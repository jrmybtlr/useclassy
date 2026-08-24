<template>
  <div
    class="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-neutral-950 py-1.5 pr-1.5 pl-3"
  >
    <p class="min-w-0 truncate font-mono text-base text-neutral-300" class:sm="text-sm">
      <span class="text-neutral-500">$</span>
      {{ command }}
    </p>
    <button
      type="button"
      class="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400"
      class:hover="bg-white/5 text-white"
      class:focus-visible="outline-2 outline-offset-2 outline-accent"
      :aria-label="copied ? 'Copied' : 'Copy command'"
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
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  command: string
}>()

const copied = ref(false)
let copyReset: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(props.command)
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
