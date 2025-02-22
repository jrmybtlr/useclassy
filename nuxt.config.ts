import tailwindcss from "@tailwindcss/vite";
import useClassy from "./src/useClassy.js";

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4,
  },
  css: [
    '~/assets/main.css',
  ],
  vite: {
    plugins: [
      useClassy(['.vue']) as any,
      tailwindcss()
    ],
  },
})
