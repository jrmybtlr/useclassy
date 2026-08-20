<template>
  <div
    class="relative z-10 hidden shrink-0 flex-col items-center self-stretch"
    class:sm="flex"
  >
    <div
      class="flex size-6 items-center justify-center rounded-full bg-white/10 text-sm text-neutral-300"
    >
      <slot />
    </div>
    <div v-if="!last" class="mt-1 w-px flex-1 bg-white/10" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  last?: boolean
}>()
</script>
