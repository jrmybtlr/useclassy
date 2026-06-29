import { useMemo, type DependencyList } from 'react'

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
    return arg
      .map(item => (typeof item === 'string' ? item : ''))
      .filter(Boolean)
      .join(' ')
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
  const deps: DependencyList = useMemo(
    () =>
      args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)),
    [JSON.stringify(args)],
  )

  return useMemo(() => joinClassyArgs(args), deps)
}

/** Combine class names (strings, conditional maps, or nested arrays). */
export function classy(...args: ClassyArg[]): string {
  return joinClassyArgs(args)
}
