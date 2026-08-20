<template>
  <div class="flex gap-6 border-b border-white/10" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      class="border-b-2 py-3 text-sm font-medium"
      :class="
        modelValue === opt.value
          ? 'border-white text-white'
          : 'border-transparent text-neutral-500'
      "
      class:hover="text-neutral-200"
      class:focus-visible="outline-2 outline-offset-2 outline-accent"
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
