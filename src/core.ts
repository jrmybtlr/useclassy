import crypto from 'crypto'
import { hashFunction } from './utils'

// Supported file extensions
export const SUPPORTED_FILES = ['.vue', '.ts', '.tsx', '.js', '.jsx', '.html', '.blade.php']

// Performance constants
const MAX_MODIFIER_DEPTH = 4

// Base constants for class transformations
export const CLASS_REGEX = /class="([^"]*)"(?![^>]*:class)/g
export const CLASS_MODIFIER_REGEX = /class:([\w-:]+)="([^"]*)"/g
export const MULTIPLE_CLASS_REGEX = /class="[^"]*"(\s*class="[^"]*")*/g

// React-specific constants
export const REACT_CLASS_REGEX = /className=(?:"([^"]*)"|{([^}]*)})(?![^>]*:)/g
export const REACT_CLASS_MODIFIER_REGEX
  = /(?:className|class):([\w-:]+)="([^"]*)"/g
export const REACT_MULTIPLE_CLASS_REGEX
  = /(?:className|class)=(?:"[^"]*"|{[^}]*})(?:\s*(?:className|class)=(?:"[^"]*"|{[^}]*}))*|(?:className|class)="[^"]*"(?:\s*(?:className|class)="[^"]*")*/g

/**
 * Generates a hash string from the input string
 */
export function hashString(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 8)
}

/**
 * Generates a cache key for a file
 */
export function generateCacheKey(id: string, code: string): string {
  return hashFunction(id + code).toString()
}

/**
 * Extracts classes from the code, separating base classes and modifier-derived classes.
 */
function processClassString(classStr: string, allFileClasses: Set<string>): void {
  let start = 0
  const len = classStr.length

  for (let i = 0; i <= len; i++) {
    const char = classStr[i]
    if (char === ' ' || char === '\t' || char === '\n' || i === len) {
      if (i > start) {
        const cls = classStr.substring(start, i)
        if (cls) {
          allFileClasses.add(cls)
        }
      }
      while (i < len && /\s/.test(classStr[i + 1])) {
        i++
      }
      start = i + 1
    }
  }
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
    // Handle quoted strings (group 1)
    const staticClasses = classMatch[1]
    if (staticClasses) {
      processClassString(staticClasses, allFileClasses)
    }

    // Handle JSX expressions (group 2)
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

  // Extract and process classes from class:modifier="..." or className:modifier="..."
  let modifierMatch
  while ((modifierMatch = classModifierRegex.exec(code)) !== null) {
    const modifiers = modifierMatch[1]
    const classes = modifierMatch[2]

    if (modifiers && classes) {
      // Process modifier classes with optimized string parsing
      let start = 0
      const len = classes.length

      for (let i = 0; i <= len; i++) {
        const char = classes[i]
        if (char === ' ' || char === '\t' || char === '\n' || i === len) {
          if (i > start) {
            const cls = classes.substring(start, i)
            if (cls) {
              const modifiedClass = `${modifiers}:${cls}`
              allFileClasses.add(modifiedClass)
              modifierDerivedClasses.add(modifiedClass)

              // Handle nested modifiers with depth limiting
              if (modifiers.includes(':')) {
                const modifierParts = modifiers.split(':')
                // Limit modifier depth to prevent exponential class generation
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
            }
          }
          // Skip to next non-whitespace
          while (i < len && /\s/.test(classes[i + 1])) {
            i++
          }
          start = i + 1
        }
      }
    }
  }
}

/**
 * Transforms class modifiers in the code
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

    // Process each modifier part
    const modifiedClassesArr = classes
      .split(' ')
      .map((value: string) => value.trim())
      .filter(Boolean)
      .flatMap((value: string) => {
        const result = [`${modifiers}:${value}`]

        if (modifierParts.length > 1) {
          modifierParts.forEach((part: string) => {
            if (part) {
              result.push(`${part}:${value}`)
            }
          })
        }

        return result
      })

    // Add all modified classes to the set
    modifiedClassesArr.forEach((cls: string) => {
      if (
        cls
        && !cls.endsWith(':')
        && !cls.startsWith('\'')
        && !cls.endsWith('\'')
      ) {
        generatedClassesSet.add(cls)
      }
    })

    const finalAttrName = classAttrName === 'className' ? 'className' : classAttrName
    return `${finalAttrName}="${modifiedClassesArr.join(' ')}"`
  })
}

// Pre-compiled regex cache for performance
const regexCache = new Map<string, { multipleClassRegex: RegExp, attrFinderRegex: RegExp }>()

function getCompiledRegexes(attrName: string) {
  let cached = regexCache.get(attrName)
  if (!cached) {
    cached = {
      multipleClassRegex: new RegExp(
        `((?:${attrName}|class)=(?:(?:"[^"]*")|(?:{[^}]*})))`
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

/**
 * Merges multiple class attributes into a single one
 */
export function mergeClassAttributes(code: string, attrName: string): string {
  const { multipleClassRegex, attrFinderRegex } = getCompiledRegexes(attrName)

  return code.replace(multipleClassRegex, (match) => {
    const staticClasses: string[] = []
    let jsxExpr: string | null = null
    let isFunctionCall = false

    let singleAttrMatch
    while ((singleAttrMatch = attrFinderRegex.exec(match)) !== null) {
      const staticClassValue = singleAttrMatch[1] // Content of "..."
      const potentialJsx = singleAttrMatch[2] // Content of {...}

      if (staticClassValue?.trim()) {
        staticClasses.push(staticClassValue.trim())
      }
      else if (potentialJsx) {
        const currentJsx = potentialJsx.trim()
        if (currentJsx) {
          // Check if it's a template literal like {`...`}
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

    const finalAttrName = attrName === 'className' ? 'className' : attrName
    const combinedStatic = staticClasses.join(' ').trim()

    if (jsxExpr) {
      if (!combinedStatic) {
        return `${finalAttrName}={${jsxExpr}}`
      }

      if (isFunctionCall) {
        const lastParenIndex = jsxExpr.lastIndexOf(')')
        if (lastParenIndex !== -1) {
          const modifiedJsxExpr = `${jsxExpr.substring(
            0,
            lastParenIndex,
          )}, \`${combinedStatic}\`${jsxExpr.substring(lastParenIndex)}`
          return `${finalAttrName}={${modifiedJsxExpr}}`
        }
        else {
          // Only warn in non-test environments to avoid noise during testing
          if (process.env.NODE_ENV !== 'test') {
            console.warn(
              'Could not inject classes into function call format:',
              jsxExpr,
            )
          }
          return `${finalAttrName}={\`${combinedStatic} \${${jsxExpr}}\`}`
        }
      }
      else {
        return `${finalAttrName}={\`${combinedStatic} \${${jsxExpr}}\`}`
      }
    }
    else if (combinedStatic) {
      return `${finalAttrName}="${combinedStatic}"`
    }
    else {
      // Only warn in non-test environments to avoid noise during testing
      if (process.env.NODE_ENV !== 'test') {
        console.warn('No classes found in class attribute:', match)
      }
      return ''
    }
  })
}
