import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        react: resolve(__dirname, 'src/react.ts'),
        cli: resolve(__dirname, 'src/cli.ts'),
        'typescript-plugin': resolve(__dirname, 'src/typescript-plugin.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'vite',
        'react',
        'path',
        'fs',
        'crypto',
        'url',
        'node:url',
        'node:fs',
        'node:path',
        'typescript',
      ],
      output: {
        preserveModules: true,
        exports: 'named',
      },
    },
  },
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/cli.ts', 'src/init-setup.ts', 'src/init/**', 'src/tests/**'],
      copyDtsFiles: true,
    }),
    {
      name: 'copy-typescript-plugin-tsserver',
      closeBundle() {
        fs.copyFileSync(
          resolve(__dirname, 'scripts/typescript-plugin-tsserver.cjs'),
          resolve(__dirname, 'dist/typescript-plugin-tsserver.cjs'),
        )
      },
    },
  ],
})
