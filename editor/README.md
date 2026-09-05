# Editor support

UseClassy works in **any editor** once the Vite plugin is configured. Editor folders here are **optional** — they improve syntax highlighting and TypeScript diagnostics while you type.

After `npm i -D vite-plugin-useclassy`, these paths ship inside the package:

| Asset | Path under `node_modules/vite-plugin-useclassy/` |
|-------|--------------------------------------------------|
| VS Code extension | `vscode-useclassy/` |
| Neovim runtime | `editor/neovim/` |
| Zed settings template | `editor/zed/settings.example.json` |

| Editor | Diagnostics (React) | Syntax (`className:@md`, …) |
|--------|---------------------|-------------------------------|
| VS Code, Cursor | [`init`](../README.md#install) → tsconfig + `.vscode/settings.json` | Sideload [`vscode-useclassy`](../vscode-useclassy/README.md) |
| VSCodium, Insiders, Windsurf | Same tsconfig; sideload VS Code extension | Same |
| Neovim | [neovim/README.md](./neovim/README.md) | Same folder (vim + Tree-sitter queries) |
| Zed | [zed/README.md](./zed/README.md) | Not yet — diagnostics only |
| JetBrains | No tsserver plugins | Not yet — use Vite; ignore JSX attr warnings |

Shared highlight pattern: [`shared/MODIFIER_ATTR.md`](./shared/MODIFIER_ATTR.md) (keep in sync with [`vscode-useclassy/syntaxes/`](../vscode-useclassy/syntaxes/)).

## VS Code–compatible install

```bash
# After: npm i -D vite-plugin-useclassy
code --install-extension ./node_modules/vite-plugin-useclassy/vscode-useclassy
# same path for: cursor, codium, code-insiders, windsurf
```

CLI list: [`vscode-useclassy/install-commands.json`](../vscode-useclassy/install-commands.json).

## Publish VS Code extension

The grammar lives in [`vscode-useclassy/`](../vscode-useclassy/). To publish when ready:

```bash
cd vscode-useclassy
npx @vscode/vsce package
npx ovsx publish useclassy-0.1.0.vsix   # Open VSX — VSCodium, etc.
# vsce publish                              # Visual Studio Marketplace
```

Until then, sideload from `node_modules` as above (or from a repo clone’s `./vscode-useclassy`).
