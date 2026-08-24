import type {
  CssEngineDetection,
  InitEngine,
  TailwindFlavor,
} from './types'
import { detectTailwindFlavor } from './tailwind'
import { detectUnoPresent } from './unocss'

export function detectCssEngine(cwd: string): CssEngineDetection {
  const hasTw = detectTailwindFlavor(cwd) !== 'unknown'
  const hasUno = detectUnoPresent(cwd)
  if (hasTw && hasUno) return 'both'
  if (hasTw) return 'tailwind'
  if (hasUno) return 'unocss'
  return 'unknown'
}

/**
 * Resolve which engine init should configure.
 * Explicit `--engine` wins; otherwise prefer Tailwind when both are present.
 */
export function resolveInitEngine(
  cwd: string,
  explicit?: InitEngine,
): InitEngine {
  if (explicit) return explicit
  const detected = detectCssEngine(cwd)
  if (detected === 'unocss') return 'unocss'
  return 'tailwind'
}

export type { CssEngineDetection, TailwindFlavor }
