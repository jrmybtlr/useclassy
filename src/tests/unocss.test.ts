import { describe, expect, it } from 'vitest'

import { getUseClassyUnoFilesystemEntry } from '../unocss'

describe('unocss path helpers', () => {
  it('getUseClassyUnoFilesystemEntry prefixes ./', () => {
    expect(getUseClassyUnoFilesystemEntry()).toBe(
      './.classy/output.classy.html',
    )
  })

  it('respects custom output paths', () => {
    expect(
      getUseClassyUnoFilesystemEntry({
        outputDir: 'custom',
        outputFileName: 'out.html',
      }),
    ).toBe('./custom/out.html')
  })
})
