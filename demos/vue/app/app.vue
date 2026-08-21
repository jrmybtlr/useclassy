<template>
  <main class="isolate flex h-full min-h-dvh w-full flex-col bg-gutter-dots text-white">
    <section class="mx-auto flex w-full max-w-4xl bg-neutral-950">
      <GutterRail />

      <div class="flex min-w-0 flex-1 flex-col items-center bg-white/1">
        <header
          class="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-8 text-center"
          class:sm="py-16"
        >
          <TipHat />

          <h1
            class="text-tight mt-4 w-full text-center font-display text-3xl font-semibold tracking-tight text-balance"
            class:sm="text-4xl"
            class:md="text-6xl"
          >
            Readable Utility CSS.
            <span class="text-white/50">No horizontal scroll.</span>
          </h1>
          <p class="mt-4 max-w-[42ch] text-center text-lg text-pretty text-neutral-400">
            Write Tailwind and UnoCSS that's easier to read, review and debug. Made for agents and
            humans.
          </p>

          <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#setup"
              class="glass-cta relative inline-flex items-center rounded-full border border-white/20 bg-linear-to-b from-accent/45 to-accent/15 px-8 py-3 font-display text-lg font-semibold text-white shadow-[0_0_24px_rgb(40_83_255/0.35),inset_0_1px_0_0_rgb(255_255_255/0.45),inset_0_-1px_0_0_rgb(40_83_255/0.25),inset_0_0_24px_0_rgb(40_83_255/0.4)] backdrop-blur-xl backdrop-saturate-150 transition-[border-color,background-color] duration-200 ease-out"
              class:hover="border-white/30 from-accent/55 to-accent/25"
              class:focus-visible="outline-2 outline-offset-2 outline-accent"
            >
              <span class="relative z-10">Get started</span>
            </a>
            <a
              href="https://github.com/jrmybtlr/useclassy"
              class="inline-flex items-center gap-2 font-display text-lg text-neutral-400"
              class:hover="text-white"
              class:focus-visible="outline-2 outline-offset-2 outline-accent"
            >
              <IconGithub />
              GitHub
            </a>
          </div>
        </header>

        <div class="w-full min-w-0 overflow-hidden border-t border-neutral-900">
          <ClassExample v-model:format="demoFormat" :examples="classExamples" />
        </div>
      </div>

      <GutterRail />
    </section>

    <section id="setup" class="border-t border-neutral-900">
      <div class="mx-auto flex w-full max-w-4xl bg-neutral-950">
        <GutterRail />

        <div class="min-w-0 flex-1 bg-white/1 px-6 py-8" class:sm="px-12 py-16">
          <div class="flex flex-col items-start gap-6">
            <div class="flex items-center gap-3" aria-hidden="true">
              <IconTailwind />
              <IconUnoCSS />
            </div>
            <h2
              class="max-w-[24ch] font-display text-3xl font-bold tracking-tight text-balance"
              class:sm="text-5xl"
            >
              Tailwind or UnoCSS.
              <span class="text-white/50">Pick your engine.</span>
            </h2>
          </div>

          <div class="mt-10 flex flex-wrap items-end gap-x-12 gap-y-6">
            <div class="flex min-w-0 flex-col gap-2">
              <SegmentedControl
                v-model="setupMode"
                aria-label="Setup instructions"
                :options="setupModeOptions"
              />
            </div>
            <div class="flex min-w-0 flex-col gap-2">
              <SegmentedControl
                v-model="cssEngine"
                aria-label="CSS engine"
                :options="cssEngineOptions"
              />
            </div>
          </div>

          <div class="mt-10 min-w-0">
            <Step :number="1" title="Install">
              <CodeBlock
                v-model="packageManager"
                :tabs="packageManagerOptions"
                aria-label="Package manager"
                :copy-text="installCopy"
              >
                <code>
                  <span v-for="(t, i) in installTokens" :key="`install-${i}`" :class="t.class">{{
                    t.text
                  }}</span>
                </code>
              </CodeBlock>
            </Step>

            <Step v-if="setupMode === 'quick'" :number="2" title="Quick setup" last>
              <CodeBlock
                v-model="initFramework"
                :tabs="initFrameworkOptions"
                aria-label="Framework for init command"
                :copy-text="quickInitCopy"
              >
                <code>
                  <span v-for="(t, i) in quickInitTokens" :key="`init-${i}`" :class="t.class">{{
                    t.text
                  }}</span>
                </code>
              </CodeBlock>
              <CodeBlock v-if="demoFormat === 'blade'" :copy-text="composerCopy">
                <code>
                  <span class="text-sky-300">composer</span>
                  <span class="text-neutral-600">{{ ' ' }}</span>
                  <span class="text-neutral-100">require</span>
                  <span class="text-neutral-600">{{ ' ' }}</span>
                  <span class="text-emerald-400">useclassy/laravel</span>
                </code>
              </CodeBlock>
              <label
                class="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 px-3.5 py-3 text-base text-neutral-300 select-none"
                class:sm="text-sm"
                class:hover="border-white/15 bg-white/5"
              >
                <span class="relative mt-0.5 shrink-0">
                  <input
                    v-model="withSkills"
                    type="checkbox"
                    role="switch"
                    class="sr-only"
                    :aria-checked="withSkills"
                  />
                  <span
                    class="relative block h-5 w-9 rounded-full transition-colors"
                    :class="withSkills ? 'bg-accent' : 'bg-white/10'"
                    aria-hidden="true"
                  >
                    <span
                      class="absolute top-0.5 left-0.5 size-4 rounded-full shadow-sm transition-[transform,background-color]"
                      :class="withSkills ? 'translate-x-4 bg-white' : 'bg-neutral-400'"
                    />
                  </span>
                </span>
                <span class="min-w-0 text-pretty">
                  <span class="font-medium text-neutral-200">With skills.</span>
                  Installs the UseClassy skill so Cursor, Codex, and Copilot keep writing
                  <span class="font-mono text-neutral-200">class:hover</span>
                  instead of stuffing variants back into one string.
                </span>
              </label>
            </Step>

            <Step
              v-if="setupMode === 'manual'"
              :number="2"
              title="Vite"
              description="Add useClassy to your Vite config."
            >
              <CodeBlock filename="vite.config.ts" :copy-text="viteCopy">
                <code>
                  <div class="text-white">import useClassy from 'vite-plugin-useclassy';</div>
                  <div class="mt-2">export default {</div>
                  <div class="ml-4">plugins: [</div>
                  <div class="ml-8 text-white">useClassy({</div>
                  <div class="ml-12 text-white">language: '{{ demoFormat }}',</div>
                  <div v-if="cssEngine === 'unocss'" class="ml-12 text-white">
                    engine: 'unocss',
                  </div>
                  <div class="ml-8 text-white">}),</div>
                  <div class="ml-8">// ... other plugins</div>
                  <div class="ml-4">],</div>
                  <div>};</div>
                </code>
              </CodeBlock>
              <Callout variant="tip">
                Place it before Tailwind, UnoCSS, or other CSS plugins. UseClassy rewrites
                <span class="font-mono text-neutral-200">class:hover</span>
                into
                <span class="font-mono text-neutral-200">hover:…</span>
                so the engine’s scanner sees normal utilities.
              </Callout>
            </Step>

            <Step
              v-if="setupMode === 'manual' && cssEngine === 'tailwind'"
              :number="3"
              title="Tailwind"
              description="Point Tailwind at the generated class manifest."
            >
              <CodeBlock filename="app.css" :copy-text="tailwindCopy">
                <code>
                  <div>@import "tailwindcss";</div>
                  <div class="mt-2 text-white">@source "./.classy/output.classy.html";</div>
                </code>
              </CodeBlock>
            </Step>

            <Step
              v-if="setupMode === 'manual' && cssEngine === 'unocss'"
              :number="3"
              title="UnoCSS"
              description="Point Uno at the UseClassy manifest as a filesystem backstop. Vite pipeline extract is the primary path when UseClassy runs first."
            >
              <CodeBlock filename="uno.config.ts" :copy-text="unoCopy">
                <code>
                  <div>import { defineConfig, presetUno } from 'unocss';</div>
                  <div class="text-white">
                    import { getUseClassyUnoFilesystemEntry } from 'vite-plugin-useclassy/unocss';
                  </div>
                  <div class="mt-2">export default defineConfig({</div>
                  <div class="ml-4">presets: [presetUno()],</div>
                  <div class="ml-4">content: {</div>
                  <div class="ml-8">filesystem: [</div>
                  <div class="ml-12 text-white">getUseClassyUnoFilesystemEntry(),</div>
                  <div class="ml-8">],</div>
                  <div class="ml-4">},</div>
                  <div>});</div>
                </code>
              </CodeBlock>
              <Callout>
                Vite’s Uno pipeline already sees rewritten
                <span class="font-mono text-neutral-200">hover:…</span>
                classes when UseClassy runs first. The HTML manifest is a backstop for files Uno
                does not extract (plain
                <span class="font-mono text-neutral-200">.ts</span>
                /
                <span class="font-mono text-neutral-200">.js</span>
                by default, plus Blade or HTML that never enter Vite). This is not an Uno extractor,
                attributify, or Wind4 preset.
              </Callout>
            </Step>

            <Step
              v-if="setupMode === 'manual' && cssEngine === 'tailwind'"
              :number="4"
              title="IntelliSense"
              badge="Optional"
            >
              <CodeBlock filename=".vscode/settings.json" :copy-text="intelCopy">
                <code>
                  <div>{</div>
                  <div class="ml-4">"tailwindCSS.classAttributes": [</div>
                  <div class="ml-8">"class",</div>
                  <div class="ml-8 text-white">"class:[\\w:/@-]*",</div>
                  <div class="ml-8">"className",</div>
                  <div class="ml-8 text-white">"className:[\\w:/@-]*"</div>
                  <div class="ml-4">]</div>
                  <div>}</div>
                </code>
              </CodeBlock>
            </Step>

            <Step
              v-if="setupMode === 'manual'"
              :number="cssEngine === 'tailwind' ? 5 : 4"
              title="Skills"
              badge="Optional"
              description="So Cursor, Codex, and Copilot keep writing class:hover."
              wide-description
              last
            >
              <CodeBlock :copy-text="skillsInitCopy">
                <code>
                  <span v-for="(t, i) in skillsInitTokens" :key="`skills-${i}`" :class="t.class">{{
                    t.text
                  }}</span>
                </code>
              </CodeBlock>
            </Step>
          </div>
        </div>
        <GutterRail />
      </div>
    </section>

    <footer class="flex grow flex-col border-t border-neutral-900">
      <div class="mx-auto flex w-full max-w-4xl grow bg-neutral-950">
        <GutterRail />
        <div
          class="flex min-w-0 flex-1 items-center justify-center bg-white/1 py-6 font-mono text-sm tracking-wide text-neutral-500 uppercase"
        >
          MIT License © {{ new Date().getFullYear() }} Jeremy Butler
        </div>
        <GutterRail />
      </div>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DemoFormat } from './components/ClassExample.vue'

