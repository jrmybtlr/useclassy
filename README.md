# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Tailwind CSS Configuration

This project uses a custom class variant syntax with Tailwind CSS. To enable proper validation and IntelliSense in VS Code, add the following configuration to your `.vscode/settings.json`:

```json
{
  "tailwindCSS.classAttributes": [
    ...other settings,
    "class:[\\w:-]*"
  ]
}
```

This configuration enables validation for all class variants including:
- Conditional classes (hover, dark mode)
- Responsive classes (sm, md, lg)
- Group variants
- Compound variants

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Vite Configuration

This project uses Vite with custom plugins for enhanced functionality:

```ts
vite: {
  plugins: [
    useClassy(),
    tailwindcss(),
  ],
}
```

The configuration includes:
- `useClassy()`: Enables the custom class variant syntax
- `tailwindcss()`: Provides Tailwind CSS integration

## Syntax Highlighting with Shiki

This project uses [nuxt-shiki](https://github.com/nuxt-modules/shiki) for syntax highlighting. The configuration is set up in `nuxt.config.ts`:

```ts
shiki: {
  preload: true,
  tailwindcss: true,
  langs: ["vue-html"],
  theme: "github-dark",
}
```

To use syntax highlighting in your components:

```vue
<template>
  <Shiki lang="vue-html" :code="highlighted" />
</template>

<script setup lang="ts">
const codeExample = ref(`
  <input
    class="w-full max-w-sm px-6 h-12"
    class:hover="border-blue-600"
  />
`)

const highlighted = await useShikiHighlighted(codeExample.value)
</script>
```

The `useShikiHighlighted` composable and `Shiki` component are auto-imported by Nuxt, so no manual imports are needed.