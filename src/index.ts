import type { Plugin } from "vite";
import fs from "fs";

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
  writeOutputFile,
  writeGitignore,
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
 * @example
 * // vite.config.js
 * import useClassy from 'vite-plugin-useclassy';
 *
 * export default {
 *   plugins: [
 *     useClassy({
 *       language: 'react',
 *       outputDir: '.classy',
 *       outputFileName: 'output.classy.jsx'
 *     })
 *   ]
 * }
 *
 */
export default function useClassy(options: ClassyOptions = {}): Plugin {
  const transformCache: Map<string, string> = new Map();
  const ignoredDirectories = loadIgnoredDirectories();
  const allClassesSet: Set<string> = new Set();

  // Options
  const outputDir = options.outputDir || ".classy";
  const outputFileName = options.outputFileName || "output.classy.jsx";
  const isReact = options.language === "react";

  // Ensure output directory is in .gitignore
  writeGitignore(outputDir);

  // Use regex patterns based on framework
  const classRegex = isReact ? REACT_CLASS_REGEX : CLASS_REGEX;
  const classModifierRegex = isReact
    ? REACT_CLASS_MODIFIER_REGEX
    : CLASS_MODIFIER_REGEX;
  const classAttrName = isReact ? "className" : "class";

  let needsOutputUpdate = false;
  let initialOutputWritten = false;
  let filesProcessed = 0;

  return {
    name: "useClassy",
    enforce: "pre",

    configureServer(server: ViteServer) {
      setupFileWatchers(server);
      setupOutputEndpoint(server);
      setupWebSocketCommunication(server);

      if (server.httpServer) {
        server.httpServer.once("listening", () => {
          if (needsOutputUpdate && !initialOutputWritten) {
            writeOutputFile(allClassesSet, outputDir, outputFileName, isReact);
            initialOutputWritten = true;
          }
        });
      }
    },

    transform(code: string, id: string) {
      if (!shouldProcessFile(id, ignoredDirectories)) return;

      if (options.debug) console.log("Processing file:", id);

      this.addWatchFile(id);
      const cacheKey = generateCacheKey(id, code);

      if (options.debug) console.log("Cache key:", cacheKey);

      if (transformCache.has(cacheKey)) {
        return transformCache.get(cacheKey);
      }

      const result = processCode(code, allClassesSet);
      filesProcessed++;

      if (options.debug) console.log("Files processed:", filesProcessed);

      if (filesProcessed === 1 && !initialOutputWritten) {
        setTimeout(() => {
          writeOutputFile(allClassesSet, outputDir, outputFileName, isReact);
          initialOutputWritten = true;
        }, 0);
      }

      transformCache.set(cacheKey, result);

      return result;
    },

    // TODO: UPDATE THIS
    buildStart() {
      // Reset state for build
      // allClassesSet.clear();
      // transformCache.clear();
      // initialOutputWritten = false;
      // needsOutputUpdate = true;
    },

    buildEnd() {
      // Generate final output file with all collected classes
      // if (allClassesSet.size > 0) {
      //   writeOutputFile(allClassesSet, outputDir, outputFileName, isReact);
      // }
    },

    closeBundle() {
      // Clean up resources
      // transformCache.clear();
      // allClassesSet.clear();
    },
  };

  /**
   * Sets up file watchers for ViteServer
   */
  function setupFileWatchers(server: ViteServer) {
    function isIgnored(filePath: string) {
      return (
        filePath.endsWith("useClassy.ts") ||
        filePath.includes("/.classy/output.classy.jsx") ||
        !shouldProcessFile(filePath, ignoredDirectories)
      );
    }

    server.watcher.on("change", async (filePath: string) => {
      if (isIgnored(filePath)) return;
      const code = fs.readFileSync(filePath, "utf-8");
      transformCache.delete(generateCacheKey(filePath, code));
      await server.transformRequest(filePath);
      needsOutputUpdate = true;
      writeOutputFile(allClassesSet, outputDir, outputFileName, isReact);
    });

    server.watcher.on("add", async (filePath: string) => {
      if (isIgnored(filePath)) return;
      await server.transformRequest(filePath);
      needsOutputUpdate = true;
      writeOutputFile(allClassesSet, outputDir, outputFileName, isReact);
    });
  }

  /**
   * Sets up the output endpoint for the server
   */
  function setupOutputEndpoint(server: ViteServer) {
    server.middlewares.use(
      "/__useClassy__/generate-output",
      (_req: any, res: any) => {
        if (needsOutputUpdate) {
          writeOutputFile(allClassesSet, outputDir, outputFileName, isReact);
          needsOutputUpdate = false;
          res.statusCode = 200;
          res.end("Output file generated");
        } else {
          res.statusCode = 304;
          res.end("No changes to generate");
        }
      }
    );
  }

  /**
   * Sets up WebSocket communication for the server
   */
  function setupWebSocketCommunication(server: ViteServer) {
    // Notify clients when classes are updated
    server.ws.on("connection", () => {
      // Send initial classes on connection
      if (allClassesSet.size > 0) {
        server.ws.send("classy:classes-updated", {
          count: allClassesSet.size,
        });
      }
    });

    // Listen for client requests to generate output
    server.ws.on("classy:generate-output", (_, client) => {
      writeOutputFile(allClassesSet, outputDir, outputFileName, isReact);
      needsOutputUpdate = false;
      client.send("classy:output-generated", {
        success: true,
        count: allClassesSet.size,
      });
    });
  }

  /**
   * Processes the code to extract and transform classes
   */
  function processCode(code: string, allClassesSet: Set<string>): string {
    const generatedClassesSet: Set<string> = new Set();

    // Extract all classes from the code
    extractClasses(code, generatedClassesSet, classRegex, classModifierRegex);

    // Add special classes to the global set
    generatedClassesSet.forEach((className) => {
      if (className.includes(":")) allClassesSet.add(className);
    });

    // Transform the code
    const transformedCode = transformClassModifiers(
      code,
      generatedClassesSet,
      classModifierRegex,
      classAttrName
    );

    const result = mergeClassAttributes(transformedCode, classAttrName);

    return result;
  }
}

// Export React-specific utilities
export { classy, useClassy as useClassyHook } from "./react";
export { writeGitignore } from "./utils";
export type { ClassyOptions } from "./types.d.ts";