const setupMode = ref<'quick' | 'manual'>('quick')
const cssEngine = ref<'tailwind' | 'unocss'>('tailwind')
const packageManager = ref<'npm' | 'pnpm' | 'yarn'>('npm')
const withSkills = ref(true)

const packageManagerOptions = [
  { value: 'npm', label: 'npm' },
  { value: 'pnpm', label: 'pnpm' },
  { value: 'yarn', label: 'yarn' },
] as const

const setupModeOptions = [
  { value: 'quick', label: 'Init CLI' },
  { value: 'manual', label: 'Manual' },
] as const

const cssEngineOptions = [
  { value: 'tailwind', label: 'Tailwind' },
  { value: 'unocss', label: 'UnoCSS' },
] as const

/** Shared across hero demo, init CLI, and manual Vite snippet. */
const demoFormat = ref<DemoFormat>('vue')

type InitFrameworkId = 'vue' | 'svelte' | 'react' | 'laravel'

const initFramework = computed({
  get: (): InitFrameworkId => (demoFormat.value === 'blade' ? 'laravel' : demoFormat.value),
  set: (value: InitFrameworkId) => {
    demoFormat.value = value === 'laravel' ? 'blade' : value
  },
})

const initFrameworkOptions: {
  value: InitFrameworkId
  label: string
}[] = [
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'react', label: 'React' },
  { value: 'laravel', label: 'Laravel' },
]

