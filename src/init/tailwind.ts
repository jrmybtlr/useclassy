import fs from 'fs'
import path from 'path'

import { getUseClassyTailwindSourceDirective, getUseClassyTailwindV3ContentEntry } from '../tailwind'
import { applyTextFilePatch, mergedDependencies, readDirEntries, readPackageJson, referencesUseClassyManifest } from './fs'
import type { FilePatchResult, TailwindFlavor } from './types'

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

function tailwindMajorFromRange(range: string | undefined): number | null {
  if (!range) return null
  const match = range.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function tailwindConfigExists(cwd: string): boolean {
  return TAILWIND_CONFIG_NAMES.some(name =>
    fs.existsSync(path.join(cwd, name)))
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

export function patchTailwindV4Stylesheet(
  cssFile: string,
  cwd: string,
  dryRun: boolean,
): { path: string, changed: boolean } {
  const original = fs.readFileSync(cssFile, 'utf-8')
  if (referencesUseClassyManifest(original))
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
  if (referencesUseClassyManifest(content))
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

export function pushTailwindMessages(
  result: { tailwind?: string, messages: string[] },
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
