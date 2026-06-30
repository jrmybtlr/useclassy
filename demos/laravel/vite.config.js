import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import useClassy from '../../src/index.ts'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    hmr: {
      port: 24682,
      clientPort: 24682,
    },
  },
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
