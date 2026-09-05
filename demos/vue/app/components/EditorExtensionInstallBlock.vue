<template>
  <CodeBlock
    v-model="editorExtension"
    :tabs="editorExtensionOptions"
    aria-label="Editor for extension install"
    :copy-text="copyText"
  >
    <code>
      <template v-if="editorExtension === 'vscode'">
        <div class="text-neutral-500"># From a clone of github.com/jrmybtlr/useclassy</div>
        <div>
          <span class="text-sky-300">code</span>
          <span class="text-neutral-600">{{ ' ' }}</span>
          <span class="text-neutral-100">--install-extension ./vscode-useclassy</span>
        </div>
        <div class="mt-3 text-neutral-400">
          Syntax highlighting for
          <span class="text-neutral-200">className:@md</span>
          and similar modifiers. Reload the window after install.
        </div>
      </template>

      <template v-else-if="editorExtension === 'cursor'">
        <div class="text-neutral-500"># From a clone of github.com/jrmybtlr/useclassy</div>
        <div>
          <span class="text-sky-300">cursor</span>
          <span class="text-neutral-600">{{ ' ' }}</span>
          <span class="text-neutral-100">--install-extension ./vscode-useclassy</span>
        </div>
        <div class="mt-3 text-neutral-400">
          Same extension as VS Code. Reload the window after install.
        </div>
      </template>

      <template v-else-if="editorExtension === 'neovim'">
        <div class="text-neutral-400">
          Add
          <span class="text-neutral-200">editor/neovim</span>
          to runtimepath for syntax + Tree-sitter queries. Pair with the tsconfig language plugin
          and
          <span class="text-neutral-200">ts_ls</span>
          for React diagnostics.
        </div>
        <div class="mt-3 text-neutral-500"># lazy.nvim — adjust path to your clone</div>
        <div class="mt-1">
          <span class="text-neutral-100">{</span>
        </div>
        <div class="ml-4">
          <span class="text-neutral-100">dir = </span>
          <span class="text-emerald-400">'/path/to/useclassy/editor/neovim'</span>
          <span class="text-neutral-100">,</span>
        </div>
        <div class="ml-4">
          <span class="text-neutral-100">ft = { </span>
          <span class="text-emerald-400">'tsx'</span>
          <span class="text-neutral-100">, </span>
          <span class="text-emerald-400">'jsx'</span>
          <span class="text-neutral-100"> },</span>
        </div>
        <div>
          <span class="text-neutral-100">}</span>
        </div>
        <div class="mt-3 text-neutral-500">Full guide: editor/neovim/README.md</div>
      </template>

      <template v-else-if="editorExtension === 'zed'">
        <div class="text-neutral-400">
          Copy
          <span class="text-neutral-200">editor/zed/settings.example.json</span>
          into
          <span class="text-neutral-200">.zed/settings.json</span>
          for vtsls + the tsconfig language plugin (React diagnostics).
        </div>
        <div class="mt-3 text-neutral-500">
          Syntax highlighting for exotic modifiers is not available in Zed yet — Vite still rewrites
          at build time.
        </div>
        <div class="mt-2 text-neutral-500">Full guide: editor/zed/README.md</div>
      </template>

      <template v-else>
        <div class="text-neutral-400">
          No UseClassy plugin for JetBrains yet. Dev and build work — the Vite plugin rewrites
          <span class="text-neutral-200">className:hover</span>
          at transform time.
        </div>
        <div class="mt-3 text-neutral-500">
          Ignore JSX attribute warnings on exotic modifiers, or see editor/README.md.
        </div>
      </template>
    </code>
  </CodeBlock>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type EditorTab = 'vscode' | 'cursor' | 'neovim' | 'zed' | 'jetbrains'

const editorExtension = ref<EditorTab>('vscode')

const editorExtensionOptions = [
  { value: 'vscode', label: 'VS Code' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'neovim', label: 'Neovim' },
  { value: 'zed', label: 'Zed' },
  { value: 'jetbrains', label: 'JetBrains' },
] as const

const copyByEditor: Record<EditorTab, string> = {
  vscode: `# From a clone of github.com/jrmybtlr/useclassy
code --install-extension ./vscode-useclassy`,
  cursor: `# From a clone of github.com/jrmybtlr/useclassy
cursor --install-extension ./vscode-useclassy`,
  neovim: `# Add editor/neovim to runtimepath (syntax + Tree-sitter queries)
# lazy.nvim:
{
  dir = '/path/to/useclassy/editor/neovim',
  ft = { 'tsx', 'jsx' },
}
# React diagnostics: tsconfig compilerOptions.plugins + ts_ls pluginPaths
# See editor/neovim/README.md`,
  zed: `# Copy editor/zed/settings.example.json → .zed/settings.json
# Pair with tsconfig compilerOptions.plugins for React diagnostics
# See editor/zed/README.md`,
  jetbrains: `# No JetBrains plugin yet — Vite rewrites modifiers at build time
# See editor/README.md`,
}

const copyText = computed(() => copyByEditor[editorExtension.value])
</script>
