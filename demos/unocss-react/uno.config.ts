import { defineConfig, presetUno } from 'unocss'
import { getUseClassyUnoFilesystemEntry } from '../../src/unocss.ts'

export default defineConfig({
  presets: [presetUno()],
  content: {
    filesystem: [getUseClassyUnoFilesystemEntry()],
  },
})
