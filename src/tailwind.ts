import path from 'path'

/** Default `outputDir` for UseClassy (matches plugin defaults). */
export const USECLASSY_DEFAULT_OUTPUT_DIR = '.classy'

/** Default `outputFileName` for UseClassy (matches plugin defaults). */
export const USECLASSY_DEFAULT_OUTPUT_FILE = 'output.classy.html'

export interface UseClassyTailwindPathsOptions {
  outputDir?: string
  outputFileName?: string
}

function resolvedOutputDir(options?: UseClassyTailwindPathsOptions): string {
  return options?.outputDir ?? USECLASSY_DEFAULT_OUTPUT_DIR
}

function resolvedOutputFile(options?: UseClassyTailwindPathsOptions): string {
  return options?.outputFileName ?? USECLASSY_DEFAULT_OUTPUT_FILE
}

function toPosixPath(segment: string): string {
  return segment.replace(/\\/g, '/')
}

/**
 * POSIX-style path from project root to the generated class manifest, e.g. `.classy/output.classy.html`.
 */
export function getUseClassyManifestPath(
  options?: UseClassyTailwindPathsOptions,
): string {
  const dir = toPosixPath(resolvedOutputDir(options))
  const file = toPosixPath(resolvedOutputFile(options))
  return `${dir}/${file}`
}

/**
 * Tailwind v3 `content` entry (relative to typical config-at-root layouts).
 */
export function getUseClassyTailwindV3ContentEntry(
  options?: UseClassyTailwindPathsOptions,
): string {
  return `./${getUseClassyManifestPath(options)}`
}

/**
 * Tailwind v4 `@source` line when the stylesheet lives at the project root next to `.classy/`.
 * Prefer {@link getUseClassyTailwindSourceDirective} when the CSS file is under `src/` etc.
 */
export function getUseClassyTailwindSourceLineForRootStylesheet(
  options?: UseClassyTailwindPathsOptions,
): string {
  return `@source "./${getUseClassyManifestPath(options)}";`
}

/**
 * Tailwind v4 `@source` directive with a path relative to the given stylesheet file.
 */
export function getUseClassyTailwindSourceDirective(
  stylesheetAbsolutePath: string,
  projectRoot: string,
  options?: UseClassyTailwindPathsOptions,
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
