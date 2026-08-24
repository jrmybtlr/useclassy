import fs from 'fs'
import path from 'path'

import { applyTextFilePatch } from './fs'
import type { FilePatchResult, InitEngine, InitLanguage } from './types'

const VITE_CONFIG_NAMES = [
  'vite.config.ts',
  'vite.config.mts',
  'vite.config.cts',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.cjs',
] as const

export function findViteConfigFile(cwd: string): string | null {
  for (const name of VITE_CONFIG_NAMES) {
    const full = path.join(cwd, name)
    if (fs.existsSync(full)) return full
  }
  return null
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

export function pushViteMessages(
  result: { viteConfig?: string, messages: string[] },
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
