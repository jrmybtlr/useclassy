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

/**
 * Variant names in `class:…` / `className:…`.
 * Includes `/` (named groups like `group-hover/item`) and `@` (container
 * queries like `@md`). Arbitrary variants (`[&>*]`, `data-[open]`) still cannot
 * be attribute names — `[` / `]` / `&` are not allowed, and JSX cannot parse
 * `/` or `@` in `className:…` attributes. In React, use `mods({ '@md': '…',
 * 'group-hover/item': '…' })` so the real Tailwind names stay unchanged.
 */
export const CLASS_MODIFIER_NAME_PATTERN = String.raw`[\w/:@-]+`

/** Base (Vue) class attribute regexes */
export const CLASS_REGEX = /(?<![:\w])class="([^"]*)"(?![^>]*:class)/g
export const CLASS_MODIFIER_REGEX = new RegExp(
  String.raw`(?<![:\w])class:(${CLASS_MODIFIER_NAME_PATTERN})="([^"]*)"`,
  'g',
)

/** React `className` / `class` regexes */
export const REACT_CLASS_REGEX = /(?<![:\w])className=(?:"([^"]*)"|{([^}]*)})(?![^>]*:)/g
export const REACT_CLASS_MODIFIER_REGEX = new RegExp(
  String.raw`(?<![:\w])(?:className|class):(${CLASS_MODIFIER_NAME_PATTERN})="([^"]*)"`,
  'g',
)

/** Start of a JSX expression modifier: `className:hover={` or `class:sm:hover = {` */
const JSX_MODIFIER_START_REGEX = new RegExp(
  String.raw`(?<![:\w])(?:className|class):(${CLASS_MODIFIER_NAME_PATTERN})\s*=\s*\{`,
  'g',
)

/**
 * Svelte `class` regexes.
 * UseClassy modifiers use quoted values (`class:hover="..."`).
 * Native Svelte class directives (`class:active={cond}`, shorthand `class:active`)
 * are left alone because they do not use a quoted string value.
 * Unlike Vue, there is no `:class` binding lookahead.
 */
export const SVELTE_CLASS_REGEX = /(?<![:\w])class=(?:"([^"]*)"|{([^}]*)})/g
export const SVELTE_CLASS_MODIFIER_REGEX = new RegExp(
  String.raw`(?<![:\w])class:(${CLASS_MODIFIER_NAME_PATTERN})="([^"]*)"`,
  'g',
)

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
 * Prefixes each class token with the full modifier chain.
 * `class:sm:hover="underline"` emits `sm:hover:underline` only — the same
 * composition Tailwind and UnoCSS use — not the individual `sm:` / `hover:`
 * pieces.
 */
function buildModifiedClasses(
  classes: string,
  modifiers: string,
): string[] {
  if (!modifiers.trim())
    return []

  const modifiedClassesArr: string[] = []

  tokenize(classes, (value) => {
    modifiedClassesArr.push(`${modifiers}:${value}`)
  })

  return modifiedClassesArr
}

/**
 * True when a string/template literal is a comparison operand or method receiver
 * (e.g. `status === 'active'`, `'x'.includes(y)`), not a class list to prefix.
 */
function isNonClassStringLiteral(
  expr: string,
  literalStart: number,
  literalEndExclusive: number,
): boolean {
  let before = literalStart - 1
  while (before >= 0 && /\s/.test(expr.charAt(before)))
    before--

  if (before >= 0) {
    if (
      (before >= 2 && expr.slice(before - 2, before + 1) === '===')
      || (before >= 2 && expr.slice(before - 2, before + 1) === '!==')
      || (before >= 1 && expr.slice(before - 1, before + 1) === '==')
      || (before >= 1 && expr.slice(before - 1, before + 1) === '!=')
    ) {
      return true
    }
  }

  let after = literalEndExclusive
  while (after < expr.length && /\s/.test(expr.charAt(after)))
    after++

  if (after < expr.length) {
    if (
      expr.startsWith('===', after)
      || expr.startsWith('!==', after)
      || expr.startsWith('==', after)
      || expr.startsWith('!=', after)
      || expr.charAt(after) === '.'
    ) {
      return true
    }
  }

  return false
}

