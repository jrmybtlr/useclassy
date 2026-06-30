/**
 * Blade templates are outside Vite's module graph; we discover and watch them explicitly.
 */

import fs from 'fs'
import path from 'path'
import {
  shouldProcessFile,
  writeOutputFileDebounced,
  writeOutputFileDirect,
  BASE_SKIP_DIRS,
  type FsWithGlob,
} from './utils'
import type { ApplyFileClassesFn, ProcessCodeFn, ViteServer } from './types'

const BLADE_SKIP_DIR = new Set([...BASE_SKIP_DIRS, 'vendor'])
const BLADE_GLOB_EXCLUDE = [...BLADE_SKIP_DIR].map(d => `**/${d}/**`)

const fsWithGlob = fs as FsWithGlob

export function isLaravelProject(): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), 'artisan'))
      && fs.existsSync(path.join(process.cwd(), 'app'))
  }
  catch {
    return false
  }
}

export function setupLaravelServiceProvider(debug = false): boolean {
  if (!isLaravelProject()) {
    if (debug) console.log('ℹ️  Not a Laravel project - skipping Laravel setup')
    return false
  }

  if (debug) {
    console.log('🎩 Laravel project detected!')
    console.log('📋 To enable UseClassy blade transformations:')
    console.log('')
    console.log('   composer require useclassy/laravel')
    console.log('')
    console.log('💡 The Vite plugin will handle class extraction for Tailwind JIT')
    console.log('   The Composer package will handle blade template transformations')
  }

  return true
}

export function findBladeFiles(dir: string, acc: string[] = []): string[] {
  if (typeof fsWithGlob.globSync === 'function') {
    const relative = fsWithGlob.globSync('**/*.blade.php', {
      cwd: dir,
      exclude: BLADE_GLOB_EXCLUDE,
    })
    return relative.map(p => path.join(dir, p))
  }

  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      if (BLADE_SKIP_DIR.has(item))
        continue
      findBladeFiles(fullPath, acc)
    }
    else if (item.endsWith('.blade.php')) {
      acc.push(fullPath)
    }
  }

  return acc
}

function countModifierTokens(classes: Set<string>): number {
  let n = 0
  for (const c of classes) {
    if (c.includes(':'))
      n++
  }
  return n
}

export function scanBladeFiles(
  ignoredDirectories: string[],
  allClassesSet: Set<string>,
  applyFileClasses: ApplyFileClassesFn,
  processCode: ProcessCodeFn,
  outputDir: string,
  outputFileName: string,
  debug: boolean,
  projectRoot = process.cwd(),
  writeDirect: typeof writeOutputFileDirect = writeOutputFileDirect,
): void {
  if (debug) console.log('🎩 Scanning Blade files...')

  try {
    const bladeFiles = findBladeFiles(projectRoot)
    const outputNorm = path.normalize(outputDir)

    if (debug) console.log(`🎩 Found ${bladeFiles.length} Blade files`)

    for (const file of bladeFiles) {
      if (!shouldProcessFile(file, ignoredDirectories, outputNorm))
        continue

      try {
        const content = fs.readFileSync(file, 'utf-8')
        const result = processCode(content)
        applyFileClasses(file, result.fileSpecificClasses)

        if (debug) {
          const n = countModifierTokens(result.fileSpecificClasses)
          console.log(`🎩 Processed ${path.relative(projectRoot, file)}: ${n} modifier class(es)`)
        }
      }
      catch (error) {
        if (debug) console.error(`🎩 Error reading ${file}:`, error)
      }
    }

    if (allClassesSet.size > 0) {
      if (debug) console.log(`🎩 Total classes found: ${allClassesSet.size}`)
      writeDirect(allClassesSet, outputDir, outputFileName)
    }
  }
  catch (error) {
    if (debug) console.error('🎩 Error scanning Blade files:', error)
  }
}

export function setupBladeFileWatching(
  server: ViteServer,
  ignoredDirectories: string[],
  allClassesSet: Set<string>,
  applyFileClasses: ApplyFileClassesFn,
  processCode: ProcessCodeFn,
  outputDir: string,
  outputFileName: string,
  debug: boolean,
  projectRoot = process.cwd(),
  writeDebounced: typeof writeOutputFileDebounced = writeOutputFileDebounced,
): void {
  if (debug) console.log('🎩 Setting up Blade file watching...')

  const outputNorm = path.normalize(outputDir)

  for (const file of findBladeFiles(projectRoot)) {
    if (!shouldProcessFile(file, ignoredDirectories, outputNorm))
      continue
    server.watcher.add(file)
    if (debug) console.log(`🎩 Watching: ${path.relative(projectRoot, file)}`)
  }

  server.watcher.on('change', (filePath) => {
    if (!filePath.endsWith('.blade.php'))
      return

    if (debug) console.log(`🎩 Blade file changed: ${path.relative(projectRoot, filePath)}`)

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const result = processCode(content)
      if (applyFileClasses(filePath, result.fileSpecificClasses)) {
        if (debug) console.log('🎩 Blade file classes changed, updating output file.')
        writeDebounced(allClassesSet, outputDir, outputFileName)
      }
    }
    catch (error) {
      if (debug) console.error(`🎩 Error processing changed Blade file:`, error)
    }
  })
}
