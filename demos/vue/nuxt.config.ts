import path from 'node:path'
import { fileURLToPath } from 'node:url'
import useClassy from '../../src/index.ts'
import tailwindcss from '@tailwindcss/vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  modules: ['@nuxt/fonts', '@nuxthub/core', '@nuxt/icon'],

  fonts: {
    families: [
      // Local @font-face in main.css — skip metric fallbacks and a second face.
      { name: 'Gilroy', provider: 'none' },
    ],
  },

  icon: {
    serverBundle: {
      collections: ['vscode-icons'],
    },
  },

  devtools: {
    enabled: true,
  },

  css: ['~/assets/main.css'],

  nitro: {
    prerender: {
      routes: ['/llms.txt', '/llms-full.txt', '/llm.txt', '/index.md', '/docs.md'],
    },
  },

  vite: {
    plugins: [useClassy({ manifestRoot: rootDir }), tailwindcss()],
    resolve: {
      alias: {
        'vite-plugin-useclassy': path.resolve(rootDir, '../../src/index.ts'),
      },
    },
    server: {
      fs: {
        allow: [path.resolve(rootDir, '../..')],
      },
    },
    optimizeDeps: {
      include: ['marked', 'shiki'],
    },
  },
})
