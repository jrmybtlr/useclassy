import useClassy from "./src/useClassy.ts";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  // ssr: false,
  devtools: {
    enabled: true,
    timeline: {
      enabled: true,
    },
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
