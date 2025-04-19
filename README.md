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