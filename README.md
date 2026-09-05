# 🎩 UseClassy

A Vite plugin that automatically rewrites conditional class attributes like `class:hover` or `class:focus` into standard utility classes usable by Tailwind CSS and UnoCSS. UseClassy lets you write cleaner, more maintainable variant styles in your HTML, Vue, React, Blade, and Svelte code, with no runtime overhead.

```html
<button
  class="@container rounded px-4 bg-blue-600 text-white"
  class:hover="bg-blue-700"
  class:focus="ring-2 ring-blue-300"
  class:@md="px-6"
></button>
```

becomes `class="@container rounded px-4 bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 @md:px-6"`. There is no runtime. Put UseClassy before Tailwind or UnoCSS so those engines see the rewritten utilities.

## Install

```bash
npm i -D vite-plugin-useclassy
npx vite-plugin-useclassy init
```

`init` patches Vite and your CSS engine, plus VS Code IntelliSense for Tailwind. Run it from the app root (the folder with `package.json` and `vite.config.*`).

| Option          | Default     | Notes                                                           |
| --------------- | ----------- | --------------------------------------------------------------- |
| `--language`    | `'vue'`     | `'vue'` \| `'react'` \| `'blade'` \| `'svelte'`                 |
| `--engine`      | auto-detect | `'tailwind'` \| `'unocss'`; Tailwind wins if both are installed |
| `--with-skills` | `false`     | Agent skill, Cursor rules, and `AGENTS.md`                      |
| `--with-claude` | `false`     | Also copy to `.claude/skills/` (requires `--with-skills`)       |
| `--force`       | `false`     | Overwrite locally edited skill files                            |
| `--dry-run`     | `false`     | Print planned edits                                             |

