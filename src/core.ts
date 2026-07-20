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
 * Svelte `class` regexes.
 * UseClassy modifiers use quoted values (`class:hover="..."`).
 * Native Svelte class directives (`class:active={cond}`, shorthand `class:active`)
 * are left alone because they do not use a quoted string value.
 * Unlike Vue, there is no `:class` binding lookahead.
 */
export const SVELTE_CLASS_REGEX = /(?<![:\w])class=(?:"([^"]*)"|{([^}]*)})/g
export const SVELTE_CLASS_MODIFIER_REGEX
  = /(?<![:\w])class:([\w-:]+)="([^"]*)"/g

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

const regexCache = new Map<string, RegExp>()

/** Matches `class` / `className` attrs, excluding Vue `:class` and Svelte `class:name`. */
function getClassAttrRegex(attrName: string): RegExp {
  let cached = regexCache.get(attrName)
  if (!cached) {
    cached = new RegExp(
      `(?<![:\\w])(?:${attrName}|class)=(?:(?:"([^"]*)")|(?:{([^}]*)}))`,
      'g',
    )
    regexCache.set(attrName, cached)
  }
  return cached
}

interface ClassAttrMatch {
  index: number
  length: number
  staticClass: string | undefined
  jsx: string | undefined
}

function collectMergedClassValue(
  matches: ClassAttrMatch[],
  attrName: string,
): string {
  const staticClasses: string[] = []
  let jsxExpr: string | null = null
  let isFunctionCall = false

  for (const match of matches) {
    const staticClassValue = match.staticClass
    const potentialJsx = match.jsx

    if (staticClassValue?.trim()) {
      staticClasses.push(staticClassValue.trim())
    }
    else if (potentialJsx) {
      const currentJsx = potentialJsx.trim()
      if (currentJsx) {
        if (currentJsx.startsWith('`') && currentJsx.endsWith('`')) {
          const literalContent = currentJsx.slice(1, -1).trim()
          if (literalContent)
            staticClasses.push(literalContent)
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

  return ''
}

/**
 * Index of the `>` that closes a start tag, ignoring `>` inside quotes or `{...}`.
 * `from` is the index immediately after the tag name.
 */
function findStartTagClose(code: string, from: number): number | null {
  let quote: '"' | "'" | '`' | null = null
  let braceDepth = 0

  for (let i = from; i < code.length; i++) {
    const ch = code.charAt(i)

    if (quote !== null) {
      if (ch === '\\' && i + 1 < code.length) {
        i++
        continue
      }
      if (ch === quote)
        quote = null
      continue
    }

    if (braceDepth > 0) {
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
        continue
      }
      if (ch === '{') {
        braceDepth++
        continue
      }
      if (ch === '}') {
        braceDepth--
        continue
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '{') {
      braceDepth = 1
      continue
    }
    if (ch === '>')
      return i
  }

  return null
}

function mergeAttrsInStartTag(
  attrs: string,
  attrName: string,
  classAttrRegex: RegExp,
): string | null {
  classAttrRegex.lastIndex = 0
  const matches: ClassAttrMatch[] = []
  let singleAttrMatch: RegExpExecArray | null
  while ((singleAttrMatch = classAttrRegex.exec(attrs)) !== null) {
    matches.push({
      index: singleAttrMatch.index,
      length: singleAttrMatch[0].length,
      staticClass: singleAttrMatch[1],
      jsx: singleAttrMatch[2],
    })
  }

  if (matches.length < 2)
    return null

  const merged = collectMergedClassValue(matches, attrName)
  let nextAttrs = attrs

  // Remove trailing class attrs first so earlier indices stay valid.
  for (let i = matches.length - 1; i >= 1; i--) {
    const match = matches[i]!
    let start = match.index
    const stop = match.index + match.length
    while (start > 0 && /\s/.test(nextAttrs.charAt(start - 1)))
      start--
    nextAttrs = nextAttrs.slice(0, start) + nextAttrs.slice(stop)
  }

  const first = matches[0]!
  if (merged) {
    return (
      nextAttrs.slice(0, first.index)
      + merged
      + nextAttrs.slice(first.index + first.length)
    )
  }

  let start = first.index
  const stop = first.index + first.length
  while (start > 0 && /\s/.test(nextAttrs.charAt(start - 1)))
    start--
  nextAttrs = nextAttrs.slice(0, start) + nextAttrs.slice(stop)
  if (process.env.NODE_ENV !== 'test') {
    console.warn('No classes found in class attribute:', attrs)
  }
  return nextAttrs
}

/**
 * Collapses repeated `class` / `className` attributes within a start tag,
 * preserving intervening attrs (Vue `:class`, Svelte `class:name`, etc.).
 */
export function mergeClassAttributes(code: string, attrName: string): string {
  const classAttrRegex = getClassAttrRegex(attrName)
  const tagNameRe = /^[A-Za-z][\w.:-]*/
  let result = ''
  let cursor = 0

  while (cursor < code.length) {
    const lt = code.indexOf('<', cursor)
    if (lt === -1) {
      result += code.slice(cursor)
      break
    }

    result += code.slice(cursor, lt)

    const next = code.charAt(lt + 1)
    // Skip closing tags, comments, CDATA, and processing instructions.
    if (next === '/' || next === '!' || next === '?' || next === '') {
      let end = -1
      if (next === '!' && code.startsWith('--', lt + 2)) {
        // HTML comment: must end at `-->`, not the first `>` inside the body.
        const close = code.indexOf('-->', lt + 4)
        end = close === -1 ? -1 : close + 2
      }
      else if (next === '!' && code.startsWith('[CDATA[', lt + 2)) {
        const close = code.indexOf(']]>', lt + 9)
        end = close === -1 ? -1 : close + 2
      }
      else {
        end = code.indexOf('>', lt + 1)
      }

      if (end === -1) {
        result += code.slice(lt)
        break
      }
      result += code.slice(lt, end + 1)
      cursor = end + 1
      continue
    }

    const nameMatch = tagNameRe.exec(code.slice(lt + 1))
    if (!nameMatch) {
      result += '<'
      cursor = lt + 1
      continue
    }

    const tagName = nameMatch[0]
    const afterName = lt + 1 + tagName.length

    // Only tags with an attribute region (whitespace after the name) can merge.
    if (!/\s/.test(code.charAt(afterName))) {
      const gt = findStartTagClose(code, afterName)
      if (gt === null) {
        result += code.slice(lt)
        break
      }
      result += code.slice(lt, gt + 1)
      cursor = gt + 1
      continue
    }

    const closeIdx = findStartTagClose(code, afterName)
    if (closeIdx === null) {
      result += code.slice(lt)
      break
    }

    const beforeClose = code.slice(afterName, closeIdx)
    const endMatch = beforeClose.match(/(\s*\/?)$/)
    const endPrefix = endMatch?.[1] ?? ''
    const attrs = beforeClose.slice(0, beforeClose.length - endPrefix.length)
    const end = `${endPrefix}>`

    const nextAttrs = mergeAttrsInStartTag(attrs, attrName, classAttrRegex)
    if (nextAttrs === null) {
      result += code.slice(lt, closeIdx + 1)
    }
    else {
      result += `<${tagName}${nextAttrs}${end}`
    }
    cursor = closeIdx + 1
  }

  return result
}
