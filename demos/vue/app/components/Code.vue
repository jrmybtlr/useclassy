<template>
  <div
    class="group/code relative block w-full overflow-x-auto rounded-none border border-white/10 bg-zinc-900/30 text-sm"
  >
    <button
      v-if="showCopy"
      type="button"
      class="absolute right-3 top-3 z-10 px-2 py-1 text-xs font-medium text-zinc-500 transition-colors"
      class:hover="text-zinc-100"
      class:focus-visible="outline-none ring-2 ring-white/20"
      :aria-label="copied ? 'Copied' : 'Copy code'"
      @click="copy"
    >
      {{ copied ? "Copied" : "Copy" }}
    </button>
    <div ref="contentEl">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  showCopy?: boolean;
}>();

const contentEl = ref<HTMLElement | null>(null);
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
  const text = contentEl.value?.innerText?.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    // Clipboard can fail in insecure contexts; ignore quietly.
  }
}
</script>