/**
 * Rewrites class string/template literals inside a JSX expression so each token
 * receives the variant prefix (e.g. `hover:`). Returns null when no literals
 * were rewritten — callers should leave the original attribute unchanged.
 *
 * Comparison operands and string method receivers are left untouched so
 * `status === 'active' ? 'bg-a' : 'bg-b'` does not become `'hover:active'`.
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
    const next = expr[i + 1]

    // Skip comments so quotes inside them are not treated as class literals.
    if (ch === '/' && next === '/') {
      const start = i
      i += 2
      while (i < expr.length && expr[i] !== '\n')
        i++
      result += expr.slice(start, i)
      continue
    }

    if (ch === '/' && next === '*') {
      const start = i
      i += 2
      while (i < expr.length) {
        if (expr[i] === '*' && expr[i + 1] === '/') {
          i += 2
          break
        }
        i++
      }
      result += expr.slice(start, i)
      continue
    }

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
      const endExclusive = j + 1
      const nextContent = isNonClassStringLiteral(expr, i, endExclusive)
        ? content
        : emitModified(content)
      result += quote + nextContent + quote
      i = endExclusive
      continue
    }

    if (ch === '`') {
      let j = i + 1
      let templateClosed = false

      // Locate the closing backtick first so comparison/method templates
      // can be skipped without emitting prefixed classes.
      while (j < expr.length) {
        if (expr[j] === '\\' && j + 1 < expr.length) {
          j += 2
          continue
        }
        if (expr[j] === '`') {
          templateClosed = true
          j++
          break
        }
        if (expr[j] === '$' && expr[j + 1] === '{') {
          const nested = readBalancedJsxExpression(expr, j + 1)
          if (!nested) {
            j = expr.length
            break
          }
          j = nested.endIndex + 1
          continue
        }
        j++
      }

      if (!templateClosed) {
        result += expr.slice(i)
        break
      }

      if (isNonClassStringLiteral(expr, i, j)) {
        result += expr.slice(i, j)
        i = j
        continue
      }

      let k = i + 1
      let staticPart = ''
      let rebuilt = '`'

      while (k < j - 1) {
        if (expr[k] === '\\' && k + 1 < expr.length) {
          staticPart += expr[k] + expr[k + 1]
          k += 2
          continue
        }
        if (expr[k] === '$' && expr[k + 1] === '{') {
          if (staticPart) {
            rebuilt += emitModified(staticPart)
            staticPart = ''
          }
          const nested = readBalancedJsxExpression(expr, k + 1)
          if (!nested) {
            rebuilt += expr.slice(k, j - 1)
            break
          }
          rebuilt += '${' + nested.content + '}'
          k = nested.endIndex + 1
          continue
        }
        staticPart += expr[k]
        k++
      }

      if (staticPart)
        rebuilt += emitModified(staticPart)
      rebuilt += '`'

      result += rebuilt
      i = j
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
 * Start of a React `mods({…})` / `useMods({…})` / `classy.mods({…})` call.
 * Used to pull `@md` / `group-hover/item` (and other non-JSX attribute names)
 * into the Tailwind/Uno class manifest.
 */
