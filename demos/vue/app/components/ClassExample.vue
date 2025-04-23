<template>
  <div class="w-full max-w-2xl space-y-4">
    <!-- Expanded View -->
    <Code class="motion-preset-blur-up motion-delay-500">
      <!-- Format Toggle -->
      <div class="flex items-center border-b border-white/10 px-4">
        <button
          v-for="formatOption in formatOptions"
          :key="formatOption"
          @click="toggleFormat(formatOption)"
          class="px-3 py-3 cursor-pointer"
          :class="
            format === formatOption
              ? 'border-b-2 border-blue-500 '
              : 'border-b-2 border-transparent text-zinc-400'
          "
        >
          {{ formatOption.charAt(0).toUpperCase() + formatOption.slice(1) }}
        </button>
      </div>
      <code>
        <div
          v-for="(value, key) in examples"
          :key="key"
          class="flex transition-opacity duration-200 cursor-pointer"
          :class="{ 'opacity-30': hoveredSection && hoveredSection !== key }"
          @mouseenter="hoveredSection = key"
          @mouseleave="hoveredSection = null"
        >
          <div class="text-blue-400">
            {{ format === "vue" ? "class" : "className"
            }}{{ key === "base" ? "" : ":" + key }}
          </div>
          <div class="text-zinc-300">="{{ value }}"</div>
        </div>
      </code>
    </Code>

    <!-- Combined View -->
    <Code class="motion-preset-blur-up motion-delay-800">
      <code>
        <span class="text-blue-400 text-sm"
          >{{ format === "vue" ? "class" : "className" }}="</span
        >
        <span class="text-zinc-300">
          <template v-for="(value, key) in examples" :key="key">
            <span
              class="mx-1 first:ml-0 last:mr-0"
              :class="{
                'opacity-30': hoveredSection && hoveredSection !== key,
              }"
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
        <span class="text-blue-400">"</span>
      </code>
    </Code>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  examples: Record<string, string>;
}

defineProps<Props>();
const formatOptions = ["vue", "react"] as const;
const hoveredSection = ref<string | null>(null);
const format = ref<(typeof formatOptions)[number]>("vue");

const toggleFormat = (newFormat: (typeof formatOptions)[number]) => {
  format.value = newFormat;
};

const formatCombinedClasses = (key: string, value: string): string => {
  return value
    .split(" ")
    .map((v) => `${key}:${v}`)
    .join(" ");
};
</script>