type CliToken = { text: string; class: string }

const space: CliToken = { text: ' ', class: 'text-neutral-600' }

const installTokens = computed((): CliToken[] => {
  if (packageManager.value === 'pnpm') {
    return [
      { text: 'pnpm', class: 'text-sky-300' },
      space,
      { text: 'add', class: 'text-neutral-100' },
      space,
      { text: 'vite-plugin-useclassy', class: 'text-emerald-400' },
      space,
      { text: '-D', class: 'text-amber-400' },
    ]
  }
  if (packageManager.value === 'yarn') {
    return [
      { text: 'yarn', class: 'text-sky-300' },
      space,
      { text: 'add', class: 'text-neutral-100' },
      space,
      { text: 'vite-plugin-useclassy', class: 'text-emerald-400' },
      space,
      { text: '-D', class: 'text-amber-400' },
    ]
  }
  return [
    { text: 'npm', class: 'text-sky-300' },
    space,
    { text: 'install', class: 'text-neutral-100' },
    space,
    { text: 'vite-plugin-useclassy', class: 'text-emerald-400' },
    space,
    { text: '--save-dev', class: 'text-amber-400' },
  ]
})

const installCopy = computed(() => installTokens.value.map((t) => t.text).join(''))

const quickInitTokens = computed((): CliToken[] => {
  const format = demoFormat.value
  const tokens: CliToken[] = [
    { text: 'npx', class: 'text-sky-300' },
    { text: ' ', class: 'text-neutral-600' },
    { text: 'vite-plugin-useclassy', class: 'text-emerald-400' },
    { text: ' ', class: 'text-neutral-600' },
    { text: 'init', class: 'text-neutral-100' },
  ]
  if (cssEngine.value === 'unocss') {
    tokens.push(
      { text: ' ', class: 'text-neutral-600' },
      { text: '--engine', class: 'text-amber-400' },
      { text: ' ', class: 'text-neutral-600' },
      { text: 'unocss', class: 'text-orange-300' },
    )
  }
  tokens.push(
    { text: ' ', class: 'text-neutral-600' },
    { text: '--language', class: 'text-amber-400' },
    { text: ' ', class: 'text-neutral-600' },
    { text: format, class: 'text-orange-300' },
  )
  if (withSkills.value) {
    tokens.push(
      { text: ' ', class: 'text-neutral-600' },
      { text: '--with-skills', class: 'text-amber-400' },
    )
  }
  return tokens
})

