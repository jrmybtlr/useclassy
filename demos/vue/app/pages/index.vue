<template>
  <div class="flex flex-col items-center py-4" class:md="py-12">
    <!-- Title -->
    <section>
      <div class="text-white flex items-center -space-x-[8%] group">
        <div
          class="text-[140px] rotate-0 transition-transform duration-300 motion-preset-blur-up motion-delay-500 z-10"
          class:md="text-[170px]"
          class:group-hover="-rotate-6 -translate-y-12"
          class:hover="rotate-12 -translate-y-16"
        >
          🎩
        </div>
        <div
          class="font-serif flex flex-col items-start font-extralight tracking-tight"
          class:max-md="text-6xl"
          class:md="text-7xl"
          class:lg="text-8xl"
        >
          <div class="motion-preset-blur-up">Use</div>
          <div class="motion-preset-blur-up motion-delay-300">Classy</div>
        </div>
      </div>
    </section>

    <!-- Example -->
    <section class="mt-2 w-full">
      <p
        class="text-center font-semibold text-2xl motion-preset-blur-up motion-delay-600 text-balance"
        class:md="text-3xl mt-2"
      >
        Make your Tailwind variants fast, simple, and much more readable.
      </p>

      <ClassExample
        v-model:format="demoFormat"
        :examples="classExamples"
        class="mt-10"
      />

      <p class="mt-6 text-center text-sm text-zinc-500">
        Want the full technique guide?
        <NuxtLink
          to="/docs"
          class="text-zinc-200 underline underline-offset-4 transition-colors"
          class:hover="text-white"
        >
          Open the docs
        </NuxtLink>
      </p>
    </section>

    <div class="mt-14 flex w-full flex-col items-center gap-2">
      <SegmentedControl
        v-model="setupMode"
        aria-label="Setup instructions"
        :options="setupModeOptions"
        class="w-full"
      />
    </div>

    <div class="relative mt-4 w-full min-w-0">
      <div
        class="h-full w-[1px] absolute left-3 top-16 bg-gradient-to-b from-zinc-800 to-transparent"
      />
      <!-- Install -->
      <Step :number="1" title="Install">
        <Code class="mt-6 w-full text-zinc-500" showCopy>
          <code class="font-mono text-sm leading-relaxed">
            <div>
              <span
                v-for="(t, i) in npmInstallTokens"
                :key="`npm-${i}`"
                :class="t.class"
              >{{ t.text }}</span>
            </div>
          </code>
        </Code>
      </Step>

      <!-- Quick setup -->
      <Step
        v-if="setupMode === 'quick'"
        :number="2"
        title="Quick setup"
      >
        <div class="mt-6 flex w-full flex-col -space-y-px">
          <SegmentedControl
            v-model="initFramework"
            aria-label="Framework for init command"
            :options="initFrameworkOptions"
            class="w-full"
          />
          <Code class="w-full text-zinc-500" showCopy>
            <code class="font-mono text-sm leading-relaxed">
              <div>
                <span
                  v-for="(t, i) in quickInitTokens"
                  :key="`init-${i}`"
                  :class="t.class"
                >{{ t.text }}</span>
              </div>
              <div
                v-if="demoFormat === 'blade'"
                class="mt-2"
              >
                <span class="text-sky-300 pr-1.5">composer</span><span class="text-amber-400 pr-1.5">require</span><span class="text-emerald-400">useclassy/laravel</span>
              </div>
            </code>
          </Code>
        </div>
      </Step>

      <!-- Vite -->
      <Step
        v-if="setupMode === 'manual'"
        :number="2"
        title="Vite"
        description="Add useClassy before Tailwind or other CSS plugins so transforms run first."
      >
        <Code class="mt-6 w-full text-zinc-500" showCopy>
          <code class="font-mono text-sm leading-relaxed">
            <div class="text-white">
              import useClassy from 'vite-plugin-useclassy';
            </div>
            <div>{</div>
            <div>
              <div class="ml-4">
                <div class="ml-4">plugins: [</div>
                <div class="ml-8 text-white">useClassy({</div>
                <div class="ml-12 text-white">language: '{{ demoFormat }}',</div>
                <div class="ml-8 text-white">}),</div>
                <div class="ml-8">// ... other plugins</div>
                <div class="ml-4">],</div>
              </div>
            </div>
            <div>}</div>
          </code>
        </Code>
      </Step>

      <!-- Tailwind CSS -->
      <Step
        v-if="setupMode === 'manual'"
        :number="3"
        title="Tailwind"
        description="Point Tailwind at the generated UseClassy manifest so variant utilities are detected."
      >
        <Code class="mt-6 w-full text-zinc-500" showCopy>
          <code class="font-mono text-sm leading-relaxed">
            <div>@import "tailwindcss";</div>
            <div class="text-white mt-2">@source "./.classy/output.classy.html";</div>
          </code>
        </Code>
      </Step>

      <!-- Intellisense -->
      <Step
        v-if="setupMode === 'manual'"
        :number="4"
        title="IntelliSense"
        description="VS Code: merge into .vscode/settings.json. Omit className lines for Vue-only projects."
      >
        <Code class="mt-6 w-full text-zinc-500" showCopy>
          <code class="font-mono text-sm leading-relaxed">
            <div>{</div>
            <div class="ml-4">"tailwindCSS.classAttributes": [</div>
            <div class="ml-8">"class",</div>
            <div class="ml-8 text-white">"class:[\\w:-]*",</div>
            <div class="ml-8">"className",</div>
            <div class="ml-8 text-white">"className:[\\w:-]*"</div>
            <div class="ml-4">]</div>
            <div>}</div>
          </code>
        </Code>
      </Step>
    </div>

    <footer class="mt-24 w-full pb-8 text-sm flex justify-center">
      <NuxtLink
        to="/docs"
        class="text-zinc-400 transition-colors"
        class:hover="text-zinc-100"
      >
        Techniques & docs →
      </NuxtLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { DemoFormat } from "../components/ClassExample.vue";

