import { defineConfig, presetUno } from 'unocss'
import { getUseClassyUnoFilesystemEntry } from '../../src/unocss.ts'

export default defineConfig({
  presets: [
    presetUno(),
    // Present so attributify works; demo prefers UseClassy variant attrs.
    presetAttributify(),
  ],
  content: {
    filesystem: [getUseClassyUnoFilesystemEntry()],
  },
})
