import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
/**
 * Use Classy plugin for Vite
 * @param files - The files to process
 * @returns The Vite plugin
 */
export default function useClassy(files: string[] = []): Plugin {

    // Cache for transformed content
    const transformCache: Map<string, string> = new Map();

    return {
        name: 'useClassy',
        enforce: 'pre',

        transform(code: string, id: string) {
            // Only process supported files
            if (!files.some((file) => id?.split('?')[0]?.endsWith(file))) return;

            // Add the file to HMR dependencies
            this.addWatchFile(id);

            // Generate cache key
            const cacheKey = hashFunction(id + code + files.join(',') + 'useClassy');

            // Check if we have a cached result
            if (transformCache.has(cacheKey.toString())) {
                return transformCache.get(cacheKey.toString());
            }

            // Transform the code
            let result = code;

            // Transform class:modifier attributes
            result = result.replace(
                /(?:class|className):([\w-:]+)="([^"]*)"/g,
                (match, modifiers, classes) => {
                    // Split classes and handle each individually
                    const modifiedClasses = classes.split(' ').map((value: string) => {
                        return `${modifiers}:${value}`;
                    }).join(' ');

                    const attributeName = match.startsWith('class:') ? 'class' : 'className';
                    return `${attributeName}="${modifiedClasses}"`;
                }
            );

            // Merge all class/className attributes
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
            // Create an output file in a folder called '.classy'
            // with a single div and all the generated classes
            // This is a workaround to Tailwind 4.0.8 which introduces
            // raw file scanning which interupts the useClassy plugin
            // 
            const outDir = path.join(process.cwd(), '.classy');
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }
            const outputFileName = path.basename(id).replace(/\.\w+$/, '.classy.html');
            const outputFilePath = path.join(outDir, outputFileName);

            // Extract all classes from the result using regex
            const classMatches = [...result.matchAll(/(?:class|className)="([^"]*)"/g)];
            let classesArray = classMatches.flatMap(match => match[1].split(/\s+/)).filter(Boolean);

            // Remove duplicate classes
            classesArray = [...new Set(classesArray)];

            // Write a single div element containing all classes
            fs.writeFileSync(outputFilePath, `<div class="${classesArray.join(' ')}"></div>`);

            // Cache the result before returning
            transformCache.set(cacheKey.toString(), result);
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