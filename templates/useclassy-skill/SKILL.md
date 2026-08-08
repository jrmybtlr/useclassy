---
name: useclassy
description: >-
  Write and refactor Vue, React, Svelte, Blade, and HTML markup using
  vite-plugin-useclassy modifier attributes such as class:hover and
  className:focus. Use when authoring UI, converting existing Tailwind variant
  classes to UseClassy, or reviewing and fixing UseClassy markup.
---

# Authoring with UseClassy

Use UseClassy to separate Tailwind variants from base utilities:

```html
<!-- Before -->
<button class="rounded px-4 hover:bg-blue-500 hover:text-white focus:ring-2">

<!-- After -->
<button
  class="rounded px-4"
  class:hover="bg-blue-500 text-white"
  class:focus="ring-2"
>
```

## Syntax

| Language | Base | Modifiers |
|----------|------|-----------|
| Vue / Blade | `class="…"` | `class:hover="…"`, `class:sm:hover="…"` |
| React | `className="…"` | `className:hover="…"` (also accepts `class:…`); JSX expressions allowed |
| Svelte | `class="…"` | Quoted only: `class:hover="…"` |

Modifier names may contain letters, numbers, `_`, `-`, and `:`.

- **Vue / Blade / Svelte / HTML:** modifier values must be double-quoted static class strings.
- **React:** prefer double-quoted static strings. JSX expressions are also supported when string literals inside the expression should receive the variant prefix, e.g. `className:hover={on ? 'bg-blue-500' : 'bg-gray-200'}`.

## Refactor existing code

When asked to convert markup to UseClassy:

1. Identify the framework from the file/config; use `className:` for React and `class:` elsewhere.
2. Inspect each **static** `class` / `className` string.
3. Keep unprefixed utilities in the base attribute.
4. Group utilities with the same single modifier and remove that prefix:
   - `hover:bg-blue-500 hover:text-white` → `class:hover="bg-blue-500 text-white"`
   - `focus:ring-2 focus:ring-blue-400` → `class:focus="ring-2 ring-blue-400"`
   - `md:px-6 md:py-3` → `class:md="px-6 py-3"`
5. Preserve utility order within each group and preserve unrelated attributes/expressions.
6. Review the result for the exceptions below.

Convert only static tokens that can be represented safely. Do not rewrite:

- Dynamic expressions, template interpolations, conditional class helpers, Vue `:class`, or Svelte directives — unless you are intentionally using React's `className:mod={…}` expression form with string literals.
- Arbitrary variant prefixes such as `[&>*]:mt-2` or `data-[state=open]:block`; their characters are not valid in a UseClassy modifier name.
- Variant tokens embedded in variables or function calls (leave those variables unchanged, or store already-prefixed class names).

## Chained modifier semantics

UseClassy accepts chained attributes such as `class:sm:hover="underline"`, but it expands the value for the combined chain **and each individual modifier**:

```html
class:sm:hover="underline"
<!-- produces sm:hover:underline, sm:underline, and hover:underline -->
```

Therefore, converting an existing `sm:hover:underline` token to `class:sm:hover="underline"` is **not behavior-preserving** unless those additional `sm:` and `hover:` styles are intended. When preserving behavior:

- Migrate single-modifier tokens automatically.
- Leave exact chained tokens such as `sm:hover:underline` in the base class string.
- Use a chained UseClassy attribute only when the requested design intentionally applies all generated combinations.

## Framework rules

- Put base utilities on `class` / `className`.
- Vue / Blade / HTML: use `class:modifier="…"`.
- React: prefer `className:modifier="…"` for static variants. For runtime conditions that still use string literals, `className:modifier={cond ? 'a' : 'b'}` is valid and will prefix those literals. Leave `className={…}` base expressions unchanged when they are unrelated.
- Vue: leave `:class` and other dynamic bindings unchanged.
- **Svelte**: only transform quoted UseClassy modifiers. Native `class:active={cond}` and `class:active` stay untouched — do not rewrite those.
- Do not move conditional base utilities into modifier attributes on Vue/Svelte/Blade; UseClassy modifiers represent Tailwind variants. React is the exception for `className:mod={…}` expression values.

## Verification

After a refactor:

1. Confirm every moved utility lost exactly the modifier encoded in its attribute name.
2. Confirm base and dynamic classes remain intact.
3. Confirm Svelte native directives remain expressions/directives.
4. Run the project’s formatter, typecheck, and relevant tests/build.
5. Inspect transformed output or the rendered UI when chained modifiers or ordering could change behavior.

## More examples

See [examples.md](examples.md).
