import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import {
  getUseClassyTailwindSourceDirective,
  getUseClassyTailwindV3ContentEntry,
} from './tailwind'
import { getUseClassyUnoFilesystemEntry } from './unocss'

export type TailwindFlavor = 'v4' | 'v3' | 'unknown'
export type CssEngineDetection = 'tailwind' | 'unocss' | 'both' | 'unknown'

export const INIT_LANGUAGES = ['vue', 'react', 'blade', 'svelte'] as const
export type InitLanguage = typeof INIT_LANGUAGES[number]

export const INIT_ENGINES = ['tailwind', 'unocss'] as const
export type InitEngine = typeof INIT_ENGINES[number]

const VITE_CONFIG_NAMES = [
  'vite.config.ts',
  'vite.config.mts',
  'vite.config.cts',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.cjs',
] as const

const TAILWIND_CONFIG_NAMES = [
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
  'tailwind.config.ts',
  'tailwind.config.mts',
] as const

const UNO_CONFIG_NAMES = [
  'uno.config.ts',
  'uno.config.mts',
  'uno.config.js',
  'uno.config.mjs',
  'uno.config.cjs',
  'unocss.config.ts',
  'unocss.config.mts',
  'unocss.config.js',
  'unocss.config.mjs',
  'unocss.config.cjs',
] as const

const TAILWIND_IMPORT_RE = /@import\s+["']tailwindcss["']\s*;/

const MAX_CSS_WALK_DEPTH = 6

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', '.git'])

export type FilePatchResult = {
  path: string
  changed: boolean
  error?: string
  /** True when a differing local file was left alone (use --force to overwrite). */
  skipped?: boolean
}

function readPackageJson(cwd: string): Record<string, unknown> | null {
  const packagePath = path.join(cwd, 'package.json')
  try {
    return JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as Record<
      string,
      unknown
    >
  }
  catch {
    return null
  }
}

function mergedDependencies(pkg: Record<string, unknown>): Record<string, string> {
  const prod = pkg.dependencies as Record<string, string> | undefined
  const dev = pkg.devDependencies as Record<string, string> | undefined
  return { ...prod, ...dev }
}

function tailwindMajorFromRange(range: string | undefined): number | null {
  if (!range) return null
  const match = range.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function tailwindConfigExists(cwd: string): boolean {
  return TAILWIND_CONFIG_NAMES.some(name =>
    fs.existsSync(path.join(cwd, name)))
}

function readDirEntries(dir: string): fs.Dirent[] | null {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
  }
  catch {
    return null
  }
}

function addRootCssFiles(projectRoot: string, out: string[]): void {
  const entries = readDirEntries(projectRoot)
  if (!entries) return

  for (const ent of entries) {
    if (!ent.isFile()) continue
    if (/\.(css|pcss)$/i.test(ent.name))
      out.push(path.join(projectRoot, ent.name))
  }
}

function walkCssFiles(dir: string, depth: number, out: string[]): void {
  if (depth > MAX_CSS_WALK_DEPTH) return

  const entries = readDirEntries(dir)
  if (!entries) return

  for (const ent of entries) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue

    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walkCssFiles(full, depth + 1, out)
    }
    else if (/\.(css|pcss)$/i.test(ent.name)) {
      out.push(full)
    }
  }
}

function collectCssFiles(cwd: string): string[] {
  const out: string[] = []
  addRootCssFiles(cwd, out)

  const subRoots = [
    path.join(cwd, 'src'),
    path.join(cwd, 'app'),
    path.join(cwd, 'assets'),
    path.join(cwd, 'resources', 'css'),
  ]

  for (const root of subRoots) {
    walkCssFiles(root, 0, out)
  }

  return out
}

export function findViteConfigFile(cwd: string): string | null {
  for (const name of VITE_CONFIG_NAMES) {
    const full = path.join(cwd, name)
    if (fs.existsSync(full)) return full
  }
  return null
}

