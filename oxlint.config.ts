import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
  },
  plugins: ["typescript", "unicorn", "oxc", "vitest"],
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  rules: {
    "unicorn/no-array-sort": "off",
  },
  env: {
    es2022: true,
    node: true,
  },
  ignorePatterns: [
    "dist/**",
    "node_modules/**",
    ".output/**",
    ".nuxt/**",
    "**/.classy/**",
    "pnpm-lock.yaml",
    "**/vendor/**",
  ],
  overrides: [
    {
      files: ["src/**/*.{ts,tsx}", "demos/**/*.{ts,tsx,js,jsx,vue}"],
      env: {
        browser: true,
      },
    },
    {
      files: ["**/vite.config.{ts,js,mjs}", "vitest.config.js"],
      rules: {
        "react-hooks/rules-of-hooks": "off",
      },
    },
    {
      files: ["demos/react/src/**/*.{ts,tsx}"],
      plugins: ["react"],
      rules: {
        "react/react-in-jsx-scope": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
    {
      files: ["**/*.{test,spec}.{ts,tsx,js}"],
      plugins: ["vitest"],
      env: {
        vitest: true,
      },
      rules: {
        "vitest/require-mock-type-parameters": "off",
        "vitest/no-conditional-expect": "off",
        "typescript/no-floating-promises": "off",
        "typescript/no-unsafe-type-assertion": "off",
        "typescript/unbound-method": "off",
        "eslint/no-shadow": "off",
        "unicorn/consistent-function-scoping": "off",
      },
    },
    {
      files: ["vite.config.ts", "vitest.config.js", "oxlint.config.ts", "oxfmt.config.ts"],
      env: {
        node: true,
      },
    },
  ],
});
