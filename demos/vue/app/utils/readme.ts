import { lexer, type Token } from 'marked'
import src from '../../../../README.md?raw'

const GITHUB_REPO = 'https://github.com/jrmybtlr/useclassy'
const SITE = 'https://useclassy.com'

export function slugify(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export const readmeTokens: Token[] = lexer(src)

export type ReadmeHeading = {
  id: string
  text: string
}

export const readmeHeadings: ReadmeHeading[] = readmeTokens.flatMap((token) => {
  if (token.type !== 'heading' || token.depth !== 2) return []
  return [{ id: slugify(token.text), text: token.text }]
})

export function rewriteHref(href: string): string {
  if (!href || href.startsWith('#')) return href
  if (href === SITE || href === `${SITE}/` || href === '/') return '/'
  if (href.startsWith(`${SITE}/`)) return href.slice(SITE.length) || '/'
  if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) return href
  const clean = href.replace(/^\.\//, '')
  return `${GITHUB_REPO}/tree/main/${clean}`
}

export function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//')
}