const quickInitCopy = computed(() => quickInitTokens.value.map((t) => t.text).join(''))

const skillsInitTokens: CliToken[] = [
  { text: 'npx', class: 'text-sky-300' },
  space,
  { text: 'vite-plugin-useclassy', class: 'text-emerald-400' },
  space,
  { text: 'init', class: 'text-neutral-100' },
  space,
  { text: '--with-skills', class: 'text-amber-400' },
]

const skillsInitCopy = skillsInitTokens.map((t) => t.text).join('')

const composerCopy = 'composer require useclassy/laravel'

const viteCopy = computed(() => {
  const engineLine = cssEngine.value === 'unocss' ? `\n      engine: 'unocss',` : ''
  return `import useClassy from 'vite-plugin-useclassy';

export default {
  plugins: [
    useClassy({
      language: '${demoFormat.value}',${engineLine}
    }),
    // ... other plugins
  ],
};
`
})

const tailwindCopy = `@import "tailwindcss";
@source "./.classy/output.classy.html";
`

const unoCopy = `import { defineConfig, presetUno } from 'unocss';
import { getUseClassyUnoFilesystemEntry } from 'vite-plugin-useclassy/unocss';

export default defineConfig({
  presets: [presetUno()],
  content: {
    filesystem: [
      getUseClassyUnoFilesystemEntry(),
    ],
  },
});
`

const intelCopy = `{
  "tailwindCSS.classAttributes": [
    "class",
    "class:[\\\\w:/@-]*",
    "className",
    "className:[\\\\w:/@-]*"
  ]
}
`

useSeoMeta({
  title: 'UseClassy',
  description: 'Variant attributes for Tailwind and UnoCSS. One state per line.',
  ogTitle: 'UseClassy',
  ogDescription: 'Variant attributes for Tailwind and UnoCSS. One state per line.',
  ogImage: 'https://assets.useclassy.com/og-image.png',
  ogUrl: 'https://useclassy.com',
  twitterTitle: 'UseClassy',
  twitterDescription: 'Variant attributes for Tailwind and UnoCSS. One rewrite. Every engine.',
  twitterImage: 'https://assets.useclassy.com/og-image-twitter.png',
  twitterCard: 'summary_large_image',
})

useHead({
  htmlAttrs: {
    lang: 'en',
    class: 'scheme-only-dark',
  },
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: '/favicon.png',
    },
  ],
})

const classExamples = {
  // Base styles
  base: 'p-6 bg-white rounded-xl shadow-lg border',

  // Interactive states
  hover: 'bg-blue-50 scale-105 shadow-xl',
  focus: 'ring-2 ring-blue-500 ring-offset-2',

  // Dark mode
  dark: 'bg-zinc-800 text-white border-zinc-700',

  // Container query
  '@md': 'p-6 text-base mt-4',

  // Chained modifier (emits sm:hover:underline only)
  'sm:hover': 'underline',

  // Group interactions
  'group-hover': 'bg-blue-100 shadow-lg border-blue-200',
  'focus-within': 'ring-2 ring-blue-500',

  // Arbitrary values
  // '[&>svg]': 'size-6 fill-blue-700 stroke-blue-700',
  'dark:[&>svg]': 'fill-blue-200 stroke-blue-200',

  // Complex selectors
  // '[&:has(>svg)]': 'pl-10 pr-2 fill-blue-500',
  '[&:not(:has(>svg))]': 'pl-4 pr-3 text-zinc-100 underline',
}
</script>
