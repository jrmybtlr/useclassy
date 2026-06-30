import path from "node:path";
import { fileURLToPath } from "node:url";
import useClassy from "../../src/index.ts";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  modules: ["@nuxt/fonts", "@nuxthub/core"],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/main.css"],

  vite: {
    plugins: [useClassy({ debug: true, manifestRoot: rootDir }), tailwindcss()],
    resolve: {
      alias: {
        "vite-plugin-useclassy": path.resolve(rootDir, "../../src/index.ts"),
      },
    },
    server: {
      fs: {
        allow: [path.resolve(rootDir, "../..")],
      },
    },
  },
});
