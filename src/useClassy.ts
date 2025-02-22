import type { Plugin } from 'vite';

/**
 * Use Classy plugin
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

            // Generate cache key using code content and file id
            const cacheKey = hashFunction(id + code);

            // Check if we have a cached result
            if (transformCache.has(cacheKey.toString())) {
                return transformCache.get(cacheKey.toString());
            }

            // Transform the code
            let result = code;

            // Extract all class:modifier patterns and generate virtual content
            const virtualClasses: string[] = [];
            const classPattern = /(?:class|className):([\w-:]+)="([^"]*)"/g;
            const matches = result.matchAll(classPattern);

            for (const match of matches) {
                const [_, modifiers, classes] = match;
                const modifierChain = modifiers?.split(':') ?? [];
                const modifiedClasses = classes
                    ?.split(' ')
                    .map((cls: string) => modifierChain.reduceRight((acc: string, mod: string) => `${mod}:${acc}`, cls))
                    .join(' ');
                virtualClasses.push(modifiedClasses ?? '');
            }

            // Add virtual content for Tailwind scanning
            if (virtualClasses.length > 0) {
                result = `<!-- ${virtualClasses.join(' ')} -->\n${result}`;
            }

            // Transform class:modifier attributes
            result = result.replace(
                /(?:class|className):([\w-:]+)="([^"]*)"/g,
                (match, modifiers, classes) => {
                    const modifierChain = modifiers?.split(':') ?? [];
                    const modifiedClasses = classes
                        .split(' ')
                        .map((cls: string) => modifierChain.reduceRight((acc: string, mod: string) => `${mod}:${acc}`, cls))
                        .join(' ');
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