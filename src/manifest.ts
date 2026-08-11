/** Default `outputDir` for UseClassy (matches plugin defaults). */
export const USECLASSY_DEFAULT_OUTPUT_DIR = '.classy'

/** Default `outputFileName` for UseClassy (matches plugin defaults). */
export const USECLASSY_DEFAULT_OUTPUT_FILE = 'output.classy.html'

/** Shared options for manifest path helpers (Tailwind, UnoCSS, etc.). */
export interface UseClassyManifestPathsOptions {
  outputDir?: string
  outputFileName?: string
}

/**
 * @deprecated Prefer {@link UseClassyManifestPathsOptions}. Kept for public API stability.
 */
export type UseClassyTailwindPathsOptions = UseClassyManifestPathsOptions

export function resolvedOutputDir(
  options?: UseClassyManifestPathsOptions,
): string {
  return options?.outputDir ?? USECLASSY_DEFAULT_OUTPUT_DIR
}

export function resolvedOutputFile(
  options?: UseClassyManifestPathsOptions,
): string {
  return options?.outputFileName ?? USECLASSY_DEFAULT_OUTPUT_FILE
}

function toPosixPath(segment: string): string {
  return segment.replace(/\\/g, '/')
}

/**
 * POSIX-style path from project root to the generated class manifest,
 * e.g. `.classy/output.classy.html`.
 */
export function getUseClassyManifestPath(
  options?: UseClassyManifestPathsOptions,
): string {
  const dir = toPosixPath(resolvedOutputDir(options))
  const file = toPosixPath(resolvedOutputFile(options))
  return `${dir}/${file}`
}
