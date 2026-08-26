import fs from 'fs'
import path from 'path'

import type { FilePatchResult, InitSetupResult } from './types'

export const USECLASSY_TS_PLUGIN_NAME = 'useclassy-typescript-plugin'

const TSCONFIG_SOLUTION = 'tsconfig.json'
const TSCONFIG_APP = 'tsconfig.app.json'

const TSCONFIG_CANDIDATES = [TSCONFIG_APP, TSCONFIG_SOLUTION] as const

function normalizeConfigPath(configPath: string): string {
  return configPath.replace(/\\/g, '/')
}

export function patchTsConfigSolutionContent(content: string): string | null {
  const parsed = JSON.parse(content) as {
    files?: unknown[]
    references?: Array<{ path?: string }>
    extends?: string
  }

  if (parsed.extends)
    return null

  if (!Array.isArray(parsed.files) || parsed.files.length !== 0)
    return null

  const references = parsed.references ?? []
  const appRefIndex = references.findIndex(reference =>
    normalizeConfigPath(reference.path ?? '').endsWith(TSCONFIG_APP),
  )
  if (appRefIndex < 0)
    return null

  const nextReferences = references.filter((_, index) => index !== appRefIndex)
  const next: Record<string, unknown> = {
    extends: `./${TSCONFIG_APP}`,
  }
  if (nextReferences.length > 0)
    next.references = nextReferences

  return `${JSON.stringify(next, null, 2)}\n`
}

export function patchTsConfigSolution(
  cwd: string,
  dryRun: boolean,
): FilePatchResult {
  const file = path.join(cwd, TSCONFIG_SOLUTION)
  if (!fs.existsSync(file))
    return { path: file, changed: false }

  const content = fs.readFileSync(file, 'utf-8')
  let next: string | null
  try {
    next = patchTsConfigSolutionContent(content)
  }
  catch {
    return {
      path: file,
      changed: false,
      error: `Could not parse ${file}; fix JSON or extend tsconfig.app.json manually.`,
    }
  }

  if (!next || next === content)
    return { path: file, changed: false }

  if (!dryRun)
    fs.writeFileSync(file, next, 'utf-8')

  return { path: file, changed: true }
}

export function findTsConfigFile(cwd: string): string | null {
  for (const name of TSCONFIG_CANDIDATES) {
    const file = path.join(cwd, name)
    if (fs.existsSync(file))
      return file
  }
  return null
}

export function patchTsConfigContent(content: string): string {
  const parsed = JSON.parse(content) as {
    compilerOptions?: { plugins?: Array<{ name?: string }> }
  }

  const plugins = parsed.compilerOptions?.plugins ?? []
  if (plugins.some(plugin => plugin?.name === USECLASSY_TS_PLUGIN_NAME))
    return content

  parsed.compilerOptions = parsed.compilerOptions ?? {}
  parsed.compilerOptions.plugins = [
    ...plugins,
    { name: USECLASSY_TS_PLUGIN_NAME },
  ]

  return `${JSON.stringify(parsed, null, 2)}\n`
}

export function patchTsConfig(cwd: string, dryRun: boolean): FilePatchResult {
  const pluginPatch = patchTsConfigPlugins(cwd, dryRun)
  const solutionPatch = patchTsConfigSolution(cwd, dryRun)

  if (pluginPatch.error)
    return pluginPatch
  if (solutionPatch.error)
    return solutionPatch

  if (pluginPatch.changed || solutionPatch.changed) {
    return {
      path: pluginPatch.path,
      changed: true,
    }
  }

  return pluginPatch
}

function patchTsConfigPlugins(cwd: string, dryRun: boolean): FilePatchResult {
  const file = findTsConfigFile(cwd)
  if (!file) {
    return {
      path: path.join(cwd, 'tsconfig.json'),
      changed: false,
      error:
        'Could not find tsconfig.app.json or tsconfig.json. Add the UseClassy TypeScript plugin manually.',
    }
  }

  const content = fs.readFileSync(file, 'utf-8')
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  }
  catch {
    return {
      path: file,
      changed: false,
      error: `Could not parse ${file}; fix JSON or add the plugin manually.`,
    }
  }

  void parsed
  const next = patchTsConfigContent(content)
  if (next === content)
    return { path: file, changed: false }

  if (!dryRun)
    fs.writeFileSync(file, next, 'utf-8')

  return { path: file, changed: true }
}

export function pushTsConfigMessages(
  result: InitSetupResult,
  patch: FilePatchResult,
  dryRun: boolean,
): void {
  if (patch.error) {
    result.messages.push(`TypeScript: ${patch.error}`)
    return
  }

  const writeLabel = dryRun ? '[dry-run] Would write' : 'Wrote'

  if (patch.changed) {
    result.tsConfig = patch.path
    result.messages.push(`${writeLabel} ${patch.path} (UseClassy TS plugin)`)
    return
  }

  result.messages.push(`TypeScript: no changes (${patch.path})`)
}
