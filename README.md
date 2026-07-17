# 🎩 UseClassy

UseClassy transforms Tailwind variant attributes (`class:hover="..."`) into standard Tailwind classes (`hover:...`). This allows for cleaner component markup by separating base classes from stateful or responsive variants.

## Features

- Transforms attributes like `class:hover="text-blue-500"` to standard `class="hover:text-blue-500"`.
- Supports chaining modifiers like `class:dark:hover="text-blue-500"`.
- Supports React conditional variants: `className:hover={isActive ? 'bg-blue-500' : 'bg-gray-200'}`.
- Works seamlessly with React (`className`) and Vue/HTML (`class`).
- Integrates with Vite's build process and dev server. No runtime overhead.
- Smart Caching: Avoids reprocessing unchanged files during development.
- Runs before Tailwind JIT compiler with HMR and TailwindMerge support.

## Installation

```bash
# npm
npm install vite-plugin-useclassy --save-dev

# yarn
yarn add vite-plugin-useclassy -D

# pnpm
pnpm add vite-plugin-useclassy -D
```

When using the React helpers (`vite-plugin-useclassy/react`), install **React 18 or 19** (`react` satisfies `^18.0.0 || ^19.0.0`). The Vite plugin alone does not require React for Vue or Blade projects.

## Quick setup (recommended)

After installing the package, run the init helper from your **app root** (where `package.json` and `vite.config.*` live). It patches Vite, Tailwind (v3 or v4), and VS Code settings when it can do so safely.

```bash
npx vite-plugin-useclassy init
```

Options:

```bash
# React: include className:* IntelliSense patterns
npx vite-plugin-useclassy init --language react
```

Add **`--dry-run`** to any init command to print the planned file changes without modifying your repo (for example `npx vite-plugin-useclassy init --language react --dry-run`).

If detection fails or your config is non-standard, use the manual steps below.

## Vite Configuration

Add `useClassy` to your Vite plugins. It's recommended that you place it before Tailwind or other CSS processing plugins.

```ts
// vite.config.ts
import useClassy from "vite-plugin-useclassy";

export default {
  plugins: [
    useClassy({
      language: "react", // or 'vue' or 'blade'

      // Optional: Customize the output directory. Defaults to '.classy'.
      // outputDir: '.classy',

      // Optional: Customize output file name. Defaults to 'output.classy.html'.
      // outputFileName: 'generated-classes.html'

      // Optional: Enable debugging. Defaults to false.
      // debug: true,
    }),
    // ... other plugins
  ],
};
```

## React Usage (`className`)

### Variant Attributes

```tsx
// Input (using class:variant attributes)
<button
  className="px-4 py-2 rounded bg-blue-600 text-white"
  className:hover="bg-blue-700 scale-105"
  className:focus="ring-2 ring-blue-300"
  className:disabled="opacity-50 cursor-not-allowed"
  className:dark="bg-sky-700"
/>

// Output (after transformation by the plugin)
<button
  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-sky-700 dark:hover:bg-sky-800"
/>
```

### Conditional / dynamic variants

JSX expression values work too — string literals inside the expression are prefixed with the variant:

