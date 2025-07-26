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

// Laravel Service Provider template
function getLaravelServiceProviderTemplate(): string {
  const pattern1 = String.raw`/\bclass:(\w+)=(["'])([^"']*)\2/`
  const pattern2 = String.raw`/(<[^>]*)\bclass=(["'])([^"']*)\2([^>]*__USECLASSY_MODIFIER__[^>]*>)/`
  return `<?php

namespace App\\Providers;

use Illuminate\\Support\\ServiceProvider;
use Illuminate\\View\\Compilers\\BladeCompiler;

class UseClassyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Hook into Blade compilation to transform class:modifier syntax
        $this->app->resolving('blade.compiler', fn (BladeCompiler $bladeCompiler) => 
            $bladeCompiler->extend(fn ($value) => $this->transformUseClassySyntax($value))
        );
    }

    private function transformUseClassySyntax(string $value): string
    {
        // Step 1: Transform class:modifier="value" to the modifier classes
        $pattern = '${pattern1}';
        
        $value = preg_replace_callback($pattern, function ($matches) {
            $modifier = $matches[1];
            $classes = $matches[3];
            
            // Transform each class with the modifier prefix
            $transformedClasses = [];
            foreach (explode(' ', trim($classes)) as $class) {
                if (!empty($class)) {
                    $transformedClasses[] = "{$modifier}:{$class}";
                }
            }
            
            $modifierClasses = implode(' ', $transformedClasses);
            
            // Return as a temporary marker to be merged later
            return "__USECLASSY_MODIFIER__{$modifierClasses}__USECLASSY_END__";
        }, $value);
        
        // Step 2: Find elements with both class attributes and modifier markers, then merge them
        $value = preg_replace_callback(
            '${pattern2}',
            fn ($matches) => (function () use ($matches) {
                $beforeClass = $matches[1];
                $quote = $matches[2];
                $existingClasses = $matches[3];
                $afterClass = $matches[4];
                
                // Extract all modifier classes from this element
                preg_match_all('/__USECLASSY_MODIFIER__([^_]*)__USECLASSY_END__/', $afterClass, $modifierMatches);
                $allModifierClasses = implode(' ', $modifierMatches[1]);
                
                // Remove the modifier markers
                $cleanAfterClass = preg_replace('/__USECLASSY_MODIFIER__[^_]*__USECLASSY_END__/', '', $afterClass);
                
                // Combine existing and modifier classes
                $combinedClasses = trim("{$existingClasses} {$allModifierClasses}");
                
                return "{$beforeClass}class={$quote}{$combinedClasses}{$quote}{$cleanAfterClass}";
            })(),
            $value
        );
        
        // Step 3: Handle any remaining modifier markers (elements without existing class attributes)
        $value = preg_replace_callback(
            '/__USECLASSY_MODIFIER__([^_]*)__USECLASSY_END__/',
            fn ($matches) => "class=\\"{$matches[1]}\\"",
            $value
        );
        
        return $value;
    }
}
`
}

// Laravel setup functions
export function isLaravelProject(): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), 'artisan'))
      && fs.existsSync(path.join(process.cwd(), 'app'))
  }
  catch {
    return false
  }
}

export function setupLaravelServiceProvider(debug = false): boolean {
  if (!isLaravelProject()) {
    if (debug) console.log('ℹ️  Not a Laravel project - skipping Laravel setup')
    return false
  }

  try {
    // Copy service provider
    const targetDir = path.join(process.cwd(), 'app', 'Providers')
    const targetFile = path.join(targetDir, 'UseClassyServiceProvider.php')

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    fs.writeFileSync(targetFile, getLaravelServiceProviderTemplate())
    if (debug) console.log('✅ UseClassyServiceProvider created in app/Providers/')

    // Update providers config
    const providersFile = path.join(process.cwd(), 'bootstrap', 'providers.php')

    if (!fs.existsSync(providersFile)) {
      if (debug) console.log('⚠️  Could not find bootstrap/providers.php - manual registration required')
      return false
    }

    const content = fs.readFileSync(providersFile, 'utf8')

    // Check if already registered
    if (content.includes('UseClassyServiceProvider::class')) {
      if (debug) console.log('ℹ️  UseClassyServiceProvider already registered')
      return true
    }

    // Add the service provider to the array
    const updatedContent = content.replace(
      /return \[([\s\S]*?)\];/,
      (_, providers) => {
        const trimmedProviders = providers.trim()
        const separator = trimmedProviders.endsWith(',') ? '' : ','
        return `return [${providers}${separator}\n    App\\Providers\\UseClassyServiceProvider::class,\n];`
      },
    )

    if (updatedContent !== content) {
      fs.writeFileSync(providersFile, updatedContent)
      if (debug) console.log('✅ UseClassyServiceProvider registered in bootstrap/providers.php')
      return true
    }

    if (debug) console.log('⚠️  Could not automatically register service provider')
    return false
  }
  catch (error) {
    if (debug) console.error('❌ Error setting up Laravel integration:', error)
    return false
  }
}

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
