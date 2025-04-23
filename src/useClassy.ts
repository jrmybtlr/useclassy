import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

const SUPPORTED_FILES = ['.vue', '.ts', '.tsx', '.html', '.js', '.jsx'];
const CLASS_REGEX = /class="([^"]*)"(?![^>]*:class)/g;
const CLASS_MODIFIER_REGEX = /class:([\w-:]+)="([^"]*)"/g;
const MULTIPLE_CLASS_REGEX = /class="[^"]*"(\s*class="[^"]*")*/g;
const PRE_TAG_REGEX = /<pre[^>]*>[\s\S]*?<\/pre>|<pre[^>]*v-html[^>]*\/?>/g;
const PRE_TAG_PLACEHOLDER_REGEX = /__PRE_TAG_(\d+)__/g;

interface ClassyOptions {
  outputDir?: string;
  outputFileName?: string;
}

/**
 * Use Classy plugin for Vite
 * @param options - Configuration options for the plugin
 * @returns The Vite plugin
 */
export default function useClassy(options: ClassyOptions = {}): Plugin {
  // Config
  const outputDir = options.outputDir || '.classy';
  const outputFileName = options.outputFileName || 'output.classy.jsx';
  const transformCache: Map<string, string> = new Map();
  const ignoredDirectories = loadIgnoredDirectories();
  const allClassesSet: Set<string> = new Set();

  let needsOutputUpdate = false;
  let initialOutputWritten = false;
  let filesProcessed = 0;

  return {
    name: 'useClassy',
    enforce: 'pre',

    configureServer(server) {
      setupFileWatchers(server);
      setupOutputEndpoint(server);
      
      server.httpServer?.once('listening', () => {
        if (needsOutputUpdate && !initialOutputWritten) {
          writeOutputFile(allClassesSet, outputDir, outputFileName);
          initialOutputWritten = true;
        }
      });
    },

    transform(code: string, id: string) {
      if (!shouldProcessFile(id)) return;

      this.addWatchFile(id);
      const cacheKey = generateCacheKey(id, code);

      if (transformCache.has(cacheKey)) {
        return transformCache.get(cacheKey);
      }

      const result = processCode(code, allClassesSet);
      filesProcessed++;
      
      if (filesProcessed === 1 && !initialOutputWritten) {
        setTimeout(() => {
          writeOutputFile(allClassesSet, outputDir, outputFileName);
          initialOutputWritten = true;
        }, 0);
      }

      transformCache.set(cacheKey, result);
      return result;
    },
  };

  function setupFileWatchers(server: any) {
    server.watcher.on('change', async (filePath: string) => {
      if (filePath.endsWith('useClassy.ts')) return;
      
      if (!shouldProcessFile(filePath)) return;

      const code = fs.readFileSync(filePath, 'utf-8');
      transformCache.delete(generateCacheKey(filePath, code));
      await server.transformRequest(filePath);
      needsOutputUpdate = true;
    });

    server.watcher.on('add', async (filePath: string) => {
      if (!shouldProcessFile(filePath)) return;

      await server.transformRequest(filePath);
      needsOutputUpdate = true;
    });
  }

  function setupOutputEndpoint(server: any) {
    server.middlewares.use('/__useClassy__/generate-output', (res: any) => {
      if (needsOutputUpdate) {
        writeOutputFile(allClassesSet, outputDir, outputFileName);
        needsOutputUpdate = false;
        res.statusCode = 200;
        res.end('Output file generated');
      } else {
        res.statusCode = 304;
        res.end('No changes to generate');
      }
    });
  }

  function shouldProcessFile(filePath: string): boolean {
    if (!SUPPORTED_FILES.some((ext) => filePath?.split('?')[0]?.endsWith(ext))) return false;
    if (filePath.includes('node_modules') || filePath.includes('\0')) return false;
    if (filePath.includes('virtual:') || filePath.includes('runtime')) return false;
    return !isInIgnoredDirectory(filePath, ignoredDirectories);
  }

  function generateCacheKey(id: string, code: string): string {
    return hashString(id + code);
  }

  function processCode(code: string, allClassesSet: Set<string>): string {
    // Store pre tag content and replace with placeholders
    const preTagPlaceholders: string[] = [];
    let result = code.replace(PRE_TAG_REGEX, (match) => {
      preTagPlaceholders.push(match);
      return `__PRE_TAG_${preTagPlaceholders.length - 1}__`;
    });

    // Extract and transform classes
    const generatedClassesSet: Set<string> = new Set();
    extractClasses(code, generatedClassesSet);
    result = transformClassModifiers(result, generatedClassesSet);
    result = mergeClassAttributes(result);
    result = restorePreTags(result, preTagPlaceholders);

    // Add all found classes to the global set
    generatedClassesSet.forEach(cls => {
      if (cls.includes(':')) {
        allClassesSet.add(cls);
      }
    });

    return result;
  }

  function extractClasses(code: string, generatedClassesSet: Set<string>): void {
    let classMatch;
    while ((classMatch = CLASS_REGEX.exec(code)) !== null) {
      const classes = classMatch[1];
      if (classes) {
        classes.split(' ').forEach(cls => {
          if (cls.trim()) {
            generatedClassesSet.add(cls.trim());
          }
        });
      }
    }
  }

  function transformClassModifiers(code: string, generatedClassesSet: Set<string>): string {
    return code.replace(CLASS_MODIFIER_REGEX, (match, modifiers, classes) => {
      if (!modifiers || modifiers.trim() === '') return match;
      
      const modifiedClassesArr = classes.split(' ')
        .map((value: string) => value.trim())
        .filter((value: string) => value && value !== '')
        .map((value: string) => `${modifiers}:${value}`);
      
      modifiedClassesArr.forEach((cls: string) => {
        if (cls && !cls.endsWith(':') && !cls.startsWith("'") && !cls.endsWith("'")) {
          generatedClassesSet.add(cls);
        }
      });

      return `class="${modifiedClassesArr.join(' ')}"`;
    });
  }

  function mergeClassAttributes(code: string): string {
    return code.replace(MULTIPLE_CLASS_REGEX, (match) => {
      const allClasses = match
        .match(/class="([^"]*)"/g)
        ?.map(cls => {
          const subMatch = cls.match(/class="([^"]*)"/);
          return subMatch ? subMatch[1] : '';
        })
        .filter(Boolean)
        .join(' ') || '';

      return `class="${allClasses}"`;
    });
  }

  function restorePreTags(code: string, preTagPlaceholders: string[]): string {
    return code.replace(PRE_TAG_PLACEHOLDER_REGEX, (_, index) => {
      return preTagPlaceholders[parseInt(index)] || '';
    });
  }
}

