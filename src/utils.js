/**
 * Hash function
 */
export const hashFunction = (string) =>
{
    return string.split('').reduce((acc, char) =>
    {
        return acc + char.charCodeAt(0);
    }, 0);
}