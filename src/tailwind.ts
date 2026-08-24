import path from 'path'

import {
  getUseClassyManifestPath,
  referencesUseClassyManifest,
  resolvedOutputDir,
  resolvedOutputFile,
  type UseClassyManifestPathsOptions,
} from './manifest'

export {
  USECLASSY_DEFAULT_OUTPUT_DIR,
  USECLASSY_DEFAULT_OUTPUT_FILE,
  getUseClassyManifestPath,
  type UseClassyManifestPathsOptions,
  type UseClassyTailwindPathsOptions,
} from './manifest'

/**
 * Tailwind v3 `content` entry (relative to typical config-at-root layouts).
 */
export function getUseClassyTailwindV3ContentEntry(
  options?: UseClassyManifestPathsOptions,
): string {
  return `./${getUseClassyManifestPath(options)}`
}

/**
 * Tailwind v4 `@source` line when the stylesheet lives at the project root next to `.classy/`.
 * Prefer {@link getUseClassyTailwindSourceDirective} when the CSS file is under `src/` etc.
 */
export function getUseClassyTailwindSourceLineForRootStylesheet(
  options?: UseClassyManifestPathsOptions,
): string {
  return `@source "./${getUseClassyManifestPath(options)}";`
}

/**
 * Tailwind v4 `@source` directive with a path relative to the given stylesheet file.
 */
export function getUseClassyTailwindSourceDirective(
  stylesheetAbsolutePath: string,
  projectRoot: string,
  options?: UseClassyManifestPathsOptions,
): string {
  const manifestAbs = path.join(
    projectRoot,
    resolvedOutputDir(options),
    resolvedOutputFile(options),
  )
  const rel = path.relative(
    path.dirname(path.resolve(stylesheetAbsolutePath)),
    manifestAbs,
  )
  const posix = rel.split(path.sep).join('/')
  const normalized = posix.startsWith('.') ? posix : `./${posix}`
  return `@source "${normalized}";`
}

export type InjectTailwindSourceOptions = {
  enabled: boolean
  manifestRoot: string
  outputDir: string
  outputFileName: string
  debug?: boolean
}

/**
 * When enabled, insert a Tailwind v4 `@source` directive after `@import "tailwindcss"`.
 * Returns the rewritten CSS, or `null` when no change is needed.
 */
export function injectTailwindSourceIfNeeded(
  code: string,
  id: string,
  options: InjectTailwindSourceOptions,
): string | null {
  const cssPath = id.split('?', 1)[0]?.split('#', 1)[0] ?? id
  if (!options.enabled || !cssPath.endsWith('.css'))
    return null
  if (!/@import\s+["']tailwindcss["']/.test(code))
    return null

  const pathOpts = {
    outputDir: options.outputDir,
    outputFileName: options.outputFileName,
  }
  if (referencesUseClassyManifest(code, options.outputFileName))
    return null

  const directive = getUseClassyTailwindSourceDirective(
    cssPath,
    options.manifestRoot,
    pathOpts,
  )

  if (options.debug)
    console.log('🎩 Injecting Tailwind @source into:', id)

  return code.replace(
    /@import\s+["']tailwindcss["'];?\s*\n/,
    match => `${match}${directive}\n`,
  )
}
