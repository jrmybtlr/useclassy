import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  detectTailwindFlavor,
  mergeTailwindClassAttributes,
  patchTailwindV3ConfigContent,
  patchTailwindV4Stylesheet,
  patchViteConfigContent,
} from '../init-setup'

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'useclassy-init-'))
}

afterEach(() => {
  // no global cleanup; each test uses its own temp dir
})

describe('patchViteConfigContent', () => {
  it('inserts import and useClassy plugin', () => {
    const src = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
  ],
})
`
    const out = patchViteConfigContent(src, 'vue')
    expect(out).toContain('import useClassy from \'vite-plugin-useclassy\'')
    expect(out).toContain('language: \'vue\'')
    expect(out).toMatch(/plugins:\s*\[\s*\n\s*useClassy/)
  })

  it('does not duplicate useClassy', () => {
    const src = `import useClassy from 'vite-plugin-useclassy'
export default { plugins: [useClassy({ language: 'vue' })] }
`
    expect(patchViteConfigContent(src, 'vue')).toBe(src)
  })
})

describe('patchTailwindV3ConfigContent', () => {
  it('adds content entry', () => {
    const src = `export default { content: [] }
`
    const out = patchTailwindV3ConfigContent(src)
    expect(out).toContain('./.classy/output.classy.html')
  })

  it('is a no-op when manifest already referenced', () => {
    const src = `export default { content: ["./.classy/output.classy.html"] }
`
    expect(patchTailwindV3ConfigContent(src)).toBe(src)
  })
})

describe('patchTailwindV4Stylesheet', () => {
  it('inserts @source after tailwind import', () => {
    const dir = tempDir()
    const cssPath = path.join(dir, 'src', 'main.css')
    fs.mkdirSync(path.dirname(cssPath), { recursive: true })
    fs.writeFileSync(
      cssPath,
      '@import "tailwindcss";\n',
      'utf-8',
    )
    const r = patchTailwindV4Stylesheet(cssPath, dir, false)
    expect(r.changed).toBe(true)
    const text = fs.readFileSync(cssPath, 'utf-8')
    expect(text).toContain('@source "')
    expect(text).toContain('.classy/output.classy.html')
  })
})

describe('detectTailwindFlavor', () => {
  it('detects v4 when @tailwindcss/vite is present', () => {
    const dir = tempDir()
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        devDependencies: { '@tailwindcss/vite': '^4.0.0' },
      }),
      'utf-8',
    )
    expect(detectTailwindFlavor(dir)).toBe('v4')
  })

  it('detects v3 when tailwind.config exists', () => {
    const dir = tempDir()
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { tailwindcss: '^3.4.0' } }),
      'utf-8',
    )
    fs.writeFileSync(path.join(dir, 'tailwind.config.js'), 'export default {}')
    expect(detectTailwindFlavor(dir)).toBe('v3')
  })
})

describe('mergeTailwindClassAttributes', () => {
  it('merges vue patterns', () => {
    const out = mergeTailwindClassAttributes(['class'], 'vue')
    expect(out).toContain('class')
    expect(out).toContain('class:[\\w:-]*')
  })

  it('adds className for react', () => {
    const out = mergeTailwindClassAttributes([], 'react')
    expect(out).toContain('className')
    expect(out).toContain('className:[\\w:-]*')
  })
})
