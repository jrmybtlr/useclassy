const SITE = 'https://useclassy.com'

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

export { default as docsMarkdown } from '../../../../README.md?raw'

export const llmsTxt = `# UseClassy

> A Vite plugin that turns \`class:hover\` / \`className:focus\` attributes into normal Tailwind CSS and UnoCSS classes. No runtime.

## Docs

- [Home](${SITE}/index.md): Product overview and quick start
- [Documentation](${SITE}/docs.md): Install, usage, Vite, Tailwind, UnoCSS, IntelliSense, agent skill

## Optional

- [Website](${SITE}/): Marketing site
- [GitHub](https://github.com/jrmybtlr/useclassy): Source code
`

export function llmsFullTxt(docs: string): string {
  return `${indexMarkdown.trim()}\n\n---\n\n${docs.trim()}\n`
}
