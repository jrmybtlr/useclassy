import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import useClassy from '../../src/index.ts'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    // Run before the Svelte compiler so UseClassy variant attributes
    // are rewritten ahead of native class directives.
    useClassy({ language: 'svelte', debug: true }),
    svelte(),
    tailwindcss(),
  ],
  server: {
    port: 3002,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
