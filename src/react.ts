import { useMemo, DependencyList } from 'react'

/**
 * A custom React hook for combining class names
 * This is similar to the classnames package but optimized for react and memoization
 */
export function useClassy(...args: (string | Record<string, boolean> | (string | Record<string, boolean>)[])[]): string {
  // Create stable dependency list by stringifying object arguments
  const deps: DependencyList = useMemo(
    () =>
      args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)),
    // This helps React correctly identify when dependencies change
    [JSON.stringify(args)],
  )

  return useMemo(() => {
    // Process each argument
    return args
      .map((arg) => {
        // Handle strings directly
        if (typeof arg === 'string') return arg

        // Handle objects (conditionally apply classes)
        if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
          return Object.entries(arg)
            .filter(([, value]) => Boolean(value))
            .map(([key]) => key)
            .join(' ')
        }

        // Handle arrays by recursively flattening
        if (Array.isArray(arg)) {
          return arg
            .map(item => (typeof item === 'string' ? item : ''))
            .filter(Boolean)
            .join(' ')
        }

        return ''
      })
      .filter(Boolean)
      .join(' ')
  }, deps)
}

/**
 * A simple function for combining class names without hooks
 * Can be used in cases where hooks aren't appropriate
 */
export function classy(...args: (string | Record<string, boolean> | (string | Record<string, boolean>)[])[]): string {
  return args
    .map((arg) => {
      // Handle strings directly
      if (typeof arg === 'string') return arg

      // Handle objects (conditionally apply classes)
      if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
        return Object.entries(arg)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ')
      }

      // Handle arrays by flattening
      if (Array.isArray(arg)) {
        return arg
          .map(item => (typeof item === 'string' ? item : ''))
          .filter(Boolean)
          .join(' ')
      }

      return ''
    })
    .filter(Boolean)
    .join(' ')
}
