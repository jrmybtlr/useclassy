import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Use Classy plugin for Vite
 * @param files - The files to process
 * @returns The Vite plugin
 */
export default function useClassy(): Plugin {

    // Cache for transformed content
    const transformCache: Map<string, string> = new Map();
    const supportedFiles = ['.vue', '.ts', '.tsx', '.js', '.jsx'];
    
    // Load ignored directories from .gitignore
    const ignoredDirectories = loadIgnoredDirectories();

    return {
        name: 'useClassy',
        enforce: 'pre',

        // Watch for file changes and additions
        configureServer(server) {
            // Watch for both file changes and additions
            server.watcher.on('change', async (filePath) => {
                if (!supportedFiles.some((ext) => filePath.endsWith(ext))) return;
                if (filePath.includes('node_modules')) return;
                if (isInIgnoredDirectory(filePath, ignoredDirectories)) return;

                // Clear the cache for this file
                const code = fs.readFileSync(filePath, 'utf-8');
                const cacheKey = hashFunction(filePath + code + supportedFiles.join(',') + 'useClassy');
                transformCache.delete(cacheKey.toString());

                await server.transformRequest(filePath);
            });

            // Keep existing 'add' watcher
            server.watcher.on('add', async (filePath) => {
                if (!supportedFiles.some((ext) => filePath.endsWith(ext))) return;
                if (filePath.includes('node_modules')) return;
                if (isInIgnoredDirectory(filePath, ignoredDirectories)) return;

                const code = fs.readFileSync(filePath, 'utf-8');
                await server.transformRequest(filePath);
            });
        },

        // Transform the code
        transform(code: string, id: string) {
            // Only process supported files
            if (!supportedFiles.some((file) => id?.split('?')[0]?.endsWith(file))) return;

            // Skip files in node_modules
            if (id.includes('node_modules')) return;
            
            // Skip files with null bytes in the path
            if (id.includes('\0')) return;
            
            // Skip virtual files and runtime files
            if (id.includes('virtual:') || id.includes('runtime')) return;
            
            // Skip files in ignored directories
            if (isInIgnoredDirectory(id, ignoredDirectories)) return;

            // Add the file to HMR dependencies
            this.addWatchFile(id);

            // Generate cache key
            const cacheKey = hashFunction(id.split('?')[0] + code + supportedFiles.join(',') + 'useClassy');

            // Check if we have a cached result
            if (transformCache.has(cacheKey.toString())) {
                return transformCache.get(cacheKey.toString());
            }

            // Store pre tag content and replace with placeholders
            const preTagPlaceholders: string[] = [];
            let result = code.replace(/<pre[^>]*>[\s\S]*?<\/pre>|<pre[^>]*v-html[^>]*\/?>/g, (match) => {
                preTagPlaceholders.push(match);
                return `__PRE_TAG_${preTagPlaceholders.length - 1}__`;
            });

            // Create a set to hold classes generated via the class:modifier transform
            const generatedClassesSet: Set<string> = new Set();

            // Extract all class attributes from the code
            const classRegex = /(?:class|className)="([^"]*)"(?![^>]*:class)/g;
            let classMatch;
            while ((classMatch = classRegex.exec(code)) !== null) {
                const classes = classMatch[1];
                if (classes) {
                    classes.split(' ').forEach(cls => {
                        if (cls.trim()) {
                            generatedClassesSet.add(cls.trim());
                        }
                    });
                }
            }

            // Transform class:modifier attributes and capture generated classes
            result = result.replace(
                /(?:class|className):([\w-:]+)="([^"]*)"/g,
                (match, modifiers, classes) => {
                    // Split classes and handle each individually and store them
                    const modifiedClassesArr = classes.split(' ').map((value: string) => {
                        return `${modifiers}:${value}`;
                    });
                    modifiedClassesArr.forEach((cls: string) => generatedClassesSet.add(cls));

                    const modifiedClasses = modifiedClassesArr.join(' ');
                    const attributeName = match.startsWith('class:') ? 'class' : 'className';
                    return `${attributeName}="${modifiedClasses}"`;
                }
            );

            // 
            // Merge all class/className attributes
            // 
            result = result.replace(
                /(?:class|className)="[^"]*"(\s*(?:class|className)="[^"]*")*/g,
                (match) => {
                    // Extract classes from each attribute
                    const allClasses =
                        match
                            .match(/(?:class|className)="([^"]*)"/g)
                            ?.map((cls) => {
                                const subMatch = cls.match(/(?:class|className)="([^"]*)"/);
                                return subMatch ? subMatch[1] : '';
                            })
                            .join(' ') || '';

                    // Preserve the last attribute name used (class or className)
                    const lastAttributeName =
                        match.match(/(?:class|className)=/g)?.pop()?.replace('=', '') ?? 'class';

                    return `${lastAttributeName}="${allClasses}"`;
                }
            );

            // Restore pre tag content
            result = result.replace(/__PRE_TAG_(\d+)__/g, (_, index) => {
                const placeholder = preTagPlaceholders[parseInt(index)];
                return placeholder || '';
            });

            // 
            // Create an output file that exports the generated classes as a module.
            // This file will be imported into tailwind.config.js to safelist dynamic classes.
            // 
            const outDir = path.join(process.cwd(), '.classy');
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }

            // Create .gitignore file inside .classy directory if it doesn't exist
            const classyGitignorePath = path.join(outDir, '.gitignore');
            if (!fs.existsSync(classyGitignorePath)) {
                fs.writeFileSync(classyGitignorePath, '# Ignore all files in this directory\n*');
            }

            // Create or update .gitignore to exclude .classy directory
            const gitignorePath = path.join(process.cwd(), '.gitignore');
            const gitignoreEntry = '\n# Generated Classy files\n.classy/\n';

            try {
                if (fs.existsSync(gitignorePath)) {
                    const currentContent = fs.readFileSync(gitignorePath, 'utf-8');
                    if (!currentContent.includes('.classy/')) {
                        fs.appendFileSync(gitignorePath, gitignoreEntry);
                    }
                } else {
                    fs.writeFileSync(gitignorePath, gitignoreEntry.trim());
                }
            } catch (error) {
                console.warn('Failed to update .gitignore file:', error);
            }

            // Get relative path from project root to maintain directory structure
            const relativeFilePath = path.relative(process.cwd(), id.split('?')[0] || id);
            
            // Skip if the path contains null bytes
            if (relativeFilePath.includes('\0')) return result;
            
            const outputFileName = relativeFilePath.replace(/\.\w+$/, '.classy.js');
            const outputFilePath = path.join(outDir, outputFileName);

            // Ensure the directory exists before writing the file
            try {
                fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
            } catch (error) {
                console.warn(`Failed to create directory for ${outputFilePath}:`, error);
                return result;
            }

            const classesArray = Array.from(generatedClassesSet)
                .filter(cls => {
                    // Only keep classes that contain a colon, indicating a variant
                    return cls.includes(':');
                });

            fs.writeFileSync(
                outputFilePath,
                `export default ${JSON.stringify(classesArray)};`
            );

            // Cache the result before returning
            transformCache.set(cacheKey.toString(), result);

            // Return the transformed result
            return result;
        },
    };
}

/**
 * Load ignored directories from .gitignore file
 */
function loadIgnoredDirectories(): string[] {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        return [];
    }

    try {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .filter(line => {
                // Only include directory patterns (those ending with / or without file extensions)
                return line.endsWith('/') || !line.includes('.');
            })
            .map(dir => {
                // Remove leading slash if present
                return dir.startsWith('/') ? dir.substring(1) : dir;
            });
    } catch (error) {
        console.warn('Failed to read .gitignore file:', error);
        return [];
    }
}

/**
 * Check if a file is in an ignored directory
 */
function isInIgnoredDirectory(filePath: string, ignoredDirectories: string[]): boolean {
    if (!ignoredDirectories.length) return false;
    
    // Convert absolute path to relative path from project root
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Check if the file is in any of the ignored directories
    return ignoredDirectories.some(dir => {
        return relativePath.startsWith(dir + '/') || relativePath === dir;
    });
}

/**
 * Hash function
 */
export const hashFunction = (string: string): number => {
    return string.split('').reduce((acc: number, char: string): number => {
        return acc + char.charCodeAt(0);
    }, 0);
}