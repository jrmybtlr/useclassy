import { describe, it, expect } from 'vitest';
import useClassy from './useClassy.ts';

const states: string[] = ['hover', 'group-hover', 'focus', 'active', 'visited', 'focus-visible', 'focus-within', 'group-focus-within', 'group-focus'];
const modifiers: string[] = ['sm', 'md', 'lg', 'xl', '2xl'];

// Test all frameworks
describe('useClassy', () => {
    const frameworks = ['.html', '.vue', '.svelte', '.jsx'];
    frameworks.forEach(testEachFramework);
});

/*
 * Generates all possible combinations
 */
function generateClassCombinations(states: string[], modifiers: string[]): string[] {
    const combinations: string[] = [];
    for (const state of states) {
        for (const modifier of modifiers) {
            combinations.push(`${modifier}:${state}`);
        }
    }
    return combinations;
}

/*
 * Test each framework
 */
function testEachFramework(extension: string): void {
    it(`should handle ${extension.replace('.', '')}`, async () => {
        const plugin = useClassy([extension]);
        const combinations = generateClassCombinations(states, modifiers);

        // Ensure the combination count matches the product of the two arrays
        expect(combinations.length).toBe(states.length * modifiers.length);

        // Use className for JSX, class otherwise
        const classAttr = extension === '.jsx' ? 'className' : 'class';

        // Construct an input template with various class:modifier attributes
        const input = `
            <div
                ${classAttr}="base-class"
                ${combinations
                .map((combination) => `class:${combination}="text-sm font-light"`)
                .join(' ')}
            >Content</div>
        `.trim();

        // Mock context object to simulate Vite plugin context
        const mockContext = {
            addWatchFile: (_: string) => {
                // No-op in tests
            },
        };

        // Transform and test
        const result = await plugin.transform!.call(
            mockContext,
            input,
            `test${extension}`
        );

        // Basic assertions
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');

        // Check virtual content for Tailwind scanning
        const expectedVirtualClasses = combinations
            .map((combination) => {
                const [modifier, state] = combination.split(':');
                return `${modifier}:${state}:text-sm ${modifier}:${state}:font-light`;
            })
            .join(' ');

        // 
        // The first line is the virtual comment containing all classes
        // 
        expect(result).toContain(`<!-- ${expectedVirtualClasses} -->`);

        // Separate the actual transformed template from the virtual comment
        const transformedDiv = (result as string).split('\n').slice(1).join('\n');

        // Check that the base class is still present
        expect(transformedDiv).toContain('class="base-class');

        // Verify transformation of class:modifier attributes
        combinations.forEach((combination) => {
            const [modifier, state] = combination.split(':');
            expect(transformedDiv).toContain(`${modifier}:${state}:text-sm`);
            expect(transformedDiv).toContain(`${modifier}:${state}:font-light`);
            expect(transformedDiv).not.toContain(`class:${combination}=`);
        });
    });
}
