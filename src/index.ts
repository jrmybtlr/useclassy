import type { PluginOption } from 'vite'
import path from 'path'

import {
  CLASS_REGEX,
  CLASS_MODIFIER_REGEX,
  REACT_CLASS_REGEX,
  REACT_CLASS_MODIFIER_REGEX,
  generateCacheKey,
  extractClasses,
  transformClassModifiers,
  mergeClassAttributes,
} from './core'

import {
  loadIgnoredDirectories,
  shouldProcessFile,
  writeOutputFileDebounced,
  writeOutputFileDirect,
  writeGitignore,
} from './utils'

import {
  scanBladeFiles,
  setupBladeFileWatching,
  setupLaravelServiceProvider,
} from './blade'

import type { ClassyOptions, ProcessCodeResult, ViteServer } from './types'

/**
 * UseClassy Vite plugin
 * Transforms class:modifier attributes into Tailwind JIT-compatible class names.
 * @param options - Configuration options for the plugin
 * @param options.language - The framework language to use (e.g., "vue" or "react")
 * @param options.outputDir - The directory to output the generated class file
 * @param options.outputFileName - The filename for the generated class file
 * @param options.includePatterns - Array of glob patterns for files to include in processing
 * @param options.debug - Enable debug logging
 * @example
 * // vite.config.js
 * import useClassy from 'vite-plugin-useclassy';
 *
 * export default {
 *   plugins: [
 *     useClassy({
 *       language: 'react',
 *       outputDir: '.classy',
 *       outputFileName: 'output.classy.html',
 *       includePatterns: [],
 *       debug: true
 *     })
 *   ]
 * }
 *
 */

