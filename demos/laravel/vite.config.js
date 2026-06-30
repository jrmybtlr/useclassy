import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import useClassy from '../../src/index.ts'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    useClassy({
      language: 'blade',
      debug: true,
    }),
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.js'],
    }),
    tailwindcss(),
  ],
})