```tsx
// Input
<button
  className="px-4 py-2 rounded"
  className:hover={isActive ? 'bg-blue-500 text-white' : 'bg-gray-200'}
  className:disabled={isDisabled && 'opacity-50 cursor-not-allowed'}
/>

// Output
<button
  className={`px-4 py-2 rounded ${isActive ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-gray-200'} ${isDisabled && 'disabled:opacity-50 disabled:cursor-not-allowed'}`}
/>
```

Expressions without string literals (e.g. `className:hover={hoverClasses}`) are left unchanged so runtime variables are not corrupted. Prefer string literals in the expression (as above), or store already-prefixed class names in the variable.

## Vue / HTML Usage (`class`)

```vue
<template>
  <button
    class="px-4 py-2 rounded bg-blue-600 text-white"
    class:hover="bg-blue-700 scale-105"
    class:focus="ring-2 ring-blue-300"
    class:disabled="opacity-50 cursor-not-allowed"
    class:dark="bg-sky-700"
  />

  <!-- Output -->
  <button
    class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-sky-700 dark:hover:bg-sky-800"
  />
</template>
```

## Laravel Blade Usage

For Laravel applications, install the dedicated Composer package. The service provider will be automatically registered via Laravel's package auto-discovery.

```bash
composer require useclassy/laravel
```

### Add 'blade' to the language option in your Vite configuration

```ts
useClassy({
  language: "blade",
});
```

### Blade Template Usage

```blade
<h1 class="text-xl" class:lg="text-3xl" class:hover="text-blue-600">
    Responsive heading that changes on large screens and hover
</h1>
```

The package transforms these during Blade compilation:

- `class:lg="text-3xl"` becomes `lg:text-3xl`
- `class:hover="text-blue-600"` becomes `hover:text-blue-600`
- `class:dark="bg-gray-800 text-white"` becomes `dark:bg-gray-800 dark:text-white`

These transformed classes are merged with any existing `class` attributes.

### Requirements

- PHP ^8.1
- Laravel ^10.0|^11.0|^12.0

## Tailwind JIT Integration

UseClassy writes discovered classes to **`.classy/output.classy.html`** by default (configurable via `outputDir` / `outputFileName`). Tailwind must scan that file so utilities like `hover:…` exist in CSS.

### Why `@source` / `content` is required

The plugin adds `.classy/` to **`.gitignore`**. **Tailwind CSS v4** does not scan gitignored paths during automatic detection, so it will miss the manifest unless you register it explicitly. Use `@source` in your CSS (v4) or add the file to `content` (v3). See Tailwind’s docs: [Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files).

### Tailwind v4

`@source` paths are **relative to the stylesheet file**, not necessarily the project root. If your entry CSS lives in `src/`, the line may look like `../.classy/output.classy.html` instead of `./.classy/...`.

```css
/* Example when the stylesheet is next to package.json */
@import "tailwindcss";
@source "./.classy/output.classy.html";
```

### Tailwind v3

Add the manifest to `content` in `tailwind.config.*`:

```js
export default {
  content: [
    // ...existing paths
    "./.classy/output.classy.html",
  ],
};
```

### Path helpers (optional)

The package exports stable defaults and helpers so docs, init, and your own scripts stay aligned:

```ts
import {
  getUseClassyTailwindSourceDirective,
  getUseClassyTailwindSourceLineForRootStylesheet,
  getUseClassyTailwindV3ContentEntry,
} from "vite-plugin-useclassy";
// or: import { ... } from "vite-plugin-useclassy/tailwind";

// v4: correct @source for a given CSS file path
const line = getUseClassyTailwindSourceDirective(
  "/path/to/project/src/app.css",
  "/path/to/project",
);
// line → @source "../.classy/output.classy.html";

// v4 shorthand when the CSS file sits beside package.json:
getUseClassyTailwindSourceLineForRootStylesheet();
// → @source "./.classy/output.classy.html";

// v3 content array entry (default output paths):
getUseClassyTailwindV3ContentEntry();
// → "./.classy/output.classy.html"
```

If you customize `outputDir` or `outputFileName` in `useClassy({ ... })`, pass the same options into these helpers.

## Tailwind IntelliSense

Add the following to your editor settings to enable IntelliSense for UseClassy variant attributes.

```json
{
  "tailwindCSS.classAttributes": [
    "class",
    "class:[\\w:-]*",
    "className",
    "className:[\\w:-]*"
  ]
}
```

For Vue-only projects you can omit the `className` entries. Running `npx vite-plugin-useclassy init` merges these into `.vscode/settings.json` when possible.

## AI-assisted setup

Use this prompt in your editor agent when you want a one-shot manual setup (for example if `init` cannot patch your repo):

**Prompt — “Set up UseClassy in this repo”**

1. Install dev dependency: `vite-plugin-useclassy` (use the repo’s package manager: npm, pnpm, or yarn).
2. Open `vite.config.*`. Add `import useClassy from 'vite-plugin-useclassy'`. In `plugins`, insert `useClassy({ language: '<vue|react|blade>' })` **before** `@tailwindcss/vite` or other CSS pipeline plugins so it runs early.
3. **Tailwind v4** (project uses `@import "tailwindcss"` and typically `@tailwindcss/vite`): In the main CSS entry that imports Tailwind, add an `@source` line pointing at the generated manifest. Default manifest path is `.classy/output.classy.html` from the project root; the `@source` path must be **relative to that CSS file**. If `useClassy` uses custom `outputDir` / `outputFileName`, use those instead.
4. **Tailwind v3** (`tailwind.config.*`): Add `".classy/output.classy.html"` (or `./.classy/output.classy.html` as appropriate) to the `content` array without removing existing entries.
5. **VS Code**: In `.vscode/settings.json` (merge, do not wipe), set or extend `tailwindCSS.classAttributes` to include `"class:[\\w:-]*"`. For React, also add `"className:[\\w:-]*"`.
6. Run `dev` once so `.classy/output.classy.html` is generated; confirm Tailwind includes a class that only appears on a `class:hover` or `className:hover` attribute.

A **Cursor rule template** you can copy into an app repo lives at [`templates/useclassy-setup.cursor-rule.mdc`](templates/useclassy-setup.cursor-rule.mdc).

## Debugging

Enable debugging by setting `debug: true` in the plugin options. This will log detailed information about the plugin's operation to the console.

```ts
useClassy({
  debug: true,
});
```

## Processing Rules

- Only processes files with `.vue`, `.tsx`, `.jsx`, `.html`, `.blade.php` extensions.
- Does not process files in the `node_modules` directory.
- Does not process files in `.gitignore` directories.
- Does not process virtual modules.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
