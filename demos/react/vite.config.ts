import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import useClassy from "../../src/index.ts";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    // Before React and Tailwind so className:hover rewrites ahead of JSX / CSS scan.
    useClassy({ language: "react", debug: true }),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3001,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "vite-plugin-useclassy/react": path.resolve(__dirname, "../../src/react.ts"),
    },
  },
});
