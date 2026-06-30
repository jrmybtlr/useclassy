import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import useClassy from "../../src/index.ts";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    useClassy({ language: "react", debug: true }),
    tailwindcss(),
  ],
  server: {
    port: 3001,
    hmr: {
      port: 24681,
      clientPort: 24681,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
