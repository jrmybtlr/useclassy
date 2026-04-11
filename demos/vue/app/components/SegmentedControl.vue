<template>
  <div
    class="flex w-full border border-white/10 bg-zinc-900/30 divide-x divide-white/10"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      class="min-w-0 flex-1 px-2 py-4 text-center text-sm font-medium transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 sm:px-4"
      :class="
        modelValue === opt.value
          ? 'bg-white text-zinc-950'
          : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
      "
      :aria-selected="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: readonly { value: string; label: string }[]
  ariaLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
