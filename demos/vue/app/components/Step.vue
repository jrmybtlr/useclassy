<template>
  <section class="w-full">
    <div class="flex items-start" class:sm="gap-4">
      <StepNumber :last="last">{{ number }}</StepNumber>
      <div class="min-w-0 flex-1" :class="last ? 'pb-0' : 'pb-8 sm:pb-10'">
        <h3 class="flex items-baseline gap-2 font-display text-lg font-bold">
          {{ title }}
          <span v-if="badge" class="text-sm font-medium text-neutral-500" class:sm="text-xs">{{
            badge
          }}</span>
        </h3>
        <p
          v-if="description"
          class="mt-1.5 text-base text-pretty text-neutral-400"
          :class="wideDescription ? undefined : 'max-w-[48ch]'"
          class:sm="text-sm"
        >
          {{ description }}
        </p>
        <div class="mt-4 flex flex-col gap-3">
          <slot />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import StepNumber from './StepNumber.vue'

defineProps<{
  number: number
  title: string
  description?: string
  wideDescription?: boolean
  badge?: string
  last?: boolean
}>()
</script>
