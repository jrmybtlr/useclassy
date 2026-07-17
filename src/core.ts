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

/** Start of a JSX expression modifier: `className:hover={` or `class:sm:hover={` */
const JSX_MODIFIER_START_REGEX = /(?<![:\w])(?:className|class):([\w-:]+)=\{/g

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
 * Reads a `{...}` JSX expression starting at `openIndex` (must point at `{`).
 * Respects string/template literals and comments so nested braces are handled.
 */
export function readBalancedJsxExpression(
  code: string,
  openIndex: number,
): { content: string, endIndex: number } | null {
  if (code[openIndex] !== '{')
    return null

  let depth = 0
  let inQuote: '"' | '\'' | null = null
  let inTemplate = false
  let inLineComment = false
  let inBlockComment = false

  for (let i = openIndex; i < code.length; i++) {
    const ch = code[i]
    const next = code[i + 1]

    if (inLineComment) {
      if (ch === '\n')
        inLineComment = false
      continue
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }

    if (inQuote) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === inQuote)
        inQuote = null
      continue
    }

    if (inTemplate) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === '`') {
        inTemplate = false
        continue
      }
      if (ch === '$' && next === '{') {
        const nested = readBalancedJsxExpression(code, i + 1)
        if (!nested)
          return null
        i = nested.endIndex
      }
      continue
    }

    if (ch === '"' || ch === '\'') {
      inQuote = ch
      continue
    }

    if (ch === '`') {
      inTemplate = true
      continue
    }

    if (ch === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }

    if (ch === '{') {
      depth++
      continue
    }

    if (ch === '}') {
      depth--
      if (depth === 0) {
        return {
          content: code.slice(openIndex + 1, i),
          endIndex: i,
        }
      }
    }
  }

  return null
}

/**
 * Builds the prefixed class list for a modifier (full chain + partials).
 */
function buildModifiedClasses(
  classes: string,
  modifiers: string,
): string[] {
  if (!modifiers.trim())
    return []

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

  return modifiedClassesArr
}

/**
 * Rewrites class string/template literals inside a JSX expression so each token
 * receives the variant prefix (e.g. `hover:`). Returns null when no literals
 * were rewritten — callers should leave the original attribute unchanged.
 */
function rewriteClassLiteralsInExpression(
  expr: string,
  modifiers: string,
  onClass?: (cls: string) => void,
): string | null {
  let result = ''
  let i = 0
  let rewrote = false

  const emitModified = (classStr: string): string => {
    const modified = buildModifiedClasses(classStr, modifiers)
    if (modified.length === 0)
      return classStr

    rewrote = true
    if (onClass) {
      for (const cls of modified) {
        if (isTrackedGeneratedClass(cls))
          onClass(cls)
      }
    }
    return modified.join(' ')
  }

  while (i < expr.length) {
    const ch = expr[i]

    if (ch === '"' || ch === '\'') {
      const quote = ch
      let j = i + 1
      let content = ''
      while (j < expr.length) {
        if (expr[j] === '\\' && j + 1 < expr.length) {
          content += expr[j] + expr[j + 1]
          j += 2
          continue
        }
        if (expr[j] === quote)
          break
        content += expr[j]
        j++
      }
      if (j >= expr.length) {
        result += expr.slice(i)
        break
      }
      result += quote + emitModified(content) + quote
      i = j + 1
      continue
    }

    if (ch === '`') {
      let j = i + 1
      let staticPart = ''
      let rebuilt = '`'
      let templateClosed = false

      while (j < expr.length) {
        if (expr[j] === '\\' && j + 1 < expr.length) {
          staticPart += expr[j] + expr[j + 1]
          j += 2
          continue
        }
        if (expr[j] === '`') {
          if (staticPart)
            rebuilt += emitModified(staticPart)
          rebuilt += '`'
          templateClosed = true
          j++
          break
        }
        if (expr[j] === '$' && expr[j + 1] === '{') {
          if (staticPart) {
            rebuilt += emitModified(staticPart)
            staticPart = ''
          }
          const nested = readBalancedJsxExpression(expr, j + 1)
          if (!nested) {
            rebuilt += expr.slice(j)
            j = expr.length
            break
          }
          // Interpolations are runtime values — leave them untouched.
          rebuilt += '${' + nested.content + '}'
          j = nested.endIndex + 1
          continue
        }
        staticPart += expr[j]
        j++
      }

      result += templateClosed ? rebuilt : expr.slice(i)
      i = templateClosed ? j : expr.length
      continue
    }

    result += ch
    i++
  }

  return rewrote ? result : null
}

