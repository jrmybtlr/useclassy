import type { PluginOption } from 'vite'
import path from 'path'

import {
  CLASS_REGEX,
  CLASS_MODIFIER_REGEX,
  REACT_CLASS_REGEX,
  REACT_CLASS_MODIFIER_REGEX,
  SVELTE_CLASS_REGEX,
  SVELTE_CLASS_MODIFIER_REGEX,
  generateCacheKey,
  extractClasses,
  transformClassModifiers,
  mergeClassAttributes,
} from './core'

import {
  loadIgnoredDirectories,
  shouldProcessFile,
  writeGitignore,
  scanProjectFiles,
  createOutputFileWriter,
} from './utils'

import {
  scanBladeFiles,
  setupBladeFileWatching,
  setupLaravelServiceProvider,
} from './blade'

import type { ClassyOptions, ProcessCodeResult, ViteServer } from './types'
import {
  getUseClassyManifestPath,
  getUseClassyTailwindSourceDirective,
} from './tailwind'

/**
 * UseClassy Vite plugin
 * Transforms class:modifier attributes into Tailwind JIT-compatible class names.
 * @param options - Configuration options for the plugin
 * @param options.language - The framework language to use (e.g., "vue", "react", "blade", or "svelte")
 * @param options.outputDir - The directory to output the generated class file
 * @param options.outputFileName - The filename for the generated class file
 * @param options.debug - Enable debug logging
 * @example
 * // vite.config.js
 * import useClassy from 'vite-plugin-useclassy';
 *
 * export default {
 *   plugins: [
 *     useClassy({
 *       language: 'svelte',
 *       outputDir: '.classy',
 *       outputFileName: 'output.classy.html',
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
  /** True when this plugin instance is attached to an SSR / server build. */
  let isSSR = false
  let initialScanComplete = false
  let projectRoot = process.cwd()
  let manifestRoot = process.cwd()
  let viteServer: ViteServer | null = null

  const outputDir = options.outputDir || '.classy'
  const outputDirForFilter = path.normalize(outputDir)
  const outputFileName = options.outputFileName || 'output.classy.html'
  const isReact = options.language === 'react'
  const isBlade = options.language === 'blade'
  const isSvelte = options.language === 'svelte'
  const debug = options.debug || false
  const injectTailwindSource = options.injectTailwindSource !== false

  /**
   * After the class manifest changes on disk, force Tailwind CSS modules to
   * recompile so `@source` picks up newly discovered variants during HMR.
   * Avoid emitting a FS `change` for the `.html` manifest — Vite treats that as
   * a full page reload. Invalidating CSS modules is enough: on regenerate,
   * `@tailwindcss/vite` sees the newer mtime via `requiresBuild()`.
   */
  function invalidateTailwindCssModules(): void {
    if (!viteServer?.moduleGraph || isBuild)
      return

    const updates: Array<{
      type: 'css-update'
      path: string
      acceptedPath: string
      timestamp: number
    }> = []
    const timestamp = Date.now()

    for (const [id, mod] of viteServer.moduleGraph.idToModuleMap) {
      if (!id || !id.includes('.css'))
        continue

      viteServer.moduleGraph.invalidateModule(mod)
      const url = mod.url || id
      updates.push({
        type: 'css-update',
        path: url,
        acceptedPath: url,
        timestamp,
      })
    }

    if (updates.length > 0) {
      viteServer.ws.send({ type: 'update', updates })
      if (debug)
        console.log(`🎩 Invalidated ${updates.length} CSS module(s) after manifest write.`)
    }
  }

  // Per-instance write state — avoids shared module-level cache collisions.
  const { writeDirect, writeDebounced, resetCache } = createOutputFileWriter({
    onWrote: invalidateTailwindCssModules,
  })

  /**
   * Persist the in-memory class set to disk.
   * Used after transforms complete (`renderStart` / `generateBundle`) so SSR
   * builds — which never run `transformIndexHtml` — still get a fresh manifest
   * before the first server render.
   */
  function flushManifest(reason: string): void {
    if (allClassesSet.size === 0) {
      if (debug)
        console.log(`🎩 Skipping manifest flush (${reason}): no classes.`)
      return
    }

    if (debug) {
      console.log(
        `🎩 Flushing manifest (${reason}${isSSR ? ', SSR' : ''}): ${allClassesSet.size} class(es).`,
      )
    }

    writeDirect(
      allClassesSet,
      outputDir,
      outputFileName,
      manifestRoot,
    )
  }

  /**
   * Schedule a manifest write after classes change during transform.
   * Builds skip here — `renderStart` / `generateBundle` / `buildEnd` flush
   * once after all modules are processed, avoiding per-module sync rewrites.
   */
  function scheduleManifestWrite(): void {
    if (isBuild)
      return

    writeDebounced(
      allClassesSet,
      outputDir,
      outputFileName,
      manifestRoot,
    )
  }

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

  const classRegex = isReact
    ? REACT_CLASS_REGEX
    : isSvelte
      ? SVELTE_CLASS_REGEX
      : CLASS_REGEX
  const classModifierRegex = isReact
    ? REACT_CLASS_MODIFIER_REGEX
    : isSvelte
      ? SVELTE_CLASS_MODIFIER_REGEX
      : CLASS_MODIFIER_REGEX
  const classAttrName = isReact ? 'className' : 'class'

  function runProjectScan(): void {
    scanProjectFiles(
      projectRoot,
      ignoredDirectories,
      outputDir,
      applyFileClasses,
      processCode,
      allClassesSet,
      outputFileName,
      manifestRoot,
      debug,
      writeDirect,
    )
  }

  function runBladeScan(): void {
    scanBladeFiles(
      ignoredDirectories,
      allClassesSet,
      applyFileClasses,
      processCode,
      outputDir,
      outputFileName,
      debug,
      manifestRoot,
      writeDirect,
    )
  }

  // Watch the output directory so Tailwind/Vite see manifest mtime changes.
  // Intercept those events in `handleHotUpdate` — returning CSS modules prevents
  // Vite's default full-page reload for `.html` files.
  function isManifestFile(watchPath: string): boolean {
    const normalized = watchPath.replace(/\\/g, '/')
    const manifestName = outputFileName.replace(/\\/g, '/')
    // Only the final manifest — ignore `.gitignore`, temp `*.tmp`, etc.
    return (
      normalized.endsWith(`/${manifestName}`)
      || normalized === manifestName
    )
  }

  return {
    name: 'useClassy',
    enforce: 'pre',

    configResolved(config) {
      isBuild = config.command === 'build'
      // Classic SSR builds set `build.ssr`. Vite Environment API (Nuxt / Vite 6+)
      // exposes server builds via `consumer === 'server'` on the environment later.
      isSSR = Boolean(config.build?.ssr)
      projectRoot = config.root
      manifestRoot = options.manifestRoot
        ? path.resolve(options.manifestRoot)
        : config.root
      ignoredDirectories = loadIgnoredDirectories(manifestRoot)
      writeGitignore(outputDir, manifestRoot)

      if (isBlade && !isBuild) {
        setupLaravelServiceProvider(debug)
      }

      if (debug) {
        const mode = isBuild ? (isSSR ? 'SSR build' : 'build') : 'dev'
        console.log(`🎩 Running in ${mode} mode.`)
      }
    },

    configureServer(server: ViteServer) {
      if (isBuild) return

      viteServer = server
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
          manifestRoot,
          writeDebounced,
        )
      }

      server.httpServer?.once('listening', () => {
        if (initialScanComplete && allClassesSet.size > 0) {
          if (debug) console.log('🎩 Initial write on server ready.')
          writeDirect(
            allClassesSet,
            outputDir,
            outputFileName,
            manifestRoot,
          )
        }
      })
    },

    handleHotUpdate({ file, server, timestamp }) {
      if (!isManifestFile(file))
        return

      const cssModules: import('vite').ModuleNode[] = []
      for (const [id, mod] of server.moduleGraph.idToModuleMap) {
        if (!id || !id.includes('.css'))
          continue
        server.moduleGraph.invalidateModule(mod, undefined, timestamp, true)
        cssModules.push(mod)
      }

      if (debug)
        console.log(`🎩 Manifest changed — updating ${cssModules.length} CSS module(s).`)

      // Returning CSS modules prevents Vite's default full reload for `.html`.
      return cssModules
    },

    transform(code: string, id: string) {
      const tailwindSource = injectTailwindSourceIfNeeded(code, id)
      if (tailwindSource !== null) {
        return { code: tailwindSource, map: null }
      }

      if (!shouldProcessFile(id, ignoredDirectories, outputDirForFilter, projectRoot))
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

      if (classesChanged) {
        if (debug)
          console.log('🎩 Classes changed, writing output file.')
        scheduleManifestWrite()
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
      initialScanComplete = false
      resetCache()

      // Scan before any CSS transform so Tailwind's `@source` can see variants
      // on the first pass (fixes cold builds and the first `vite` / HMR session).
      if (isBlade)
        runBladeScan()
      else
        runProjectScan()

      if (allClassesSet.size > 0)
        initialScanComplete = true
    },

    /**
     * All modules are transformed by `renderStart`. Flush here so SSR builds
     * (which never invoke `transformIndexHtml`) write a complete manifest
     * before Rollup emits output / the server renders.
     */
    renderStart() {
      if (!isBuild) return

      // Vite Environment API: prefer live environment over configResolved snapshot.
      const environment = (this as { environment?: { name?: string, config?: { consumer?: string } } }).environment
      if (environment) {
        isSSR = environment.name === 'ssr'
          || environment.config?.consumer === 'server'
          || isSSR
      }

      flushManifest('renderStart')
    },

    /**
     * Final SSR-safe write during bundle generation. Content-deduped with
     * `renderStart` / `buildEnd` so duplicate flushes are cheap no-ops.
     */
    generateBundle() {
      if (!isBuild) return
      flushManifest('generateBundle')
    },

    buildEnd() {
      if (!isBuild) return
      flushManifest('buildEnd')
    },
  }

  function injectTailwindSourceIfNeeded(code: string, id: string): string | null {
    const cssPath = id.split('?', 1)[0]?.split('#', 1)[0] ?? id
    if (!injectTailwindSource || !cssPath.endsWith('.css'))
      return null
    if (!/@import\s+["']tailwindcss["']/.test(code))
      return null

    const manifestPath = getUseClassyManifestPath({
      outputDir,
      outputFileName,
    })
    if (code.includes(manifestPath) || code.includes(outputFileName))
      return null

    const directive = getUseClassyTailwindSourceDirective(
      id,
      manifestRoot,
      { outputDir, outputFileName },
    )

    if (debug)
      console.log('🎩 Injecting Tailwind @source into:', id)

    return code.replace(
      /@import\s+["']tailwindcss["'];?\s*\n/,
      match => `${match}${directive}\n`,
    )
  }

  function setupOutputEndpoint(server: ViteServer) {
    server.middlewares.use(
      '/__useClassy__/generate-output',
      (_req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
        if (debug)
          console.log(
            '🎩 Manual output generation requested via HTTP endpoint.',
          )
        writeDirect(
          allClassesSet,
          outputDir,
          outputFileName,
          manifestRoot,
        )
        res.statusCode = 200
        res.end(`Output file generated (${allClassesSet.size} classes)`)
      },
    )
  }

  function processCode(code: string): ProcessCodeResult {
    const generatedClassesSet = new Set<string>()
    const modifierDerivedClassesSet = new Set<string>()

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
