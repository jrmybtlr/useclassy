import fs from 'fs'
import path from 'path'
import {
  extractClasses,
  CLASS_REGEX,
  CLASS_MODIFIER_REGEX,
} from './core'
import {
  shouldProcessFile,
  writeOutputFileDebounced,
  writeOutputFileDirect,
} from './utils'
import type { ViteServer } from './types'

export function findBladeFiles(dir: string, files: string[] = []): string[] {
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // Skip ignored directories
      if (['node_modules', 'vendor', '.git', 'dist', 'build'].includes(item)) {
        continue
      }
      findBladeFiles(fullPath, files)
    }
    else if (item.endsWith('.blade.php')) {
      files.push(fullPath)
    }
  }

  return files
}

export function scanBladeFiles(
  ignoredDirectories: string[],
  allClassesSet: Set<string>,
  fileClassMap: Map<string, Set<string>>,
  regenerateAllClasses: () => boolean,
  processCode: (code: string, currentGlobalClasses: Set<string>) => {
    transformedCode: string
    classesChanged: boolean
    fileSpecificClasses: Set<string>
  },
  outputDir: string,
  outputFileName: string,
  debug: boolean,
) {
  if (debug) console.log('🎩 Scanning Blade files...')

  try {
    const bladeFiles = findBladeFiles(process.cwd())

    if (debug) console.log(`🎩 Found ${bladeFiles.length} Blade files`)

    for (const file of bladeFiles) {
      if (!shouldProcessFile(file, ignoredDirectories)) {
        continue
      }

      try {
        const content = fs.readFileSync(file, 'utf-8')
        const result = processCode(content, allClassesSet)

        // Only store modifier-derived classes (from class:modifier attributes)
        if (result.classesChanged) {
          // Store only the modifier-derived classes for this file
          const modifierClasses = new Set<string>()

          // Extract just the modifier classes from the processed result
          extractClasses(
            content,
            new Set(), // We don't need generatedClassesSet here
            modifierClasses, // This will contain only class:modifier derived classes
            CLASS_REGEX,
            CLASS_MODIFIER_REGEX,
          )

          fileClassMap.set(file, modifierClasses)
          regenerateAllClasses()

          // Don't write back to original files during scanning - only extract classes
          // This prevents interference with hot reloading and file watchers

          if (debug) {
            console.log(`🎩 Processed ${path.relative(process.cwd(), file)}: found ${modifierClasses.size} UseClassy modifier classes`)
          }
        }
      }
      catch (error) {
        if (debug) console.error(`🎩 Error reading ${file}:`, error)
      }
    }

    if (allClassesSet.size > 0) {
      if (debug) console.log(`🎩 Total classes found: ${allClassesSet.size}`)
      writeOutputFileDirect(allClassesSet, outputDir, outputFileName)
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
  fileClassMap: Map<string, Set<string>>,
  regenerateAllClasses: () => boolean,
  processCode: (code: string, currentGlobalClasses: Set<string>) => {
    transformedCode: string
    classesChanged: boolean
    fileSpecificClasses: Set<string>
  },
  outputDir: string,
  outputFileName: string,
  isReact: boolean,
  debug: boolean,
) {
  if (debug) console.log('🎩 Setting up Blade file watching...')

  const bladeFiles = findBladeFiles(process.cwd())

  bladeFiles.forEach((file) => {
    if (shouldProcessFile(file, ignoredDirectories)) {
      server.watcher.add(file)

      if (debug) console.log(`🎩 Watching: ${path.relative(process.cwd(), file)}`)
    }
  })

  server.watcher.on('change', (filePath) => {
    if (filePath.endsWith('.blade.php')) {
      if (debug) console.log(`🎩 Blade file changed: ${path.relative(process.cwd(), filePath)}`)

      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const result = processCode(content, allClassesSet)

        if (result.classesChanged) {
          const modifierClasses = new Set<string>()

          extractClasses(
            content,
            new Set(),
            modifierClasses,
            CLASS_REGEX,
            CLASS_MODIFIER_REGEX,
          )

          fileClassMap.set(filePath, modifierClasses)
          const globalChanged = regenerateAllClasses()

          // Update output file when blade classes change
          if (result.classesChanged || globalChanged) {
            if (debug) console.log('🎩 Blade file classes changed, updating output file.')
            writeOutputFileDebounced(allClassesSet, outputDir, outputFileName, isReact)
          }
        }
      }
      catch (error) {
        if (debug) console.error(`🎩 Error processing changed Blade file:`, error)
      }
    }
  })
}