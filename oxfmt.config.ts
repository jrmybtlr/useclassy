import { defineConfig } from "oxfmt";

export default defineConfig({
  singleQuote: true,
  semi: false,
  printWidth: 100,
  sortTailwindcss: {},
  ignorePatterns: [
    "dist/**",
    "node_modules/**",
    ".nuxt/**",
    "**/.nuxt/**",
    ".nuxt/**",
    "pnpm-lock.yaml",
    "**/*.blade.php",
    "**/vendor/**",
    "demos/laravel/vendor/**",
  ],
});
