import { describe, expect, it } from 'vitest'
import ts from 'typescript'

import { rewriteJsxForTypeScript, shouldRewriteJsxFile } from '../core'

function diagnoseTypeScript(code: string, fileName = '/check.ts'): string[] {
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  }
  const host = ts.createCompilerHost(options)
  const originalGetSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (name === fileName) {
      return ts.createSourceFile(name, code, languageVersion, true, ts.ScriptKind.TS)
    }
    return originalGetSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile)
  }
  host.fileExists = (name) => name === fileName || ts.sys.fileExists(name)
  host.readFile = (name) => (name === fileName ? code : ts.sys.readFile(name))

  const program = ts.createProgram([fileName], options, host)
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    return `${diagnostic.code}: ${message}`
  })
}

describe('rewriteJsxForTypeScript', () => {
  it('rewrites @md, named groups, and arbitrary variants', () => {
    const code =
      '<div className="@container" className:@md="p-4" className:group-hover/item="bg-red-500" className:[&>*]="mt-2" className:data-[state=open]="block">X</div>'
    const result = rewriteJsxForTypeScript(code)

    expect(result).toContain('@md:p-4')
    expect(result).toContain('group-hover/item:bg-red-500')
    expect(result).toContain('[&>*]:mt-2')
    expect(result).toContain('data-[state=open]:block')
    expect(result).not.toContain('className:@md')
    expect(result).not.toContain('className:group-hover/item')
  })

  it('rewrites chained modifiers', () => {
    const code = '<p className:sm:hover="underline">X</p>'
    const result = rewriteJsxForTypeScript(code)

    expect(result).toContain('sm:hover:underline')
    expect(result).not.toContain('className:sm:hover')
  })

  it('leaves files without UseClassy modifiers unchanged', () => {
    const code = '<div className="px-4">X</div>'
    expect(rewriteJsxForTypeScript(code)).toBe(code)
  })

  it('does not wrap string ternaries in || which is TS2872', () => {
    const code = `<button className="px-4" className:hover={isActive ? 'bg-blue-500' : 'bg-gray-200'}>X</button>`
    const result = rewriteJsxForTypeScript(code)

    expect(result).toContain("${isActive ? 'hover:bg-blue-500' : 'hover:bg-gray-200'}")
    expect(result).not.toContain("|| ''")
  })

  it('still coerces && class expressions so false is not stringified', () => {
    const code = `<button className="px-4" className:disabled={isDisabled && 'opacity-50'}>X</button>`
    const result = rewriteJsxForTypeScript(code)

    expect(result).toContain("${(isDisabled && 'disabled:opacity-50') || ''}")
  })

  it('rewritten hover ternary does not trigger TS2872', () => {
    const source = `<button
      className="px-6 py-3 rounded-lg font-semibold transition"
      className:hover={
        isActive
          ? "bg-blue-500 text-white scale-105"
          : "bg-zinc-700 text-zinc-200"
      }
      className:disabled={isDisabled && "opacity-40 cursor-not-allowed"}
    />`

    const rewritten = rewriteJsxForTypeScript(source)
    const classNameMatch = rewritten.match(/className=\{`([\s\S]*?)`\}/)
    expect(classNameMatch?.[1]).toBeDefined()

    const diagnostics = diagnoseTypeScript(
      `const isActive = true as boolean
const isDisabled = false as boolean
export const className = \`${classNameMatch![1]}\`
`,
    )

    expect(diagnostics.filter((message) => message.startsWith('2872:'))).toEqual([])
    expect(rewritten).toContain(
      '${isActive\n          ? "hover:bg-blue-500 hover:text-white hover:scale-105"\n          : "hover:bg-zinc-700 hover:text-zinc-200"}',
    )
    expect(rewritten).toContain(
      '${(isDisabled && "disabled:opacity-40 disabled:cursor-not-allowed") || \'\'}',
    )
  })
})

describe('shouldRewriteJsxFile', () => {
  it('matches tsx/jsx and skips node_modules', () => {
    expect(shouldRewriteJsxFile('/app/src/App.tsx')).toBe(true)
    expect(shouldRewriteJsxFile('/app/src/App.jsx')).toBe(true)
    expect(shouldRewriteJsxFile('/app/node_modules/pkg/index.tsx')).toBe(false)
    expect(shouldRewriteJsxFile('/app/src/utils.ts')).toBe(false)
  })
})
