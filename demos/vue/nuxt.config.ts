import useClassy from "../../src/index.ts";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  modules: ["@nuxt/fonts", "@nuxthub/core"],

  devtools: {
    enabled: true,
  },

  future: {
    compatibilityVersion: 4,
  },

  css: ["~/assets/main.css"],

  vite: {
    plugins: [useClassy({ debug: true }), tailwindcss()],
  },
});