<template>
  <div class="flex min-w-0">
    <NuxtLink
      to="/"
      class="flex shrink-0 items-center border-r border-white/10 px-6 font-display text-sm font-semibold tracking-tight text-white"
      class:sm="pl-12 pr-5"
      class:hover="text-white/80"
      class:focus-visible="outline-2 outline-offset-2 outline-accent"
    >
      Home
    </NuxtLink>
    <div
      class="min-w-0 flex-1"
      :class="{ 'fade-x-start': fadeStart, 'fade-x-end': fadeEnd }"
    >
      <nav
        ref="scroller"
        class="scrollbar-faint overflow-x-auto overscroll-x-contain py-5 pr-5 pl-5"
        aria-label="On this page"
        @scroll="updateFades"
      >
        <div class="flex w-max items-center gap-4">
          <NuxtLink
            v-for="heading in navHeadings"
            :key="heading.id"
            :to="{ path: '/docs', hash: `#${heading.id}` }"
            active-class=""
            exact-active-class=""
            class="shrink-0 font-display text-sm whitespace-nowrap"
            class:hover="text-white"
            class:focus-visible="outline-2 outline-offset-2 outline-accent"
            :aria-current="activeId === heading.id ? 'location' : undefined"
            :class="activeId === heading.id ? 'text-white' : 'text-neutral-400'"
            @click="activeId = heading.id"
          >
            {{ heading.text }}
          </NuxtLink>
        </div>
      </nav>
    </div>
    <a
      href="https://github.com/jrmybtlr/useclassy"
      class="flex shrink-0 items-center border-l border-white/10 px-6 text-neutral-400"
      class:sm="pr-12 pl-5"
      class:hover="text-white"
      class:focus-visible="outline-2 outline-offset-2 outline-accent"
      target="_blank"
      rel="noreferrer"
      aria-label="GitHub"
    >
      <IconGithub />
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ReadmeHeading } from '~/utils/readme'

const HIDDEN_NAV_IDS = new Set(['contributing', 'license'])

const props = defineProps<{
  headings: ReadmeHeading[]
}>()

const navHeadings = computed(() =>
  props.headings.filter((heading) => !HIDDEN_NAV_IDS.has(heading.id)),
)

const scroller = ref<HTMLElement | null>(null)
const fadeStart = ref(false)
const fadeEnd = ref(false)
const activeId = ref('')

function updateFades() {
  const nav = scroller.value
  if (!nav) return
  fadeStart.value = nav.scrollLeft > 2
  fadeEnd.value = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2
}

function spyOffset() {
  // scroll-mt-20 / router hash offset is 80px. Activate a little before that
  // so the item is current as the heading approaches the sticky nav.
  return 80 + 16
}

function headingFromScroll(): string {
  const offset = spyOffset()
  let current = ''
  for (const heading of navHeadings.value) {
    const el = document.getElementById(heading.id)
    if (!el) continue
    if (el.getBoundingClientRect().top <= offset) current = heading.id
  }
  return current || navHeadings.value[0]?.id || ''
}

function panNavTo(id: string) {
  const nav = scroller.value
  const active = nav?.querySelector<HTMLElement>(`a[href$="#${id}"]`)
  if (!nav || !active) return
  const navBox = nav.getBoundingClientRect()
  const elBox = active.getBoundingClientRect()
  if (elBox.left >= navBox.left + 8 && elBox.right <= navBox.right - 8) return
  nav.scrollTo({
    left: nav.scrollLeft + (elBox.left - navBox.left) - (navBox.width - elBox.width) / 2,
    behavior: 'smooth',
  })
}

function updateActive() {
  const next = headingFromScroll()
  if (!next || next === activeId.value) return
  activeId.value = next
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  updateFades()
  updateActive()
  window.addEventListener('scroll', updateActive, { passive: true })
  window.addEventListener('resize', updateActive, { passive: true })
  const nav = scroller.value
  if (!nav) return
  resizeObserver = new ResizeObserver(() => {
    updateFades()
    updateActive()
  })
  resizeObserver.observe(nav)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateActive)
  window.removeEventListener('resize', updateActive)
  resizeObserver?.disconnect()
})

watch(activeId, async (id) => {
  if (!id) return
  await nextTick()
  panNavTo(id)
  updateFades()
})
</script>
