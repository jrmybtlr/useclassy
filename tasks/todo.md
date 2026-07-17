# Feature: Dynamic/conditional variant syntax (JSX expressions)

## Goal

Support React JSX expression values on variant attributes, e.g.:

```tsx
className:hover={isActive ? 'bg-blue-500' : 'bg-gray-200'}
```

Today only quoted strings (`className:hover="..."`) are matched; expression forms are ignored.

## Plan

- [x] Branch `cursor/jsx-conditional-variants-1ea7`
- [x] Add balanced-brace scanner + string-literal class prefixing in `src/core.ts`
- [x] Extract modified classes from JSX expression modifiers into the Tailwind manifest
- [x] Transform `className:mod={expr}` / `class:mod={expr}` → `className={prefixedExpr}`
- [x] Ensure `mergeClassAttributes` handles nested `{}` in JSX values (needed after transform)
- [x] Tests for extract + transform + merge + nested modifiers + edge cases
- [x] Document React conditional usage in README
- [x] Run unit tests; commit, push, open PR

## Design notes

- Keep zero new dependencies; extend the existing regex/scanner approach
- Rewrite whitespace-separated tokens inside `'...'`, `"..."`, and static `` `...` `` literals
- Leave template interpolations (`${...}`) untouched
- Nested modifiers keep current behavior: full chain + partials (`sm:hover` → `sm:hover:X sm:X hover:X`)
- Vue quoted `class:hover="..."` path unchanged
- Expressions with no string literals are left unchanged

## Review

Implemented in `src/core.ts`:

1. **`readBalancedJsxExpression`** — brace scanner that respects strings/templates/comments
2. **`rewriteClassLiteralsInExpression`** — prefixes class tokens inside literals
3. **`transformJsxExpressionModifiers`** — `className:hover={...}` → `className={...}`
4. **`mergeClassAttributes`** — scanner-based merge; keeps multiple JSX exprs; nested `{}` safe

Verification: **190** unit tests passed (11 new). README documents the syntax.
