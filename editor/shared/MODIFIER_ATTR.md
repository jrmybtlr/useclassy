# UseClassy modifier attribute pattern

Shared rule for syntax highlighters. Keep in sync with
[`vscode-useclassy/syntaxes/useclassy.tsx.injection.tmLanguage.json`](../../vscode-useclassy/syntaxes/useclassy.tsx.injection.tmLanguage.json).

## TextMate / Oniguruma

```regex
\b(?:className|class):(?:[^\s=\[]|\[[^\]]*\])+
```

Scope: `entity.other.attribute-name.tsx` (VS Code) or `@attribute` (Tree-sitter themes).

## Vim regex

```vim
\<\%(className\|class\):\%([^ \t=]\|\[[^]]*\]\)\+
```

## Tree-sitter query (TSX / JSX)

```scheme
(jsx_attribute
  (property_identifier) @attribute.useclassy
  (#match? @attribute.useclassy "^class(Name)?:"))
```

Link `@attribute.useclassy` to `@attribute` in your colorscheme or use `@property`.
