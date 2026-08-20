<template>
  <div class="isolate min-h-dvh bg-gutter-dots text-white">
    <main>
      <section class="mx-auto flex max-w-4xl">
        <div class="w-6 shrink-0 border-x border-neutral-900 bg-diagonal-lines"></div>

        <div class="flex flex-col items-center bg-canvas">
          <header
            ref="heroRef"
            class="relative flex w-full flex-col items-center justify-center overflow-hidden py-16 text-center"
          >
            <canvas
              ref="emberCanvasRef"
              class="pointer-events-none absolute inset-0 z-10 size-full"
              aria-hidden="true"
            ></canvas>
            <button
              ref="hatWrapRef"
              type="button"
              class="group relative z-20 inline-flex cursor-pointer touch-manipulation appearance-none items-center justify-center border-0 bg-transparent p-4 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400/70"
              aria-label="Tip the hat"
              @pointerenter="onHatPlay"
              @click="onHatPlay"
            >
              <span
                class="pointer-events-none absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-[42%] rounded-full opacity-70 blur-2xl transition duration-500 hat-aura"
                class:sm="size-28"
                class:group-hover="scale-110 opacity-100"
              ></span>
              <span
                class="relative inline-block origin-[18%_88%] text-7xl leading-none hat-glow transition-[filter] duration-300 motion-reduce:animate-none"
                class:sm="text-8xl"
                :class="
                  hatTipping
                    ? 'motion-safe:animate-hat-tip hat-glow-hot'
                    : 'motion-safe:animate-hat-float'
                "
              >
                🎩
              </span>
            </button>

            <h1
              class="text-tight mt-4 w-full text-center font-display text-5xl font-semibold text-balance"
              class:sm="text-[50px]/[55px]"
            >
              Clever class attributes.
              <span class="text-white/50">No horizontal scroll.</span>
            </h1>
            <p class="mt-4 max-w-[40ch] text-center text-lg text-pretty text-neutral-400">
              Write classier code for Tailwind and UnoCSS and leave your mouse and scrollbar alone.
            </p>

            <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#setup"
                class="inline-flex items-center rounded-full bg-accent px-5 py-2 text-base font-medium text-white"
                class:hover="bg-blue-800"
                class:focus-visible="outline-2 outline-offset-2 outline-accent"
              >
                Get started
              </a>
              <a
                href="https://github.com/jrmybtlr/useclassy"
                class="inline-flex items-center gap-2 text-base text-neutral-300"
                class:hover="text-white"
                class:focus-visible="outline-2 outline-offset-2 outline-accent"
              >
                <IconGithub />
                GitHub
              </a>
            </div>
          </header>

          <div class="w-full border-t border-neutral-900 pb-3">
            <ClassExample v-model:format="demoFormat" :examples="classExamples" />
          </div>
        </div>

        <div class="w-6 shrink-0 border-x border-neutral-900 bg-diagonal-lines"></div>
      </section>

      <section id="setup" class="border-t border-neutral-900">
        <div class="mx-auto flex max-w-4xl">
          <div class="w-6 shrink-0 border-x border-neutral-900 bg-diagonal-lines"></div>

          <div class="w-full bg-canvas px-12 py-10">
            <div class="flex flex-col items-start gap-6">
              <div class="flex items-center gap-3" aria-hidden="true">
                <IconTailwind />
                <IconUnoCSS />
              </div>
              <h2
                class="max-w-[24ch] font-display text-4xl font-bold tracking-tight text-balance"
                class:sm="text-5xl"
              >
                Tailwind or UnoCSS.
                <span class="text-white/50">Pick your engine.</span>
              </h2>
            </div>

            <div class="mt-10 flex flex-wrap items-end gap-x-12 gap-y-6">
              <div class="flex min-w-0 flex-col gap-2">
                <p class="text-sm text-neutral-400" class:sm="text-xs">Setup method</p>
                <SegmentedControl
                  v-model="setupMode"
                  aria-label="Setup instructions"
                  :options="setupModeOptions"
                />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <p class="text-sm text-neutral-400" class:sm="text-xs">CSS engine</p>
                <SegmentedControl
                  v-model="cssEngine"
                  aria-label="CSS engine"
                  :options="cssEngineOptions"
                />
              </div>
            </div>

            <div class="mt-10 min-w-0">
              <Step
                :number="1"
                title="Install"
                description="Install the Vite plugin as a dev dependency."
              >
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

              <Step
                v-if="setupMode === 'quick'"
                :number="2"
                title="Quick setup"
                description="Run init from your app root. It patches Vite and Tailwind or UnoCSS. For Tailwind, it also merges VS Code IntelliSense settings when it can."
                last
              >
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
                last
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
                  by default, plus Blade or HTML that never enter Vite). This is not an Uno
                  extractor, attributify, or Wind4 preset.
                </Callout>
              </Step>

              <Step
                v-if="setupMode === 'manual' && cssEngine === 'tailwind'"
                :number="4"
                title="IntelliSense"
                badge="Optional"
                last
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
            </div>
          </div>
          <div class="w-6 shrink-0 border-x border-neutral-900 bg-diagonal-lines"></div>
        </div>
      </section>

      <footer
        class="flex items-center justify-center border-t border-neutral-900 bg-black py-6 text-sm text-neutral-500"
      >
        MIT License © {{ new Date().getFullYear() }} Jeremy Butler
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { DemoFormat } from './components/ClassExample.vue'

