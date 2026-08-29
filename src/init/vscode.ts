import fs from 'fs'
import path from 'path'

import type { FilePatchResult, InitLanguage, InitSetupResult } from './types'

const VSCODE_CLASS_PATTERNS_VUE = ['class:[\\w:/@\\[\\]\\-=&*>.]*']
const VSCODE_CLASS_PATTERNS_REACT = [
  'class:[\\w:/@\\[\\]\\-=&*>.]*',
  'className:[\\w:/@\\[\\]\\-=&*>.]*',
]

/** VS Code / Cursor extension id for UseClassy TextMate injection (React modifiers). */
export const USECLASSY_VSCODE_EXTENSION_ID = 'useclassy.useclassy'

export function mergePluginPaths(existing: unknown, additions: string[]): string[] {
  const prior = Array.isArray(existing) ? existing.map(String) : []
  return [...new Set([...prior, ...additions])]
}

export function mergeTailwindClassAttributes(existing: unknown, language: InitLanguage): string[] {
  const patterns = language === 'react' ? VSCODE_CLASS_PATTERNS_REACT : VSCODE_CLASS_PATTERNS_VUE

  const prior = Array.isArray(existing) ? existing.map(String) : []
  const merged = new Set<string>(['class', ...prior, ...patterns])

  if (language === 'react') merged.add('className')

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
      settings = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>
    } catch {
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

  if (language === 'react') {
    settings['js/ts.tsdk.path'] = 'node_modules/typescript/lib'
    settings['js/ts.tsdk.promptToUseWorkspaceVersion'] = true
    settings['js/ts.experimental.useTsgo'] = false
    // Syntax-only tsserver does not load language-service plugins.
    settings['js/ts.tsserver.useSyntaxServer'] = 'never'
    settings['js/ts.tsserver.pluginPaths'] = mergePluginPaths(
      settings['js/ts.tsserver.pluginPaths'] ?? settings['typescript.tsserver.pluginPaths'],
      ['./node_modules'],
    )
    // Drop deprecated typescript.* aliases Cursor still warns about.
    delete settings['typescript.tsdk']
    delete settings['typescript.enablePromptUseWorkspaceTsdk']
    delete settings['typescript.experimental.useTsgo']
    delete settings['typescript.tsserver.useSyntaxServer']
    delete settings['typescript.tsserver.pluginPaths']
  }

  const reactTsSettingsApplied =
    language === 'react' &&
    settings['js/ts.tsdk.path'] === 'node_modules/typescript/lib' &&
    settings['js/ts.tsdk.promptToUseWorkspaceVersion'] === true &&
    settings['js/ts.experimental.useTsgo'] === false &&
    settings['js/ts.tsserver.useSyntaxServer'] === 'never' &&
    settings['typescript.tsdk'] === undefined &&
    settings['typescript.tsserver.useSyntaxServer'] === undefined &&
    settings['typescript.tsserver.pluginPaths'] === undefined

  const alreadyApplied =
    JSON.stringify(prev ?? []) === JSON.stringify(nextArr) &&
    fs.existsSync(file) &&
    (language !== 'react' || reactTsSettingsApplied)

  if (alreadyApplied) return { path: file, changed: false }

  settings['tailwindCSS.classAttributes'] = nextArr

  if (!dryRun) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8')
  }

  return { path: file, changed: true }
}

export function pushVsCodeMessages(
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

export function mergeExtensionRecommendations(existing: unknown, additions: string[]): string[] {
  const prior = Array.isArray(existing) ? existing.map(String) : []
  return [...new Set([...prior, ...additions])]
}

/**
 * Marketplace extension is not published yet — do not write recommendations.
 * Keep helpers (`USECLASSY_VSCODE_EXTENSION_ID`, `mergeExtensionRecommendations`)
 * for when `useclassy.useclassy` ships. Consumers sideload from the repo
 * (`code --install-extension ./vscode-useclassy`).
 */
export function patchVsCodeExtensions(
  cwd: string,
  _language: InitLanguage,
  _dryRun: boolean,
): FilePatchResult {
  return {
    path: path.join(cwd, '.vscode', 'extensions.json'),
    changed: false,
  }
}

export function pushVsCodeExtensionsMessages(
  result: InitSetupResult,
  patch: FilePatchResult,
  _dryRun: boolean,
): void {
  if (patch.error) {
    result.messages.push(`VS Code extensions: ${patch.error}`)
    return
  }

  result.messages.push(
    'VS Code: UseClassy syntax highlighting is not on the Marketplace yet. From the UseClassy repo: code --install-extension ./vscode-useclassy (see vscode-useclassy/README.md).',
  )
}
