import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import classyPlugin from '../../src/useClassy.ts'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), classyPlugin({ language: 'react' }), tailwindcss()],
  server: {
    port: 3001
  },
})
