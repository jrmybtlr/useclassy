import crypto from 'crypto'

// Supported file extensions
export const SUPPORTED_FILES = [
  '.vue',
  '.svelte',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.html',
  '.blade.php',
]

const MAX_MODIFIER_DEPTH = 4

/** Base (Vue) class attribute regexes */
export const CLASS_REGEX = /(?<![:\w])class="([^"]*)"(?![^>]*:class)/g
export const CLASS_MODIFIER_REGEX = /(?<![:\w])class:([\w-:]+)="([^"]*)"/g

/** React `className` / `class` regexes */
export const REACT_CLASS_REGEX = /(?<![:\w])className=(?:"([^"]*)"|{([^}]*)})(?![^>]*:)/g
export const REACT_CLASS_MODIFIER_REGEX
  = /(?<![:\w])(?:className|class):([\w-:]+)="([^"]*)"/g

/**
 * Generates a hash string from the input string
 */
export function hashString(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 8)
}

/**
 * Generates a cache key for a file (collision-resistant for transform caching)
 */
export function generateCacheKey(id: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(id, 'utf8')
    .update('\0', 'utf8')
    .update(code, 'utf8')
    .digest('hex')
}

/**
 * Splits a whitespace-delimited string and invokes `callback` for each non-empty token.
 * Uses character comparisons instead of regex for performance in hot paths.
 * Recognises space, tab, newline (\n), and carriage-return (\r) as delimiters.
 */
function tokenize(str: string, callback: (token: string) => void): void {
  let start = 0
  const len = str.length
  for (let i = 0; i <= len; i++) {
    const ch = str[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || i === len) {
      if (i > start) {
        callback(str.substring(start, i))
      }
      start = i + 1
    }
  }
}

/**
 * Extracts classes from the code, separating base classes and modifier-derived classes.
 */
function processClassString(classStr: string, allFileClasses: Set<string>): void {
  tokenize(classStr, cls => allFileClasses.add(cls))
}

/**
 * Extracts classes from the code
 */
export function extractClasses(
  code: string,
  allFileClasses: Set<string>,
  modifierDerivedClasses: Set<string>,
  classRegex: RegExp,
  classModifierRegex: RegExp,
): void {
  allFileClasses.clear()
  modifierDerivedClasses.clear()

  // Extract base classes from class="..." or className="..."
  let classMatch
  while ((classMatch = classRegex.exec(code)) !== null) {
    const staticClasses = classMatch[1]
    if (staticClasses) {
      processClassString(staticClasses, allFileClasses)
    }

    const jsxClasses = classMatch[2]
    if (jsxClasses) {
      const trimmedJsx = jsxClasses.trim()
      if (trimmedJsx.startsWith('`') && trimmedJsx.endsWith('`')) {
        const literalContent = trimmedJsx.slice(1, -1)
        const staticPart = literalContent.split('${')[0]
        if (staticPart) {
          processClassString(staticPart, allFileClasses)
        }
      }
    }
  }

  let modifierMatch
  while ((modifierMatch = classModifierRegex.exec(code)) !== null) {
    const modifiers = modifierMatch[1]
    const classes = modifierMatch[2]

    if (modifiers && classes) {
      const modifierParts = modifiers.includes(':') ? modifiers.split(':') : null

      tokenize(classes, (cls) => {
        const modifiedClass = `${modifiers}:${cls}`
        allFileClasses.add(modifiedClass)
        modifierDerivedClasses.add(modifiedClass)

        if (modifierParts) {
          const maxDepth = Math.min(modifierParts.length, MAX_MODIFIER_DEPTH)
          for (let j = 0; j < maxDepth; j++) {
            const part = modifierParts[j]
            if (part) {
              const partialModifiedClass = `${part}:${cls}`
              allFileClasses.add(partialModifiedClass)
              modifierDerivedClasses.add(partialModifiedClass)
            }
          }
        }
      })
    }
  }
}

function isTrackedGeneratedClass(cls: string): boolean {
  return Boolean(
    cls
    && !cls.endsWith(':')
    && !cls.startsWith('\'')
    && !cls.endsWith('\''),
  )
}

