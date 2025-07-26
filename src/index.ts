import type { PluginOption } from 'vite'

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
} from './blade'

import type { ClassyOptions, ViteServer } from './types'

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
  // Simple caching
  const transformCache: Map<string, string> = new Map()
  const fileClassMap: Map<string, Set<string>> = new Map()

  function regenerateAllClasses(): boolean {
    const oldSize = allClassesSet.size
    allClassesSet.clear()

    // Regenerate from all tracked files
    for (const classes of fileClassMap.values()) {
      classes.forEach(className => allClassesSet.add(className))
    }

    return oldSize !== allClassesSet.size
  }

  // Options
  const outputDir = options.outputDir || '.classy'
  const outputFileName = options.outputFileName || 'output.classy.html'
  const isReact = options.language === 'react'
  const isBlade = options.language === 'blade'
  const debug = options.debug || false

  // Framework regex (Blade uses same syntax as Vue - both use 'class' attribute)
  const classRegex = isReact ? REACT_CLASS_REGEX : CLASS_REGEX
  const classModifierRegex = isReact
    ? REACT_CLASS_MODIFIER_REGEX
    : CLASS_MODIFIER_REGEX
  const classAttrName = isReact ? 'className' : 'class'

  // Class sets
  const generatedClassesSet: Set<string> = new Set()
  const modifierDerivedClassesSet: Set<string> = new Set()

  // Ensure .gitignore * is in .classy/ directory
  writeGitignore(outputDir)

  return {
    name: 'useClassy',
    enforce: 'pre',

    configResolved(config) {
      isBuild = config.command === 'build'
      ignoredDirectories = loadIgnoredDirectories()
      if (debug) {
        console.log(`🎩 Running in ${isBuild ? 'build' : 'dev'} mode.`)
      }
    },

    configureServer(server: ViteServer) {
      if (isBuild) return

      if (debug) console.log('🎩 Configuring dev server...')

      setupOutputEndpoint(server)

      // Only scan and watch Blade files if explicitly using blade language
      if (isBlade) {
        // Scan Blade files in dev mode too
        scanBladeFiles(
          ignoredDirectories,
          allClassesSet,
          fileClassMap,
          regenerateAllClasses,
          processCode,
          outputDir,
          outputFileName,
          debug,
        )

        // Watch Blade files for changes in dev mode
        setupBladeFileWatching(
          server,
          ignoredDirectories,
          allClassesSet,
          fileClassMap,
          regenerateAllClasses,
          processCode,
          outputDir,
          outputFileName,
          isReact,
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
      if (!shouldProcessFile(id, ignoredDirectories)) return null

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
      let directClassesChanged: boolean
      let fileSpecificClasses: Set<string>

      try {
        const result = processCode(code, allClassesSet)
        transformedCode = result.transformedCode
        directClassesChanged = result.classesChanged
        fileSpecificClasses = result.fileSpecificClasses
      }
      catch (error) {
        console.error(`🎩 Error processing file ${id}:`, error)
        return null // Return original code without transformation
      }

      // Update file classes and regenerate global set
      fileClassMap.set(id, new Set(fileSpecificClasses))
      transformCache.set(cacheKey, transformedCode)

      const globalClassesChanged = regenerateAllClasses()
      const classesChanged = directClassesChanged || globalClassesChanged

      if (!isBuild && classesChanged) {
        if (debug)
          console.log('🎩 Classes changed, writing output file.')
        writeOutputFileDebounced(
          allClassesSet,
          outputDir,
          outputFileName,
          isReact,
        )
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
      transformCache.clear()
      fileClassMap.clear()
      lastWrittenClassCount = -1
      initialScanComplete = false

      // Only scan Blade files during build if explicitly using blade language
      if (isBlade) {
        // Scan Blade files that aren't part of the module graph
        scanBladeFiles(
          ignoredDirectories,
          allClassesSet,
          fileClassMap,
          regenerateAllClasses,
          processCode,
          outputDir,
          outputFileName,
          debug,
        )
      }
    },

    buildEnd() {
      if (!isBuild) return

      if (allClassesSet.size > 0) {
        if (debug)
          console.log('🎩 Build ended, writing final output file.')
        writeOutputFileDirect(allClassesSet, outputDir, outputFileName)
      }
      else {
        if (debug)
          console.log('🎩 Build ended, no classes found to write.')
      }
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

  function processCode(
    code: string,
    currentGlobalClasses: Set<string>,
  ): {
      transformedCode: string
      classesChanged: boolean
      fileSpecificClasses: Set<string>
    } {
    let classesChanged = false
    generatedClassesSet.clear()
    modifierDerivedClassesSet.clear()

    extractClasses(
      code,
      generatedClassesSet,
      modifierDerivedClassesSet,
      classRegex,
      classModifierRegex,
    )

    // Check which of the *modifier-derived* classes need to be added to the global set
    modifierDerivedClassesSet.forEach((className) => {
      if (!currentGlobalClasses.has(className)) {
        currentGlobalClasses.add(className)
        classesChanged = true
      }
    })

    // Transform the code (replace class:mod with actual classes)
    const transformedCodeWithModifiers = transformClassModifiers(
      code,
      generatedClassesSet,
      classModifierRegex,
      classAttrName,
    )

    // Merge multiple class attributes into one
    const finalTransformedCode = mergeClassAttributes(
      transformedCodeWithModifiers,
      classAttrName,
    )

    if (debug && classesChanged) {
      console.log(
        `🎩 Global class set size changed to ${currentGlobalClasses.size}`,
      )
    }

    // Return the final code, whether global classes changed,
    // and the set of ALL classes extracted specifically from this file
    return {
      transformedCode: finalTransformedCode,
      classesChanged,
      fileSpecificClasses: generatedClassesSet,
    }
  }
}

// Export React-specific utilities
// React hooks are not fully tested yet
export { classy, useClassy as useClassyHook } from './react'
export { writeGitignore } from './utils'
export type { ClassyOptions } from './types.d.ts'
