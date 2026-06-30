import useClassy from '../../src/index.ts'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({

  modules: ['@nuxt/fonts', '@nuxthub/core'],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/main.css'],

  vite: {
    plugins: [useClassy({ debug: true }), tailwindcss()],
    server: {
      ws: {
        port: 24679,
      },
    },
  },
})
