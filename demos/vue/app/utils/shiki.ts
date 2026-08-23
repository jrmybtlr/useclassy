import { createHighlighter, createJavaScriptRegexEngine, type BundledLanguage } from 'shiki'

const LANGS = [
  'html',
  'vue',
  'tsx',
  'jsx',
  'typescript',
  'javascript',
  'css',
  'json',
  'bash',
  'svelte',
] as const satisfies BundledLanguage[]

const LANG_ALIASES: Record<string, BundledLanguage> = {
  ts: 'typescript',
  js: 'javascript',
  sh: 'bash',
  shell: 'bash',
  bash: 'bash',
  vue: 'vue',
  html: 'html',
  css: 'css',
  json: 'json',
  tsx: 'tsx',
  jsx: 'jsx',
  svelte: 'svelte',
  blade: 'html',
}

export const SHIKI_THEME = 'github-dark' as const

let highlighterPromise: ReturnType<typeof createHighlighter> | undefined

async function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    engine: createJavaScriptRegexEngine({ forgiving: true }),
    themes: [SHIKI_THEME],
    langs: [...LANGS],
  })
  const highlighter = await highlighterPromise
  if (!highlighter.getLoadedThemes().includes(SHIKI_THEME)) {
    await highlighter.loadTheme(SHIKI_THEME)
  }
  return highlighter
}

function resolveLang(lang?: string): BundledLanguage | undefined {
  if (!lang) return undefined
  const key = lang.trim().toLowerCase()
  if (key in LANG_ALIASES) return LANG_ALIASES[key]
  if ((LANGS as readonly string[]).includes(key)) return key as BundledLanguage
  return undefined
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function toLineHtml(code: string): string {
  return code
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => `<span class="line">${escapeHtml(line)}</span>`)
    .join('')
}

export async function highlightCode(code: string, lang?: string): Promise<string> {
  const resolved = resolveLang(lang)
  if (!resolved) return toLineHtml(code)

  try {
    const highlighter = await getHighlighter()
    const html = highlighter.codeToHtml(code, {
      lang: resolved,
      theme: SHIKI_THEME,
    })
    const inner = html.match(/<code[^>]*>([\s\S]*)<\/code>/)?.[1]
    if (!inner) return toLineHtml(code)
    // Shiki puts a newline between .line spans. Those plus display:block double-space.
    return inner.replace(/>\r?\n</g, '><')
  } catch {
    return toLineHtml(code)
  }
}
