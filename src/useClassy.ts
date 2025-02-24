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

    return {
        name: 'useClassy',
        enforce: 'pre',

        // Watch for file changes and additions
        configureServer(server) {
            // Watch for both file changes and additions
            server.watcher.on('change', async (filePath) => {
                if (!supportedFiles.some((ext) => filePath.endsWith(ext))) return;
                if (filePath.includes('node_modules')) return;

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

            // Add the file to HMR dependencies
            this.addWatchFile(id);

            // Generate cache key
            const cacheKey = hashFunction(id.split('?')[0] + code + supportedFiles.join(',') + 'useClassy');

            // Check if we have a cached result
            if (transformCache.has(cacheKey.toString())) {
                return transformCache.get(cacheKey.toString());
            }

            let result = code;

            // Create a set to hold classes generated via the class:modifier transform
            const generatedClassesSet: Set<string> = new Set();

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

            // 
            // Create an output file that exports the generated classes as a module.
            // This file will be imported into tailwind.config.js to safelist dynamic classes.
            // 
            const outDir = path.join(process.cwd(), '.classy');
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });

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
            }

            // Get relative path from project root to maintain directory structure
            const relativeFilePath = path.relative(process.cwd(), id.split('?')[0] || id);
            const outputFileName = relativeFilePath.replace(/\.\w+$/, '.classy.js');
            const outputFilePath = path.join(outDir, outputFileName);

            // Ensure the directory exists before writing the file
            fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });

            const classesArray = Array.from(generatedClassesSet);

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
 * Hash function
 */
export const hashFunction = (string: string): number => {
    return string.split('').reduce((acc: number, char: string): number => {
        return acc + char.charCodeAt(0);
    }, 0);
}