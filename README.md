# vite-plugin-useclassy

UseClassy enables simple separation of your Tailwind variants. Write cleaner component markup by using modifier attributes instead of complex class strings.

## Features

- Transform `class:hover="text-blue-500"` to `class="hover:text-blue-500"`
- Support for React (`className`) and Vue/HTML (`class`)
- No runtime overhead - transforms during build/dev
- Works with Vite and Tailwind 4

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

```ts
import useClassy from 'vite-plugin-useclassy'

export default {
  plugins: [
    useClassy({
      language: 'react', // or 'vue'
      
      // Optional: customize output directory
      outputDir: '.classy',
      
      // Optional: customize output file name
      outputFileName: 'output.classy.html'
    })
  ],
}
```

## React Usage

### Variant Classes

```jsx
// Before (with plugin)
<div 
  className="text-black"
  class:hover="text-blue-500"
  class:dark="text-white"
  class:sm:hover="font-bold"
/>

// After transformation
<div className="text-black hover:text-blue-500 dark:text-white sm:hover:font-bold" />
```

## Vue Usage

```vue
<template>
  <!-- Before (with plugin) -->
  <div 
    class="text-black"
    class:hover="text-blue-500"
    class:dark="text-white"
    class:sm:hover="font-bold"
  >Content</div>
  
  <!-- After transformation -->
  <div class="text-black hover:text-blue-500 dark:text-white sm:hover:font-bold">
    Content
  </div>
</template>
```

## Tailwind Integration

The plugin automatically creates a file with all used variant classes to ensure Tailwind JIT properly picks them up:

```jsx
// .classy/output.classy.jsx (auto-generated)
export const classyClasses = [
  'hover:text-blue-500',
  'dark:text-white',
  'sm:hover:font-bold',
  // ... other variant classes
];

export default function ClassyOutput() {
  return (
    <div className={classyClasses.join(' ')} style={{ display: 'none' }}>
      {/* This component is used for Tailwind JIT to detect used classes */}
    </div>
  );
}
```

## VS Code Tailwind IntelliSense

Add to your project's `.vscode/settings.json`:

```json
{
  "tailwindCSS.classAttributes": [
    "class",
    "className",
    "class:.*"
  ]
}
```

## Performance

The plugin is designed with performance in mind:
- Uses regex-based transformations for speed
- Implements caching to avoid reprocessing unchanged files
- Only processes relevant files with supported extensions

## License

MIT