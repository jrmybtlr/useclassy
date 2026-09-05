# Zed

TypeScript diagnostics for UseClassy React modifiers in Zed.

**Dev and build do not need this** — the Vite plugin rewrites modifiers at transform time. Zed does not yet ship a UseClassy syntax extension (built-in TSX grammars cannot be overridden locally). Exotic names like `className:@md` may still look wrong in the buffer; that is cosmetic.

## TypeScript diagnostics (React)

1. Add to `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "vite-plugin-useclassy/typescript-plugin" }]
  }
}
```

2. Make the root `tsconfig.json` extend the app config if Vite’s template used `"files": []` only.

3. Merge into `.zed/settings.json` (or Zed user settings) — adjust paths to your project:

```json
{
  "lsp": {
    "vtsls": {
      "settings": {
        "vtsls": {
          "autoUseWorkspaceTsdk": true
        },
        "typescript": {
          "tsserver": {
            "pluginPaths": ["./node_modules"]
          }
        },
        "javascript": {
          "tsserver": {
            "pluginPaths": ["./node_modules"]
          }
        }
      }
    }
  }
}
```

Zed uses **vtsls** by default for TSX. `compilerOptions.plugins` in tsconfig activates `vite-plugin-useclassy/typescript-plugin`; `pluginPaths` lets the server resolve it from the workspace `node_modules`.

Restart the language server after changing tsconfig (**language tools: restart**).

## Syntax highlighting

There is no Zed extension in this repo yet. The shared attribute pattern lives in [`editor/shared/MODIFIER_ATTR.md`](../shared/MODIFIER_ATTR.md) for upstream / extension contributions.

Until then, rely on Vite for correctness or sideload the VS Code extension from `node_modules/vite-plugin-useclassy/vscode-useclassy` (see [`vscode-useclassy`](../../vscode-useclassy/README.md)).

## Local settings template

Copy [`settings.example.json`](./settings.example.json) (or the same file under `node_modules/vite-plugin-useclassy/editor/zed/`) into your project as `.zed/settings.json` and edit paths if needed.
