import crypto from 'crypto'
import { hashFunction } from './utils'

// Supported file extensions
export const SUPPORTED_FILES = ['.vue', '.ts', '.tsx', '.js', '.jsx', '.html']

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
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8)
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
      staticClasses.split(/\s+/).forEach((cls) => {
        const trimmedCls = cls.trim()
        if (trimmedCls) {
          allFileClasses.add(trimmedCls)
        }
      })
    }

    // Handle JSX expressions (group 2)
    const jsxClasses = classMatch[2]
    if (jsxClasses) {
      const trimmedJsx = jsxClasses.trim()
      // Check if it's a template literal and try to extract static classes from the start
      if (trimmedJsx.startsWith('`') && trimmedJsx.endsWith('`')) {
        const literalContent = trimmedJsx.slice(1, -1)
        // Extract parts before the first interpolation
        const staticPart = literalContent.split('${')[0]
        if (staticPart) {
          staticPart.split(/\s+/).forEach((cls) => {
            const trimmedCls = cls.trim()
            if (trimmedCls) {
              allFileClasses.add(trimmedCls)
            }
          })
        }
      }
      else {
        // If it's not a template literal (e.g., a variable or function call),
        // we cannot extract static classes reliably here.
        // The mergeClassAttributes function handles preserving these expressions later.
      }
    }
  }

  // Extract and process classes from class:modifier="..." or className:modifier="..."
  let modifierMatch
  while ((modifierMatch = classModifierRegex.exec(code)) !== null) {
    const modifiers = modifierMatch[1] // e.g., "hover", "sm:focus"
    const classes = modifierMatch[2] // e.g., "bg-blue-500 text-white"

    if (modifiers && classes) {
      classes.split(/\s+/).forEach((cls) => {
        // Split by any whitespace
        const trimmedCls = cls.trim()
        if (trimmedCls) {
          // Construct the fully modified class name (e.g., "hover:bg-blue-500")
          const modifiedClass = `${modifiers}:${trimmedCls}`

          // Add to the set containing ALL classes for transformation context
          allFileClasses.add(modifiedClass)

          // Add ONLY the derived class to the set used for the output file
          modifierDerivedClasses.add(modifiedClass)

          // Handle multi-part modifiers like sm:hover
          // Add individual parts as well to the modifierDerivedClasses for Tailwind JIT
          const modifierParts = modifiers.split(':')
          if (modifierParts.length > 1) {
            modifierParts.forEach((part) => {
              if (part) {
                const partialModifiedClass = `${part}:${trimmedCls}`
                allFileClasses.add(partialModifiedClass) // Also add to all classes context
                modifierDerivedClasses.add(partialModifiedClass)
              }
            })
          }
        }
      })
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
    if (!modifiers || modifiers.trim() === '') return match

    const modifierParts = modifiers.split(':')

    // Process each modifier part
    const modifiedClassesArr = classes
      .split(' ')
      .map((value: string) => value.trim())
      .filter((value: string) => value && value !== '')
      .flatMap((value: string) => {
        // Create an array with the full modifier:class combination
        const result = [`${modifiers}:${value}`]

        // Also add individual modifier parts for better coverage
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

    // For React components, always use className as the attribute name
    // regardless of whether the original was class: or className:
    const finalAttrName
      = classAttrName === 'className' ? 'className' : classAttrName
    return `${finalAttrName}="${modifiedClassesArr.join(' ')}"`
  })
}

/**
 * Merges multiple class attributes into a single one
 */
export function mergeClassAttributes(code: string, attrName: string): string {
  // Regex to find blocks of adjacent class/className attributes
  const multipleClassRegex = new RegExp(
    // Match the first attribute (quoted string or JSX)
    `((?:${attrName}|class)=(?:(?:"[^"]*")|(?:{[^}]*})))`
    // Match subsequent attributes separated by whitespace
    + `(?:\\s+((?:${attrName}|class)=(?:(?:"[^"]*")|(?:{[^}]*}))))*`,
    'g',
  )

  return code.replace(multipleClassRegex, (match) => {
    const staticClasses: string[] = []
    let jsxExpr: string | null = null
    let isFunctionCall = false

    // Regex to find individual attributes (quoted string or JSX) within the matched block
    const attrFinderRegex = new RegExp(
      `(?:${attrName}|class)=(?:(?:"([^"]*)")|(?:{([^}]*)}))`,
      'g',
    )

    let singleAttrMatch
    while ((singleAttrMatch = attrFinderRegex.exec(match)) !== null) {
      const staticClassValue = singleAttrMatch[1] // Content of "..."
      const potentialJsx = singleAttrMatch[2] // Content of {...}

      if (staticClassValue !== undefined) {
        // Directly add static classes from quoted attributes
        if (staticClassValue.trim()) {
          staticClasses.push(staticClassValue.trim())
        }
      }
      else if (potentialJsx !== undefined) {
        const currentJsx = potentialJsx.trim()
        if (currentJsx) {
          // Check if it's a template literal like {`...`}, treat its content as static
          if (currentJsx.startsWith('`') && currentJsx.endsWith('`')) {
            const literalContent = currentJsx.slice(1, -1).trim()
            if (literalContent) {
              staticClasses.push(literalContent)
            }
          }
          else {
            // It's a non-literal JSX expression. Store it.
            // Prioritize function calls if encountered.
            const currentIsFunctionCall = /^[a-zA-Z_][\w.]*\(.*\)$/.test(
              currentJsx,
            )

            if (!jsxExpr || (currentIsFunctionCall && !isFunctionCall)) {
              // Store if it's the first JSX or if it's a function call and the previous wasn't
              jsxExpr = currentJsx
              isFunctionCall = currentIsFunctionCall
            }
            else if (currentIsFunctionCall && isFunctionCall) {
              // If both current and previous are function calls, prefer the current one (last encountered)
              jsxExpr = currentJsx
            }
            else if (!jsxExpr) {
              // If no JSX stored yet, store the current non-function expression
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
        // Only JSX expression found
        return `${finalAttrName}={${jsxExpr}}`
      }

      if (isFunctionCall) {
        // Try to inject static classes into the function call
        const lastParenIndex = jsxExpr.lastIndexOf(')')
        if (lastParenIndex !== -1) {
          // Add static classes as a new template literal argument
          const modifiedJsxExpr = `${jsxExpr.substring(
            0,
            lastParenIndex,
          )}, \`${combinedStatic}\`${jsxExpr.substring(lastParenIndex)}`
          return `${finalAttrName}={${modifiedJsxExpr}}`
        }
        else {
          // Fallback if function call format is unexpected
          console.warn(
            'Could not inject classes into function call format:',
            jsxExpr,
          )
          // Combine using template literal as a fallback
          return `${finalAttrName}={\`${combinedStatic} \${${jsxExpr}}\`}`
        }
      }
      else {
        // Combine static classes and non-function JSX using a template literal
        return `${finalAttrName}={\`${combinedStatic} \${${jsxExpr}}\`}`
      }
    }
    else if (combinedStatic) {
      // Only static classes found
      return `${finalAttrName}="${combinedStatic}"`
    }
    else {
      // No classes found at all (e.g. class="" className={undefined})
      return '' // Return empty string to remove the attributes
    }
  })
}
