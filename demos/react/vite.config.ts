import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import classyPlugin from '../../src/useClassy.ts'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), classyPlugin({ language: 'react' }), tailwindcss()],
  server: {
    port: 3001
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