// ── Ember particle system ─────────────────────────────────────────────────────
const heroRef = ref<HTMLElement | null>(null)
const hatWrapRef = ref<HTMLElement | null>(null)
const emberCanvasRef = ref<HTMLCanvasElement | null>(null)
/** True only while the hat-tip animation is playing (0.7s). */
const sprinkling = ref(false)
/** Drives `animate-hat-tip` from JS so each tap can restart it (iOS sticky :hover cannot). */
const hatTipping = ref(false)
let sprinkleTimer = 0
let hatTipTimer = 0
let lastHatPlay = 0
const HAT_TIP_MS = 700
/** Collapse iOS first-tap pointerenter + click into one burst. */
const HAT_PLAY_DEBOUNCE_MS = 80

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  decay: number
  color: string
  fall: boolean
}

function isCheapDevice(): boolean {
  if (window.matchMedia('(pointer: coarse)').matches) return true
  if (window.matchMedia('(max-width: 640px)').matches) return true
  const nav = navigator as Navigator & { hardwareConcurrency?: number }
  return (nav.hardwareConcurrency ?? 8) <= 4
}

function useEmbers() {
  let raf = 0
  let embers: Ember[] = []
  let lastTs = 0
  let riseAcc = 0
  let fallAcc = 0
  let origin: { cx: number; brimY: number; spread: number } | null = null
  let cheap = false
  let risePerSec = 48
  let fallPerSec = 42
  let maxEmbers = 80
  let visible = true
  let ctx: CanvasRenderingContext2D | null = null
  let resizeObserver: ResizeObserver | null = null
  let intersectObserver: IntersectionObserver | null = null

  const GRAVITY = 120

  function applyDeviceProfile() {
    cheap = isCheapDevice()
    risePerSec = cheap ? 16 : 48
    fallPerSec = cheap ? 14 : 42
    maxEmbers = cheap ? 28 : 80
  }

  function syncCanvasSize() {
    const canvas = emberCanvasRef.value
    if (!canvas || !ctx) return
    const dpr = cheap ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    const cssW = Math.max(1, canvas.clientWidth)
    const cssH = Math.max(1, canvas.clientHeight)
    const bw = Math.round(cssW * dpr)
    const bh = Math.round(cssH * dpr)
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function refreshOrigin() {
    const hat = hatWrapRef.value
    const canvas = emberCanvasRef.value
    if (!hat || !canvas) {
      origin = null
      return
    }
    const hr = hat.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    origin = {
      cx: hr.left - cr.left + hr.width / 2,
      brimY: hr.top - cr.top + hr.height * 0.62,
      spread: hr.width * 0.28,
    }
  }

  function spawnRise() {
    if (!origin || embers.length >= maxEmbers) return
    embers.push({
      x: origin.cx + (Math.random() - 0.5) * origin.spread * 2.2,
      y: origin.brimY + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 42,
      vy: -(24 + Math.random() * 54),
      size: 1.4 + Math.random() * 1.8,
      alpha: 0.5 + Math.random() * 0.35,
      decay: 0.36 + Math.random() * 0.3,
      color: `hsl(${200 + Math.random() * 40} 90% 80%)`,
      fall: false,
    })
  }

  function spawnFall(force = false) {
    if (!origin) return
    if (embers.length >= maxEmbers) {
      if (!force) return
      embers.shift()
    }
    embers.push({
      x: origin.cx + (Math.random() - 0.5) * origin.spread * 2.4,
      y: origin.brimY + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 84,
      vy: 24 + Math.random() * 72,
      size: 1.6 + Math.random() * 2.2,
      alpha: 0.55 + Math.random() * 0.35,
      decay: 0.15 + Math.random() * 0.15,
      color: `hsl(${195 + Math.random() * 45} 90% 80%)`,
      fall: true,
    })
  }

  function burstFall(count = 14) {
    refreshOrigin()
    const n = cheap ? Math.min(count, 8) : count
    for (let i = 0; i < n; i++) spawnFall(true)
  }

  function tick(ts: number) {
    const canvas = emberCanvasRef.value
    if (!ctx || !canvas) return

    const rawDt = lastTs ? (ts - lastTs) / 1000 : 1 / 60
    const dt = Math.min(rawDt, 0.05)
    lastTs = ts

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    ctx.clearRect(0, 0, w, h)

    if (!sprinkling.value) {
      riseAcc += risePerSec * dt
      while (riseAcc >= 1) {
        spawnRise()
        riseAcc -= 1
      }
    } else {
      riseAcc = 0
      fallAcc += fallPerSec * dt
      while (fallAcc >= 1) {
        spawnFall()
        fallAcc -= 1
      }
    }

    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]!
      e.x += e.vx * dt
      e.y += e.vy * dt
      e.vx += (Math.random() - 0.5) * (e.fall ? 24 : 36) * dt
      if (e.fall) e.vy += GRAVITY * dt
      e.alpha -= e.decay * dt

      const offscreen = e.y > h + 20 || e.y < -20 || e.x < -20 || e.x > w + 20
      if (e.alpha <= 0 || offscreen) {
        embers[i] = embers[embers.length - 1]!
        embers.pop()
        continue
      }

      ctx.globalAlpha = e.alpha
      ctx.fillStyle = e.color
      ctx.fillRect(e.x, e.y, e.size, e.size)
    }
    ctx.globalAlpha = 1

    raf = requestAnimationFrame(tick)
  }

  function loopIfNeeded() {
    if (!visible || document.visibilityState === 'hidden' || raf) return
    lastTs = 0
    raf = requestAnimationFrame(tick)
  }

  function pauseLoop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') pauseLoop()
    else loopIfNeeded()
  }

  function start() {
    const canvas = emberCanvasRef.value
    const hero = heroRef.value
    if (!canvas) return
    applyDeviceProfile()
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return
    syncCanvasSize()
    refreshOrigin()

    resizeObserver = new ResizeObserver(() => {
      syncCanvasSize()
      refreshOrigin()
    })
    resizeObserver.observe(canvas)

    if (hero) {
      intersectObserver = new IntersectionObserver(
        ([entry]) => {
          visible = Boolean(entry?.isIntersecting)
          if (visible) loopIfNeeded()
          else pauseLoop()
        },
        { threshold: 0.05 },
      )
      intersectObserver.observe(hero)
    }

    document.addEventListener('visibilitychange', onVisibility)
    visible = true
    loopIfNeeded()
  }

  function stop() {
    pauseLoop()
    document.removeEventListener('visibilitychange', onVisibility)
    resizeObserver?.disconnect()
    intersectObserver?.disconnect()
    resizeObserver = null
    intersectObserver = null
    ctx = null
    embers = []
    lastTs = 0
    riseAcc = 0
    fallAcc = 0
  }

  return { start, stop, burstFall }
}

