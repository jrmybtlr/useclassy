import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import useClassy from '../../src/index.ts'
import path from 'path'

export default defineConfig({
  plugins: [
    useClassy({ language: 'react', engine: 'unocss', debug: true }),
    UnoCSS(),
    react(),
  ],
  server: {
    port: 3004,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