export function findTailwindCssEntryFiles(cwd: string): string[] {
  return collectCssFiles(cwd).filter((file) => {
    const text = fs.readFileSync(file, 'utf-8')
    return TAILWIND_IMPORT_RE.test(text)
  })
}

export function findTailwindConfigFile(cwd: string): string | null {
  for (const name of TAILWIND_CONFIG_NAMES) {
    const full = path.join(cwd, name)
    if (fs.existsSync(full)) return full
  }
  return null
}

export function detectTailwindFlavor(cwd: string): TailwindFlavor {
  const pkg = readPackageJson(cwd)
  if (!pkg) return 'unknown'

  const all = mergedDependencies(pkg)
  if (all['@tailwindcss/vite']) return 'v4'

  const twMajor = tailwindMajorFromRange(all['tailwindcss'])
  if (twMajor !== null && twMajor >= 4) return 'v4'
  if (tailwindConfigExists(cwd)) return 'v3'
  if (findTailwindCssEntryFiles(cwd).length > 0) return 'v4'

  return 'unknown'
}

export function findUnoConfigFile(cwd: string): string | null {
  for (const name of UNO_CONFIG_NAMES) {
    const full = path.join(cwd, name)
    if (fs.existsSync(full)) return full
  }
  return null
}

export function hasUnoDependency(cwd: string): boolean {
  const pkg = readPackageJson(cwd)
  if (!pkg) return false
  const all = mergedDependencies(pkg)
  return Boolean(
    all['unocss']
    || all['@unocss/vite']
    || all['@unocss/nuxt']
    || all['@unocss/webpack'],
  )
}

export function detectUnoPresent(cwd: string): boolean {
  return hasUnoDependency(cwd) || findUnoConfigFile(cwd) !== null
}

export function detectCssEngine(cwd: string): CssEngineDetection {
  const hasTw = detectTailwindFlavor(cwd) !== 'unknown'
  const hasUno = detectUnoPresent(cwd)
  if (hasTw && hasUno) return 'both'
  if (hasTw) return 'tailwind'
  if (hasUno) return 'unocss'
  return 'unknown'
}

/**
 * Resolve which engine init should configure.
 * Explicit `--engine` wins; otherwise prefer Tailwind when both are present.
 */
export function resolveInitEngine(
  cwd: string,
  explicit?: InitEngine,
): InitEngine {
  if (explicit) return explicit
  const detected = detectCssEngine(cwd)
  if (detected === 'unocss') return 'unocss'
  return 'tailwind'
}

export interface InitSetupResult {
  viteConfig?: string
  tailwind?: string
  unocss?: string
  vscodeSettings?: string
  agentFiles?: string[]
  messages: string[]
}

const SKILL_NAME = 'useclassy'
const SKILL_FILES = ['SKILL.md', 'examples.md'] as const

/** Canonical skill location — Cursor, Codex, and Copilot all read this. */
const AGENTS_SKILL_DIR = path.join('.agents', 'skills', SKILL_NAME)

/**
 * Claude Code only reads `.claude/skills` and does not see `.agents/skills`.
 * Opt-in via `--with-claude` so Cursor does not also load a duplicate copy
 * (Cursor discovers both `.agents/skills` and `.claude/skills`).
 */
const CLAUDE_SKILL_DIR = path.join('.claude', 'skills', SKILL_NAME)

/** Cursor-specific glob-scoped rules; other tools use AGENTS.md. */
const CURSOR_RULE_FILES = [
  {
    from: 'useclassy-setup.cursor-rule.mdc',
    to: path.join('.cursor', 'rules', 'useclassy-setup.mdc'),
  },
  {
    from: 'useclassy-authoring.cursor-rule.mdc',
    to: path.join('.cursor', 'rules', 'useclassy-authoring.mdc'),
  },
] as const

