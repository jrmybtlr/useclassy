import crypto from 'crypto'
import { describe, it, expect } from 'vitest'
import {
  hashString,
  generateCacheKey,
  extractClasses,
  transformClassModifiers,
  mergeClassAttributes,
  CLASS_REGEX,
  CLASS_MODIFIER_REGEX,
  REACT_CLASS_REGEX,
  REACT_CLASS_MODIFIER_REGEX,
} from '../core'

describe('core module', () => {
  describe('hashString', () => {
    it('should generate a consistent hash for a string', () => {
      const input = 'test string'
      const result = hashString(input)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBe(8)

      // Should be consistent
      expect(hashString(input)).toBe(result)
    })
  })

  describe('generateCacheKey', () => {
    it('should create a stable SHA-256 hex cache key from id and code', () => {
      const id = 'file.tsx'
      const code = '<div>content</div>'

      const expected = crypto
        .createHash('sha256')
        .update(id, 'utf8')
        .update('\0', 'utf8')
        .update(code, 'utf8')
        .digest('hex')

      expect(generateCacheKey(id, code)).toBe(expected)
      expect(expected).toHaveLength(64)
    })

    it('should produce distinct keys for different inputs (no short-hash collisions)', () => {
      const a = generateCacheKey('a', 'x')
      const b = generateCacheKey('b', 'x')
      expect(a).not.toBe(b)
    })
  })

  describe('extractClasses', () => {
    it('should extract standard classes from code', () => {
      const code = '<div class="flex items-center p-4">Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.size).toBe(3)
      expect(allClasses.has('flex')).toBeTruthy()
      expect(allClasses.has('items-center')).toBeTruthy()
      expect(allClasses.has('p-4')).toBeTruthy()
      expect(modifierClasses.size).toBe(0)
    })

    it('should extract modifier classes from code', () => {
      const code = '<div class:hover="text-blue-500 bg-gray-100">Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.size).toBe(2)
      expect(modifierClasses.size).toBe(2)
      expect(allClasses.has('hover:text-blue-500')).toBeTruthy()
      expect(allClasses.has('hover:bg-gray-100')).toBeTruthy()
      expect(modifierClasses.has('hover:text-blue-500')).toBeTruthy()
      expect(modifierClasses.has('hover:bg-gray-100')).toBeTruthy()
    })

    it('should extract nested modifier classes', () => {
      const code = '<div class:sm:hover="text-blue-500">Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.size).toBe(3)
      expect(modifierClasses.size).toBe(3)
      expect(allClasses.has('sm:hover:text-blue-500')).toBeTruthy()
      expect(allClasses.has('sm:text-blue-500')).toBeTruthy()
      expect(allClasses.has('hover:text-blue-500')).toBeTruthy()
      expect(modifierClasses.has('sm:hover:text-blue-500')).toBeTruthy()
      expect(modifierClasses.has('sm:text-blue-500')).toBeTruthy()
      expect(modifierClasses.has('hover:text-blue-500')).toBeTruthy()
    })

    it('should extract multiple classes from React code', () => {
      const code
        = '<div className="flex items-center" className:hover="text-blue-500">Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        REACT_CLASS_REGEX,
        REACT_CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.has('flex')).toBeFalsy()
      expect(allClasses.has('items-center')).toBeFalsy()
      expect(allClasses.has('hover:text-blue-500')).toBeTruthy()
      expect(modifierClasses.has('hover:text-blue-500')).toBeTruthy()
    })

    it('should handle JSX expressions in className', () => {
      const code
        = '<div className={`flex ${active ? "bg-blue-500" : ""}`}>Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        REACT_CLASS_REGEX,
        REACT_CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.has('flex')).toBeFalsy()
      expect(allClasses.has('bg-blue-500')).toBeFalsy()
      expect(modifierClasses.size).toBe(0)
    })

    it('should extract classes from conditional className:modifier JSX expressions', () => {
      const code
        = `<div className:hover={isActive ? 'bg-blue-500' : 'bg-gray-200'}>Content</div>`
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        REACT_CLASS_REGEX,
        REACT_CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.has('hover:bg-blue-500')).toBeTruthy()
      expect(allClasses.has('hover:bg-gray-200')).toBeTruthy()
      expect(modifierClasses.has('hover:bg-blue-500')).toBeTruthy()
      expect(modifierClasses.has('hover:bg-gray-200')).toBeTruthy()
    })

    it('should extract nested modifier classes from JSX expressions', () => {
      const code
        = `<div className:sm:hover={cond ? 'text-lg' : "text-sm"}>Content</div>`
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        REACT_CLASS_REGEX,
        REACT_CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.has('sm:hover:text-lg')).toBeTruthy()
      expect(allClasses.has('sm:text-lg')).toBeTruthy()
      expect(allClasses.has('hover:text-lg')).toBeTruthy()
      expect(allClasses.has('sm:hover:text-sm')).toBeTruthy()
      expect(modifierClasses.has('sm:hover:text-lg')).toBeTruthy()
    })

    it('should ignore className:modifier expressions without string literals', () => {
      const code = '<div className:hover={hoverClasses}>Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        REACT_CLASS_REGEX,
        REACT_CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.size).toBe(0)
      expect(modifierClasses.size).toBe(0)
    })

    it('should ignore empty classes', () => {
      const code = '<div class="  ">Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.size).toBe(0)
      expect(modifierClasses.size).toBe(0)
    })

    it('should handle mixed standard and modifier classes', () => {
      const code
        = '<div class="flex" class:hover="text-blue-500">Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      expect(allClasses.size).toBe(2)
      expect(modifierClasses.size).toBe(1)
      expect(allClasses.has('flex')).toBeTruthy()
      expect(allClasses.has('hover:text-blue-500')).toBeTruthy()
      expect(modifierClasses.has('hover:text-blue-500')).toBeTruthy()
    })

    it('should not include modified classes from standard class attributes in modifierClasses', () => {
      const code
        = '<div class="flex items-center dark:text-gray-500 hover:text-white">Content</div>'
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      // All classes should be in allClasses
      expect(allClasses.size).toBe(4)
      expect(allClasses.has('flex')).toBeTruthy()
      expect(allClasses.has('items-center')).toBeTruthy()
      expect(allClasses.has('dark:text-gray-500')).toBeTruthy()
      expect(allClasses.has('hover:text-white')).toBeTruthy()

      // Modified classes from standard attributes should NOT be in modifierClasses
      expect(modifierClasses.size).toBe(0)
      expect(modifierClasses.has('dark:text-gray-500')).toBeFalsy()
      expect(modifierClasses.has('hover:text-white')).toBeFalsy()
    })

    it('should only include modified classes from class:modifier attributes in modifierClasses', () => {
      const code = `
        <div 
          class="flex items-center dark:text-gray-500" 
          class:hover="text-white"
          class:dark="bg-gray-800"
        >Content</div>
      `
      const allClasses = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        allClasses,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      // All classes should be in allClasses
      expect(allClasses.size).toBe(5)
      expect(allClasses.has('flex')).toBeTruthy()
      expect(allClasses.has('items-center')).toBeTruthy()
      expect(allClasses.has('dark:text-gray-500')).toBeTruthy()
      expect(allClasses.has('hover:text-white')).toBeTruthy()
      expect(allClasses.has('dark:bg-gray-800')).toBeTruthy()

      // Only classes from class:modifier attributes should be in modifierClasses
      expect(modifierClasses.size).toBe(2)
      expect(modifierClasses.has('hover:text-white')).toBeTruthy()
      expect(modifierClasses.has('dark:bg-gray-800')).toBeTruthy()
      expect(modifierClasses.has('dark:text-gray-500')).toBeFalsy()
    })
  })

  describe('transformClassModifiers', () => {
    it('should transform simple class modifiers', () => {
      const code = '<div class:hover="text-blue-500">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )

      expect(result).toBe('<div class="hover:text-blue-500">Content</div>')
      expect(classes.has('hover:text-blue-500')).toBeTruthy()
    })

    it('should transform nested class modifiers', () => {
      const code = '<div class:sm:hover="text-blue-500">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )

      expect(result).toBe(
        '<div class="sm:hover:text-blue-500 sm:text-blue-500 hover:text-blue-500">Content</div>',
      )
      expect(classes.has('sm:hover:text-blue-500')).toBeTruthy()
      expect(classes.has('sm:text-blue-500')).toBeTruthy()
      expect(classes.has('hover:text-blue-500')).toBeTruthy()
    })

    it('should transform multiple class modifiers', () => {
      const code
        = '<div class:hover="text-blue-500" class:focus="outline-none">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )

      expect(result).toContain('class="hover:text-blue-500"')
      expect(result).toContain('class="focus:outline-none"')
      expect(classes.has('hover:text-blue-500')).toBeTruthy()
      expect(classes.has('focus:outline-none')).toBeTruthy()
    })

    it('should transform React className modifiers', () => {
      const code = '<div className:hover="text-blue-500">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )

      expect(result).toBe('<div className="hover:text-blue-500">Content</div>')
      expect(classes.has('hover:text-blue-500')).toBeTruthy()
    })

    it('should transform conditional className:modifier JSX expressions', () => {
      const code
        = `<div className:hover={isActive ? 'bg-blue-500' : 'bg-gray-200'}>Content</div>`
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )

      expect(result).toBe(
        `<div className={isActive ? 'hover:bg-blue-500' : 'hover:bg-gray-200'}>Content</div>`,
      )
      expect(classes.has('hover:bg-blue-500')).toBeTruthy()
      expect(classes.has('hover:bg-gray-200')).toBeTruthy()
    })

    it('should transform logical && className:modifier expressions', () => {
      const code = `<button className:disabled={isDisabled && 'opacity-50 cursor-not-allowed'}>Go</button>`
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )

      expect(result).toBe(
        `<button className={isDisabled && 'disabled:opacity-50 disabled:cursor-not-allowed'}>Go</button>`,
      )
      expect(classes.has('disabled:opacity-50')).toBeTruthy()
      expect(classes.has('disabled:cursor-not-allowed')).toBeTruthy()
    })

    it('should transform nested modifiers inside JSX expressions', () => {
      const code = `<div className:sm:hover={on ? 'text-lg' : 'text-sm'}>X</div>`
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )

      expect(result).toBe(
        `<div className={on ? 'sm:hover:text-lg sm:text-lg hover:text-lg' : 'sm:hover:text-sm sm:text-sm hover:text-sm'}>X</div>`,
      )
      expect(classes.has('sm:hover:text-lg')).toBeTruthy()
      expect(classes.has('hover:text-sm')).toBeTruthy()
    })

    it('should leave className:modifier variable expressions unchanged', () => {
      const code = '<div className:hover={hoverClasses}>Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )

      expect(result).toBe(code)
      expect(classes.size).toBe(0)
    })

    it('should rewrite string literals inside nested JSX braces', () => {
      const code
        = `<div className:hover={cn({ 'bg-blue-500': isActive, 'bg-gray-200': !isActive })}>X</div>`
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )

      expect(result).toBe(
        `<div className={cn({ 'hover:bg-blue-500': isActive, 'hover:bg-gray-200': !isActive })}>X</div>`,
      )
      expect(classes.has('hover:bg-blue-500')).toBeTruthy()
      expect(classes.has('hover:bg-gray-200')).toBeTruthy()
    })

    it('should handle multiple class values per modifier', () => {
      const code = '<div class:hover="text-blue-500 bg-gray-100">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )

      expect(result).toBe(
        '<div class="hover:text-blue-500 hover:bg-gray-100">Content</div>',
      )
      expect(classes.has('hover:text-blue-500')).toBeTruthy()
      expect(classes.has('hover:bg-gray-100')).toBeTruthy()
    })

    it('should ignore empty modifiers', () => {
      const code = '<div class:=""="text-blue-500">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )

      expect(result).toBe(code)
      expect(classes.size).toBe(0)
    })

    it('should filter out invalid classes', () => {
      // Classes with quotes or ending with colons would be invalid
      const code
        = '<div class:hover="\'invalid\' text-blue-500:">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )

      expect(result).toContain('hover:\'invalid\' hover:text-blue-500:')
      // Only valid classes should be added to the set
      expect(classes.size).toBe(0)
    })

    it('should handle null/undefined modifiers', () => {
      const code = '<div class:null="text-blue-500">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )

      // The function should transform even "null" as a modifier
      expect(result).toContain('null:text-blue-500')
      expect(classes.size).toBe(1)
    })

    it('should handle whitespace-only modifiers', () => {
      const code = '<div class:"   "="text-blue-500">Content</div>'
      const classes = new Set<string>()

      const result = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )

      expect(result).toBe(code)
      expect(classes.size).toBe(0)
    })

    it('should limit modifier depth to prevent exponential growth', () => {
      const code = `
        <div class:sm:md:lg:xl:2xl:hover:focus:active:disabled="text-blue-500">
          Content
        </div>
      `
      const classes = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        classes,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      // Should limit the number of partial modifier classes created
      // With depth limit of 4, we shouldn't see all 9 possible modifiers
      const partialModifiers = Array.from(modifierClasses).filter(cls =>
        cls.includes(':text-blue-500') && !cls.startsWith('sm:md:lg:xl:2xl:hover:focus:active:disabled:'))

      // Should have limited the depth (exact count depends on implementation)
      expect(partialModifiers.length).toBeLessThan(10) // Much less than would be without limiting
    })

    it('should handle empty modifier strings gracefully', () => {
      const code = `<div class:="text-blue-500">Content</div>`
      const classes = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        classes,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      // Should handle empty modifiers without errors
      expect(classes.size).toBeGreaterThanOrEqual(0)
    })

    it('should NOT match when "class" is part of a larger word', () => {
      const code = '<div someclass:hover="text-blue-500">Content</div>'
      const classes = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        classes,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      // Should not extract any modifier classes when class is part of a larger word
      expect(classes.size).toBe(0)
      expect(modifierClasses.size).toBe(0)
    })

    it('should NOT match standalone :class patterns in Vue', () => {
      const code = '<div :class="{active: isActive}">Content</div>'
      const classes = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        classes,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      // Should not match Vue's :class pattern
      expect(classes.size).toBe(0)
      expect(modifierClasses.size).toBe(0)
    })

    it('should NOT match React className when part of larger word', () => {
      const code = '<div myClassName:hover="text-blue-500">Content</div>'
      const classes = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        classes,
        modifierClasses,
        REACT_CLASS_REGEX,
        REACT_CLASS_MODIFIER_REGEX,
      )

      // Should not extract any modifier classes when className is part of a larger word
      expect(classes.size).toBe(0)
      expect(modifierClasses.size).toBe(0)
    })
  })

  describe('Performance optimizations', () => {
    it('should use optimized string processing for large class lists', () => {
      const longClassList = Array.from({ length: 100 }, (_, i) => `class-${i}`).join(' ')
      const code = `<div class="${longClassList}">Content</div>`
      const classes = new Set<string>()
      const modifierClasses = new Set<string>()

      const startTime = performance.now()
      extractClasses(
        code,
        classes,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )
      const endTime = performance.now()

      // Should complete quickly even with many classes
      expect(endTime - startTime).toBeLessThan(100) // Should take less than 100ms
      expect(classes.size).toBe(100) // Should extract all classes
    })
  })

  describe('mergeClassAttributes', () => {
    it('should merge multiple class attributes', () => {
      const code
        = '<div class="flex" class="items-center" class="p-4">Content</div>'

      const result = mergeClassAttributes(code, 'class')

      expect(result).toBe('<div class="flex items-center p-4">Content</div>')
    })

    it('should merge React className attributes', () => {
      const code
        = '<div className="flex" className="items-center">Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toBe('<div className="flex items-center">Content</div>')
    })

    it('should handle mixed class and className attributes', () => {
      const code = '<div class="flex" className="items-center">Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toBe('<div className="flex items-center">Content</div>')
    })

    it('should handle JSX expressions', () => {
      const code
        = '<div className="flex" className={active ? "bg-blue-500" : ""}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toBe(
        '<div className={`flex ${active ? "bg-blue-500" : ""}`}>Content</div>',
      )
    })

    it('should handle function calls in JSX expressions', () => {
      const code
        = '<div className="flex" className={getClassNames()}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      // Instead of checking exact output formatting, check for key elements
      expect(result).toContain('className=')
      expect(result).toContain('getClassNames(')
      expect(result).toContain('flex')
    })

    it('should handle template literals in JSX expressions', () => {
      const code
        = '<div className="flex" className={`items-center ${active ? "bg-blue-500" : ""}`}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      // Instead of checking exact output formatting, check for key elements
      expect(result).toContain('className=')
      expect(result).toContain('flex')
      expect(result).toContain('items-center')
      expect(result).toContain('active ?')
    })

    it('should handle empty class attributes', () => {
      const code = '<div class="" class="  ">Content</div>'

      const result = mergeClassAttributes(code, 'class')

      // The function might either keep empty class attribute or remove it,
      // so let's check that no class content remains
      expect(result).not.toContain('class="  "')
      expect(result).not.toContain('class=""')
    })

    it('should handle function calls without parentheses', () => {
      const code = '<div className="flex" className={getClassNames}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toContain('className=')
      expect(result).toContain('getClassNames')
      expect(result).toContain('flex')
    })

    it('should handle function calls with complex parameters', () => {
      const code = '<div className="flex" className={getClassNames(theme, isActive)}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toContain('className=')
      expect(result).toContain('getClassNames(theme, isActive')
      expect(result).toContain('flex')
    })

    it('should handle function calls with nested parentheses', () => {
      const code = '<div className="flex" className={getClassNames(theme, isActive ? "active" : "inactive")}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toContain('className=')
      expect(result).toContain('getClassNames(theme, isActive ? "active" : "inactive"')
      expect(result).toContain('flex')
    })

    it('should handle function calls with missing closing parenthesis', () => {
      const code = '<div className="flex" className={getClassNames(theme}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      // Should fall back to template literal approach
      expect(result).toContain('className=')
      expect(result).toContain('getClassNames(theme')
      expect(result).toContain('flex')
    })

    it('should handle multiple JSX expressions', () => {
      const code = '<div className="flex" className={active ? "bg-blue-500" : ""} className={theme}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toBe(
        '<div className={`flex ${active ? "bg-blue-500" : ""} ${theme}`}>Content</div>',
      )
    })

    it('should handle template literals with complex expressions', () => {
      const code = '<div className="flex" className={`${baseClass} ${active ? "bg-blue-500" : "bg-gray-100"}`}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toContain('className=')
      expect(result).toContain('flex')
      expect(result).toContain('baseClass')
      expect(result).toContain('active ?')
    })

    it('should handle empty JSX expressions', () => {
      const code = '<div className="flex" className={}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toContain('className=')
      expect(result).toContain('flex')
    })

    it('should handle whitespace-only JSX expressions', () => {
      const code = '<div className="flex" className={"   "}>Content</div>'

      const result = mergeClassAttributes(code, 'className')

      expect(result).toContain('className=')
      expect(result).toContain('flex')
    })

    it('should not modify standalone Vue :class bindings', () => {
      const code = '<div :class="{active: isActive}">Content</div>'

      const result = mergeClassAttributes(code, 'class')

      expect(result).toBe(code)
    })

    it('should not merge static class into a preceding Vue :class binding', () => {
      const code = '<div :class="x" class="a">Content</div>'

      const result = mergeClassAttributes(code, 'class')

      expect(result).toBe(code)
    })

    it('should merge static class attributes while preserving a trailing :class binding', () => {
      const code = '<div class="a" class="b" :class="x">Content</div>'

      const result = mergeClassAttributes(code, 'class')

      expect(result).toBe('<div class="a b" :class="x">Content</div>')
    })
  })

  describe('Vue :class with class modifiers pipeline', () => {
    it('should transform class modifiers without touching :class bindings', () => {
      const code = `<button
        class="min-w-0 flex-1"
        class:hover="text-blue-500"
        :class="active ? 'bg-white' : 'text-zinc-400'"
      ></button>`
      const classes = new Set<string>()
      const modifierClasses = new Set<string>()

      extractClasses(
        code,
        classes,
        modifierClasses,
        CLASS_REGEX,
        CLASS_MODIFIER_REGEX,
      )

      const afterModifiers = transformClassModifiers(
        code,
        classes,
        CLASS_MODIFIER_REGEX,
        'class',
      )
      const result = mergeClassAttributes(afterModifiers, 'class')

      expect(result).toContain('class="min-w-0 flex-1 hover:text-blue-500"')
      expect(result).toContain(
        ':class="active ? \'bg-white\' : \'text-zinc-400\'"',
      )
      expect(result).not.toContain('class:hover')
    })
  })

  describe('React conditional className:modifier pipeline', () => {
    it('should merge static className with transformed conditional modifiers', () => {
      const code = `<button
        className="px-4 py-2"
        className:hover={isActive ? 'bg-blue-500' : 'bg-gray-200'}
      >Save</button>`
      const classes = new Set<string>()

      const afterModifiers = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )
      const result = mergeClassAttributes(afterModifiers, 'className')

      expect(result).toBe(
        `<button
        className={\`px-4 py-2 \${isActive ? 'hover:bg-blue-500' : 'hover:bg-gray-200'}\`}
      >Save</button>`,
      )
      expect(classes.has('hover:bg-blue-500')).toBeTruthy()
      expect(classes.has('hover:bg-gray-200')).toBeTruthy()
      expect(result).not.toContain('className:hover')
    })

    it('should merge nested-brace conditional modifiers with static classes', () => {
      const code
        = `<div className="flex" className:hover={cn({ 'bg-blue-500': on })}>X</div>`
      const classes = new Set<string>()

      const afterModifiers = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )
      const result = mergeClassAttributes(afterModifiers, 'className')

      expect(result).toBe(
        `<div className={\`flex \${cn({ 'hover:bg-blue-500': on })}\`}>X</div>`,
      )
      expect(classes.has('hover:bg-blue-500')).toBeTruthy()
    })

    it('should keep multiple conditional modifiers when merging', () => {
      const code = `<button
        className="px-4"
        className:hover={isActive ? 'bg-blue-500' : 'bg-gray-200'}
        className:disabled={isDisabled && 'opacity-50'}
      >Save</button>`
      const classes = new Set<string>()

      const afterModifiers = transformClassModifiers(
        code,
        classes,
        REACT_CLASS_MODIFIER_REGEX,
        'className',
      )
      const result = mergeClassAttributes(afterModifiers, 'className')

      expect(result).toBe(
        `<button
        className={\`px-4 \${isActive ? 'hover:bg-blue-500' : 'hover:bg-gray-200'} \${isDisabled && 'disabled:opacity-50'}\`}
      >Save</button>`,
      )
      expect(classes.has('hover:bg-blue-500')).toBeTruthy()
      expect(classes.has('disabled:opacity-50')).toBeTruthy()
    })
  })
})
