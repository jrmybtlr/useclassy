import {
  defineConfig,
  presetUno,
  presetAttributify,
} from 'unocss'
import { getUseClassyUnoFilesystemEntry } from '../../src/unocss.ts'

export default defineConfig({
  presets: [
    presetUno(),
    // Attributify is available; this demo prefers UseClassy variant attrs.
    presetAttributify(),
  ],
  content: {
    filesystem: [getUseClassyUnoFilesystemEntry()],
  },
})
