import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

// Import utility functions
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
  writeOutputFileDebounced,
  writeOutputFileDirect,
  writeGitignore,
  debounce,
} from "./utils";

// Import types
import type { ClassyOptions, ViteServer } from "./types";

/**
 * UseClassy Vite plugin
 * Transforms class:modifier attributes into Tailwind JIT-compatible class names.
 * @param options - Configuration options for the plugin
 * @param options.language - The framework language to use (e.g., "vue" or "react")
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
 *       language: 'react',
 *       outputDir: '.classy',
 *       outputFileName: 'output.classy.html'
 *     })
 *   ]
 * }
 *
 */
export default function useClassy(options: ClassyOptions = {}): Plugin {
  const transformCache: Map<string, string> = new Map();
  let ignoredDirectories: string[] = [];
  let allClassesSet: Set<string> = new Set();
  let isBuild = false;

  // Options
  const outputDir = options.outputDir || ".classy";
  const outputFileName = options.outputFileName || "output.classy.html";
  const isReact = options.language === "react";
  const debug = options.debug || false;

  // Ensure output directory is in .gitignore
  writeGitignore(outputDir);

  // Use regex patterns based on framework
  const classRegex = isReact ? REACT_CLASS_REGEX : CLASS_REGEX;
  const classModifierRegex = isReact
    ? REACT_CLASS_MODIFIER_REGEX
    : CLASS_MODIFIER_REGEX;
  const classAttrName = isReact ? "className" : "class";

  let initialScanComplete = false;
  let lastWrittenClassCount = -1;
  let notifyWsDebounced: (() => void) | null = null;

  return {
    name: "useClassy",
    enforce: "pre",

    configResolved(config) {
      isBuild = config.command === "build";
      ignoredDirectories = loadIgnoredDirectories();
      if (debug)
        console.log(`useClassy: Running in ${isBuild ? "build" : "dev"} mode.`);
    },

    configureServer(server: ViteServer) {
      if (isBuild) return;

      if (debug) console.log("🎩 Configuring dev server...");
      setupFileWatchers(server);
      setupOutputEndpoint(server);
      notifyWsDebounced = setupWebSocketCommunicationAndReturnNotifier(server);

      server.httpServer?.once("listening", () => {
        if (
          initialScanComplete &&
          allClassesSet.size > 0 &&
          lastWrittenClassCount !== allClassesSet.size
        ) {
          if (debug) console.log("🎩 Initial write on server ready.");
          writeOutputFileDirect(allClassesSet, outputDir, outputFileName);
          lastWrittenClassCount = allClassesSet.size;
        }
      });
    },

    transform(code: string, id: string) {
      if (!shouldProcessFile(id, ignoredDirectories)) return null;

      this.addWatchFile(id);
      const cacheKey = generateCacheKey(id, code);

      if (transformCache.has(cacheKey)) {
        if (debug) console.log("🎩 Cache key" + cacheKey + " hit for:", id);
        return transformCache.get(cacheKey);
      }

      if (options.debug) console.log("Processing file:", id);
      if (options.debug) console.log("Cache key:", cacheKey);

      const { transformedCode, classesChanged } = processCode(
        code,
        allClassesSet
      );

      transformCache.set(cacheKey, transformedCode);

      if (!isBuild && classesChanged) {
        if (debug)
          console.log(
            "useClassy: Classes changed, scheduling debounced write & WS notify."
          );
        writeOutputFileDebounced(
          allClassesSet,
          outputDir,
          outputFileName,
          isReact
        );
        notifyWsDebounced?.();
      }

      if (!initialScanComplete) {
        if (debug) console.log("🎩 Initial scan marked as complete.");
        initialScanComplete = true;
      }

      // Return transformed code as a CodeObject for source maps if needed later
      // For now, just the string is fine based on current logic.
      return {
        code: transformedCode,
        map: null, // No source map generated currently
      };
    },

    buildStart() {
      if (debug) console.log("🎩 Build starting, resetting state.");
      allClassesSet = new Set();
      transformCache.clear();
      lastWrittenClassCount = -1;
      initialScanComplete = false;
    },

    buildEnd() {
      if (!isBuild) return;

      if (allClassesSet.size > 0) {
        if (debug)
          console.log("useClassy: Build ended, writing final output file.");
        writeOutputFileDirect(allClassesSet, outputDir, outputFileName);
      } else {
        if (debug)
          console.log("useClassy: Build ended, no classes found to write.");
      }
    },
  };

  function setupFileWatchers(server: ViteServer) {
    const processChange = async (filePath: string, event: "change" | "add") => {
      const normalizedPath = path.normalize(filePath);
      if (!shouldProcessFile(normalizedPath, ignoredDirectories)) return;

      if (debug) console.log(`🎩 Saving ${event} file:`, normalizedPath);

      try {
        if (fs.existsSync(normalizedPath)) {
          const code = fs.readFileSync(normalizedPath, "utf-8");
          // Invalidate cache *before* transformRequest
          transformCache.delete(generateCacheKey(normalizedPath, code));
          // Retransform - transform hook handles write/notify
          await server.transformRequest(normalizedPath);
        } else {
          // File deleted - just trigger write/notify
          if (debug)
            console.log(
              `useClassy: Watched file deleted (during ${event}):`,
              normalizedPath
            );
          writeOutputFileDebounced(
            allClassesSet,
            outputDir,
            outputFileName,
            isReact
          );
          notifyWsDebounced?.();
          return; // Skip transform if file doesn't exist
        }
      } catch (error) {
        console.error(
          `useClassy: Error processing ${event} for ${normalizedPath}:`,
          error
        );
      }
    };

    server.watcher.on("change", (filePath: string) =>
      processChange(filePath, "change")
    );
    server.watcher.on("add", (filePath: string) =>
      processChange(filePath, "add")
    );
    server.watcher.on("unlink", (filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      if (!shouldProcessFile(normalizedPath, ignoredDirectories)) return;
      if (debug) console.log(`🎩 Watcher detected unlink:`, normalizedPath);
      // Invalidate cache for the deleted file path - might not be strictly necessary
      // but good practice if using path-based cache keys elsewhere.
      // Assume generateCacheKey uses path; find a way to remove based on path?
      // Simple approach: Just trigger write/notify. A full rescan would be needed
      // to accurately remove classes originating *only* from this file.
      writeOutputFileDebounced(
        allClassesSet,
        outputDir,
        outputFileName,
        isReact
      );
      notifyWsDebounced?.();
    });
  }

  function setupOutputEndpoint(server: ViteServer) {
    server.middlewares.use(
      "/__useClassy__/generate-output",
      (_req: any, res: any) => {
        if (debug)
          console.log(
            "useClassy: Manual output generation requested via HTTP endpoint."
          );
        writeOutputFileDirect(allClassesSet, outputDir, outputFileName);
        lastWrittenClassCount = allClassesSet.size;
        res.statusCode = 200;
        res.end(`Output file generated (${allClassesSet.size} classes)`);
      }
    );
  }

  function setupWebSocketCommunicationAndReturnNotifier(
    server: ViteServer
  ): () => void {
    // Use Vite's standard custom event structure
    const sendUpdate = () => {
      if (server.ws) {
        const payload = {
          type: "custom", // Vite standard type
          event: "classy:classes-updated",
          data: { count: allClassesSet.size },
        } as const; // Use 'as const' for stricter typing if needed
        server.ws.send(payload);
        if (debug)
          console.log(
            "useClassy: Sent WebSocket update: classy:classes-updated"
          );
      }
    };

    const debouncedSendUpdate = debounce(sendUpdate, 150);

    server.ws?.on("connection", (client) => {
      if (debug) console.log("🎩 WebSocket client connected.");
      if (allClassesSet.size > 0) {
        sendUpdate();
      }

      // Listen for Vite-style custom events from the client
      client.on("message", (rawMsg) => {
        try {
          const message = JSON.parse(rawMsg.toString());
          if (
            message.type === "custom" &&
            message.event === "classy:generate-output"
          ) {
            if (debug)
              console.log(
                "useClassy: Manual output generation requested via WebSocket."
              );
            writeOutputFileDirect(allClassesSet, outputDir, outputFileName);
            lastWrittenClassCount = allClassesSet.size;
            // Send confirmation back using the same structure
            client.send(
              JSON.stringify({
                // Ensure payload is stringified
                type: "custom",
                event: "classy:output-generated",
                data: { success: true, count: allClassesSet.size },
              })
            );
            sendUpdate(); // Also send the updated class count
          }
        } catch (e) {
          // Ignore non-JSON messages or messages with incorrect format
          if (debug)
            console.log(
              "useClassy: Received non-standard WS message",
              rawMsg.toString()
            );
        }
      });
    });

    return debouncedSendUpdate;
  }

  function processCode(
    code: string,
    currentGlobalClasses: Set<string>
  ): { transformedCode: string; classesChanged: boolean } {
    let classesChanged = false;
    const generatedClassesSet: Set<string> = new Set();

    extractClasses(code, generatedClassesSet, classRegex, classModifierRegex);

    generatedClassesSet.forEach((className) => {
      if (className.includes(":")) {
        if (!currentGlobalClasses.has(className)) {
          currentGlobalClasses.add(className);
          classesChanged = true;
        }
      }
    });

    const transformedCode = transformClassModifiers(
      code,
      generatedClassesSet,
      classModifierRegex,
      classAttrName
    );

    const result = mergeClassAttributes(transformedCode, classAttrName);

    if (debug && classesChanged) {
      console.log(
        `useClassy: Global class set size changed to ${currentGlobalClasses.size}`
      );
    }

    return { transformedCode: result, classesChanged };
  }
}

// Export React-specific utilities
export { classy, useClassy as useClassyHook } from "./react";
export { writeGitignore } from "./utils";
export type { ClassyOptions } from "./types.d.ts";