const { start: startEmbers, stop: stopEmbers, burstFall } = useEmbers()

function onHatPlay() {
  const now = performance.now()
  if (now - lastHatPlay < HAT_PLAY_DEBOUNCE_MS) return
  lastHatPlay = now

  window.clearTimeout(sprinkleTimer)
  window.clearTimeout(hatTipTimer)
  sprinkling.value = true
  burstFall(12)

  hatTipping.value = false
  void nextTick(() => {
    hatTipping.value = true
    hatTipTimer = window.setTimeout(() => {
      hatTipping.value = false
    }, HAT_TIP_MS)
  })

  sprinkleTimer = window.setTimeout(() => {
    sprinkling.value = false
  }, HAT_TIP_MS)
}

onMounted(() => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    startEmbers()
  }
})
onUnmounted(() => {
  window.clearTimeout(sprinkleTimer)
  window.clearTimeout(hatTipTimer)
  stopEmbers()
})

// ── End ember system ──────────────────────────────────────────────────────────

const heroCommand = 'npx vite-plugin-useclassy init'

const setupMode = ref<'quick' | 'manual'>('quick')
const cssEngine = ref<'tailwind' | 'unocss'>('tailwind')
const packageManager = ref<'npm' | 'pnpm' | 'yarn'>('npm')

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
  return tokens
})

const quickInitCopy = computed(() => quickInitTokens.value.map((t) => t.text).join(''))

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
  description: 'Variant attributes for Tailwind and UnoCSS. One rewrite. Every engine.',
  ogTitle: 'UseClassy',
  ogDescription: 'Variant attributes for Tailwind and UnoCSS. One rewrite. Every engine.',
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

  // Responsive design
  lg: 'p-6 text-base mt-4',

  // Additive chain (also emits sm:underline and hover:underline)
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
