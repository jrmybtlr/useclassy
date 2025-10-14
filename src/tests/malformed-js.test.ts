import { describe, it, expect } from 'vitest'
import { mergeClassAttributes } from '../core'

describe('Malformed JavaScript Generation', () => {
  it('should not generate malformed JavaScript when merging function calls with static classes', () => {
    // This is the problematic case that generates malformed JavaScript
    const input = '<div className="flex" className={getClassNames()}>Content</div>'

    const result = mergeClassAttributes(input, 'className')

    console.log('Input:', input)
    console.log('Output:', result)

    // The current implementation generates:
    // className={getClassNames(), `flex`)}
    // This is invalid JavaScript syntax!

    // It should generate valid JavaScript instead
    expect(result).not.toContain('getClassNames(), `flex`)')
    expect(result).toContain('className=')
    expect(result).toContain('flex')
    expect(result).toContain('getClassNames')

    // The result should be valid JavaScript syntax
    // Valid options would be:
    // 1. className={`flex ${getClassNames()}`}
    // 2. className={getClassNames('flex')} (if function supports parameters)
    // 3. className={getClassNames()} with flex handled separately
  })

  it('should handle function calls with parameters correctly', () => {
    const input = '<div className="flex" className={getClassNames(theme)}>Content</div>'

    const result = mergeClassAttributes(input, 'className')

    console.log('Input:', input)
    console.log('Output:', result)

    // Should not generate malformed syntax like: getClassNames(theme), `flex`)
    expect(result).not.toContain('getClassNames(theme), `flex`)')
    expect(result).toContain('className=')
    expect(result).toContain('flex')
    expect(result).toContain('getClassNames(theme')
  })

  it('should handle complex function calls without breaking syntax', () => {
    const input = '<div className="flex" className={getClassNames(theme, isActive ? "active" : "inactive")}>Content</div>'

    const result = mergeClassAttributes(input, 'className')

    console.log('Input:', input)
    console.log('Output:', result)

    // Should not generate malformed syntax
    expect(result).not.toMatch(/getClassNames\([^)]+\), `[^`]+`\)/)
    expect(result).toContain('className=')
    expect(result).toContain('flex')
    expect(result).toContain('getClassNames(theme, isActive ? "active" : "inactive"')
  })

  it('should handle template literals correctly', () => {
    const input = '<div className="flex" className={`${baseClass} ${active ? "bg-blue-500" : ""}`}>Content</div>'

    const result = mergeClassAttributes(input, 'className')

    console.log('Input:', input)
    console.log('Output:', result)

    // Should merge template literals properly
    expect(result).toContain('className=')
    expect(result).toContain('flex')
    expect(result).toContain('baseClass')
    expect(result).toContain('active ?')
  })
})