/**
 * Replaces `class:modifier="..."` (or React equivalents) with a single merged attribute.
 */
export function transformClassModifiers(
  code: string,
  generatedClassesSet: Set<string>,
  classModifierRegex: RegExp,
  classAttrName: string,
): string {
  return code.replace(classModifierRegex, (match, modifiers, classes) => {
    if (!modifiers?.trim()) return match

    const modifierParts = modifiers.split(':')
    const modifiedClassesArr: string[] = []

    tokenize(classes, (value) => {
      modifiedClassesArr.push(`${modifiers}:${value}`)
      if (modifierParts.length > 1) {
        for (const part of modifierParts) {
          if (part)
            modifiedClassesArr.push(`${part}:${value}`)
        }
      }
    })

    for (const cls of modifiedClassesArr) {
      if (isTrackedGeneratedClass(cls))
        generatedClassesSet.add(cls)
    }

    return `${classAttrName}="${modifiedClassesArr.join(' ')}"`
  })
}

const regexCache = new Map<string, { multipleClassRegex: RegExp, attrFinderRegex: RegExp }>()

function getCompiledRegexes(attrName: string): {
  multipleClassRegex: RegExp
  attrFinderRegex: RegExp
} {
  let cached = regexCache.get(attrName)
  if (!cached) {
    cached = {
      multipleClassRegex: new RegExp(
        `(?<![:\\w])((?:${attrName}|class)=(?:(?:"[^"]*")|(?:{[^}]*})))`
        + `(?:\\s+((?:${attrName}|class)=(?:(?:"[^"]*")|(?:{[^}]*}))))*`,
        'g',
      ),
      attrFinderRegex: new RegExp(
        `(?:${attrName}|class)=(?:(?:"([^"]*)")|(?:{([^}]*)}))`,
        'g',
      ),
    }
    regexCache.set(attrName, cached)
  }
  return cached
}

/** Collapses repeated `class` / `className` attributes on one element (Vue or React). */
export function mergeClassAttributes(code: string, attrName: string): string {
  const { multipleClassRegex, attrFinderRegex } = getCompiledRegexes(attrName)

  return code.replace(multipleClassRegex, (match) => {
    attrFinderRegex.lastIndex = 0
    const staticClasses: string[] = []
    let jsxExpr: string | null = null
    let isFunctionCall = false

    let singleAttrMatch
    while ((singleAttrMatch = attrFinderRegex.exec(match)) !== null) {
      const staticClassValue = singleAttrMatch[1]
      const potentialJsx = singleAttrMatch[2]

      if (staticClassValue?.trim()) {
        staticClasses.push(staticClassValue.trim())
      }
      else if (potentialJsx) {
        const currentJsx = potentialJsx.trim()
        if (currentJsx) {
          if (currentJsx.startsWith('`') && currentJsx.endsWith('`')) {
            const literalContent = currentJsx.slice(1, -1).trim()
            if (literalContent) {
              staticClasses.push(literalContent)
            }
          }
          else {
            const currentIsFunctionCall = /^[a-zA-Z_][\w.]*\(.*\)$/.test(currentJsx)

            if (!jsxExpr || (currentIsFunctionCall && !isFunctionCall)) {
              jsxExpr = currentJsx
              isFunctionCall = currentIsFunctionCall
            }
            else if (currentIsFunctionCall && isFunctionCall) {
              jsxExpr = currentJsx
            }
            else if (!jsxExpr) {
              jsxExpr = currentJsx
              isFunctionCall = false
            }
          }
        }
      }
    }

    const combinedStatic = staticClasses.join(' ').trim()

    if (jsxExpr) {
      if (!combinedStatic)
        return `${attrName}={${jsxExpr}}`

      return `${attrName}={\`${combinedStatic} \${${jsxExpr}}\`}`
    }
    if (combinedStatic)
      return `${attrName}="${combinedStatic}"`

    if (process.env.NODE_ENV !== 'test') {
      console.warn('No classes found in class attribute:', match)
    }
    return ''
  })
}