export default function useClassy(options: ClassyOptions = {}): PluginOption {
  let ignoredDirectories: string[] = []
  let allClassesSet: Set<string> = new Set()
  let isBuild = false
  let initialScanComplete = false
  let lastWrittenClassCount = -1

  const transformCache: Map<string, string> = new Map()
  const fileClassMap: Map<string, Set<string>> = new Map()
  const classRefCounts: Map<string, number> = new Map()

  /** Ref-counted merge of per-file classes into the global set; returns whether membership changed. */
  function applyFileClasses(id: string, newClasses: Set<string>): boolean {
    const oldClasses = fileClassMap.get(id) ?? new Set<string>()
    let changed = false

    for (const c of oldClasses) {
      if (!newClasses.has(c)) {
        const prev = classRefCounts.get(c) ?? 0
        const next = prev - 1
        if (next <= 0) {
          classRefCounts.delete(c)
          allClassesSet.delete(c)
          changed = true
        }
        else {
          classRefCounts.set(c, next)
        }
      }
    }

    for (const c of newClasses) {
      if (!oldClasses.has(c)) {
        const prev = classRefCounts.get(c) ?? 0
        const next = prev + 1
        classRefCounts.set(c, next)
        if (prev === 0) {
          allClassesSet.add(c)
          changed = true
        }
      }
    }

    fileClassMap.set(id, new Set(newClasses))
    return changed
  }

  const outputDir = options.outputDir || '.classy'
  const outputDirForFilter = path.normalize(outputDir)
  const outputFileName = options.outputFileName || 'output.classy.html'
  const isReact = options.language === 'react'
  const isBlade = options.language === 'blade'
  const debug = options.debug || false

  const classRegex = isReact ? REACT_CLASS_REGEX : CLASS_REGEX
  const classModifierRegex = isReact
    ? REACT_CLASS_MODIFIER_REGEX
    : CLASS_MODIFIER_REGEX
  const classAttrName = isReact ? 'className' : 'class'

  const generatedClassesSet: Set<string> = new Set()
  const modifierDerivedClassesSet: Set<string> = new Set()

  writeGitignore(outputDir)

  function runBladeScan(): void {
    scanBladeFiles(
      ignoredDirectories,
      allClassesSet,
      applyFileClasses,
      processCode,
      outputDir,
      outputFileName,
      debug,
    )
  }

  return {
    name: 'useClassy',
    enforce: 'pre',

    configResolved(config) {
      isBuild = config.command === 'build'
      ignoredDirectories = loadIgnoredDirectories()

      if (isBlade && !isBuild) {
        setupLaravelServiceProvider(debug)
      }

      if (debug) {
        console.log(`🎩 Running in ${isBuild ? 'build' : 'dev'} mode.`)
      }
    },

    configureServer(server: ViteServer) {
      if (isBuild) return

      if (debug) console.log('🎩 Configuring dev server...')

      setupOutputEndpoint(server)

      if (isBlade) {
        runBladeScan()
        setupBladeFileWatching(
          server,
          ignoredDirectories,
          allClassesSet,
          applyFileClasses,
          processCode,
          outputDir,
          outputFileName,
          debug,
        )
      }

      server.httpServer?.once('listening', () => {
        if (
          initialScanComplete
          && allClassesSet.size > 0
          && lastWrittenClassCount !== allClassesSet.size
        ) {
          if (debug) console.log('🎩 Initial write on server ready.')
          writeOutputFileDirect(allClassesSet, outputDir, outputFileName)
          lastWrittenClassCount = allClassesSet.size
        }
      })
    },

    transform(code: string, id: string) {
      if (!shouldProcessFile(id, ignoredDirectories, outputDirForFilter))
        return null

      this.addWatchFile(id)
      const cacheKey = generateCacheKey(id, code)

      if (transformCache.has(cacheKey)) {
        if (debug)
          console.log('🎩 Cache key' + cacheKey + ': hit for:', id)

        return transformCache.get(cacheKey)
      }

      if (debug) console.log('🎩 Processing file:', id)
      if (debug) console.log('🎩 Cache key:', cacheKey)

      let transformedCode: string
      let fileSpecificClasses: Set<string>

      try {
        const result = processCode(code)
        transformedCode = result.transformedCode
        fileSpecificClasses = result.fileSpecificClasses
      }
      catch (error) {
        console.error(`🎩 Error processing file ${id}:`, error)
        return null // Return original code without transformation
      }

      transformCache.set(cacheKey, transformedCode)

      const classesChanged = applyFileClasses(id, fileSpecificClasses)

      if (!isBuild && classesChanged) {
        if (debug)
          console.log('🎩 Classes changed, writing output file.')
        writeOutputFileDebounced(allClassesSet, outputDir, outputFileName)
      }

      if (!initialScanComplete) {
        if (debug) console.log('🎩 Initial scan marked as complete.')
        initialScanComplete = true
      }

      return {
        code: transformedCode,
        map: null,
      }
    },

    buildStart() {
      if (debug) console.log('🎩 Build starting, resetting state.')
      allClassesSet = new Set()
      classRefCounts.clear()
      transformCache.clear()
      fileClassMap.clear()
      lastWrittenClassCount = -1
      initialScanComplete = false

      if (isBlade)
        runBladeScan()
    },

    buildEnd() {
      if (!isBuild) return

      if (allClassesSet.size === 0) {
        if (debug)
          console.log('🎩 Build ended, no classes found to write.')
        return
      }

      if (debug)
        console.log('🎩 Build ended, writing final output file.')
      writeOutputFileDirect(allClassesSet, outputDir, outputFileName)
    },
  }

  function setupOutputEndpoint(server: ViteServer) {
    server.middlewares.use(
      '/__useClassy__/generate-output',
      (_req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
        if (debug)
          console.log(
            '🎩 Manual output generation requested via HTTP endpoint.',
          )
        writeOutputFileDirect(allClassesSet, outputDir, outputFileName)
        lastWrittenClassCount = allClassesSet.size
        res.statusCode = 200
        res.end(`Output file generated (${allClassesSet.size} classes)`)
      },
    )
  }

  function processCode(code: string): ProcessCodeResult {
    generatedClassesSet.clear()
    modifierDerivedClassesSet.clear()

    extractClasses(
      code,
      generatedClassesSet,
      modifierDerivedClassesSet,
      classRegex,
      classModifierRegex,
    )

    const transformedCodeWithModifiers = transformClassModifiers(
      code,
      generatedClassesSet,
      classModifierRegex,
      classAttrName,
    )

    const finalTransformedCode = mergeClassAttributes(
      transformedCodeWithModifiers,
      classAttrName,
    )

    return {
      transformedCode: finalTransformedCode,
      fileSpecificClasses: generatedClassesSet,
    }
  }
}

// Tailwind integration helpers (paths match plugin defaults unless overridden)
export {
  USECLASSY_DEFAULT_OUTPUT_DIR,
  USECLASSY_DEFAULT_OUTPUT_FILE,
  getUseClassyManifestPath,
  getUseClassyTailwindSourceDirective,
  getUseClassyTailwindSourceLineForRootStylesheet,
  getUseClassyTailwindV3ContentEntry,
} from './tailwind'
export type { UseClassyTailwindPathsOptions } from './tailwind'

// Export React-specific utilities
export { classy, useClassy as useClassyHook } from './react'
export { writeGitignore } from './utils'
export type { ClassyOptions } from './types.d.ts'