export type InstallAgentOptions = {
  templatesRoot?: string | null
  /** Overwrite skill/rule files that differ from the packaged templates. */
  force?: boolean
  /** Also copy the skill into `.claude/skills` for Claude Code. */
  withClaude?: boolean
}

function agentTemplateFiles(withClaude: boolean): { from: string, to: string }[] {
  const destinations = withClaude
    ? [AGENTS_SKILL_DIR, CLAUDE_SKILL_DIR]
    : [AGENTS_SKILL_DIR]

  const files: { from: string, to: string }[] = []

  for (const dest of destinations) {
    for (const name of SKILL_FILES) {
      files.push({
        from: path.join('useclassy-skill', name),
        to: path.join(dest, name),
      })
    }
  }

  return [...files, ...CURSOR_RULE_FILES]
}

const AGENTS_MD_START = '<!-- useclassy:start -->'
const AGENTS_MD_END = '<!-- useclassy:end -->'

const AGENTS_MD_SECTION = `${AGENTS_MD_START}
## UseClassy

This project uses \`vite-plugin-useclassy\`. Write Tailwind variants as modifier
attributes instead of inline variant prefixes:

- Vue, Svelte, Blade, HTML: \`class="rounded px-4" class:hover="bg-blue-500"\`
- React: \`className="rounded px-4" className:hover="bg-blue-500"\` (JSX expressions with string literals are also supported, e.g. \`className:hover={on ? 'a' : 'b'}\`)

Leave Vue \`:class\`, native Svelte \`class:name={cond}\` directives, and unrelated
dynamic base expressions unchanged.

Full authoring and refactoring guide: \`.agents/skills/${SKILL_NAME}/SKILL.md\`
${AGENTS_MD_END}`

/**
 * Resolve the packaged `templates/` directory (sibling of `dist/` or `src/`).
 */
export function resolveTemplatesRoot(
  fromUrl: string = import.meta.url,
): string | null {
  const here = path.dirname(fileURLToPath(fromUrl))
  const candidates = [
    path.join(here, '..', 'templates'),
    path.join(here, 'templates'),
    path.join(here, '..', '..', 'templates'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'useclassy-skill', 'SKILL.md')))
      return candidate
  }

  return null
}

/**
 * Upserts the UseClassy section in AGENTS.md for agents that only read
 * project instruction files. Replaces the fenced block when present so
 * template updates propagate; leaves content outside the markers alone.
 */
export function patchAgentsMdContent(content: string): string {
  const start = content.indexOf(AGENTS_MD_START)
  if (start !== -1) {
    const end = content.indexOf(AGENTS_MD_END, start)
    if (end === -1)
      return content

    const endInclusive = end + AGENTS_MD_END.length
    const existing = content.slice(start, endInclusive)
    if (existing === AGENTS_MD_SECTION)
      return content

    const before = content.slice(0, start).trimEnd()
    const after = content.slice(endInclusive).replace(/^\n*/, '')

    if (before.length === 0) {
      return after.length > 0
        ? `# AGENTS.md\n\n${AGENTS_MD_SECTION}\n${after}`
        : `# AGENTS.md\n\n${AGENTS_MD_SECTION}\n`
    }

    return after.length > 0
      ? `${before}\n\n${AGENTS_MD_SECTION}\n${after}`
      : `${before}\n\n${AGENTS_MD_SECTION}\n`
  }

  const trimmed = content.trimEnd()
  if (trimmed.length === 0)
    return `# AGENTS.md\n\n${AGENTS_MD_SECTION}\n`

  return `${trimmed}\n\n${AGENTS_MD_SECTION}\n`
}

export function patchAgentsMd(cwd: string, dryRun: boolean): FilePatchResult {
  const file = path.join(cwd, 'AGENTS.md')
  const original = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf-8')
    : ''

  const next = patchAgentsMdContent(original)
  if (next === original)
    return { path: file, changed: false }

  if (!dryRun)
    fs.writeFileSync(file, next, 'utf-8')

  return { path: file, changed: true }
}

