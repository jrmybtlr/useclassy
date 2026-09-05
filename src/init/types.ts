export type TailwindFlavor = 'v4' | 'v3' | 'unknown'
export type CssEngineDetection = 'tailwind' | 'unocss' | 'both' | 'unknown'

export const INIT_LANGUAGES = ['vue', 'react', 'blade', 'svelte'] as const
export type InitLanguage = (typeof INIT_LANGUAGES)[number]

export const INIT_ENGINES = ['tailwind', 'unocss'] as const
export type InitEngine = (typeof INIT_ENGINES)[number]

export type FilePatchResult = {
  path: string
  changed: boolean
  error?: string
  /** True when a differing local file was left alone (use --force to overwrite). */
  skipped?: boolean
}

export interface InitSetupResult {
  viteConfig?: string
  tailwind?: string
  unocss?: string
  vscodeSettings?: string
  vscodeExtensions?: string
  tsConfig?: string
  agentFiles?: string[]
  messages: string[]
}
