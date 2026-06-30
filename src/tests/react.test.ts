import { describe, it, expect } from 'vitest'
import { classy } from '../react'

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
      expect(classy(['px-4', { 'text-red-500': true, 'text-blue-500': false }, 'py-2']))
        .toBe('px-4 text-red-500 py-2')
    })
  })

  describe('mixed argument types', () => {
    it('should combine strings and objects at the top level', () => {
      expect(classy('flex', { 'items-center': true, hidden: false }, 'gap-2'))
        .toBe('flex items-center gap-2')
    })

    it('should combine strings and arrays', () => {
      expect(classy('flex', ['items-center', 'gap-2'])).toBe('flex items-center gap-2')
    })
  })
})
