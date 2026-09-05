import { describe, expect, it, vi } from 'vitest'

import init from '../typescript-plugin'

function createMockHost(source: string, fileName = '/app/src/App.tsx') {
  const originalSnapshot = {
    getText: (_start: number, _end: number) => source,
    getLength: () => source.length,
  }

  const getScriptSnapshot = vi.fn((name: string) =>
    name === fileName ? originalSnapshot : undefined,
  )

  const readFile = vi.fn((name: string) =>
    name === fileName ? source : undefined,
  )

  const host = { getScriptSnapshot, readFile }
  const ts = {
    ScriptSnapshot: {
      fromString: (text: string) => ({
        getText: (start: number, end: number) => text.slice(start, end),
        getLength: () => text.length,
      }),
    },
  }

  init({ typescript: ts as never }).create({
    languageServiceHost: host,
    languageService: {} as never,
    project: {
      projectService: { logger: { info: () => {}, err: () => {} } },
    } as never,
    config: {} as never,
  })

  return { host, fileName }
}

describe('typescript-plugin', () => {
  it('rewrites getScriptSnapshot for tsx files with UseClassy modifiers', () => {
    const source
      = '<div className="@container" className:@md="p-4">X</div>'
    const { host, fileName } = createMockHost(source)

    const snapshot = host.getScriptSnapshot(fileName)
    const text = snapshot?.getText(0, snapshot.getLength()) ?? ''

    expect(text).toContain('@md:p-4')
    expect(text).not.toContain('className:@md')
  })

  it('does not rewrite plain .ts files', () => {
    const source = 'export const x = 1'
    const { host } = createMockHost(source, '/app/src/utils.ts')

    const snapshot = host.getScriptSnapshot('/app/src/utils.ts')
    expect(snapshot?.getText(0, snapshot.getLength())).toBe(source)
    expect(host.readFile('/app/src/utils.ts')).toBe(source)
  })

  it('rewrites readFile for tsx files with UseClassy modifiers', () => {
    const source
      = '<div className="@container" className:@md="p-4">X</div>'
    const { host, fileName } = createMockHost(source)

    const text = host.readFile(fileName) ?? ''

    expect(text).toContain('@md:p-4')
    expect(text).not.toContain('className:@md')
  })
})
