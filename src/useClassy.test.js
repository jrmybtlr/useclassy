import { describe, it, expect } from 'vitest'
import useClassy from './useClassy'

const states = ['hover', 'group-hover', 'focus', 'active', 'visited', 'focus-visible', 'focus-within', 'group-focus-within', 'group-focus']
const modifiers = ['sm', 'md', 'lg', 'xl', '2xl']

// Test all frameworks
describe('useClassy', () =>
{
    const frameworks = ['.html', '.vue', '.svelte', '.jsx']
    frameworks.forEach(testFramework)
})

// Generate all possible combinations of states and modifiers
function generateCombinations(states, modifiers)
{
    const combinations = []
    for (const state of states) {
        for (const modifier of modifiers) {
            combinations.push(`${modifier}:${state}`)
        }
    }
    return combinations
}

// Test each framework
function testFramework(extension)
{
    it(`should handle ${extension.replace('.', '')}`, async () =>
    {
        const plugin = useClassy([extension])
        const combinations = generateCombinations(states, modifiers)
        expect(combinations.length).toBe(states.length * modifiers.length)

        // Input with all combinations, using className for JSX
        const classAttr = extension === '.jsx' ? 'className' : 'class'

        // Input with all combinations, using class for HTML
        const input = `
            <div
                ${classAttr}="base-class"
                ${combinations.map(combination => `class:${combination}="text-sm font-light"`).join(' ')}
            >Content</div>
        `.trim()

        // Mock context
        const mockContext = {
            addWatchFile: () => { },
        }

        // Transform and test
        const result = await plugin.transform.call(mockContext, input, `test${extension}`)

        // Basic assertions
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')

        // Check virtual content for Tailwind scanning
        const expectedVirtualClasses = combinations.map(combination =>
        {
            const [modifier, state] = combination.split(':')
            return `${modifier}:${state}:text-sm ${modifier}:${state}:font-light`
        }).join(' ')

        // Check if the expected virtual classes are present
        expect(result).toContain(`<!-- ${expectedVirtualClasses} -->`)

        // Check transformed class attributes
        const transformedDiv = result.split('\n').slice(1).join('\n') // Skip virtual content line
        expect(transformedDiv).toContain('class="base-class')

        // Verify that original class:modifier attributes are transformed
        combinations.forEach(combination =>
        {
            const [modifier, state] = combination.split(':')
            expect(transformedDiv).toContain(`${modifier}:${state}:text-sm`)
            expect(transformedDiv).toContain(`${modifier}:${state}:font-light`)
            expect(transformedDiv).not.toContain(`class:${combination}=`)
        })
    })
}