function loadIgnoredDirectories(): string[] {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];

  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .filter(line => line.endsWith('/') || !line.includes('.'))
      .map(dir => dir.startsWith('/') ? dir.substring(1) : dir);
  } catch (error) {
    console.warn('Failed to read .gitignore file:', error);
    return [];
  }
}

function isInIgnoredDirectory(filePath: string, ignoredDirectories: string[]): boolean {
  if (!ignoredDirectories.length) return false;
  
  const relativePath = path.relative(process.cwd(), filePath);
  return ignoredDirectories.some(dir => 
    relativePath.startsWith(dir + '/') || relativePath === dir
  );
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

function writeOutputFile(allClassesSet: Set<string>, outputDir: string, outputFileName: string): void {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create .gitignore file inside output directory
    const classyGitignorePath = path.join(outputDir, '.gitignore');
    if (!fs.existsSync(classyGitignorePath)) {
      fs.writeFileSync(classyGitignorePath, '# Ignore all files in this directory\n*');
    }

    // Update .gitignore to exclude output directory
    updateGitignore(outputDir);

    // Create a single file with all classes
    const outputFilePath = path.join(outputDir, outputFileName);
    const jsxContent = `// Generated by useClassy
import React from 'react';

export default function ClassyOutput() {
  return (
    <div>
      ${Array.from(allClassesSet).map(cls => `<div class="${cls}" />`).join('\n      ')}
    </div>
  );
}`;
    
    fs.writeFileSync(outputFilePath, jsxContent, { encoding: 'utf-8' });
  } catch (error) {
    console.error('Failed to write classy output file:', error);
  }
}

function updateGitignore(outputDir: string): void {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const gitignoreEntry = `\n# Generated Classy files\n${outputDir}/\n`;

  try {
    if (fs.existsSync(gitignorePath)) {
      const currentContent = fs.readFileSync(gitignorePath, 'utf-8');
      if (!currentContent.includes(`${outputDir}/`)) {
        fs.appendFileSync(gitignorePath, gitignoreEntry);
      }
    } else {
      fs.writeFileSync(gitignorePath, gitignoreEntry.trim());
    }
  } catch (error) {
    console.warn('Failed to update .gitignore file:', error);
  }
}