<template>
  <div class="overflow-hidden">
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
      embedded
      filename="output"
      class="border-t border-white/10"
      :copy-text="combinedCopy"
    >
      <code>
        <span class="text-sky-300">{{ attrName }}="</span>
        <span class="text-neutral-300">
          <template v-for="(value, key) in examples" :key="key">
            <span
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
import { computed, ref } from 'vue'

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

/** Same charset as UseClassy modifier names (`[\w/:@-]+`). */
const ADDITIVE_MODIFIER_NAME = /^[\w/:@-]+$/

/**
 * Matches the plugin: a chained modifier like `sm:hover` emits the full chain
 * plus each segment alone. Arbitrary names (`[&>svg]`) stay prefix-only.
 */
const formatCombinedClasses = (key: string, value: string): string => {
  const tokens = value.split(/\s+/).filter(Boolean)
  const additive = key.includes(':') && ADDITIVE_MODIFIER_NAME.test(key)
  const parts = additive ? key.split(':').filter(Boolean) : []

  return tokens
    .flatMap((token) => {
      const out = [`${key}:${token}`]
      for (const part of parts) out.push(`${part}:${token}`)
      return out
    })
    .join(' ')
}
</script>
