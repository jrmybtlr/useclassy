# UseClassy (editor)

TextMate injection so React UseClassy modifiers highlight like normal JSX attributes.

Without this, the built-in TSX grammar treats names with `@`, `/`, or `[…]` as `invalid.illegal.attribute.tsx` (red italic). Simple namespaced forms like `className:hover` already tokenize correctly.

**Not on the VS Code Marketplace yet.** Install from this repo (sideload) until it is published.

## Install (local)

From the UseClassy repo root, either:

```bash
# Prefer: VS Code / Cursor CLI (folder extension)
code --install-extension ./vscode-useclassy
# or, if `cursor` is on your PATH:
cursor --install-extension ./vscode-useclassy
```

If the CLI rejects a folder path, copy into the extensions directory then reload the window:

```bash
cp -R ./vscode-useclassy ~/.cursor/extensions/useclassy.useclassy-0.1.0
# VS Code: ~/.vscode/extensions/useclassy.useclassy-0.1.0
```

Reload the window after installing (`Developer: Reload Window`).

## Verify

Open a `.tsx` file with `className:@md="…"`. **Developer: Inspect Editor Tokens and Scopes** should show `entity.other.attribute-name.tsx`, not `invalid.illegal.attribute.tsx`.
