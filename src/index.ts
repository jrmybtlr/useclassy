import type { PluginOption } from "vite";
import path from "path";

import {
  CLASS_REGEX,
  CLASS_MODIFIER_REGEX,
  REACT_CLASS_REGEX,
  REACT_CLASS_MODIFIER_REGEX,
  generateCacheKey,
  extractClasses,
  transformClassModifiers,
  mergeClassAttributes,
} from "./core";

import {
  loadIgnoredDirectories,
  shouldProcessFile,
  createOutputWriter,
  writeGitignore,
  scanProjectFiles,
} from "./utils";

import { scanBladeFiles, setupBladeFileWatching, setupLaravelServiceProvider } from "./blade";

import type { ClassyOptions, ProcessCodeResult, ViteServer } from "./types";
import { getUseClassyManifestPath, getUseClassyTailwindSourceDirective } from "./tailwind";

/**
 * UseClassy Vite plugin
 * Transforms class:modifier attributes into Tailwind JIT-compatible class names.
 * @param options - Configuration options for the plugin
 * @param options.language - The framework language to use (e.g., "vue" or "react")
 * @param options.outputDir - The directory to output the generated class file
 * @param options.outputFileName - The filename for the generated class file
 * @param options.manifestRoot - Project root for manifest output (defaults to Vite root)
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
 *       debug: true
 *     })
 *   ]
 * }
 *
 */

