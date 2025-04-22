import useClassy from "./src/useClassy.ts";
import useClassyRust from "./src/useClassyRust.ts";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  modules: [
    "@nuxt/fonts",
  ],

  devtools: {
    enabled: true,
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
