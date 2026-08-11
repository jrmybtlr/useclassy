import {
  getUseClassyManifestPath,
  type UseClassyManifestPathsOptions,
} from './manifest'

/** Options for UnoCSS path helpers (same shape as shared manifest helpers). */
export type UseClassyUnoPathsOptions = UseClassyManifestPathsOptions

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
