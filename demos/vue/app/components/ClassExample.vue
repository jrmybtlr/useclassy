<template>
  <div class="min-w-0 max-w-full overflow-hidden">
    <CodeBlock
      v-model="format"
      embedded
      :tabs="formatTabs"
      aria-label="Markup format"
      :copy-text="expandedCopy"
    >
      <code>
        <div
          v-for="(value, key) in examples"
          :key="key"
          class="cursor-pointer transition-[opacity,text-shadow] duration-200"
          :class="sectionHighlight(key)"
          @mouseenter="hoveredSection = key"
          @mouseleave="hoveredSection = null"
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
      <code>
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
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue'

export type DemoFormat = 'vue' | 'react' | 'svelte' | 'blade'

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

const hoveredSection = ref<string | null>(null)
const outputWrap = ref(false)
const outputSectionEls = new Map<string, HTMLElement>()

function setOutputSectionRef(key: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) outputSectionEls.set(key, el)
  else outputSectionEls.delete(key)
}

function scrollOutputSectionIntoView(key: string) {
  const el = outputSectionEls.get(key)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

function resetOutputScroll() {
  const el = outputSectionEls.values().next().value
  const pane = el?.closest('.overflow-x-auto')
  if (!(pane instanceof HTMLElement)) return
  pane.scrollTo({ left: 0, behavior: 'smooth' })
}

watch([hoveredSection, outputWrap], async ([key, wrap]) => {
  if (wrap) return
  await nextTick()
  // Wait for nowrap layout after the wrap toggle before measuring.
  requestAnimationFrame(() => {
    if (key) scrollOutputSectionIntoView(key)
    else resetOutputScroll()
  })
})

const sectionHighlight = (key: string) => ({
  'opacity-30': hoveredSection.value && hoveredSection.value !== key,
  'text-glow': hoveredSection.value === key,
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
