import fs from 'fs'
import path from 'path'

import { getUseClassyUnoFilesystemEntry } from '../unocss'
import { applyTextFilePatch, mergedDependencies, readPackageJson, referencesUseClassyManifest } from './fs'
import type { FilePatchResult } from './types'

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

/**
 * Insert UseClassy manifest into UnoCSS `content.filesystem`.
 * Supports `defineConfig({…})` and plain `export default {…}` shapes.
 */
export function patchUnoConfigContent(content: string): string {
  const entry = getUseClassyUnoFilesystemEntry()
  if (referencesUseClassyManifest(content))
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

export function pushUnoMessages(
  result: { unocss?: string, messages: string[] },
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
