import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import useClassy from '../../src/index.ts'
import tailwindcss from '@tailwindcss/vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const readme = readFileSync(path.resolve(rootDir, '../../README.md'), 'utf8')
const skill = readFileSync(
  path.resolve(rootDir, '../../templates/useclassy-skill/SKILL.md'),
  'utf8',
)
const skillExamples = readFileSync(
  path.resolve(rootDir, '../../templates/useclassy-skill/examples.md'),
  'utf8',
)

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
      routes: [
        '/llms.txt',
        '/llms-full.txt',
        '/llm.txt',
        '/index.md',
        '/docs.md',
        '/skill.md',
        '/skill/examples.md',
        '/.well-known/llms.txt',
        '/sitemap.xml',
      ],
    },
    virtual: {
      'virtual:site-readme': () => `export default ${JSON.stringify(readme)}`,
      'virtual:site-skill': () => `export default ${JSON.stringify(skill)}`,
      'virtual:site-skill-examples': () =>
        `export default ${JSON.stringify(skillExamples)}`,
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
