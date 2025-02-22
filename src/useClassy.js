import { hashFunction } from '../utils';

/**
 * Use Classy
 * @param {string[]} files - The files to process
 * @returns {Object} - The useClassy plugin
 */
export default function useClassy(files = [])
{
    // Cache for transformed content
    const transformCache = new Map()

    return {
        name: 'useClassy',
        enforce: 'pre',
        transform(code, id)
        {
            // Only process supported files
            if (!files.some(file => id.endsWith(file))) return;

            // Add the file to HMR dependencies
            this.addWatchFile(id);

            // Generate cache key using code content and file id
            const cacheKey = hashFunction(id + code);

            // Check if we have a cached result
            if (transformCache.has(cacheKey)) {
                return transformCache.get(cacheKey)
            }

            // Transform the code
            let result = code;

            // Transform class:modifier attributes
            result = result.replace(
                /(?:class|className):([\w:]+)="([^"]*)"/g,
                (match, modifiers, classes) =>
                {
                    const modifierChain = modifiers.split(':');
                    const modifiedClasses = classes.split(' ')
                        .map(cls => modifierChain.reduceRight((acc, mod) => `${mod}:${acc}`, cls))
                        .join(' ');
                    const attributeName = match.startsWith('class:') ? 'class' : 'className';
                    return `${attributeName}="${modifiedClasses}"`;
                }
            );

            // Merge all class/className attributes
            result = result.replace(
                /(?:class|className)="[^"]*"(\s*(?:class|className)="[^"]*")*/g,
                (match) =>
                {
                    const classes = match.match(/(?:class|className)="([^"]*)"/g)
                        .map(cls => cls.match(/(?:class|className)="([^"]*)"/)[1])
                        .join(' ');
                    // Preserve the last attribute name used (class or className)
                    const lastAttributeName = match.match(/(?:class|className)=/g).pop();
                    return `${lastAttributeName}"${classes}"`;
                }
            );

            // Cache the result before returning
            transformCache.set(cacheKey, result)
            return result;
        }
    }
}

/**
 * Hash function
 */
function hashFunction(string)
{
    return string.split('').reduce((acc, char) =>
    {
        return acc + char.charCodeAt(0);
    }, 0);
}