function writeTemplateFile(
  source: string,
  dest: string,
  dryRun: boolean,
  force: boolean,
): FilePatchResult {
  if (!fs.existsSync(source)) {
    return {
      path: dest,
      changed: false,
      error: `Missing template: ${path.basename(source)}`,
    }
  }

  const content = fs.readFileSync(source, 'utf-8')
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf-8')
    if (existing === content)
      return { path: dest, changed: false }

    if (!force) {
      return {
        path: dest,
        changed: false,
        skipped: true,
      }
    }
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, content, 'utf-8')
  }

  return { path: dest, changed: true }
}

export function installAgentResources(
  cwd: string,
  dryRun: boolean,
  options: InstallAgentOptions = {},
): FilePatchResult[] {
  const {
    templatesRoot,
    force = false,
    withClaude = false,
  } = options

  const resolvedRoot = templatesRoot === undefined
    ? resolveTemplatesRoot()
    : templatesRoot
  const root
    = resolvedRoot
      && fs.existsSync(path.join(resolvedRoot, 'useclassy-skill', 'SKILL.md'))
      ? resolvedRoot
      : null

  const results: FilePatchResult[] = []

  if (!root) {
    results.push({
      path: '',
      changed: false,
      error:
        'Could not find package templates/. Reinstall vite-plugin-useclassy or copy templates manually from the README.',
    })
  }
  else {
    for (const file of agentTemplateFiles(withClaude)) {
      results.push(
        writeTemplateFile(
          path.join(root, file.from),
          path.join(cwd, file.to),
          dryRun,
          force,
        ),
      )
    }
  }

  // AGENTS.md section is inline and does not depend on packaged templates.
  results.push(patchAgentsMd(cwd, dryRun))

  return results
}

function pushAgentMessages(
  result: InitSetupResult,
  patches: FilePatchResult[],
  dryRun: boolean,
): void {
  const writeLabel = dryRun ? '[dry-run] Would write' : 'Wrote'
  const written: string[] = []

  for (const patch of patches) {
    if (patch.error) {
      result.messages.push(`Agent skills: ${patch.error}`)
      continue
    }

    if (patch.skipped) {
      result.messages.push(
        `Agent skills: skipped ${patch.path} (local edits; pass --force to overwrite)`,
      )
      continue
    }

    if (patch.changed) {
      written.push(patch.path)
      result.messages.push(`${writeLabel} ${patch.path}`)
      continue
    }

    if (patch.path)
      result.messages.push(`Agent skills: no changes (${patch.path})`)
  }

  if (written.length > 0)
    result.agentFiles = written
}