If detection fails, follow the [manual setup](#vite) below.

## Usage

**Vue / HTML.** Use `class` plus `class:modifier`:

```vue
<button
  class="px-4 py-2 rounded bg-blue-600 text-white"
  class:hover="bg-blue-700 scale-105"
  class:focus="ring-2 ring-blue-300"
  class:disabled="opacity-50 cursor-not-allowed"
  class:dark="bg-sky-700"
/>
```

**React.** Use `className` and `className:hover`. JSX expressions work when the class tokens are string literals:

```tsx
<button
  className="px-4 py-2 rounded"
  className:hover={isActive ? 'bg-blue-500 text-white' : 'bg-gray-200'}
  className:@md="px-6"
  className:group-hover/item="bg-red-500"
  className:[&>*]="mt-2"
  className:data-[state=open]="block"
/>
```

Expressions with no string literals (`className:hover={hoverClasses}`) are left alone. Import types with `import 'vite-plugin-useclassy/react'` (or `ClassyProps`). React 18/19 is an optional peer, only needed for those helpers.

Quoted modifier values may use `"` or `'`. Prefer `"` in docs and new code.

`className:@md`, `className:group-hover/item`, and arbitrary variants like `className:[&>*]` / `className:data-[state=open]` use the same attribute spelling as Vue. UseClassy rewrites them before the JSX/HTML parser runs (bracket-aware so `=` inside `[…]` stays part of the name). Put UseClassy before `@vitejs/plugin-react`.

For editor TypeScript diagnostics, add the language plugin (React `init` does this automatically):

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "vite-plugin-useclassy/typescript-plugin" }]
  }
}
```

If your app uses Vite’s split config (`tsconfig.json` with `"files": []` referencing `tsconfig.app.json`), make the root config extend the app config instead — otherwise tsserver stops at the empty file list and never loads the plugin:

```json
{
  "extends": "./tsconfig.app.json",
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Keep `build` on `tsc -p tsconfig.node.json && vite build` so CLI `tsc` does not parse modifier attrs without the plugin.

Use the workspace TypeScript version in VS Code/Cursor (`js/ts.tsdk.path`: `node_modules/typescript/lib`, `js/ts.tsserver.useSyntaxServer`: `never`, enable “Use Workspace Version”). Oxlint and ESLint still parse source text directly, so keep smoke-demo `App.tsx` files ignored unless you add a separate ESLint preprocessor.

The TypeScript plugin only affects diagnostics. For syntax highlighting of `className:@md`, `className:group-hover/item`, and arbitrary variants (paths are under `node_modules/vite-plugin-useclassy/` after install):

- **VS Code / Cursor / VSCodium / Windsurf:** `code --install-extension ./node_modules/vite-plugin-useclassy/vscode-useclassy` (or `cursor` / `codium` / …). See [`vscode-useclassy`](vscode-useclassy/README.md) and [editor/](editor/README.md).
- **Neovim:** add `node_modules/vite-plugin-useclassy/editor/neovim` to `'runtimepath'`. See [`editor/neovim`](editor/neovim/README.md).
- **Zed:** copy [`editor/zed/settings.example.json`](editor/zed/settings.example.json) to `.zed/settings.json` (diagnostics; highlighting not yet). See [`editor/zed`](editor/zed/README.md).
- **JetBrains:** no plugin yet — rely on Vite; see [editor/README.md](editor/README.md).

**Svelte.** Quoted modifiers transform; native directives do not. Put UseClassy before `@sveltejs/vite-plugin-svelte`.

```svelte
<button class="px-4 py-2 rounded" class:hover="bg-blue-700" class:active={isActive}>
```

**Laravel Blade.** `composer require useclassy/laravel`, then `language: "blade"`. PHP ^8.2, Laravel ^11–13. Blade files sit outside Vite’s module graph, so keep the class manifest registered with Tailwind or UnoCSS (below).

### Chained modifiers

`class:sm:hover="underline"` emits `sm:hover:underline` only, the same composition as Tailwind / UnoCSS, not the individual `sm:` and `hover:` pieces.

Modifier names may include letters, digits, `_`, `-`, `:`, `/` (`group-hover/item`), `@` (`@md`), and arbitrary variants with `[…]` (`[&>*]`, `data-[state=open]`). UseClassy parses modifier names with bracket depth so an `=` inside `[…]` is not treated as the attribute separator. React uses the same modifier attributes as Vue; UseClassy rewrites them before JSX/HTML parse.

## Vite

```ts
import useClassy from 'vite-plugin-useclassy'

export default {
  plugins: [
    useClassy({
      language: 'vue', // 'react' | 'blade' | 'svelte'
      // engine: "unocss",
    }),
    // Tailwind / UnoCSS after UseClassy
  ],
}
```

| Option                         | Default                          | Notes                                                            |
| ------------------------------ | -------------------------------- | ---------------------------------------------------------------- |
| `language`                     | `'vue'`                          | `'vue'` \| `'react'` \| `'blade'` \| `'svelte'`                  |
| `engine`                       | `'tailwind'`                     | `'unocss'` skips Tailwind `@source` inject                       |
| `outputDir` / `outputFileName` | `.classy` / `output.classy.html` | Class manifest Tailwind and Uno scan                             |
| `manifestRoot`                 | Vite `root`                      | Set when Vite’s root is a subfolder (e.g. Nuxt `srcDir: "app/"`) |
| `injectTailwindSource`         | `true`                           | Tailwind v4 only; ignored for UnoCSS                             |
| `debug`                        | `false`                          | Log transform and manifest writes                                |

Processes `.vue`, `.svelte`, `.ts`, `.tsx`, `.js`, `.jsx`, `.html`, and `.blade.php`. Skips `node_modules`, gitignored paths, and virtual modules.

## Tailwind

UseClassy writes discovered utilities to `.classy/output.classy.html` (gitignored). Tailwind v4 does not scan gitignored files unless you `@source` them. The plugin injects that directive into stylesheets that `@import "tailwindcss"`. `init` also writes it into your CSS.

```css
@import 'tailwindcss';
@source "./.classy/output.classy.html";
```

`@source` paths are relative to the CSS file. If the stylesheet lives in `src/`, use `../.classy/output.classy.html`.

**Tailwind v3.** Add the manifest to `content`:

```js
content: ["./.classy/output.classy.html"],
```

Path helpers: `getUseClassyTailwindSourceDirective`, `getUseClassyTailwindV3ContentEntry` from `vite-plugin-useclassy` or `vite-plugin-useclassy/tailwind`. Pass the same `outputDir` / `outputFileName` you use in the plugin.

## UnoCSS

```ts
useClassy({ language: 'react', engine: 'unocss' })
```

Place it before `unocss/vite`. After the rewrite, Uno’s Vite pipeline already sees `hover:` classes. Register the HTML manifest as a filesystem source for files Uno does not extract (plain `.ts` / `.js`, Blade, HTML that never enter Vite):

```ts
import { defineConfig, presetUno } from 'unocss'
import { getUseClassyUnoFilesystemEntry } from 'vite-plugin-useclassy/unocss'

export default defineConfig({
  presets: [presetUno()],
  content: { filesystem: [getUseClassyUnoFilesystemEntry()] },
})
```

UseClassy is variant-first (`class:hover="bg-red"`), not [Attributify](https://unocss.dev/presets/attributify) (`bg="hover:..."`). Don’t enable both on the same attributes. See `demos/unocss-react`.

## IntelliSense

`init` merges this into `.vscode/settings.json` for Tailwind projects:

```json
{
  "tailwindCSS.classAttributes": [
    "class",
    "class:[\\w:/@\\[\\]\\-=&*>.]*",
    "className",
    "className:[\\w:/@\\[\\]\\-=&*>.]*"
  ]
}
```

Vue-only projects can omit the `className` entries. UnoCSS projects should use the [UnoCSS VS Code extension](https://unocss.dev/integrations/vscode) instead.

## Agent skill

```bash
npx vite-plugin-useclassy init --with-skills
```

| Path                            | Used by                            |
| ------------------------------- | ---------------------------------- |
| `.agents/skills/useclassy/`     | Cursor, Codex, Copilot             |
| `.cursor/rules/useclassy-*.mdc` | Cursor                             |
| `AGENTS.md` (fenced block)      | Windsurf, Aider, Cline, and others |

Add `--with-claude` to also copy into `.claude/skills/` (opt-in so Cursor doesn’t load the skill twice). Running it again is safe; `--force` overwrites local edits. Templates live in [`templates/`](templates/).

## Contributing

Issues and PRs welcome.

## License

MIT
