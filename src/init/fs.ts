import fs from 'fs'
import path from 'path'

import type { FilePatchResult } from './types'

export function readPackageJson(cwd: string): Record<string, unknown> | null {
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

export function mergedDependencies(
  pkg: Record<string, unknown>,
): Record<string, string> {
  const prod = pkg.dependencies as Record<string, string> | undefined
  const dev = pkg.devDependencies as Record<string, string> | undefined
  return { ...prod, ...dev }
}

export function applyTextFilePatch(
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

export function readDirEntries(dir: string): fs.Dirent[] | null {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
  }
  catch {
    return null
  }
}
