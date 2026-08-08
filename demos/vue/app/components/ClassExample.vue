<template>
  <div class="w-full space-y-4">
    <!-- Expanded View -->
    <Code class="motion-preset-blur-up motion-delay-500">
      <!-- Format Toggle -->
      <div class="flex items-center border-b border-white/10 px-4">
        <button
          v-for="formatOption in formatOptions"
          :key="formatOption"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-3 cursor-pointer"
          :class="
            format === formatOption
              ? 'border-b-2 border-blue-500'
              : 'border-b-2 border-transparent text-zinc-400'
          "
          @click="format = formatOption"
        >
          <Icon
            :name="formatIcons[formatOption]"
            class="size-4 shrink-0 grayscale opacity-70"
          />
          {{ formatOption.charAt(0).toUpperCase() + formatOption.slice(1) }}
        </button>
      </div>
      <code class="font-mono text-sm leading-relaxed">
        <div
          v-for="(value, key) in examples"
          :key="key"
          class="transition-opacity duration-200 cursor-pointer"
          :class="{ 'opacity-30': hoveredSection && hoveredSection !== key }"
          @mouseenter="hoveredSection = String(key)"
          @mouseleave="hoveredSection = null"
        >
          <span class="text-blue-400">
            {{ format === "react" ? "className" : "class"
            }}{{ key === "base" ? "" : ":" + key }}
          </span>
          <span class="text-zinc-300">="{{ value }}"</span>
        </div>
      </code>
    </Code>

    <!-- Combined View -->
    <Code class="motion-preset-blur-up motion-delay-800">
      <div
        class="border-b border-white/10 px-5 py-2 text-xs uppercase tracking-[0.14em] text-zinc-500"
      >
        Compiles to
      </div>
      <code class="font-mono text-sm leading-relaxed">
        <span class="text-blue-400"
          >{{ format === "react" ? "className" : "class" }}="</span
        >
        <span class="text-zinc-300">
          <template v-for="(value, key) in examples" :key="key">
            <span
              class="mx-1 first:ml-0 last:mr-0 transition-opacity duration-200"
              :class="{
                'opacity-30': hoveredSection && hoveredSection !== key,
              }"
            >
              <template v-if="key === 'base'">
                {{ value }}
              </template>
              <template v-else>
                {{ formatCombinedClasses(String(key), value) }}
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

export type DemoFormat = "vue" | "react" | "svelte" | "blade";

interface Props {
  examples: Record<string, string>;
}

defineProps<Props>();

const format = defineModel<DemoFormat>("format", { default: "vue" });

const formatOptions = ["vue", "react", "svelte", "blade"] as const;
const formatIcons: Record<DemoFormat, string> = {
  vue: "vscode-icons:file-type-vue",
  react: "vscode-icons:file-type-reactjs",
  svelte: "vscode-icons:file-type-svelte",
  blade: "vscode-icons:file-type-blade",
};
const hoveredSection = ref<string | null>(null);

const formatCombinedClasses = (key: string, value: string): string => {
  return value
    .split(" ")
    .map((v) => `${key}:${v}`)
    .join(" ");
};
</script>
