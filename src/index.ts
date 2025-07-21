import type { PluginOption } from 'vite'
import fs from 'fs'
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
  debounce,
} from './utils'

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
// Memory management constants
const MAX_CACHE_SIZE = 1000
const MAX_CLASSES = 10000
const MAX_FILES = 500
const MEMORY_CHECK_INTERVAL = 100

// Performance constants
const LARGE_FILE_THRESHOLD = 50000

export default function useClassy(options: ClassyOptions = {}): PluginOption {
  let ignoredDirectories: string[] = []
  let allClassesSet: Set<string> = new Set()
  let isBuild = false
  let initialScanComplete = false
  let lastWrittenClassCount = -1
  let notifyWsDebounced: (() => void) | null = null
  let operationCount = 0

  // Cache with LRU tracking
  const transformCache: Map<string, string> = new Map()
  const fileClassMap: Map<string, Set<string>> = new Map()
  const cacheAccessOrder: string[] = []

  // Memory management functions
  function evictLRUCache() {
    if (transformCache.size > MAX_CACHE_SIZE) {
      const toEvict = Math.floor(MAX_CACHE_SIZE * 0.2)
      for (let i = 0; i < toEvict; i++) {
        const oldestKey = cacheAccessOrder.shift()
        if (oldestKey) {
          transformCache.delete(oldestKey)
        }
      }
    }
  }

  function evictFileClassMap() {
    if (fileClassMap.size > MAX_FILES) {
      const toEvict = Math.floor(MAX_FILES * 0.2)
      const oldestFiles = Array.from(fileClassMap.keys()).slice(0, toEvict)
      oldestFiles.forEach(file => fileClassMap.delete(file))
    }
  }

  function trimClassSet() {
    if (allClassesSet.size > MAX_CLASSES) {
      const classArray = Array.from(allClassesSet)
      // Keep most recently used classes (simple heuristic: shorter class names are often more basic/reused)
      classArray.sort((a, b) => a.length - b.length)
      allClassesSet = new Set(classArray.slice(0, Math.floor(MAX_CLASSES * 0.8)))
    }
  }

  function performMemoryCheck() {
    operationCount++
    if (operationCount % MEMORY_CHECK_INTERVAL === 0) {
      evictLRUCache()
      evictFileClassMap()
      trimClassSet()

      if (debug) {
        console.log(`🎩 Memory check: Cache=${transformCache.size}, Files=${fileClassMap.size}, Classes=${allClassesSet.size}`)
      }
    }
  }

  function updateCacheAccess(key: string) {
    const index = cacheAccessOrder.indexOf(key)
    if (index > -1) {
      cacheAccessOrder.splice(index, 1)
    }
    cacheAccessOrder.push(key)
  }

  function updateGlobalClassesIncrementally(
    fileId: string,
    newFileClasses: Set<string>,
    oldFileClasses?: Set<string>,
  ): boolean {
    let classesChanged = false

    // Remove old classes that are no longer in this file
    if (oldFileClasses) {
      oldFileClasses.forEach((className) => {
        if (!newFileClasses.has(className)) {
          // Check if this class is used in other files before removing
          let isUsedElsewhere = false
          for (const [otherId, otherClasses] of fileClassMap) {
            if (otherId !== fileId && otherClasses.has(className)) {
              isUsedElsewhere = true
              break
            }
          }
          if (!isUsedElsewhere) {
            allClassesSet.delete(className)
            classesChanged = true
          }
        }
      })
    }

    // Add new classes that weren't in the global set
    newFileClasses.forEach((className) => {
      if (!allClassesSet.has(className)) {
        allClassesSet.add(className)
        classesChanged = true
      }
    })

    return classesChanged
  }

  // Options
  const outputDir = options.outputDir || '.classy'
  const outputFileName = options.outputFileName || 'output.classy.html'
  const isReact = options.language === 'react'
  const debug = options.debug || false

  // Framework regex
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

      setupFileWatchers(server)
      setupOutputEndpoint(server)
      notifyWsDebounced = setupWebSocketCommunicationAndReturnNotifier(server)

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

        updateCacheAccess(cacheKey)
        return transformCache.get(cacheKey)
      }

      if (debug) console.log('🎩 Processing file:', id)
      if (debug) console.log('🎩 Cache key:', cacheKey)

      // Handle large files with extra caution
      if (code.length > LARGE_FILE_THRESHOLD) {
        if (debug) console.log(`🎩 Large file detected (${code.length} bytes):`, id)
        // For very large files, we might want to skip processing or limit it
        if (code.length > LARGE_FILE_THRESHOLD * 10) {
          console.warn(`🎩 Skipping extremely large file (${code.length} bytes):`, id)
          return null
        }
      }

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

      // Use incremental processing for better performance
      const oldFileClasses = fileClassMap.get(id)
      const incrementalClassesChanged = updateGlobalClassesIncrementally(
        id,
        fileSpecificClasses,
        oldFileClasses,
      )

      fileClassMap.set(id, new Set(fileSpecificClasses))
      transformCache.set(cacheKey, transformedCode)
      updateCacheAccess(cacheKey)

      performMemoryCheck()

      // Use either direct or incremental change detection
      const classesChanged = directClassesChanged || incrementalClassesChanged

      if (!isBuild && classesChanged) {
        if (debug)
          console.log(
            '🎩 Classes changed, scheduling debounced write & WS notify.',
          )
        writeOutputFileDebounced(
          allClassesSet,
          outputDir,
          outputFileName,
          isReact,
        )
        notifyWsDebounced?.()
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

  function setupFileWatchers(server: ViteServer) {
    const processChange = async (filePath: string, event: 'change' | 'add') => {
      const normalizedPath = path.normalize(filePath)
      if (!shouldProcessFile(normalizedPath, ignoredDirectories)) return

      if (debug)
        console.log(`🎩 Saving ${event} file:`, normalizedPath)

      try {
        if (fs.existsSync(normalizedPath)) {
          const code = fs.readFileSync(normalizedPath, 'utf-8')
          // Invalidate cache *before* transformRequest
          transformCache.delete(generateCacheKey(normalizedPath, code))
          // Retransform - transform hook handles write/notify
          await server.transformRequest(normalizedPath)
        }
        else {
          if (debug)
            console.log(`🎩 File deleted (during ${event}):`, normalizedPath)
          writeOutputFileDebounced(
            allClassesSet,
            outputDir,
            outputFileName,
            isReact,
          )
          notifyWsDebounced?.()
          return
        }
      }
      catch (error) {
        console.error(
          `🎩 Error processing ${event} for ${normalizedPath}:`,
          error,
        )
      }
    }

    server.watcher.on('change', (filePath: string) =>
      processChange(filePath, 'change'))
    server.watcher.on('add', (filePath: string) =>
      processChange(filePath, 'add'))

    // Updated unlink handler
    server.watcher.on('unlink', (filePath: string) => {
      const normalizedPath = path.normalize(filePath)
      if (!shouldProcessFile(normalizedPath, ignoredDirectories)) return
      if (debug)
        console.log(`🎩 Watcher detected unlink:`, normalizedPath)

      let classesActuallyRemoved = false
      if (fileClassMap.has(normalizedPath)) {
        const classesToRemove = fileClassMap.get(normalizedPath)
        if (classesToRemove) {
          if (debug)
            console.log(
              `🎩 Removing ${classesToRemove.size} classes from deleted file: ${normalizedPath}`,
            )
          classesToRemove.forEach((cls) => {
            if (allClassesSet.delete(cls)) {
              classesActuallyRemoved = true
            }
          })
        }
        fileClassMap.delete(normalizedPath)
      }
      else {
        if (debug)
          console.log(
            `🎩 Unlinked file not found in fileClassMap: ${normalizedPath}`,
          )
      }

      // Only trigger update if classes were actually removed from the global set
      if (classesActuallyRemoved) {
        if (debug)
          console.log(
            '🎩 Classes removed due to unlink, scheduling debounced write & WS notify.',
          )
        writeOutputFileDebounced(
          allClassesSet,
          outputDir,
          outputFileName,
          isReact,
        )
        notifyWsDebounced?.()
      }
      else {
        if (debug)
          console.log(
            '🎩 Unlink event, but no classes needed removal from global set.',
          )
      }
    })
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

  function setupWebSocketCommunicationAndReturnNotifier(
    server: ViteServer,
  ): () => void {
    const sendUpdate = () => {
      if (server.ws) {
        const payload = {
          type: 'custom',
          event: 'classy:classes-updated',
          data: { count: allClassesSet.size },
        } as const
        server.ws.send(payload)
        if (debug)
          console.log('🎩 WebSocket -> classy:classes-updated')
      }
    }

    // Only create the debounced function once
    if (!notifyWsDebounced) {
      notifyWsDebounced = debounce(sendUpdate, 150)
    }

    server.ws?.on('connection', (client) => {
      if (debug) console.log('🎩 WebSocket client connected.')
      if (allClassesSet.size > 0) {
        sendUpdate()
      }

      // Listen for Vite-style custom events from the client
      client.on('message', (rawMsg) => {
        try {
          const message = JSON.parse(rawMsg.toString())
          if (
            message.type === 'custom'
            && message.event === 'classy:generate-output'
          ) {
            if (debug)
              console.log(
                '🎩 Manual output generation requested via WebSocket.',
              )
            writeOutputFileDirect(allClassesSet, outputDir, outputFileName)
            lastWrittenClassCount = allClassesSet.size
            client.send(
              JSON.stringify({
                type: 'custom',
                event: 'classy:output-generated',
                data: { success: true, count: allClassesSet.size },
              }),
            )
            sendUpdate()
          }
        }
        catch (e) {
          if (debug)
            console.log(
              '🎩 Received non-standard WS message',
              e,
              rawMsg.toString(),
            )
        }
      })
    })

    return notifyWsDebounced
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
