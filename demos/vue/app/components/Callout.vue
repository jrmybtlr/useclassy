<template>
  <div
    class="flex items-start gap-3 rounded-lg border px-3.5 py-3 text-base text-neutral-300"
    class:sm="text-sm"
    :class="variant === 'tip' ? 'border-amber-500/20 bg-white/5' : 'border-white/10 bg-white/5'"
  >
    <IconTip v-if="variant === 'tip'" class="text-amber-400" />
    <IconInfo v-else class="text-neutral-400" />
    <div class="min-w-0 text-pretty">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'tip' | 'note'
  }>(),
  { variant: 'note' },
)
</script>
