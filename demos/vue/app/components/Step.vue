<template>
  <section class="mt-10 w-full relative z-10">
    <div class="flex items-start gap-5">
      <StepNumber>{{ number }}</StepNumber>
      <div class="flex-1">
        <h3 class="text-2xl font-semibold">{{ title }}</h3>
        <p v-if="description" class="mt-2 text-zinc-400">{{ description }}</p>
        <slot></slot>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import StepNumber from "./StepNumber.vue";

defineProps<{
  number: number;
  title: string;
  description?: string;
}>();
</script>