export default function useClassy(options: ClassyOptions = {}): PluginOption {
  let ignoredDirectories: string[] = [];
  let allClassesSet: Set<string> = new Set();
  let isBuild = false;
  let initialScanComplete = false;
  let projectRoot = process.cwd();
  let manifestRoot = process.cwd();

  const transformCache: Map<string, string> = new Map();
  const fileClassMap: Map<string, Set<string>> = new Map();
  const classRefCounts: Map<string, number> = new Map();

  /** Ref-counted merge of per-file classes into the global set; returns whether membership changed. */
  function applyFileClasses(id: string, newClasses: Set<string>): boolean {
    const oldClasses = fileClassMap.get(id) ?? new Set<string>();
    let changed = false;

    for (const c of oldClasses) {
      if (!newClasses.has(c)) {
        const prev = classRefCounts.get(c) ?? 0;
        const next = prev - 1;
        if (next <= 0) {
          classRefCounts.delete(c);
          allClassesSet.delete(c);
          changed = true;
        } else {
          classRefCounts.set(c, next);
        }
      }
    }

    for (const c of newClasses) {
      if (!oldClasses.has(c)) {
        const prev = classRefCounts.get(c) ?? 0;
        const next = prev + 1;
        classRefCounts.set(c, next);
        if (prev === 0) {
          allClassesSet.add(c);
          changed = true;
        }
      }
    }

    fileClassMap.set(id, new Set(newClasses));
    return changed;
  }

  const outputDir = options.outputDir || ".classy";
  const outputDirForFilter = path.normalize(outputDir);
  const outputFileName = options.outputFileName || "output.classy.html";
  const isReact = options.language === "react";
  const isBlade = options.language === "blade";
  const debug = options.debug || false;
  const injectTailwindSource = options.injectTailwindSource !== false;

  const classRegex = isReact ? REACT_CLASS_REGEX : CLASS_REGEX;
  const classModifierRegex = isReact ? REACT_CLASS_MODIFIER_REGEX : CLASS_MODIFIER_REGEX;
  const classAttrName = isReact ? "className" : "class";

  const generatedClassesSet: Set<string> = new Set();
  const modifierDerivedClassesSet: Set<string> = new Set();
  const outputWriter = createOutputWriter();

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
      outputWriter,
      debug,
    );
  }

  function runBladeScan(): void {
    scanBladeFiles(
      ignoredDirectories,
      allClassesSet,
      applyFileClasses,
      processCode,
      outputDir,
      outputFileName,
      manifestRoot,
      outputWriter,
      debug,
    );
  }

  const outputWatchIgnore = `**/${outputDir.replace(/\\/g, "/")}/**`;

  return {
    name: "useClassy",
    enforce: "pre",

    config(config) {
      config.server ??= {};
      config.server.watch ??= {};

      const ignored = config.server.watch.ignored;
      if (Array.isArray(ignored)) {
        if (!ignored.includes(outputWatchIgnore)) {
          config.server.watch.ignored = [...ignored, outputWatchIgnore];
        }
      } else if (typeof ignored === "function") {
        const originalIgnored = ignored;
        config.server.watch.ignored = (watchPath: string) => {
          const normalized = watchPath.replace(/\\/g, "/");
          if (normalized.includes(`/${outputDir}/`) || normalized.endsWith(`/${outputDir}`)) {
            return true;
          }
          return originalIgnored(watchPath);
        };
      } else if (typeof ignored === "string") {
        config.server.watch.ignored = [ignored, outputWatchIgnore];
      } else {
        config.server.watch.ignored = [outputWatchIgnore];
      }
    },

    configResolved(config) {
      isBuild = config.command === "build";
      projectRoot = config.root;
      manifestRoot = options.manifestRoot ? path.resolve(options.manifestRoot) : config.root;
      ignoredDirectories = loadIgnoredDirectories(manifestRoot);
      writeGitignore(outputDir, manifestRoot);

      if (isBlade && !isBuild) {
        setupLaravelServiceProvider(debug);
      }

      if (debug) {
        console.log(`🎩 Running in ${isBuild ? "build" : "dev"} mode.`);
      }
    },

    configureServer(server: ViteServer) {
      if (isBuild) return;

      if (debug) console.log("🎩 Configuring dev server...");

      setupOutputEndpoint(server);

      if (isBlade) {
        runBladeScan();
        setupBladeFileWatching(
          server,
          ignoredDirectories,
          allClassesSet,
          applyFileClasses,
          processCode,
          outputDir,
          outputFileName,
          manifestRoot,
          outputWriter,
          debug,
        );
      }

      server.httpServer?.once("listening", () => {
        if (initialScanComplete && allClassesSet.size > 0) {
          if (debug) console.log("🎩 Initial write on server ready.");
          outputWriter.writeDirect(allClassesSet, outputDir, outputFileName, manifestRoot);
        }
      });
    },

    transform(code: string, id: string) {
      const tailwindSource = injectTailwindSourceIfNeeded(code, id);
      if (tailwindSource !== null) {
        return { code: tailwindSource, map: null };
      }

      if (!shouldProcessFile(id, ignoredDirectories, outputDirForFilter, projectRoot)) return null;

      this.addWatchFile(id);
      const cacheKey = generateCacheKey(id, code);

      if (transformCache.has(cacheKey)) {
        if (debug) console.log("🎩 Cache key" + cacheKey + ": hit for:", id);

        return transformCache.get(cacheKey);
      }

      if (debug) console.log("🎩 Processing file:", id);
      if (debug) console.log("🎩 Cache key:", cacheKey);

      let transformedCode: string;
      let fileSpecificClasses: Set<string>;

      try {
        const result = processCode(code);
        transformedCode = result.transformedCode;
        fileSpecificClasses = result.fileSpecificClasses;
      } catch (error) {
        console.error(`🎩 Error processing file ${id}:`, error);
        return null; // Return original code without transformation
      }

      transformCache.set(cacheKey, transformedCode);

      const classesChanged = applyFileClasses(id, fileSpecificClasses);

      if (classesChanged) {
        if (debug) console.log("🎩 Classes changed, writing output file.");
        outputWriter.writeDebounced(allClassesSet, outputDir, outputFileName, manifestRoot);
      }

      if (!initialScanComplete) {
        if (debug) console.log("🎩 Initial scan marked as complete.");
        initialScanComplete = true;
      }

      return {
        code: transformedCode,
        map: null,
      };
    },

    buildStart() {
      if (debug) console.log("🎩 Build starting, resetting state.");
      allClassesSet = new Set();
      classRefCounts.clear();
      transformCache.clear();
      fileClassMap.clear();
      initialScanComplete = false;
      outputWriter.resetCache();

      if (isBuild) {
        if (isBlade) runBladeScan();
        else runProjectScan();
      } else if (isBlade) {
        runBladeScan();
      }
    },

    buildEnd() {
      if (!isBuild) return;

      if (allClassesSet.size === 0) {
        if (debug) console.log("🎩 Build ended, no classes found to write.");
        return;
      }

      if (debug) console.log("🎩 Build ended, writing final output file.");
      outputWriter.writeDirect(allClassesSet, outputDir, outputFileName, manifestRoot);
    },
  };

  function injectTailwindSourceIfNeeded(code: string, id: string): string | null {
    if (!injectTailwindSource || !id.endsWith(".css")) return null;
    if (!/@import\s+["']tailwindcss["']/.test(code)) return null;

    const manifestPath = getUseClassyManifestPath({
      outputDir,
      outputFileName,
    });
    if (code.includes(manifestPath) || code.includes(outputFileName)) return null;

    const directive = getUseClassyTailwindSourceDirective(id, manifestRoot, {
      outputDir,
      outputFileName,
    });

    if (debug) console.log("🎩 Injecting Tailwind @source into:", id);

    return code.replace(
      /@import\s+["']tailwindcss["'];?\s*\n/,
      (match) => `${match}${directive}\n`,
    );
  }

  function setupOutputEndpoint(server: ViteServer) {
    server.middlewares.use(
      "/__useClassy__/generate-output",
      (_req: import("http").IncomingMessage, res: import("http").ServerResponse) => {
        if (debug) console.log("🎩 Manual output generation requested via HTTP endpoint.");
        outputWriter.writeDirect(allClassesSet, outputDir, outputFileName, manifestRoot);
        res.statusCode = 200;
        res.end(`Output file generated (${allClassesSet.size} classes)`);
      },
    );
  }

  function processCode(code: string): ProcessCodeResult {
    generatedClassesSet.clear();
    modifierDerivedClassesSet.clear();

    extractClasses(
      code,
      generatedClassesSet,
      modifierDerivedClassesSet,
      classRegex,
      classModifierRegex,
    );

    const transformedCodeWithModifiers = transformClassModifiers(
      code,
      generatedClassesSet,
      classModifierRegex,
      classAttrName,
    );

    const finalTransformedCode = mergeClassAttributes(transformedCodeWithModifiers, classAttrName);

    return {
      transformedCode: finalTransformedCode,
      fileSpecificClasses: generatedClassesSet,
    };
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
} from "./tailwind";
export type { UseClassyTailwindPathsOptions } from "./tailwind";

// Export React-specific utilities
export { classy, useClassy as useClassyHook } from "./react";
export { writeGitignore } from "./utils";
export type { ClassyOptions } from "./types.d.ts";
