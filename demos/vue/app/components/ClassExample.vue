<template>
  <div ref="rootEl" class="min-w-0 max-w-full overflow-hidden">
    <CodeBlock
      v-model="format"
      embedded
      :tabs="formatTabs"
      aria-label="Markup format"
      :copy-text="expandedCopy"
    >
      <code @pointerenter="pointerInside = true" @pointerleave="onPointerLeave">
        <div
          v-for="(value, key) in examples"
          :key="key"
          class="cursor-pointer transition-[opacity,text-shadow] duration-200"
          :class="sectionHighlight(key)"
          @pointerenter="hoveredSection = key"
        >
          <span class="text-sky-300"> {{ attrName }}{{ key === 'base' ? '' : ':' + key }} </span>
          <span class="text-neutral-300">="{{ value }}"</span>
        </div>
      </code>
    </CodeBlock>

    <CodeBlock
      v-model:wrap="outputWrap"
      embedded
      wrap-toggle
      filename="output"
      class="border-t border-neutral-900"
      :copy-text="combinedCopy"
    >
      <code @pointerenter="pointerInside = true" @pointerleave="onPointerLeave">
        <span class="text-sky-300">{{ attrName }}="</span>
        <span class="text-neutral-300">
          <template v-for="(value, key) in examples" :key="key">
            <span
              :ref="(el) => setOutputSectionRef(key, el)"
              class="mx-1 transition-[opacity,text-shadow] duration-200"
              class:first="ml-0"
              class:last="mr-0"
              :class="sectionHighlight(key)"
            >
              <template v-if="key === 'base'">
                {{ value }}
              </template>
              <template v-else>
                {{ formatCombinedClasses(key, value) }}
              </template>
            </span>
          </template>
        </span>
        <span class="text-sky-300">"</span>
      </code>
    </CodeBlock>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from 'vue'

export type DemoFormat = 'vue' | 'react' | 'svelte' | 'blade'

const CYCLE_MS = 1800

const props = defineProps<{
  examples: Record<string, string>
}>()

const format = defineModel<DemoFormat>('format', { default: 'vue' })

const formatTabs: {
  value: DemoFormat
  label: string
}[] = [
  { value: 'vue', label: 'Vue' },
  { value: 'react', label: 'React' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'blade', label: 'Blade' },
]

const rootEl = ref<HTMLElement | null>(null)
const hoveredSection = ref<string | null>(null)
const pointerInside = ref(false)
const cycledIndex = ref(0)
const inView = ref(true)
const pageHidden = ref(false)
const reduceMotion = ref(false)
const outputWrap = ref(false)
const outputSectionEls = new Map<string, HTMLElement>()

const exampleKeys = computed(() => Object.keys(props.examples))

const paused = computed(
  () => pointerInside.value || reduceMotion.value || !inView.value || pageHidden.value,
)

const activeSection = computed(() => {
  if (hoveredSection.value) return hoveredSection.value
  if (reduceMotion.value) return null
  const keys = exampleKeys.value
  if (!keys.length) return null
  return keys[cycledIndex.value % keys.length] ?? null
})

function onPointerLeave() {
  const hovered = hoveredSection.value
  if (hovered) {
    const index = exampleKeys.value.indexOf(hovered)
    if (index !== -1) cycledIndex.value = index
  }
  pointerInside.value = false
  hoveredSection.value = null
}

function setOutputSectionRef(key: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) outputSectionEls.set(key, el)
  else outputSectionEls.delete(key)
}

function scrollOutputSectionIntoView(key: string) {
  const el = outputSectionEls.get(key)
  if (!el) return
  const pane = el.closest('.overflow-x-auto')
  if (!(pane instanceof HTMLElement)) return

  const paneRect = pane.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const delta =
    elRect.left + elRect.width / 2 - (paneRect.left + pane.clientWidth / 2)

  pane.scrollTo({
    left: Math.max(0, pane.scrollLeft + delta),
    behavior: 'smooth',
  })
}

function resetOutputScroll() {
  const el = outputSectionEls.values().next().value
  const pane = el?.closest('.overflow-x-auto')
  if (!(pane instanceof HTMLElement)) return
  pane.scrollTo({ left: 0, behavior: 'smooth' })
}

watch([activeSection, outputWrap], async ([key, wrap]) => {
  if (wrap) return
  await nextTick()
  // Wait for nowrap layout after the wrap toggle before measuring.
  requestAnimationFrame(() => {
    if (key) scrollOutputSectionIntoView(key)
    else resetOutputScroll()
  })
})

const sectionHighlight = (key: string) => ({
  'opacity-30': activeSection.value && activeSection.value !== key,
  'text-glow': activeSection.value === key,
})

let cycleTimer: ReturnType<typeof setInterval> | undefined
let motionQuery: MediaQueryList | undefined
let inViewObserver: IntersectionObserver | undefined

function stopCycle() {
  clearInterval(cycleTimer)
  cycleTimer = undefined
}

function startCycle() {
  if (cycleTimer !== undefined) return
  cycleTimer = setInterval(() => {
    const count = exampleKeys.value.length
    if (!count) return
    cycledIndex.value = (cycledIndex.value + 1) % count
  }, CYCLE_MS)
}

function onMotionChange() {
  reduceMotion.value = motionQuery?.matches ?? false
}

function onVisibilityChange() {
  pageHidden.value = document.hidden
}

watch(paused, (isPaused) => {
  if (!import.meta.client) return
  if (isPaused) stopCycle()
  else startCycle()
})

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', onMotionChange)
  onMotionChange()

  document.addEventListener('visibilitychange', onVisibilityChange)
  onVisibilityChange()

  inViewObserver = new IntersectionObserver(
    ([entry]) => {
      inView.value = entry?.isIntersecting ?? false
    },
    { threshold: 0 },
  )
  if (rootEl.value) inViewObserver.observe(rootEl.value)

  if (!paused.value) startCycle()
})

onUnmounted(() => {
  motionQuery?.removeEventListener('change', onMotionChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  inViewObserver?.disconnect()
  stopCycle()
})

const attrName = computed(() => (format.value === 'react' ? 'className' : 'class'))

const expandedCopy = computed(() =>
  Object.entries(props.examples)
    .map(([key, value]) => {
      const name = key === 'base' ? attrName.value : `${attrName.value}:${key}`
      return `${name}="${value}"`
    })
    .join('\n'),
)

const combinedCopy = computed(() => {
  const parts = Object.entries(props.examples).map(([key, value]) =>
    key === 'base' ? value : formatCombinedClasses(key, value),
  )
  return `${attrName.value}="${parts.join(' ')}"`
})

/**
 * Matches the plugin: prefix each token with the full modifier chain.
 */
const formatCombinedClasses = (key: string, value: string): string => {
  const tokens = value.split(/\s+/).filter(Boolean)
  return tokens.map((token) => `${key}:${token}`).join(' ')
}
</script>