const MODS_CALL_START_REGEX = /\b(?:classy\s*\.\s*)?(?:useMods|mods)\s*\(\s*\{/g

/**
 * Reads one object-literal entry value starting at `start` (first non-space of
 * the value). Stops at a top-level `,` or end of the object body.
 */
function readObjectEntryValue(
  code: string,
  start: number,
): { value: string, endIndex: number } | null {
  let i = start
  while (i < code.length && /\s/.test(code[i]!))
    i++
  if (i >= code.length)
    return null

  const valueStart = i
  let depthBrace = 0
  let depthParen = 0
  let depthBracket = 0
  let inQuote: '"' | '\'' | null = null
  let inTemplate = false
  let inLineComment = false
  let inBlockComment = false

  for (; i < code.length; i++) {
    const ch = code[i]!
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
      depthBrace++
      continue
    }
    if (ch === '}') {
      if (depthBrace === 0 && depthParen === 0 && depthBracket === 0) {
        return { value: code.slice(valueStart, i).trim(), endIndex: i }
      }
      depthBrace--
      continue
    }
    if (ch === '(') {
      depthParen++
      continue
    }
    if (ch === ')') {
      depthParen--
      continue
    }
    if (ch === '[') {
      depthBracket++
      continue
    }
    if (ch === ']') {
      depthBracket--
      continue
    }
    if (ch === ',' && depthBrace === 0 && depthParen === 0 && depthBracket === 0) {
      return { value: code.slice(valueStart, i).trim(), endIndex: i }
    }
  }

  // Last entry in a mods({…}) body has no trailing comma or `}` (braces are stripped).
  return { value: code.slice(valueStart).trim(), endIndex: code.length }
}

/**
 * Walks a `mods({…})` object literal and records prefixed utilities for the
 * class manifest. Handles quoted keys (`'@md'`, `"group-hover/item"`), bare
 * identifier keys (`hover`), and expression values with string literals.
 */
export function extractModsObjectClasses(
  objectBody: string,
  allFileClasses: Set<string>,
  modifierDerivedClasses: Set<string>,
): void {
  let i = 0
  while (i < objectBody.length) {
    while (i < objectBody.length && /[\s,]/.test(objectBody[i]!))
      i++
    if (i >= objectBody.length)
      break

    // Skip comments between entries.
    if (objectBody[i] === '/' && objectBody[i + 1] === '/') {
      i += 2
      while (i < objectBody.length && objectBody[i] !== '\n')
        i++
      continue
    }
    if (objectBody[i] === '/' && objectBody[i + 1] === '*') {
      i += 2
      while (i < objectBody.length && !(objectBody[i] === '*' && objectBody[i + 1] === '/'))
        i++
      i += 2
      continue
    }

    let modifier: string | null = null

    if (objectBody[i] === '"' || objectBody[i] === '\'') {
      const quote = objectBody[i]!
      let j = i + 1
      let key = ''
      while (j < objectBody.length) {
        if (objectBody[j] === '\\' && j + 1 < objectBody.length) {
          key += objectBody[j + 1]
          j += 2
          continue
        }
        if (objectBody[j] === quote)
          break
        key += objectBody[j]
        j++
      }
      if (j >= objectBody.length)
        break
      modifier = key
      i = j + 1
    }
    else if (/[A-Za-z_$]/.test(objectBody[i]!)) {
      let j = i + 1
      while (j < objectBody.length && /[\w$]/.test(objectBody[j]!))
        j++
      modifier = objectBody.slice(i, j)
      i = j
    }
    else {
      // Unknown token — advance one char to avoid a tight loop.
      i++
      continue
    }

    while (i < objectBody.length && /\s/.test(objectBody[i]!))
      i++
    if (objectBody[i] !== ':')
      continue
    i++

    const entry = readObjectEntryValue(objectBody, i)
    if (!entry || !modifier?.trim())
      break

    const { value, endIndex } = entry
    i = endIndex

    if (!value || value === 'false' || value === 'null' || value === 'undefined')
      continue

    // Static string value: 'p-4' / "p-4"
    if (
      (value.startsWith('\'') && value.endsWith('\''))
      || (value.startsWith('"') && value.endsWith('"'))
    ) {
      const classes = value.slice(1, -1)
      for (const modifiedClass of buildModifiedClasses(classes, modifier)) {
        if (!isTrackedGeneratedClass(modifiedClass))
          continue
        allFileClasses.add(modifiedClass)
        modifierDerivedClasses.add(modifiedClass)
      }
      continue
    }

    // Expression value: reuse the JSX literal rewriter for string tokens only.
    rewriteClassLiteralsInExpression(value, modifier, (cls) => {
      allFileClasses.add(cls)
      modifierDerivedClasses.add(cls)
    })
  }
}

/**
 * Finds `mods({…})` / `useMods({…})` / `classy.mods({…})` calls and extracts
 * prefixed utilities into the manifest sets.
 */
export function extractModsCallClasses(
  code: string,
  allFileClasses: Set<string>,
  modifierDerivedClasses: Set<string>,
): void {
  if (!code.includes('mods'))
    return

  MODS_CALL_START_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = MODS_CALL_START_REGEX.exec(code)) !== null) {
    const openBraceIndex = match.index + match[0].length - 1
    const balanced = readBalancedJsxExpression(code, openBraceIndex)
    if (!balanced) {
      MODS_CALL_START_REGEX.lastIndex = openBraceIndex + 1
      continue
    }

    extractModsObjectClasses(
      balanced.content,
      allFileClasses,
      modifierDerivedClasses,
    )
    MODS_CALL_START_REGEX.lastIndex = balanced.endIndex + 1
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
      for (const modifiedClass of buildModifiedClasses(classes, modifiers)) {
        allFileClasses.add(modifiedClass)
        modifierDerivedClasses.add(modifiedClass)
      }
    }
  }

  // Conditional / JSX expression modifiers: className:hover={cond ? 'a' : 'b'}
  forEachJsxModifier(code, ({ modifiers, expression }) => {
    rewriteClassLiteralsInExpression(expression, modifiers, (cls) => {
      allFileClasses.add(cls)
      modifierDerivedClasses.add(cls)
    })
  })

  // React mods({ '@md': '…', 'group-hover/item': '…' }) — names JSX cannot attribute
  extractModsCallClasses(code, allFileClasses, modifierDerivedClasses)
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
      // Coerce falsy runtime values (e.g. `cond && 'class'`) so template
      // interpolation does not stringify `false` into the class list.
      return `\${(${expr}) || ''}`
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

