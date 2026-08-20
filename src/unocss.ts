import {
  getUseClassyManifestPath,
  type UseClassyManifestPathsOptions,
} from './manifest'

/** Options for UnoCSS path helpers (same shape as shared manifest helpers). */
export type UseClassyUnoPathsOptions = UseClassyManifestPathsOptions

/**
 * UnoCSS `content.filesystem` entry (relative to typical config-at-root layouts).
 *
 * Vite apps mainly work because UseClassy runs `enforce: 'pre'` and rewrites
 * `class:hover` before Uno's pipeline extract. Point `content.filesystem` at
 * the HTML manifest as a backstop for files outside that pipeline (`.ts`/`.js`
 * by default, Blade, HTML that never enters Vite).
 */
export function getUseClassyUnoFilesystemEntry(
  options?: UseClassyUnoPathsOptions,
): string {
  return `./${getUseClassyManifestPath(options)}`
}
