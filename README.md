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
import useClassy from 'vite-plugin-useclassy';

export default {
  plugins: [
    useClassy({
      language: 'react',  // or 'vue'

      // Optional: Customize the output directory. Defaults to '.classy'.
      // outputDir: '.classy',

      // Optional: Customize output file name. Defaults to 'output.classy.html'.
      // outputFileName: 'generated-classes.html' 
    }),
    // ... other plugins
  ],
};
```

## React Usage (`className`)

### Variant Attributes

```jsx
// Input (using class:variant attributes)
<button 
  className="px-4 py-2 rounded bg-blue-600 text-white"
  class:hover="bg-blue-700 scale-105"
  class:focus="ring-2 ring-blue-300"
  class:disabled="opacity-50 cursor-not-allowed"
  class:dark="bg-sky-700"
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
    class:dark="bg-sky-700"
  />

  <!-- Output -->
  <button
    class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-sky-700 dark:hover:bg-sky-800"
  />
</template>
```

## Tailwind JIT Integration

Add the `output.classy.html` as a source file in your tailwind config.

```css
/* your-main-css-file.css */
@import "tailwindcss";
@source "./../../.classy/output.classy.html";
```

## Tailwind IntelliSense

Add the following to your VSCode settings to enable IntelliSense for UseClassy.

```json
{
  "tailwindCSS.classAttributes": ["class", "className", "class:[\\w:-]*"]
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

- Only processes files with `.vue`, `.ts`, `.tsx`, `.js`, `.jsx`, `.html` extensions.
- Does not process files in the `node_modules` directory.
- Does not process files in `.gitignore` directories.
- Does not process virtual modules.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
