import 'react'
import { useMemo } from 'react'

/** Allowed values for UseClassy `class:` / `className:` JSX attributes. */
export type ClassyAttrValue = string | number | boolean | null | undefined

declare module 'react' {
  interface HTMLAttributes<T> {
    [key: `class:${string}`]: ClassyAttrValue
    [key: `className:${string}`]: ClassyAttrValue
  }

  interface SVGAttributes<T> {
    [key: `class:${string}`]: ClassyAttrValue
    [key: `className:${string}`]: ClassyAttrValue
  }
}

type ClassyArg = string | Record<string, boolean> | (string | Record<string, boolean>)[]

/**
 * Modifier map for React when the variant name is not a valid JSX attribute
 * (`@md`, `group-hover/item`, arbitrary variants, etc.). Keys are real Tailwind
 * / UnoCSS variant names — the same spelling as in CSS utilities.
 */
export type ModsMap = Record<string, string | false | null | undefined>

/**
 * Props helper for components that accept UseClassy modifier attributes.
 * For global JSX typing, import this module or add:
 * `/// <reference types="vite-plugin-useclassy/react" />`
 */
export type ClassyProps<TProps = object> = TProps & {
  [key: `class:${string}`]: ClassyAttrValue
  [key: `className:${string}`]: ClassyAttrValue
  className?: string
}

function tokenizeClasses(str: string, callback: (token: string) => void): void {
  let start = 0
  const len = str.length
  for (let i = 0; i <= len; i++) {
    const ch = str[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || i === len) {
      if (i > start) callback(str.substring(start, i))
      start = i + 1
    }
  }
}

function classStringFromArg(arg: ClassyArg): string {
  if (typeof arg === 'string') return arg

  if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
    return Object.entries(arg)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .join(' ')
  }

  if (Array.isArray(arg)) {
    // `ClassyArg` arrays only contain string | Record<string,boolean> items (no nested arrays),
    // so this recursion is bounded to one level deep.
    return arg
      .map((item) => classStringFromArg(item))
      .filter(Boolean)
      .join(' ')
  }

  return ''
}

function joinClassyArgs(parts: ClassyArg[]): string {
  return parts.map(classStringFromArg).filter(Boolean).join(' ')
}

/**
 * Prefix class tokens with real Tailwind/UnoCSS variant names.
 * Use this in React when JSX cannot spell the modifier as an attribute
 * (`@md`, `group-hover/item`, `[&>*]`, …):
 *
 * ```tsx
 * <div className={classy('rounded', mods({ '@md': 'p-4', 'group-hover/item': 'bg-red-500' }))} />
 * ```
 *
 * Prefer `className:hover` (and other JSX-valid attributes) when the name is legal.
 */
export function mods(map: ModsMap): string {
  const parts: string[] = []
  for (const [modifier, value] of Object.entries(map)) {
    if (value === false || value === null || value === undefined || value === '') continue
    if (!modifier.trim()) continue
    tokenizeClasses(value, (token) => {
      parts.push(`${modifier}:${token}`)
    })
  }
  return parts.join(' ')
}

/**
 * Memoized `mods` for React (same rules as `mods`).
 */
export function useMods(map: ModsMap): string {
  // JSON.stringify provides value-based memoization; map is intentionally omitted
  // from the dependency array because it changes reference on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => mods(map), [JSON.stringify(map)])
}

/**
 * Memoized class string builder for React (same rules as `classy`).
 */
export function useClassy(...args: ClassyArg[]): string {
  // JSON.stringify provides value-based memoization; args is intentionally omitted
  // from the dependency array because it changes reference on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => joinClassyArgs(args), [JSON.stringify(args)])
}

export interface ClassyFn {
  (...args: ClassyArg[]): string
  mods: typeof mods
}

/** Combine class names (strings, conditional maps, or nested arrays). */
export const classy: ClassyFn = Object.assign((...args: ClassyArg[]) => joinClassyArgs(args), {
  mods,
})
