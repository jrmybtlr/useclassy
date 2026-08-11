import {
  getUseClassyManifestPath,
  type UseClassyTailwindPathsOptions,
} from './tailwind'

/** Options for UnoCSS path helpers (same shape as Tailwind helpers). */
export type UseClassyUnoPathsOptions = UseClassyTailwindPathsOptions

/**
 * UnoCSS `content.filesystem` entry (relative to typical config-at-root layouts).
 * Point Uno at the UseClassy HTML manifest so `hover:…` utilities are extracted
 * even when source still uses `class:hover="…"`.
 */
export function getUseClassyUnoFilesystemEntry(
  options?: UseClassyUnoPathsOptions,
): string {
  return `./${getUseClassyManifestPath(options)}`
}
