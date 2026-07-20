import fs from 'fs'
import path from 'path'

import {
  getUseClassyTailwindSourceDirective,
  getUseClassyTailwindV3ContentEntry,
} from './tailwind'

export type TailwindFlavor = 'v4' | 'v3' | 'unknown'

export const INIT_LANGUAGES = ['vue', 'react', 'blade', 'svelte'] as const
export type InitLanguage = typeof INIT_LANGUAGES[number]

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

const TAILWIND_IMPORT_RE = /@import\s+["']tailwindcss["']\s*;/

const MAX_CSS_WALK_DEPTH = 6

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', '.git'])

export type FilePatchResult = {
  path: string
  changed: boolean
  error?: string
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

export interface InitSetupResult {
  viteConfig?: string
  tailwind?: string
  vscodeSettings?: string
  messages: string[]
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

function insertUseClassyPlugin(content: string, language: InitLanguage): string {
  if (/useClassy\s*\(/.test(content))
    return content

  const pluginBlock
    = `useClassy({\n      language: '${language}',\n    }),`

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
): string {
  return insertUseClassyPlugin(ensureUseClassyImport(content), language)
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
    content => patchViteConfigContent(content, language),
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
}): InitSetupResult {
  const { cwd, language, dryRun } = options
  const result: InitSetupResult = { messages: [] }

  const flavor = detectTailwindFlavor(cwd)
  result.messages.push(`Detected Tailwind: ${flavor}`)

  pushViteMessages(result, patchViteConfig(cwd, language, dryRun), dryRun)

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

  pushVsCodeMessages(result, patchVsCodeSettings(cwd, language, dryRun), dryRun)

  return result
}
