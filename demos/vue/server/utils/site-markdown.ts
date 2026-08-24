import type { H3Event } from 'h3'
import docsMarkdown from 'virtual:site-readme'

const SITE = 'https://useclassy.com'

export { docsMarkdown }

export function sendMarkdown(event: H3Event, body: string) {
  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  appendResponseHeader(event, 'link', '</llms.txt>; rel="describedby"')
  return body
}

export const indexMarkdown = `# UseClassy

Readable utility CSS. No horizontal scroll.

A Vite plugin that turns variant attributes (\`class:hover\`, \`className:focus\`) into normal Tailwind CSS and UnoCSS classes. No runtime. Place it before your CSS engine.

- HTML: ${SITE}/
- Docs: ${SITE}/docs.md
- GitHub: https://github.com/jrmybtlr/useclassy

## Quick start

\`\`\`bash
npm i -D vite-plugin-useclassy
npx vite-plugin-useclassy init
\`\`\`

\`init\` patches Vite and your CSS engine. See the [docs](${SITE}/docs.md) for Usage, Vite, Tailwind, UnoCSS, IntelliSense, and the agent skill.
`

export const llmsTxt = `# UseClassy

> A Vite plugin that turns \`class:hover\` / \`className:focus\` attributes into normal Tailwind CSS and UnoCSS classes. No runtime.

## Docs

- [Home](${SITE}/index.md): Product overview and quick start
- [Documentation](${SITE}/docs.md): Install, usage, Vite, Tailwind, UnoCSS, IntelliSense, agent skill

## Optional

- [Website](${SITE}/): Marketing site
- [Full documentation](${SITE}/llms-full.txt): Home plus the complete README in one file
- [GitHub](https://github.com/jrmybtlr/useclassy): Source code
`

export function llmsFullTxt(docs: string): string {
  return `${indexMarkdown.trim()}\n\n---\n\n${docs.trim()}\n`
}
