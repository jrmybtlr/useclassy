import { describe, expect, it } from 'vitest'

import { isCssEngineModuleId } from '../hmr'

describe('isCssEngineModuleId', () => {
  it('matches stylesheets', () => {
    expect(isCssEngineModuleId('/src/main.css')).toBe(true)
    expect(isCssEngineModuleId('/src/app.module.css?used')).toBe(true)
  })

  it('matches Uno virtual modules', () => {
    expect(isCssEngineModuleId('/__uno.css')).toBe(true)
    expect(isCssEngineModuleId('virtual:uno.css')).toBe(true)
    expect(isCssEngineModuleId('\0unocss/entry')).toBe(true)
  })

  it('rejects unrelated modules', () => {
    expect(isCssEngineModuleId('/src/App.tsx')).toBe(false)
    expect(isCssEngineModuleId('/src/utils.ts')).toBe(false)
  })
})
