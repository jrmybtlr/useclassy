import {
  rewriteJsxForTypeScript,
  shouldRewriteJsxFile,
} from './core'

/** tsserver passes its own `typescript` module to plugin init. */
type TypeScriptModule = typeof import('typescript')

type PluginCreateInfo = import('typescript').server.PluginCreateInfo

function rewriteJsxSnapshotText(text: string): string {
  return rewriteJsxForTypeScript(text)
}

function patchHostForUseClassy(
  ts: TypeScriptModule,
  host: PluginCreateInfo['languageServiceHost'],
): void {
  const originalGetScriptSnapshot = host.getScriptSnapshot.bind(host)

  host.getScriptSnapshot = (fileName: string) => {
    const snapshot = originalGetScriptSnapshot(fileName)
    if (!snapshot || !shouldRewriteJsxFile(fileName))
      return snapshot

    const text = snapshot.getText(0, snapshot.getLength())
    const rewritten = rewriteJsxSnapshotText(text)
    if (rewritten === text)
      return snapshot

    return ts.ScriptSnapshot.fromString(rewritten)
  }

  const originalReadFile = host.readFile?.bind(host)
  if (originalReadFile) {
    host.readFile = (fileName: string) => {
      const content = originalReadFile(fileName)
      if (content === undefined || !shouldRewriteJsxFile(fileName))
        return content

      const rewritten = rewriteJsxSnapshotText(content)
      return rewritten === content ? content : rewritten
    }
  }
}

function createLanguageServiceProxy(
  languageService: import('typescript').LanguageService,
): import('typescript').LanguageService {
  const proxy = Object.create(null) as import('typescript').LanguageService

  for (const key of Object.keys(languageService) as Array<
    keyof import('typescript').LanguageService
  >) {
    const method = languageService[key]
    if (typeof method === 'function') {
      // @ts-expect-error — delegate dynamic language-service methods
      proxy[key] = (...args: unknown[]) => method.apply(languageService, args)
    }
  }

  return proxy
}

function createUseClassyLanguageServicePlugin(
  ts: TypeScriptModule,
  info: PluginCreateInfo,
): import('typescript').LanguageService {
  patchHostForUseClassy(ts, info.languageServiceHost)

  info.project.projectService.logger.info(
    '[vite-plugin-useclassy/typescript-plugin] loaded',
  )

  return createLanguageServiceProxy(info.languageService)
}

/** TypeScript language-service plugin entry (loaded by tsserver). */
function init(modules: { typescript: TypeScriptModule }) {
  const ts = modules.typescript

  return {
    create(info: PluginCreateInfo) {
      return createUseClassyLanguageServicePlugin(ts, info)
    },
  }
}

export default init
