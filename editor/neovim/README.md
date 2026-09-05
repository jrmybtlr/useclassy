# Neovim

Syntax highlighting and TypeScript diagnostics for UseClassy React modifiers.

**Dev and build do not need this** — the Vite plugin rewrites `className:hover` at transform time. These steps only improve what you see while editing.

## Install

Add `editor/neovim` to `'runtimepath'`. Prefer the path from the installed npm package:

### lazy.nvim (npm package)

```lua
{
  dir = vim.fn.getcwd() .. '/node_modules/vite-plugin-useclassy/editor/neovim',
  ft = { 'tsx', 'jsx', 'javascriptreact', 'typescriptreact' },
}
```

Or append once in your config:

```lua
vim.opt.rtp:append(
  vim.fn.getcwd() .. '/node_modules/vite-plugin-useclassy/editor/neovim'
)
```

From a git clone of [useclassy](https://github.com/jrmybtlr/useclassy), append `editor/neovim` (not the repo root):

```lua
vim.opt.rtp:append(vim.fn.expand('~/path/to/useclassy/editor/neovim'))
```

Restart Neovim or `:runtime syntax/tsx.vim` after changing rtp.

## Syntax highlighting

This bundle provides:

- **Vim regex** (`after/syntax/tsx.vim`, `after/syntax/javascriptreact.vim`) — works without Tree-sitter.
- **Tree-sitter queries** (`queries/tsx/highlights.scm`, `queries/javascript/highlights.scm`) — merged when `nvim-treesitter` is active.

Pattern source: [`editor/shared/MODIFIER_ATTR.md`](../shared/MODIFIER_ATTR.md).

Verify: open a `.tsx` file with `className:@md="p-4"`. The attribute name should match normal JSX attrs, not error highlighting.

## TypeScript diagnostics (React)

Add the language plugin to `tsconfig` (same as VS Code):

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "vite-plugin-useclassy/typescript-plugin" }]
  }
}
```

Make the root `tsconfig.json` **extend** `tsconfig.app.json` if Vite’s template used `"files": []` only.

Configure `typescript-language-server` to load plugins from the project:

```lua
require('lspconfig').ts_ls.setup({
  init_options = {
    hostInfo = 'neovim',
  },
  settings = {
    typescript = {
      tsserver = {
        pluginPaths = { './node_modules' },
      },
    },
    javascript = {
      tsserver = {
        pluginPaths = { './node_modules' },
      },
    },
  },
})
```

Use the **workspace** TypeScript version (`node_modules/typescript/lib`), not a global tsserver.

After changing tsconfig, restart the LSP (`:LspRestart` or your plugin’s equivalent).

## Vue / Svelte / Blade

UseClassy modifier attributes in those formats are valid HTML/Vue syntax — no extra Neovim setup required beyond the Vite plugin.
