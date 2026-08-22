<template>
  <div
    class="max-w-full min-w-0 overflow-hidden text-sm"
    :class="{ 'rounded-lg border border-neutral-900': !embedded }"
  >
    <div
      class="flex items-center border-b border-neutral-900"
      :class="embedded ? 'pl-6 sm:pl-12' : 'pl-6'"
    >
      <div class="min-w-0 flex-1 overflow-x-auto">
        <div
          v-if="tabs?.length"
          class="flex w-max min-w-full gap-6"
          role="tablist"
          :aria-label="ariaLabel"
        >
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            role="tab"
            class="inline-flex shrink-0 items-center border-b-2 py-3 font-display text-base"
            class:hover="text-neutral-200"
            class:focus-visible="outline-2 outline-offset-2 outline-accent"
            :class="
              modelValue === tab.value
                ? 'border-white text-white'
                : 'border-transparent text-neutral-500'
            "
            :aria-selected="modelValue === tab.value"
            @click="modelValue = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <div v-else-if="filename" class="truncate py-3 font-display text-sm text-neutral-400">
          {{ filename }}
        </div>
      </div>
      <div class="flex shrink-0 items-center pr-1.5">
        <button
          v-if="wrapToggle"
          type="button"
          class="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md"
          :class="wrap ? 'text-neutral-500' : 'bg-white/5 text-neutral-200'"
          class:hover="bg-white/5 text-neutral-200"
          class:focus-visible="outline-2 outline-offset-2 outline-accent"
          :aria-pressed="!wrap"
          :aria-label="wrap ? 'Show on one line' : 'Wrap lines'"
          @click="wrap = !wrap"
        >
          <span
            class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
            class:pointer-fine="hidden"
            aria-hidden="true"
          />
          <IconWrap />
        </button>
        <button
          type="button"
          class="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-500"
          class:hover="bg-white/5 text-neutral-200"
          class:focus-visible="outline-2 outline-offset-2 outline-accent"
          :aria-label="copied ? 'Copied' : 'Copy code'"
          @click="copy"
        >
          <span
            class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
            class:pointer-fine="hidden"
            aria-hidden="true"
          />
          <IconCheck v-if="copied" />
          <IconCopy v-else />
        </button>
      </div>
    </div>
    <div
      class="max-w-full min-w-0"
      :class="{
        'fade-x-edges': fadeX && !wrap,
        'sm:[--mask-fade:3rem]': fadeX && !wrap && embedded,
      }"
    >
      <div
        class="scrollbar-faint overflow-x-auto py-5 text-neutral-500"
        :class="[fadeX && !wrap ? 'relative z-0' : padClass, { 'whitespace-nowrap': !wrap }]"
      >
        <div
          :class="
            fadeX && !wrap
              ? [padClass, 'w-max min-w-full [&>code]:inline-block [&>code]:w-max']
              : !wrap
                ? '[&>code]:inline-block [&>code]:w-max'
                : undefined
          "
        >
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  copyText: string
  filename?: string
  tabs?: readonly { value: string; label: string }[]
  ariaLabel?: string
  embedded?: boolean
  wrapToggle?: boolean
  /** Viewport-fixed left/right fade for one-line overflow (output ticker). */
  fadeX?: boolean
}>()

const padClass = computed(() => (props.embedded ? 'px-6 sm:px-12' : 'px-6'))

const modelValue = defineModel<string>()
const wrap = defineModel<boolean>('wrap', { default: false })
const copied = ref(false)
let copyReset: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(props.copyText)
    copied.value = true
    clearTimeout(copyReset)
    copyReset = setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    copied.value = false
  }
}
</script>
