import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  USECLASSY_DEFAULT_OUTPUT_DIR,
  USECLASSY_DEFAULT_OUTPUT_FILE,
  getUseClassyManifestPath,
  referencesUseClassyManifest,
} from '../manifest'
import {
  getUseClassyTailwindSourceDirective,
  getUseClassyTailwindSourceLineForRootStylesheet,
  getUseClassyTailwindV3ContentEntry,
  injectTailwindSourceIfNeeded,
} from '../tailwind'

describe('manifest path helpers', () => {
  it('exposes defaults matching the plugin', () => {
    expect(USECLASSY_DEFAULT_OUTPUT_DIR).toBe('.classy')
    expect(USECLASSY_DEFAULT_OUTPUT_FILE).toBe('output.classy.html')
  })

  it('getUseClassyManifestPath joins output dir and file', () => {
    expect(getUseClassyManifestPath()).toBe('.classy/output.classy.html')
    expect(
      getUseClassyManifestPath({
        outputDir: 'custom',
        outputFileName: 'out.html',
      }),
    ).toBe('custom/out.html')
  })
})

describe('tailwind path helpers', () => {
  it('getUseClassyTailwindV3ContentEntry prefixes ./', () => {
    expect(getUseClassyTailwindV3ContentEntry()).toBe(
      './.classy/output.classy.html',
    )
  })

  it('getUseClassyTailwindSourceLineForRootStylesheet uses ./ manifest', () => {
    expect(getUseClassyTailwindSourceLineForRootStylesheet()).toBe(
      '@source "./.classy/output.classy.html";',
    )
  })

  it('getUseClassyTailwindSourceDirective is relative to the stylesheet', () => {
    const root = path.join(path.sep, 'proj')
    const css = path.join(root, 'src', 'app.css')
    const line = getUseClassyTailwindSourceDirective(css, root)
    expect(line).toBe('@source "../.classy/output.classy.html";')
  })

  it('getUseClassyTailwindSourceDirective supports Nuxt app/ vite root', () => {
    const manifestRoot = path.join(path.sep, 'proj')
    const css = path.join(manifestRoot, 'app', 'assets', 'main.css')
    const line = getUseClassyTailwindSourceDirective(css, manifestRoot)
    expect(line).toBe('@source "../../.classy/output.classy.html";')
  })
})

describe('injectTailwindSourceIfNeeded', () => {
  it('injects @source when enabled', () => {
    const css = '@import "tailwindcss";\nbody { color: red; }\n'
    const result = injectTailwindSourceIfNeeded(
      css,
      '/project/src/main.css',
      {
        enabled: true,
        manifestRoot: '/project',
        outputDir: '.classy',
        outputFileName: 'output.classy.html',
      },
    )
    expect(result).toMatch(/@import "tailwindcss";\n@source "/)
    expect(result).toContain('body { color: red; }')
  })

  it('returns null when disabled', () => {
    const css = '@import "tailwindcss";\n'
    expect(
      injectTailwindSourceIfNeeded(css, '/project/src/main.css', {
        enabled: false,
        manifestRoot: '/project',
        outputDir: '.classy',
        outputFileName: 'output.classy.html',
      }),
    ).toBeNull()
  })

  it('strips Vite query from the stylesheet path for @source', () => {
    const css = '@import "tailwindcss";\n'
    const result = injectTailwindSourceIfNeeded(
      css,
      '/project/src/main.css?direct',
      {
        enabled: true,
        manifestRoot: '/project',
        outputDir: '.classy',
        outputFileName: 'output.classy.html',
      },
    )
    expect(result).toContain('@source "../.classy/output.classy.html";')
    expect(result).not.toContain('?direct')
  })

  it('returns null when @source already quotes the manifest', () => {
    const css = '@import "tailwindcss";\n@source "../.classy/output.classy.html";\n'
    expect(
      injectTailwindSourceIfNeeded(css, '/project/src/main.css', {
        enabled: true,
        manifestRoot: '/project',
        outputDir: '.classy',
        outputFileName: 'output.classy.html',
      }),
    ).toBeNull()
  })

  it('still injects when the filename only appears in a comment', () => {
    const css = '/* output.classy.html */\n@import "tailwindcss";\n'
    const result = injectTailwindSourceIfNeeded(
      css,
      '/project/src/main.css',
      {
        enabled: true,
        manifestRoot: '/project',
        outputDir: '.classy',
        outputFileName: 'output.classy.html',
      },
    )
    expect(result).toContain('/* output.classy.html */')
    expect(result).toContain('@source "../.classy/output.classy.html";')
  })
})

describe('referencesUseClassyManifest', () => {
  it('ignores a bare comment mention', () => {
    expect(
      referencesUseClassyManifest('/* output.classy.html */\n@import "tailwindcss";\n'),
    ).toBe(false)
  })

  it('matches a quoted path or published helper', () => {
    expect(
      referencesUseClassyManifest('@source "../.classy/output.classy.html";'),
    ).toBe(true)
    expect(
      referencesUseClassyManifest('filesystem: [getUseClassyUnoFilesystemEntry()]'),
    ).toBe(true)
  })
})
