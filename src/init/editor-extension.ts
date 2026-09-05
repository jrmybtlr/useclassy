import installCommands from '../../vscode-useclassy/install-commands.json'

export type EditorInstallCommand = {
  name: string
  cli: string
}

export const EDITOR_EXTENSION_INSTALL_COMMANDS = installCommands as EditorInstallCommand[]

const NPM_NOTE = '# After: npm i -D vite-plugin-useclassy'
const EXT_PATH = './node_modules/vite-plugin-useclassy/vscode-useclassy'

export function formatEditorExtensionInstallCopy(): string {
  return [
    NPM_NOTE,
    ...EDITOR_EXTENSION_INSTALL_COMMANDS.map(
      ({ cli }) => `${cli} --install-extension ${EXT_PATH}`,
    ),
  ].join('\n')
}

export function editorExtensionInstallHint(): string {
  return (
    'UseClassy syntax highlighting is not on the Marketplace yet. ' +
    `Sideload from node_modules: \`code --install-extension ${EXT_PATH}\` ` +
    '(or cursor / codium / …). See editor/README.md.'
  )
}
