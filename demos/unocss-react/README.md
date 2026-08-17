# UseClassy + UnoCSS (React)

Canary demo for `engine: 'unocss'`.

```bash
pnpm install
pnpm --filter unocss-react-demo dev
```

Key wiring:

- `useClassy({ language: 'react', engine: 'unocss' })` — skips Tailwind `@source` inject
- `uno.config.ts` — `content.filesystem` includes `.classy/output.classy.html`
- Entry imports `virtual:uno.css`

Variant-attribute oriented (`className:hover`), not attributify-first.