function removeAttrWithLeadingWhitespace(
  attrs: string,
  start: number,
  end: number,
): string {
  let from = start
  while (from > 0 && /\s/.test(attrs.charAt(from - 1)))
    from--
  return attrs.slice(0, from) + attrs.slice(end)
}

function mergeAttrsInStartTag(
  attrs: string,
  attrName: string,
): string | null {
  const matches: ParsedClassAttr[] = []
  let i = 0

  while (i < attrs.length) {
    const match = matchClassAttrAt(attrs, i, attrName)
    if (!match) {
      i++
      continue
    }
    matches.push(match)
    i = match.end
  }

  if (matches.length < 2)
    return null

  const merged = mergeParsedClassAttrs(matches, attrName)
  let nextAttrs = attrs

  for (let i = matches.length - 1; i >= 1; i--) {
    const match = matches[i]
    if (!match)
      continue
    nextAttrs = removeAttrWithLeadingWhitespace(nextAttrs, match.start, match.end)
  }

  const first = matches[0]
  if (!first)
    return nextAttrs

  if (merged) {
    return (
      nextAttrs.slice(0, first.start)
      + merged
      + nextAttrs.slice(first.end)
    )
  }

  return removeAttrWithLeadingWhitespace(nextAttrs, first.start, first.end)
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

/**
 * Collapses repeated `class` / `className` attributes within a start tag,
 * preserving intervening attrs (Vue `:class`, Svelte `class:name`, etc.).
 */
export function mergeClassAttributes(code: string, attrName: string): string {
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

    const nextAttrs = mergeAttrsInStartTag(attrs, attrName)
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
