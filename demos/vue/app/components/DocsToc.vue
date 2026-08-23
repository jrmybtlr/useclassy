<template>
  <div class="flex min-w-0">
    <NuxtLink
      to="/"
      class="flex shrink-0 items-center px-6 font-display text-sm font-semibold tracking-tight text-white"
      class:sm="pl-12 pr-5"
      class:hover="text-white/80"
      class:focus-visible="outline-2 outline-offset-2 outline-accent"
    >
      Home
    </NuxtLink>
    <div class="fade-x-edges min-w-0 flex-1" class:sm="[--mask-fade:3rem]">
      <nav
        ref="scroller"
        class="scrollbar-faint overflow-x-auto py-5 pr-6"
        class:sm="pr-12"
        aria-label="On this page"
      >
        <div class="flex w-max items-center gap-4">
          <NuxtLink
            v-for="heading in headings"
            :key="heading.id"
            :to="{ hash: `#${heading.id}` }"
            class="shrink-0 font-display text-sm whitespace-nowrap"
            class:hover="text-white"
            class:focus-visible="outline-2 outline-offset-2 outline-accent"
            :class="route.hash === `#${heading.id}` ? 'text-white' : 'text-neutral-400'"
          >
            {{ heading.text }}
          </NuxtLink>
        </div>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { ReadmeHeading } from '~/utils/readme'

defineProps<{
  headings: ReadmeHeading[]
}>()

const route = useRoute()
const scroller = ref<HTMLElement | null>(null)

watch(
  () => route.hash,
  async (hash) => {
    if (!hash) return
    await nextTick()
    const nav = scroller.value
    const active = nav?.querySelector<HTMLElement>(`a[href$="${hash}"]`)
    if (!nav || !active) return
    const navBox = nav.getBoundingClientRect()
    const elBox = active.getBoundingClientRect()
    nav.scrollTo({
      left: nav.scrollLeft + (elBox.left - navBox.left) - (navBox.width - elBox.width) / 2,
      behavior: 'smooth',
    })
  },
  { immediate: true },
)
</script>