function ensureUseClassyImport(content: string): string {
  if (/from\s+["']vite-plugin-useclassy["']/.test(content))
    return content

  const importLine = 'import useClassy from \'vite-plugin-useclassy\'\n'
  const firstImport = content.search(/^(?:import|export)\s/m)
  if (firstImport === -1)
    return `${importLine}\n${content}`

  return content.slice(0, firstImport) + importLine + content.slice(firstImport)
}

function useClassyPluginBlock(
  language: InitLanguage,
  engine: InitEngine,
): string {
  if (engine === 'unocss') {
    return `useClassy({\n      language: '${language}',\n      engine: 'unocss',\n    }),`
  }
  return `useClassy({\n      language: '${language}',\n    }),`
}

function insertUseClassyPlugin(
  content: string,
  language: InitLanguage,
  engine: InitEngine = 'tailwind',
): string {
  if (/useClassy\s*\(/.test(content))
    return content

  const pluginBlock = useClassyPluginBlock(language, engine)

  const pluginsMatch = content.match(/plugins\s*:\s*\[/)
  if (!pluginsMatch || pluginsMatch.index === undefined) {
    throw new Error(
      'Could not find a `plugins: [` array in vite.config. Add useClassy manually.',
    )
  }

  const insertIndex = pluginsMatch.index + pluginsMatch[0].length
  return `${content.slice(0, insertIndex)}\n    ${pluginBlock}${content.slice(insertIndex)}`
}

export function patchViteConfigContent(
  content: string,
  language: InitLanguage,
  engine: InitEngine = 'tailwind',
): string {
  return insertUseClassyPlugin(ensureUseClassyImport(content), language, engine)
}

function applyTextFilePatch(
  file: string,
  transform: (original: string) => string,
  dryRun: boolean,
): FilePatchResult {
  const original = fs.readFileSync(file, 'utf-8')
  let next: string
  try {
    next = transform(original)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { path: file, changed: false, error: message }
  }

  if (next === original)
    return { path: file, changed: false }

  if (!dryRun)
    fs.writeFileSync(file, next, 'utf-8')

  return { path: file, changed: true }
}

export function patchViteConfig(
  cwd: string,
  language: InitLanguage,
  dryRun: boolean,
  engine: InitEngine = 'tailwind',
): FilePatchResult {
  const file = findViteConfigFile(cwd)
  if (!file) {
    return {
      path: '',
      changed: false,
      error: 'No vite.config.* found in project root.',
    }
  }

  return applyTextFilePatch(
    file,
    content => patchViteConfigContent(content, language, engine),
    dryRun,
  )
}

function manifestReferencedIn(text: string): boolean {
  return text.includes('output.classy.html')
}

export function patchTailwindV4Stylesheet(
  cssFile: string,
  cwd: string,
  dryRun: boolean,
): { path: string, changed: boolean } {
  const original = fs.readFileSync(cssFile, 'utf-8')
  if (manifestReferencedIn(original))
    return { path: cssFile, changed: false }

  const sourceLine = getUseClassyTailwindSourceDirective(cssFile, cwd)
  const lines = original.split(/\r?\n/)
  let insertIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (TAILWIND_IMPORT_RE.test(lines[i])) {
      insertIndex = i + 1
      break
    }
  }

  if (insertIndex === -1)
    return { path: cssFile, changed: false }

  const nextLines = [...lines]
  nextLines.splice(insertIndex, 0, sourceLine)
  const next = nextLines.join('\n')

  if (!dryRun)
    fs.writeFileSync(cssFile, next, 'utf-8')

  return { path: cssFile, changed: true }
}

export function patchTailwindV4(
  cwd: string,
  dryRun: boolean,
): FilePatchResult {
  const files = findTailwindCssEntryFiles(cwd)
  if (files.length === 0) {
    return {
      path: '',
      changed: false,
      error:
        'No CSS file with @import "tailwindcss" found. Add @source manually (see README).',
    }
  }

  return patchTailwindV4Stylesheet(files[0], cwd, dryRun)
}

export function patchTailwindV3ConfigContent(content: string): string {
  const entry = getUseClassyTailwindV3ContentEntry()
  if (content.includes('output.classy.html'))
    return content

  if (!/content:\s*\[/.test(content)) {
    throw new Error(
      'Could not find `content: [` in tailwind config. Add the manifest path manually.',
    )
  }

  return content.replace(
    /(content:\s*\[)/,
    `$1\n    "${entry}",`,
  )
}

export function patchTailwindV3(
  cwd: string,
  dryRun: boolean,
): FilePatchResult {
  const file = findTailwindConfigFile(cwd)
  if (!file) {
    return {
      path: '',
      changed: false,
      error: 'No tailwind.config.* found.',
    }
  }

  return applyTextFilePatch(file, patchTailwindV3ConfigContent, dryRun)
}

/**
 * Insert UseClassy manifest into UnoCSS `content.filesystem`.
 * Supports `defineConfig({…})` and plain `export default {…}` shapes.
 */
export function patchUnoConfigContent(content: string): string {
  const entry = getUseClassyUnoFilesystemEntry()
  if (content.includes('output.classy.html'))
    return content

  if (/filesystem\s*:\s*\[/.test(content)) {
    return content.replace(
      /(filesystem\s*:\s*\[)/,
      `$1\n      '${entry}',`,
    )
  }

  if (/content\s*:\s*\{/.test(content)) {
    return content.replace(
      /(content\s*:\s*\{)/,
      `$1\n    filesystem: ['${entry}'],`,
    )
  }

  const defineMatch = content.match(/defineConfig\s*\(\s*\{/)
  if (defineMatch && defineMatch.index !== undefined) {
    const insertAt = defineMatch.index + defineMatch[0].length
    return (
      `${content.slice(0, insertAt)}`
      + `\n  content: {\n    filesystem: ['${entry}'],\n  },`
      + content.slice(insertAt)
    )
  }

  const exportMatch = content.match(/export\s+default\s+\{/)
  if (exportMatch && exportMatch.index !== undefined) {
    const insertAt = exportMatch.index + exportMatch[0].length
    return (
      `${content.slice(0, insertAt)}`
      + `\n  content: {\n    filesystem: ['${entry}'],\n  },`
      + content.slice(insertAt)
    )
  }

  throw new Error(
    'Could not find a config object in uno.config. Add content.filesystem manually (see README).',
  )
}

export function patchUnoConfig(
  cwd: string,
  dryRun: boolean,
): FilePatchResult {
  const file = findUnoConfigFile(cwd)
  if (!file) {
    return {
      path: '',
      changed: false,
      error:
        'No uno.config.* / unocss.config.* found. Add content.filesystem manually (see README).',
    }
  }

  return applyTextFilePatch(file, patchUnoConfigContent, dryRun)
}

const VSCODE_CLASS_PATTERNS_VUE = ['class:[\\w:-]*']
const VSCODE_CLASS_PATTERNS_REACT = ['class:[\\w:-]*', 'className:[\\w:-]*']

export function mergeTailwindClassAttributes(
  existing: unknown,
  language: InitLanguage,
): string[] {
  const patterns = language === 'react'
    ? VSCODE_CLASS_PATTERNS_REACT
    : VSCODE_CLASS_PATTERNS_VUE

  const prior = Array.isArray(existing) ? existing.map(String) : []
  const merged = new Set<string>(['class', ...prior, ...patterns])

  if (language === 'react')
    merged.add('className')

  return [...merged]
}

export function patchVsCodeSettings(
  cwd: string,
  language: InitLanguage,
  dryRun: boolean,
): FilePatchResult {
  const dir = path.join(cwd, '.vscode')
  const file = path.join(dir, 'settings.json')
  let settings: Record<string, unknown> = {}

  if (fs.existsSync(file)) {
    try {
      settings = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<
        string,
        unknown
      >
    }
    catch {
      return {
        path: file,
        changed: false,
        error:
          'Could not parse .vscode/settings.json; fix JSON or merge Tailwind settings manually.',
      }
    }
  }

  const prev = settings['tailwindCSS.classAttributes']
  const nextArr = mergeTailwindClassAttributes(prev, language)
  const alreadyApplied
    = JSON.stringify(prev ?? []) === JSON.stringify(nextArr) && fs.existsSync(file)

  if (alreadyApplied)
    return { path: file, changed: false }

  settings['tailwindCSS.classAttributes'] = nextArr

  if (!dryRun) {
    if (!fs.existsSync(dir))
      fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8')
  }

  return { path: file, changed: true }
}

function pushViteMessages(
  result: InitSetupResult,
  vite: FilePatchResult,
  dryRun: boolean,
): void {
  if (vite.error) {
    result.messages.push(`Vite: ${vite.error}`)
    return
  }

  const patchLabel = dryRun ? '[dry-run] Would patch' : 'Patched'

  if (vite.changed) {
    result.viteConfig = vite.path
    result.messages.push(`${patchLabel} ${vite.path}`)
    return
  }

  result.messages.push(`Vite: no changes (${vite.path || 'no config'})`)
}

function pushTailwindMessages(
  result: InitSetupResult,
  flavor: 'v4' | 'v3',
  tw: FilePatchResult | { path: string, changed: boolean },
  dryRun: boolean,
): void {
  const label = flavor === 'v4' ? 'Tailwind v4' : 'Tailwind v3'
  const patchLabel = dryRun ? '[dry-run] Would patch' : 'Patched'
  const suffix = flavor === 'v4' ? ' (@source)' : ' (content)'

  if ('error' in tw && tw.error) {
    result.messages.push(`${label}: ${tw.error}`)
    return
  }

  if (tw.changed) {
    result.tailwind = tw.path
    result.messages.push(`${patchLabel} ${tw.path}${suffix}`)
    return
  }

  result.messages.push(`${label}: no changes (${tw.path || 'n/a'})`)
}

function pushUnoMessages(
  result: InitSetupResult,
  uno: FilePatchResult,
  dryRun: boolean,
): void {
  const patchLabel = dryRun ? '[dry-run] Would patch' : 'Patched'

  if (uno.error) {
    result.messages.push(`UnoCSS: ${uno.error}`)
    return
  }

  if (uno.changed) {
    result.unocss = uno.path
    result.messages.push(`${patchLabel} ${uno.path} (content.filesystem)`)
    return
  }

  result.messages.push(`UnoCSS: no changes (${uno.path || 'n/a'})`)
}

function pushVsCodeMessages(
  result: InitSetupResult,
  vs: FilePatchResult,
  dryRun: boolean,
): void {
  if (vs.error) {
    result.messages.push(`VS Code: ${vs.error}`)
    return
  }

  const writeLabel = dryRun ? '[dry-run] Would write' : 'Wrote'

  if (vs.changed) {
    result.vscodeSettings = vs.path
    result.messages.push(`${writeLabel} ${vs.path}`)
    return
  }

  result.messages.push(`VS Code: no changes (${vs.path})`)
}

export function runInitSetup(options: {
  cwd: string
  language: InitLanguage
  dryRun: boolean
  engine?: InitEngine
  withSkills?: boolean
  withClaude?: boolean
  force?: boolean
}): InitSetupResult {
  const {
    cwd,
    language,
    dryRun,
    withSkills = false,
    withClaude = false,
    force = false,
  } = options
  const result: InitSetupResult = { messages: [] }

  const detected = detectCssEngine(cwd)
  const engine = resolveInitEngine(cwd, options.engine)
  result.messages.push(`Detected CSS stack: ${detected}`)
  result.messages.push(`Using engine: ${engine}`)

  if (detected === 'both' && !options.engine) {
    result.messages.push(
      'Both Tailwind and UnoCSS detected; defaulting to Tailwind. Pass --engine unocss to configure Uno instead.',
    )
  }

  pushViteMessages(
    result,
    patchViteConfig(cwd, language, dryRun, engine),
    dryRun,
  )

  if (engine === 'unocss') {
    pushUnoMessages(result, patchUnoConfig(cwd, dryRun), dryRun)
  }
  else {
    const flavor = detectTailwindFlavor(cwd)
    if (flavor === 'v4') {
      pushTailwindMessages(result, 'v4', patchTailwindV4(cwd, dryRun), dryRun)
    }
    else if (flavor === 'v3') {
      pushTailwindMessages(result, 'v3', patchTailwindV3(cwd, dryRun), dryRun)
    }
    else {
      result.messages.push(
        'Tailwind: could not detect v3 vs v4. Add the manifest to Tailwind manually (see README).',
      )
    }

    // Tailwind IntelliSense patterns still help for class:hover attrs.
    pushVsCodeMessages(result, patchVsCodeSettings(cwd, language, dryRun), dryRun)
  }

  if (withSkills) {
    pushAgentMessages(
      result,
      installAgentResources(cwd, dryRun, { force, withClaude }),
      dryRun,
    )
  }

  return result
}
