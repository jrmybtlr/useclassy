<template>
  <div
    class="overflow-hidden text-sm"
    :class="{ 'rounded-lg border border-white/10': !embedded }"
  >
    <div class="relative flex items-center border-b border-white/10 pr-10 pl-2">
      <div class="min-w-0 flex-1 overflow-x-auto">
        <div
          v-if="tabs?.length"
          class="flex w-max min-w-full"
          role="tablist"
          :aria-label="ariaLabel"
        >
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            role="tab"
            class="inline-flex shrink-0 items-center border-b-2 px-3.5 py-3 text-sm font-medium"
            :class="
              modelValue === tab.value
                ? 'border-white text-white'
                : 'border-transparent text-neutral-500'
            "
            class:hover="text-neutral-200"
            class:focus-visible="outline-2 outline-offset-2 outline-accent"
            :aria-selected="modelValue === tab.value"
            @click="modelValue = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <div v-else-if="filename" class="truncate px-3 py-3 text-sm text-neutral-400">
          {{ filename }}
        </div>
      </div>
      <button
        type="button"
        class="absolute top-1/2 right-1.5 inline-flex size-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500"
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
    <div class="overflow-x-auto px-6 py-5 text-neutral-500">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  copyText: string
  filename?: string
  tabs?: readonly { value: string; label: string }[]
  ariaLabel?: string
  embedded?: boolean
}>()

const modelValue = defineModel<string>()
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
