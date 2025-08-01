# 🎩 UseClassy

UseClassy transforms Tailwind variant attributes (`class:hover="..."`) into standard Tailwind classes (`hover:...`). This allows for cleaner component markup by separating base classes from stateful or responsive variants.

## Features

- Transforms attributes like `class:hover="text-blue-500"` to standard `class="hover:text-blue-500"`.
- Supports chaining modifiers like `class:dark:hover="text-blue-500"`.
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

Add the `output.classy.html` as a source file in your tailwind config.

For Tailwind 4

```css
/* your-main-css-file.css */
@import "tailwindcss";
@source "./.classy/output.classy.html";
```

For Tailwind 3 you need to add the following to your Tailwind config.

```json
  "content": [
    // ... other content paths
    "./.classy/output.classy.html"
  ]
```

## Tailwind IntelliSense

Add the following to your editor settings to enable IntelliSense for UseClassy.

```json
{
  "tailwindCSS.classAttributes": [
    ...other settings,
    "class:[\\w:-]*"
  ]
}
```

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
