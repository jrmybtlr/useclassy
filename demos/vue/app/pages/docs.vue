<template>
  <div class="flex flex-col items-center pb-16 pt-8" class:md="pt-12">
    <header class="w-full text-center">
      <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">
        Documentation
      </p>
      <h1 class="mt-3 font-serif text-5xl font-extralight tracking-tight" class:md="text-6xl">
        Techniques
      </h1>
      <p class="mx-auto mt-4 max-w-lg text-balance text-zinc-400">
        Framework examples for static variants, conditionals, chained modifiers,
        and the cases UseClassy intentionally leaves alone.
      </p>
    </header>

    <TechniqueGuide v-model:format="demoFormat" class="w-full" />

    <section class="mt-20 w-full">
      <h2 class="font-serif text-3xl font-extralight tracking-tight">
        Quick reference
      </h2>
      <div class="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-zinc-400">
        <div>
          <h3 class="text-zinc-100">Attribute names</h3>
          <p class="mt-2">
            Vue, Svelte, Blade, and HTML use
            <code class="text-zinc-200">class:hover="…"</code>.
            React prefers
            <code class="text-zinc-200">className:hover="…"</code>
            and also accepts
            <code class="text-zinc-200">class:…</code>.
          </p>
        </div>
        <div>
          <h3 class="text-zinc-100">React expressions</h3>
          <p class="mt-2">
            String literals inside
            <code class="text-zinc-200">className:mod={…}</code>
            get the variant prefix. Comparison operands and string method
            receivers stay untouched.
          </p>
        </div>
        <div>
          <h3 class="text-zinc-100">Svelte directives</h3>
          <p class="mt-2">
            Only quoted UseClassy modifiers are rewritten. Native
            <code class="text-zinc-200">class:active={cond}</code>
            stays a Svelte directive.
          </p>
        </div>
        <div>
          <h3 class="text-zinc-100">Chained modifiers</h3>
          <p class="mt-2">
            <code class="text-zinc-200">class:sm:hover="underline"</code>
            is additive — it expands to the full chain plus each part. Keep exact
            <code class="text-zinc-200">sm:hover:…</code>
            tokens in the base string when preserving existing behavior.
          </p>
        </div>
      </div>
    </section>

    <footer class="mt-20 w-full text-center text-sm">
      <NuxtLink
        to="/"
        class="text-zinc-400 transition-colors"
        class:hover="text-zinc-100"
      >
        ← Back to install
      </NuxtLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { DemoFormat } from "../components/ClassExample.vue";

const demoFormat = ref<DemoFormat>("vue");

useSeoMeta({
  title: "Docs · UseClassy",
  description:
    "UseClassy techniques across Vue, React, Svelte, and Blade — static variants, conditionals, chained modifiers, and more.",
  ogTitle: "Docs · UseClassy",
  ogDescription:
    "UseClassy techniques across Vue, React, Svelte, and Blade — static variants, conditionals, chained modifiers, and more.",
  ogUrl: "https://useclassy.com/docs",
  twitterTitle: "Docs · UseClassy",
  twitterDescription:
    "UseClassy techniques across Vue, React, Svelte, and Blade — static variants, conditionals, chained modifiers, and more.",
});
</script>