const setupMode = ref<"quick" | "manual">("quick");

const setupModeOptions = [
  { value: "quick", label: "Init CLI" },
  { value: "manual", label: "Manual" },
] as const;

const demoFormat = ref<DemoFormat>("vue");

type InitFrameworkId = "vue" | "svelte" | "react" | "laravel";

const initFramework = computed({
  get: (): InitFrameworkId =>
    demoFormat.value === "blade" ? "laravel" : demoFormat.value,
  set: (value: InitFrameworkId) => {
    demoFormat.value = value === "laravel" ? "blade" : value;
  },
});

const initFrameworkOptions: {
  value: InitFrameworkId;
  label: string;
  icon: string;
}[] = [
  { value: "vue", label: "Vue", icon: "vscode-icons:file-type-vue" },
  { value: "svelte", label: "Svelte", icon: "vscode-icons:file-type-svelte" },
  { value: "react", label: "React", icon: "vscode-icons:file-type-reactjs" },
  { value: "laravel", label: "Laravel", icon: "vscode-icons:file-type-blade" },
];

type CliToken = { text: string; class: string };

const npmInstallTokens: CliToken[] = [
  { text: "npm", class: "text-sky-300" },
  { text: " ", class: "text-zinc-600" },
  { text: "install", class: "text-zinc-100" },
  { text: " ", class: "text-zinc-600" },
  { text: "vite-plugin-useclassy", class: "text-emerald-400" },
  { text: " ", class: "text-zinc-600" },
  { text: "--save-dev", class: "text-amber-400" },
];

const quickInitTokens = computed((): CliToken[] => {
  const format = demoFormat.value;
  const tokens: CliToken[] = [
    { text: "npx", class: "text-sky-300" },
    { text: " ", class: "text-zinc-600" },
    { text: "vite-plugin-useclassy", class: "text-emerald-400" },
    { text: " ", class: "text-zinc-600" },
    { text: "init", class: "text-zinc-100" },
  ];
  if (format === "vue") {
    return tokens;
  }
  tokens.push(
    { text: " ", class: "text-zinc-600" },
    { text: "--language", class: "text-amber-400" },
    { text: " ", class: "text-zinc-600" },
    { text: format, class: "text-orange-300" },
  );
  return tokens;
});

useSeoMeta({
  title: "UseClassy",
  description:
    "Make your Tailwind variant modifiers fast, simple, and much more readable.",
  ogTitle: "UseClassy",
  ogDescription:
    "Make your Tailwind variant modifiers fast, simple, and much more readable.",
  ogUrl: "https://useclassy.com",
  twitterTitle: "UseClassy",
  twitterDescription:
    "Make your Tailwind variant modifiers fast, simple, and much more readable.",
});

const classExamples = {
  base: "px-4 py-2 rounded-lg bg-blue-600 text-white",
  hover: "bg-blue-500 scale-105",
  focus: "ring-2 ring-blue-300",
  dark: "bg-sky-700",
  md: "px-6 text-lg",
  "group-hover": "shadow-lg",
};
</script>
