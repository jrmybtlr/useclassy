# UseClassy (editor)

TextMate injection so React UseClassy modifiers highlight like normal JSX attributes.

Without this, the built-in TSX grammar treats names with `@`, `/`, or `[…]` as `invalid.illegal.attribute.tsx` (red italic). Simple namespaced forms like `className:hover` already tokenize correctly.

Works in any editor that loads VS Code extensions (VS Code, Cursor, VSCodium, Insiders, Windsurf, …).

For **Neovim**, **Zed**, and other IDEs, see [`editor/`](../editor/README.md).

**Not on the VS Code Marketplace yet.** Sideload from the installed npm package until it is published. To publish: [`editor/README.md`](../editor/README.md#publish-vs-code-extension).

## Install

After installing the plugin in your app:

```bash
# After: npm i -D vite-plugin-useclassy
code --install-extension ./node_modules/vite-plugin-useclassy/vscode-useclassy
cursor --install-extension ./node_modules/vite-plugin-useclassy/vscode-useclassy
codium --install-extension ./node_modules/vite-plugin-useclassy/vscode-useclassy
code-insiders --install-extension ./node_modules/vite-plugin-useclassy/vscode-useclassy
windsurf --install-extension ./node_modules/vite-plugin-useclassy/vscode-useclassy
```

From a clone of this repo (contributors), use `./vscode-useclassy` instead of the `node_modules` path.

The list lives in [`install-commands.json`](./install-commands.json) — add a row there when a new VS Code–compatible editor ships a CLI.

If the CLI rejects a folder path, copy into that editor’s extensions directory, then reload the window:

| Editor | Extensions directory |
| --- | --- |
| VS Code | `~/.vscode/extensions/useclassy.useclassy-0.1.0` |
| Cursor | `~/.cursor/extensions/useclassy.useclassy-0.1.0` |
| VSCodium | `~/.vscode-oss/extensions/useclassy.useclassy-0.1.0` |
| VS Code Insiders | `~/.vscode-insiders/extensions/useclassy.useclassy-0.1.0` |
| Windsurf | `~/.codeium/windsurf/extensions/useclassy.useclassy-0.1.0` |

```bash
cp -R ./node_modules/vite-plugin-useclassy/vscode-useclassy ~/.vscode/extensions/useclassy.useclassy-0.1.0
```

Reload the window after installing (`Developer: Reload Window`).

## Verify

Open a `.tsx` file with `className:@md="…"`. **Developer: Inspect Editor Tokens and Scopes** should show `entity.other.attribute-name.tsx`, not `invalid.illegal.attribute.tsx`.