function forEachJsxModifier(
  code: string,
  callback: (match: {
    fullStart: number
    fullEnd: number
    modifiers: string
    expression: string
  }) => void,
): void {
  JSX_MODIFIER_START_REGEX.lastIndex = 0
  let startMatch: RegExpExecArray | null
  while ((startMatch = JSX_MODIFIER_START_REGEX.exec(code)) !== null) {
    const modifiers = startMatch[1]
    const openBraceIndex = startMatch.index + startMatch[0].length - 1
    const balanced = readBalancedJsxExpression(code, openBraceIndex)
    if (!balanced || !modifiers) {
      // Avoid tight loops on malformed `{` without a closing brace.
      JSX_MODIFIER_START_REGEX.lastIndex = openBraceIndex + 1
      continue
    }

    callback({
      fullStart: startMatch.index,
      fullEnd: balanced.endIndex + 1,
      modifiers,
      expression: balanced.content,
    })

    JSX_MODIFIER_START_REGEX.lastIndex = balanced.endIndex + 1
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

  // Conditional / JSX expression modifiers: className:hover={cond ? 'a' : 'b'}
  forEachJsxModifier(code, ({ modifiers, expression }) => {
    rewriteClassLiteralsInExpression(expression, modifiers, (cls) => {
      allFileClasses.add(cls)
      modifierDerivedClasses.add(cls)
    })
  })
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
 * Replaces `class:modifier="..."` / `className:modifier={...}` with merged attributes.
 */
export function transformClassModifiers(
  code: string,
  generatedClassesSet: Set<string>,
  classModifierRegex: RegExp,
  classAttrName: string,
): string {
  const withStaticModifiers = code.replace(classModifierRegex, (match, modifiers, classes) => {
    if (!modifiers?.trim()) return match

    const modifiedClassesArr = buildModifiedClasses(classes, modifiers)

    for (const cls of modifiedClassesArr) {
      if (isTrackedGeneratedClass(cls))
        generatedClassesSet.add(cls)
    }

    return `${classAttrName}="${modifiedClassesArr.join(' ')}"`
  })

  return transformJsxExpressionModifiers(
    withStaticModifiers,
    generatedClassesSet,
    classAttrName,
  )
}

/**
 * Transforms `className:hover={cond ? 'a' : 'b'}` into
 * `className={cond ? 'hover:a' : 'hover:b'}`. Leaves expression-only values
 * (no string literals) unchanged so runtime variables stay intact.
 */
function transformJsxExpressionModifiers(
  code: string,
  generatedClassesSet: Set<string>,
  classAttrName: string,
): string {
  const replacements: Array<{ start: number, end: number, text: string }> = []

  forEachJsxModifier(code, ({ fullStart, fullEnd, modifiers, expression }) => {
    if (!modifiers.trim())
      return

    const rewritten = rewriteClassLiteralsInExpression(
      expression,
      modifiers,
      (cls) => {
        generatedClassesSet.add(cls)
      },
    )

    if (rewritten === null)
      return

    replacements.push({
      start: fullStart,
      end: fullEnd,
      text: `${classAttrName}={${rewritten}}`,
    })
  })

  if (replacements.length === 0)
    return code

  // Apply from the end so earlier offsets stay valid.
  let result = code
  for (let i = replacements.length - 1; i >= 0; i--) {
    const replacement = replacements[i]
    if (!replacement)
      continue
    result = result.slice(0, replacement.start)
      + replacement.text
      + result.slice(replacement.end)
  }
  return result
}

interface ParsedClassAttr {
  start: number
  end: number
  staticValue?: string
  jsxValue?: string
}

function isClassAttrNameBoundary(code: string, index: number): boolean {
  if (index <= 0)
    return true
  const prev = code[index - 1]
  return prev !== ':' && !((prev >= 'a' && prev <= 'z')
    || (prev >= 'A' && prev <= 'Z')
    || (prev >= '0' && prev <= '9')
    || prev === '_')
}

function matchClassAttrAt(
  code: string,
  index: number,
  attrName: string,
): ParsedClassAttr | null {
  const names = attrName === 'className' ? ['className', 'class'] as const : ['class'] as const

  for (const name of names) {
    if (!code.startsWith(`${name}=`, index))
      continue
    if (!isClassAttrNameBoundary(code, index))
      continue

    const valueIndex = index + name.length + 1
    const valueCh = code[valueIndex]

    if (valueCh === '"') {
      let j = valueIndex + 1
      while (j < code.length) {
        if (code[j] === '\\') {
          j += 2
          continue
        }
        if (code[j] === '"')
          break
        j++
      }
      if (j >= code.length)
        return null
      return {
        start: index,
        end: j + 1,
        staticValue: code.slice(valueIndex + 1, j),
      }
    }

    if (valueCh === '{') {
      const balanced = readBalancedJsxExpression(code, valueIndex)
      if (!balanced)
        return null
      return {
        start: index,
        end: balanced.endIndex + 1,
        jsxValue: balanced.content,
      }
    }
  }

  return null
}

function skipAttrSeparator(code: string, index: number): number {
  let i = index
  while (i < code.length) {
    const ch = code[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }
    break
  }
  return i
}

function mergeParsedClassAttrs(
  attrs: ParsedClassAttr[],
  attrName: string,
): string {
  const staticClasses: string[] = []
  const jsxExprs: string[] = []

  for (const attr of attrs) {
    if (attr.staticValue?.trim()) {
      staticClasses.push(attr.staticValue.trim())
      continue
    }

    if (!attr.jsxValue)
      continue

    const currentJsx = attr.jsxValue.trim()
    if (!currentJsx)
      continue

    if (currentJsx.startsWith('`') && currentJsx.endsWith('`')) {
      const inner = currentJsx.slice(1, -1)
      if (!inner.includes('${')) {
        const literalContent = inner.trim()
        if (literalContent)
          staticClasses.push(literalContent)
        continue
      }
    }

    jsxExprs.push(currentJsx)
  }

  const combinedStatic = staticClasses.join(' ').trim()

  if (jsxExprs.length > 0) {
    if (jsxExprs.length === 1 && !combinedStatic)
      return `${attrName}={${jsxExprs[0]}}`

    const dynamicParts = jsxExprs.map((expr) => {
      if (expr.startsWith('`') && expr.endsWith('`'))
        return expr.slice(1, -1)
      return `\${${expr}}`
    }).join(' ')

    if (combinedStatic)
      return `${attrName}={\`${combinedStatic} ${dynamicParts}\`}`

    return `${attrName}={\`${dynamicParts}\`}`
  }
  if (combinedStatic)
    return `${attrName}="${combinedStatic}"`

  if (process.env.NODE_ENV !== 'test') {
    console.warn('No classes found in class attribute group')
  }
  return ''
}

/** Collapses repeated `class` / `className` attributes on one element (Vue or React). */
export function mergeClassAttributes(code: string, attrName: string): string {
  let result = ''
  let i = 0

  while (i < code.length) {
    const attr = matchClassAttrAt(code, i, attrName)
    if (!attr) {
      result += code[i]
      i++
      continue
    }

    // Skip Vue `class=` that is actually part of `:class` — handled by boundary check.
    const group: ParsedClassAttr[] = [attr]
    let cursor = attr.end

    while (true) {
      const nextIndex = skipAttrSeparator(code, cursor)
      if (nextIndex === cursor)
        break
      const nextAttr = matchClassAttrAt(code, nextIndex, attrName)
      if (!nextAttr)
        break
      // Only merge when attributes are adjacent (whitespace-separated).
      group.push(nextAttr)
      cursor = nextAttr.end
    }

    if (group.length === 1) {
      result += code.slice(attr.start, attr.end)
    }
    else {
      result += mergeParsedClassAttrs(group, attrName)
    }
    i = cursor
  }

  return result
}
