/**
 * Blade templates are outside Vite's module graph; we discover and watch them explicitly.
 */

import fs from "fs";
import path from "path";
import { globFiles } from "./fs-glob";
import { shouldProcessFile } from "./utils";
import type { OutputWriter } from "./utils";
import type { ApplyFileClassesFn, ProcessCodeFn, ViteServer } from "./types";

const BLADE_SKIP_DIR = new Set(["node_modules", "vendor", ".git", "dist", "build"]);

export function isLaravelProject(): boolean {
  try {
    return (
      fs.existsSync(path.join(process.cwd(), "artisan")) &&
      fs.existsSync(path.join(process.cwd(), "app"))
    );
  } catch {
    return false;
  }
}

export function setupLaravelServiceProvider(debug = false): boolean {
  if (!isLaravelProject()) {
    if (debug) console.log("ℹ️  Not a Laravel project - skipping Laravel setup");
    return false;
  }

  if (debug) {
    console.log("🎩 Laravel project detected!");
    console.log("📋 To enable UseClassy blade transformations:");
    console.log("");
    console.log("   composer require useclassy/laravel");
    console.log("");
    console.log("💡 The Vite plugin will handle class extraction for Tailwind JIT");
    console.log("   The Composer package will handle blade template transformations");
  }

  return true;
}

export function findBladeFiles(dir: string): string[] {
  return globFiles(dir, "**/*.blade.php", BLADE_SKIP_DIR);
}

function countModifierTokens(classes: Set<string>): number {
  let n = 0;
  for (const c of classes) {
    if (c.includes(":")) n++;
  }
  return n;
}

export function scanBladeFiles(
  ignoredDirectories: string[],
  allClassesSet: Set<string>,
  applyFileClasses: ApplyFileClassesFn,
  processCode: ProcessCodeFn,
  outputDir: string,
  outputFileName: string,
  manifestRoot: string,
  outputWriter: OutputWriter,
  debug: boolean,
): void {
  if (debug) console.log("🎩 Scanning Blade files...");

  try {
    const cwd = process.cwd();
    const bladeFiles = findBladeFiles(cwd);
    const outputNorm = path.normalize(outputDir);

    if (debug) console.log(`🎩 Found ${bladeFiles.length} Blade files`);

    for (const file of bladeFiles) {
      if (!shouldProcessFile(file, ignoredDirectories, outputNorm, manifestRoot)) continue;

      try {
        const content = fs.readFileSync(file, "utf-8");
        const result = processCode(content);
        applyFileClasses(file, result.fileSpecificClasses);

        if (debug) {
          const n = countModifierTokens(result.fileSpecificClasses);
          console.log(`🎩 Processed ${path.relative(cwd, file)}: ${n} modifier class(es)`);
        }
      } catch (error) {
        if (debug) console.error(`🎩 Error reading ${file}:`, error);
      }
    }

    if (allClassesSet.size > 0) {
      if (debug) console.log(`🎩 Total classes found: ${allClassesSet.size}`);
      outputWriter.writeDirect(allClassesSet, outputDir, outputFileName, manifestRoot);
    }
  } catch (error) {
    if (debug) console.error("🎩 Error scanning Blade files:", error);
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
  manifestRoot: string,
  outputWriter: OutputWriter,
  debug: boolean,
): void {
  if (debug) console.log("🎩 Setting up Blade file watching...");

  const cwd = process.cwd();
  const outputNorm = path.normalize(outputDir);

  for (const file of findBladeFiles(cwd)) {
    if (!shouldProcessFile(file, ignoredDirectories, outputNorm, manifestRoot)) continue;
    server.watcher.add(file);
    if (debug) console.log(`🎩 Watching: ${path.relative(cwd, file)}`);
  }

  server.watcher.on("change", (filePath) => {
    if (!filePath.endsWith(".blade.php")) return;

    if (debug) console.log(`🎩 Blade file changed: ${path.relative(cwd, filePath)}`);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const result = processCode(content);
      if (applyFileClasses(filePath, result.fileSpecificClasses)) {
        if (debug) console.log("🎩 Blade file classes changed, updating output file.");
        outputWriter.writeDebounced(allClassesSet, outputDir, outputFileName, manifestRoot);
      }
    } catch (error) {
      if (debug) console.error(`🎩 Error processing changed Blade file:`, error);
    }
  });
}
