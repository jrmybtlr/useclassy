import fs from 'fs'
import path from 'path'

import type { FilePatchResult, InitLanguage, InitSetupResult } from './types'

const VSCODE_CLASS_PATTERNS_VUE = ['class:[\\w:/@-]*']
const VSCODE_CLASS_PATTERNS_REACT = ['class:[\\w:/@-]*', 'className:[\\w:/@-]*']

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
