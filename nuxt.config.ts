import useClassy from "./src/useClassy.ts";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  pages: false,

  modules: [
    "@nuxt/fonts",
  ],

  devtools: {
    enabled: false,
  },

  future: {
    compatibilityVersion: 4,
  },

  css: [
    '~/assets/main.css',
  ],

  vite: {
    plugins: [
      useClassy(),
      tailwindcss(),
    ],
  },
})