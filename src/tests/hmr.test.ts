import { describe, expect, it } from 'vitest'

import { isCssEngineModuleId } from '../hmr'

describe('isCssEngineModuleId', () => {
  it('matches root stylesheets, not CSS modules', () => {
    expect(isCssEngineModuleId('/src/main.css')).toBe(true)
    expect(isCssEngineModuleId('/src/app.css?direct')).toBe(true)
    expect(isCssEngineModuleId('/src/app.module.css?used')).toBe(false)
  })

  it('matches Uno virtual modules', () => {
    expect(isCssEngineModuleId('/__uno.css')).toBe(true)
    expect(isCssEngineModuleId('virtual:uno.css')).toBe(true)
    expect(isCssEngineModuleId('\0unocss/entry')).toBe(true)
    expect(isCssEngineModuleId('\0/__uno.css')).toBe(true)
  })

  it('rejects unrelated modules', () => {
    expect(isCssEngineModuleId('/src/App.tsx')).toBe(false)
    expect(isCssEngineModuleId('/src/utils.ts')).toBe(false)
    expect(isCssEngineModuleId('/src/unocss.ts')).toBe(false)
    expect(isCssEngineModuleId('/node_modules/unocss/dist/index.mjs')).toBe(
      false,
    )
    expect(isCssEngineModuleId('/node_modules/some-pkg/dist/index.css')).toBe(
      false,
    )
    expect(isCssEngineModuleId('/src/foo.css.js')).toBe(false)
  })
})
