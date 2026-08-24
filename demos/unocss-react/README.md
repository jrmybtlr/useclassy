# UseClassy + UnoCSS (React)

Phase 1 canary for `engine: 'unocss'`. The transform is the same as Tailwind.

```bash
pnpm install
pnpm --filter unocss-react-demo dev
```

Key wiring:

- `useClassy({ language: 'react', engine: 'unocss' })` — `enforce: 'pre'`, before `unocss/vite`, skips Tailwind `@source`
- Vite pipeline extract sees rewritten `hover:…` classes
- `uno.config.ts` — `content.filesystem` is a backstop (files outside Uno's pipeline)
- Entry imports `virtual:uno.css`

Variant-attribute oriented (`className:hover`), not attributify-first. `presetUno` only — not Wind4 / shortcuts / variant groups.

Open the **Chained modifier** case: `className:sm:hover="underline"` underlines only at `sm` + hover, the same as `className="sm:hover:underline"`.

`pnpm --filter unocss-react-demo build` greps the emitted CSS for a utility that exists only as `className:hover` in source.
