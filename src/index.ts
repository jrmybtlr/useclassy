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
 *       outputFileName: 'output.classy.html',
 *       debug: true
 *     })
 *   ]
 * }
 *
 */
export default function useClassy(options: ClassyOptions = {}): Plugin {
  let ignoredDirectories: string[] = [];
  let allClassesSet: Set<string> = new Set();
  let isBuild = false;
  let initialScanComplete = false;
  let lastWrittenClassCount = -1;
  let notifyWsDebounced: (() => void) | null = null;

  // Cache
  const transformCache: Map<string, string> = new Map();
  const fileClassMap: Map<string, Set<string>> = new Map();

  // Options
  const outputDir = options.outputDir || ".classy";
  const outputFileName = options.outputFileName || "output.classy.html";
  const isReact = options.language === "react";
  const debug = options.debug || false;

  // Framework regex
  const classRegex = isReact ? REACT_CLASS_REGEX : CLASS_REGEX;
  const classModifierRegex = isReact
    ? REACT_CLASS_MODIFIER_REGEX
    : CLASS_MODIFIER_REGEX;
  const classAttrName = isReact ? "className" : "class";

  // Pre-allocate the set for generated classes from each file
  const generatedClassesSet: Set<string> = new Set();

  // Ensure .gitignore * is in .classy/ directory
  writeGitignore(outputDir);

  return {
    name: "useClassy",
    enforce: "pre",

    configResolved(config) {
      isBuild = config.command === "build";
      ignoredDirectories = loadIgnoredDirectories();
      if (options.debug)
        console.log(`🎩 Running in ${isBuild ? "build" : "dev"} mode.`);
    },

    configureServer(server: ViteServer) {
      if (isBuild) return;

      if (options.debug) console.log("🎩 Configuring dev server...");

      setupFileWatchers(server);
      setupOutputEndpoint(server);
      notifyWsDebounced = setupWebSocketCommunicationAndReturnNotifier(server);

      server.httpServer?.once("listening", () => {
        if (
          initialScanComplete &&
          allClassesSet.size > 0 &&
          lastWrittenClassCount !== allClassesSet.size
        ) {
          if (options.debug) console.log("🎩 Initial write on server ready.");
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
        if (options.debug)
          console.log("🎩 Cache key" + cacheKey + " hit for:", id);

        return transformCache.get(cacheKey);
      }

      if (options.debug) console.log("🎩 Processing file:", id);
      if (options.debug) console.log("🎩 Cache key:", cacheKey);

      // Process the code, get transformed code, changes, and classes
      // Also update the global set of classes
      const { transformedCode, classesChanged, fileSpecificClasses } =
        processCode(code, allClassesSet);

      // Update the map tracking classes per file
      // Store a *copy* of the set to avoid mutations if generatedClassesSet is reused/cleared elsewhere
      fileClassMap.set(id, new Set(fileSpecificClasses));

      // Update the cache with the transformed code
      transformCache.set(cacheKey, transformedCode);

      if (!isBuild && classesChanged) {
        if (options.debug)
          console.log(
            "🎩 Classes changed, scheduling debounced write & WS notify."
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
        if (options.debug) console.log("🎩 Initial scan marked as complete.");
        initialScanComplete = true;
      }

      return {
        code: transformedCode,
        map: null,
      };
    },

    buildStart() {
      if (options.debug) console.log("🎩 Build starting, resetting state.");
      allClassesSet = new Set();
      transformCache.clear();
      // Clear the file-to-class map as well
      fileClassMap.clear();
      lastWrittenClassCount = -1;
      initialScanComplete = false;
    },

    buildEnd() {
      if (!isBuild) return;

      if (allClassesSet.size > 0) {
        if (options.debug)
          console.log("🎩 Build ended, writing final output file.");
        writeOutputFileDirect(allClassesSet, outputDir, outputFileName);
      } else {
        if (options.debug)
          console.log("🎩 Build ended, no classes found to write.");
      }
    },
  };

  function setupFileWatchers(server: ViteServer) {
    const processChange = async (filePath: string, event: "change" | "add") => {
      const normalizedPath = path.normalize(filePath);
      if (!shouldProcessFile(normalizedPath, ignoredDirectories)) return;

      if (options.debug)
        console.log(`🎩 Saving ${event} file:`, normalizedPath);

      try {
        if (fs.existsSync(normalizedPath)) {
          const code = fs.readFileSync(normalizedPath, "utf-8");
          // Invalidate cache *before* transformRequest
          transformCache.delete(generateCacheKey(normalizedPath, code));
          // Retransform - transform hook handles write/notify
          await server.transformRequest(normalizedPath);
        } else {
          // File deleted - just trigger write/notify
          if (options.debug)
            console.log(`🎩 File deleted (during ${event}):`, normalizedPath);
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
          `🎩 Error processing ${event} for ${normalizedPath}:`,
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

    // Updated unlink handler
    server.watcher.on("unlink", (filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      if (!shouldProcessFile(normalizedPath, ignoredDirectories)) return;
      if (options.debug)
        console.log(`🎩 Watcher detected unlink:`, normalizedPath);

      let classesActuallyRemoved = false;
      // Check if we were tracking this file
      if (fileClassMap.has(normalizedPath)) {
        const classesToRemove = fileClassMap.get(normalizedPath);
        if (classesToRemove) {
          if (options.debug)
            console.log(
              `🎩 Removing ${classesToRemove.size} classes from deleted file: ${normalizedPath}`
            );
          classesToRemove.forEach((cls) => {
            // Remove from the global set and track if removal happened
            if (allClassesSet.delete(cls)) {
              classesActuallyRemoved = true;
            }
          });
        }
        // Remove the file's entry from the map
        fileClassMap.delete(normalizedPath);
      } else {
        if (options.debug)
          console.log(
            `🎩 Unlinked file not found in fileClassMap: ${normalizedPath}`
          );
      }

      // Only trigger update if classes were actually removed from the global set
      if (classesActuallyRemoved) {
        if (options.debug)
          console.log(
            "🎩 Classes removed due to unlink, scheduling debounced write & WS notify."
          );
        writeOutputFileDebounced(
          allClassesSet,
          outputDir,
          outputFileName,
          isReact
        );
        notifyWsDebounced?.();
      } else {
        if (options.debug)
          console.log(
            "🎩 Unlink event, but no classes needed removal from global set."
          );
      }
    });
  }

  function setupOutputEndpoint(server: ViteServer) {
    server.middlewares.use(
      "/__useClassy__/generate-output",
      (_req: any, res: any) => {
        if (options.debug)
          console.log(
            "🎩 Manual output generation requested via HTTP endpoint."
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
    const sendUpdate = () => {
      if (server.ws) {
        const payload = {
          type: "custom",
          event: "classy:classes-updated",
          data: { count: allClassesSet.size },
        } as const;
        server.ws.send(payload);
        if (options.debug)
          console.log("🎩 WebSocket -> classy:classes-updated");
      }
    };

    // Only create the debounced function once
    if (!notifyWsDebounced) {
      notifyWsDebounced = debounce(sendUpdate, 150);
    }

    server.ws?.on("connection", (client) => {
      if (options.debug) console.log("🎩 WebSocket client connected.");
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
            if (options.debug)
              console.log(
                "🎩 Manual output generation requested via WebSocket."
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
          if (options.debug)
            console.log(
              "🎩 Received non-standard WS message",
              rawMsg.toString()
            );
        }
      });
    });

    return notifyWsDebounced; // Return the memoized debounced function
  }

  function processCode(
    code: string,
    currentGlobalClasses: Set<string>
  ): {
    transformedCode: string;
    classesChanged: boolean;
    fileSpecificClasses: Set<string>; // Return the classes found in *this* file
  } {
    let classesChanged = false;
    // This set is cleared and reused
    generatedClassesSet.clear();

    // Populates generatedClassesSet with classes (including modifiers) from this file
    extractClasses(code, generatedClassesSet, classRegex, classModifierRegex);

    // Check which of the file's classes need to be added to the global set
    generatedClassesSet.forEach((className) => {
      // We only care about classes with modifiers for the output file
      if (className.includes(":")) {
        if (!currentGlobalClasses.has(className)) {
          currentGlobalClasses.add(className);
          classesChanged = true; // Global set was modified
        }
      }
    });

    // Transform the code (replace class:mod with actual classes)
    const transformedCodeWithModifiers = transformClassModifiers(
      code,
      generatedClassesSet, // Use the file-specific classes for transformation context
      classModifierRegex,
      classAttrName
    );

    // Merge multiple class attributes into one
    const finalTransformedCode = mergeClassAttributes(
      transformedCodeWithModifiers,
      classAttrName
    );

    if (debug && classesChanged) {
      console.log(
        `🎩 Global class set size changed to ${currentGlobalClasses.size}`
      );
    }

    // Return the final code, whether global classes changed,
    // and the set of classes extracted specifically from this file
    return {
      transformedCode: finalTransformedCode,
      classesChanged,
      fileSpecificClasses: generatedClassesSet, // Return the reference to the reused set
    };
  }
}

// Export React-specific utilities
export { classy, useClassy as useClassyHook } from "./react";
export { writeGitignore } from "./utils";
export type { ClassyOptions } from "./types.d.ts";
