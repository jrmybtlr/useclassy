import { describe, it, expect, vi } from 'vitest'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useMemo: (fn: () => unknown) => fn(),
  }
})

import { classy, useClassy, mods, useMods } from '../react'

describe('classy', () => {
  describe('string arguments', () => {
    it('should return a plain string unchanged', () => {
      expect(classy('foo bar')).toBe('foo bar')
    })

    it('should join multiple strings', () => {
      expect(classy('foo', 'bar', 'baz')).toBe('foo bar baz')
    })

    it('should ignore empty strings', () => {
      expect(classy('foo', '', 'bar')).toBe('foo bar')
    })
  })

  describe('object arguments', () => {
    it('should include keys where value is true', () => {
      expect(classy({ foo: true, bar: false, baz: true })).toBe('foo baz')
    })

    it('should return empty string when all values are false', () => {
      expect(classy({ foo: false })).toBe('')
    })
  })

  describe('array arguments', () => {
    it('should join string items in an array', () => {
      expect(classy(['foo', 'bar'])).toBe('foo bar')
    })

    it('should handle objects inside arrays', () => {
      expect(classy(['foo', { bar: true, baz: false }])).toBe('foo bar')
    })

    it('should skip falsy-valued object keys inside arrays', () => {
      expect(classy([{ active: false, disabled: false }])).toBe('')
    })

    it('should combine mixed string and object array items', () => {
      expect(classy(['px-4', { 'text-red-500': true, 'text-blue-500': false }, 'py-2'])).toBe(
        'px-4 text-red-500 py-2',
      )
    })
  })

  describe('mixed argument types', () => {
    it('should combine strings and objects at the top level', () => {
      expect(classy('flex', { 'items-center': true, hidden: false }, 'gap-2')).toBe(
        'flex items-center gap-2',
      )
    })

    it('should combine strings and arrays', () => {
      expect(classy('flex', ['items-center', 'gap-2'])).toBe('flex items-center gap-2')
    })

    it('should combine mods() output with other classy args', () => {
      expect(classy('rounded', mods({ '@md': 'p-4' }), { hidden: false })).toBe('rounded @md:p-4')
    })
  })
})

describe('mods', () => {
  it('prefixes tokens with real Tailwind modifier names including @ and /', () => {
    expect(
      mods({
        '@md': 'p-4 text-base',
        'group-hover/item': 'bg-red-500',
      }),
    ).toBe('@md:p-4 @md:text-base group-hover/item:bg-red-500')
  })

  it('skips falsy values', () => {
    expect(
      mods({
        '@md': 'p-4',
        'group-hover/item': false,
        hover: null,
        focus: undefined,
        dark: '',
      }),
    ).toBe('@md:p-4')
  })

  it('is available as classy.mods', () => {
    expect(classy.mods({ '@md': 'p-6' })).toBe('@md:p-6')
  })

  it('supports chained modifier keys', () => {
    expect(mods({ 'sm:hover': 'underline' })).toBe('sm:hover:underline')
  })
})

describe('useClassy', () => {
  it('should match classy for the same arguments', () => {
    expect(useClassy('foo', { bar: true }, ['baz'])).toBe(classy('foo', { bar: true }, ['baz']))
  })

  it('should join mixed class arguments', () => {
    expect(useClassy('px-4', { 'text-red-500': true, hidden: false }, 'py-2')).toBe(
      'px-4 text-red-500 py-2',
    )
  })
})

describe('useMods', () => {
  it('should match mods for the same map', () => {
    const map = { '@md': 'p-4', 'group-hover/item': 'opacity-100' as string | false }
    expect(useMods(map)).toBe(mods(map))
  })
})
