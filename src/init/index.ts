import { pushAgentMessages, installAgentResources } from './agents'
import { detectCssEngine, resolveInitEngine } from './detect'
import {
  detectTailwindFlavor,
  patchTailwindV3,
  patchTailwindV4,
  pushTailwindMessages,
} from './tailwind'
import { patchUnoConfig, pushUnoMessages } from './unocss'
import { patchViteConfig, pushViteMessages } from './vite'
import {
  patchVsCodeExtensions,
  patchVsCodeSettings,
  pushVsCodeExtensionsMessages,
  pushVsCodeMessages,
} from './vscode'
import { patchTsConfig, pushTsConfigMessages } from './tsconfig'
import type { InitEngine, InitLanguage, InitSetupResult } from './types'

export type {
  CssEngineDetection,
  FilePatchResult,
  InitEngine,
  InitLanguage,
  InitSetupResult,
  TailwindFlavor,
} from './types'
export { INIT_ENGINES, INIT_LANGUAGES } from './types'

export {
  EDITOR_EXTENSION_INSTALL_COMMANDS,
  editorExtensionInstallHint,
  formatEditorExtensionInstallCopy,
  type EditorInstallCommand,
} from './editor-extension'
export { detectCssEngine, resolveInitEngine } from './detect'
export {
  detectTailwindFlavor,
  findTailwindConfigFile,
  findTailwindCssEntryFiles,
  patchTailwindV3,
  patchTailwindV3ConfigContent,
  patchTailwindV4,
  patchTailwindV4Stylesheet,
} from './tailwind'
export {
  detectUnoPresent,
  findUnoConfigFile,
  hasUnoDependency,
  patchUnoConfig,
  patchUnoConfigContent,
} from './unocss'
export { findViteConfigFile, patchViteConfig, patchViteConfigContent } from './vite'
export {
  mergeExtensionRecommendations,
  mergeTailwindClassAttributes,
  patchVsCodeExtensions,
  patchVsCodeSettings,
  USECLASSY_VSCODE_EXTENSION_ID,
} from './vscode'
export {
  findTsConfigFile,
  patchTsConfig,
  patchTsConfigContent,
  pushTsConfigMessages,
  USECLASSY_TS_PLUGIN_NAME,
} from './tsconfig'
export {
  installAgentResources,
  patchAgentsMd,
  patchAgentsMdContent,
  resolveTemplatesRoot,
  type InstallAgentOptions,
} from './agents'

export function runInitSetup(options: {
  cwd: string
  language: InitLanguage
  dryRun: boolean
  engine?: InitEngine
  withSkills?: boolean
  withClaude?: boolean
  force?: boolean
}): InitSetupResult {
  const { cwd, language, dryRun, withSkills = false, withClaude = false, force = false } = options
  const result: InitSetupResult = { messages: [] }

  const detected = detectCssEngine(cwd)
  const engine = resolveInitEngine(cwd, options.engine)
  result.messages.push(`Detected CSS stack: ${detected}`)
  result.messages.push(`Using engine: ${engine}`)

  if (detected === 'both' && !options.engine) {
    result.messages.push(
      'Both Tailwind and UnoCSS detected; defaulting to Tailwind. Pass --engine unocss to configure Uno instead.',
    )
  }

  pushViteMessages(result, patchViteConfig(cwd, language, dryRun, engine), dryRun)

  if (engine === 'unocss') {
    pushUnoMessages(result, patchUnoConfig(cwd, dryRun), dryRun)
  } else {
    const flavor = detectTailwindFlavor(cwd)
    if (flavor === 'v4') {
      pushTailwindMessages(result, 'v4', patchTailwindV4(cwd, dryRun), dryRun)
    } else if (flavor === 'v3') {
      pushTailwindMessages(result, 'v3', patchTailwindV3(cwd, dryRun), dryRun)
    } else {
      result.messages.push(
        'Tailwind: could not detect v3 vs v4. Add the manifest to Tailwind manually (see README).',
      )
    }
  }

  // Uno IntelliSense comes from the UnoCSS extension + uno.config, not the
  // Tailwind CSS `classAttributes` setting.
  if (engine === 'unocss') {
    result.messages.push(
      'VS Code: skipped Tailwind CSS IntelliSense (UnoCSS uses the Uno extension).',
    )
  } else {
    pushVsCodeMessages(result, patchVsCodeSettings(cwd, language, dryRun), dryRun)
  }

  if (language === 'react') {
    pushVsCodeExtensionsMessages(result, patchVsCodeExtensions(cwd, language, dryRun), dryRun)
    pushTsConfigMessages(result, patchTsConfig(cwd, dryRun), dryRun)
  }

  if (withSkills) {
    pushAgentMessages(result, installAgentResources(cwd, dryRun, { force, withClaude }), dryRun)
  }

  return result
}
