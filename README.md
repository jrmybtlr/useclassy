# useClassy
useClassy enables simple seperation of your Tailwind variables. So, you can write clean classes faster and with less effort.

## WIP
While the code is complete, I'm still making the npm package and finalising tests.

## Installation

```bash
npm install useclassy
```

## Vite Configuration

```ts
import useClassy from 'useclassy'

export default {
  // ... other vite config
  plugins: [useClassy()],
  // ... other vite config
}
```

## Tailwind Intellisense

This project uses a custom class variant syntax with Tailwind CSS. To enable proper validation and IntelliSense in VS Code, add the following configuration to your `.vscode/settings.json`:

```json
{
  "tailwindCSS.classAttributes": [
    ...other settings,
    "class:[\\w:-]*"
  ]
}
```

## Usage
This configuration enables validation for all class variants including:
- Conditional classes (hover, dark mode)
- Responsive classes (sm, md, lg)
- Group variants
- Compound variants

```vue
<p class="text-white" class:hover:text-red-500 class:dark:text-black>Hello World</p>
```

This will generate a .classy folder in your project to cache the generated classes and ensure Tailwind JIT works. It will also cache results to ensure fast rebuilds.

The final output will create each class in the final rendered result.

```vue
<p class="text-white hover:text-red-500 dark:text-black">Hello World</p>
```