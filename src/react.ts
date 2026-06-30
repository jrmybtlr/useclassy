import { useMemo } from 'react'

type ClassyArg =
  | string
  | Record<string, boolean>
  | (string | Record<string, boolean>)[]

function classStringFromArg(arg: ClassyArg): string {
  if (typeof arg === 'string')
    return arg

  if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
    return Object.entries(arg)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .join(' ')
  }

  if (Array.isArray(arg)) {
    return arg.map(item => classStringFromArg(item)).filter(Boolean).join(' ')
  }

  return ''
}

function joinClassyArgs(parts: ClassyArg[]): string {
  return parts.map(classStringFromArg).filter(Boolean).join(' ')
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

/** Combine class names (strings, conditional maps, or nested arrays). */
export function classy(...args: ClassyArg[]): string {
  return joinClassyArgs(args)
}
