<template>
  <canvas
    ref="emberCanvasRef"
    class="pointer-events-none absolute inset-0 z-10 size-full"
    aria-hidden="true"
  ></canvas>
  <button
    ref="hatWrapRef"
    type="button"
    class="group relative z-20 inline-flex touch-manipulation appearance-none items-center justify-center border-0 bg-transparent p-4 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400/70"
    :style="wandCursorStyle"
    aria-label="Tip the hat"
    @pointerenter="onHatPlay"
    @click="onHatPlay"
  >
    <span
      class="pointer-events-none absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-[42%] rounded-full opacity-70 blur-2xl transition duration-500 hat-aura"
      class:sm="size-28"
      class:group-hover="scale-110 opacity-100"
    ></span>
    <span
      class="relative inline-block origin-[18%_88%] text-7xl leading-none hat-glow transition-[filter] duration-300 motion-reduce:animate-none"
      class:sm="text-8xl"
      :class="
        hatTipping
          ? 'hat-glow-hot motion-safe:animate-hat-tip'
          : 'motion-safe:animate-hat-float'
      "
    >
      🎩
    </span>
  </button>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

const hatWrapRef = ref<HTMLElement | null>(null)
const emberCanvasRef = ref<HTMLCanvasElement | null>(null)
/** Canvas-baked 🪄 PNG cursor (SVG emoji cursors are unreliable). */
const wandCursorStyle = ref<{ cursor: string }>({ cursor: 'pointer' })
/** True only while the hat-tip animation is playing (0.7s). */
const sprinkling = ref(false)
/** Drives `animate-hat-tip` from JS so each tap can restart it (iOS sticky :hover cannot). */
const hatTipping = ref(false)
let sprinkleTimer = 0
let hatTipTimer = 0
let lastHatPlay = 0
const HAT_TIP_MS = 700
/** Collapse iOS first-tap pointerenter + click into one burst. */
const HAT_PLAY_DEBOUNCE_MS = 80
const WAND_CURSOR_SIZE = 64

function bakeWandCursor() {
  const size = WAND_CURSOR_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.translate(size, 0)
  ctx.scale(-1, 1)
  ctx.font = `${Math.round(size * 0.88)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🪄', size / 2, size / 2 + 2)

  const hotspot = Math.round(size / 2)
  wandCursorStyle.value = {
    cursor: `url(${canvas.toDataURL('image/png')}) ${hotspot} ${hotspot}, pointer`,
  }
}

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  decay: number
  color: string
  fall: boolean
}

function isCheapDevice(): boolean {
  if (window.matchMedia('(pointer: coarse)').matches) return true
  if (window.matchMedia('(max-width: 640px)').matches) return true
  const nav = navigator as Navigator & { hardwareConcurrency?: number }
  return (nav.hardwareConcurrency ?? 8) <= 4
}

function useEmbers() {
  let raf = 0
  let embers: Ember[] = []
  let lastTs = 0
  let riseAcc = 0
  let fallAcc = 0
  let origin: { cx: number; brimY: number; spread: number } | null = null
  let cheap = false
  let risePerSec = 48
  let fallPerSec = 42
  let maxEmbers = 80
  let visible = true
  let ctx: CanvasRenderingContext2D | null = null
  let resizeObserver: ResizeObserver | null = null
  let intersectObserver: IntersectionObserver | null = null

  const GRAVITY = 120

  function applyDeviceProfile() {
    cheap = isCheapDevice()
    risePerSec = cheap ? 16 : 48
    fallPerSec = cheap ? 14 : 42
    maxEmbers = cheap ? 28 : 80
  }

  function syncCanvasSize() {
    const canvas = emberCanvasRef.value
    if (!canvas || !ctx) return
    const dpr = cheap ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    const cssW = Math.max(1, canvas.clientWidth)
    const cssH = Math.max(1, canvas.clientHeight)
    const bw = Math.round(cssW * dpr)
    const bh = Math.round(cssH * dpr)
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function refreshOrigin() {
    const hat = hatWrapRef.value
    const canvas = emberCanvasRef.value
    if (!hat || !canvas) {
      origin = null
      return
    }
    const hr = hat.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    origin = {
      cx: hr.left - cr.left + hr.width / 2,
      brimY: hr.top - cr.top + hr.height * 0.62,
      spread: hr.width * 0.28,
    }
  }

  function spawnRise() {
    if (!origin || embers.length >= maxEmbers) return
    embers.push({
      x: origin.cx + (Math.random() - 0.5) * origin.spread * 2.2,
      y: origin.brimY + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 42,
      vy: -(24 + Math.random() * 54),
      size: 1.4 + Math.random() * 1.8,
      alpha: 0.5 + Math.random() * 0.35,
      decay: 0.36 + Math.random() * 0.3,
      color: `hsl(${200 + Math.random() * 40} 90% 80%)`,
      fall: false,
    })
  }

  function spawnFall(force = false) {
    if (!origin) return
    if (embers.length >= maxEmbers) {
      if (!force) return
      embers.shift()
    }
    embers.push({
      x: origin.cx + (Math.random() - 0.5) * origin.spread * 2.4,
      y: origin.brimY + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 84,
      vy: 24 + Math.random() * 72,
      size: 1.6 + Math.random() * 2.2,
      alpha: 0.55 + Math.random() * 0.35,
      decay: 0.15 + Math.random() * 0.15,
      color: `hsl(${195 + Math.random() * 45} 90% 80%)`,
      fall: true,
    })
  }

  function burstFall(count = 14) {
    refreshOrigin()
    const n = cheap ? Math.min(count, 8) : count
    for (let i = 0; i < n; i++) spawnFall(true)
  }

  function tick(ts: number) {
    const canvas = emberCanvasRef.value
    if (!ctx || !canvas) return

    const rawDt = lastTs ? (ts - lastTs) / 1000 : 1 / 60
    const dt = Math.min(rawDt, 0.05)
    lastTs = ts

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    ctx.clearRect(0, 0, w, h)

    if (!sprinkling.value) {
      riseAcc += risePerSec * dt
      while (riseAcc >= 1) {
        spawnRise()
        riseAcc -= 1
      }
    } else {
      riseAcc = 0
      fallAcc += fallPerSec * dt
      while (fallAcc >= 1) {
        spawnFall()
        fallAcc -= 1
      }
    }

    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]!
      e.x += e.vx * dt
      e.y += e.vy * dt
      e.vx += (Math.random() - 0.5) * (e.fall ? 24 : 36) * dt
      if (e.fall) e.vy += GRAVITY * dt
      e.alpha -= e.decay * dt

      const offscreen = e.y > h + 20 || e.y < -20 || e.x < -20 || e.x > w + 20
      if (e.alpha <= 0 || offscreen) {
        embers[i] = embers[embers.length - 1]!
        embers.pop()
        continue
      }

      ctx.globalAlpha = e.alpha
      ctx.fillStyle = e.color
      ctx.fillRect(e.x, e.y, e.size, e.size)
    }
    ctx.globalAlpha = 1

    raf = requestAnimationFrame(tick)
  }

  function loopIfNeeded() {
    if (!visible || document.visibilityState === 'hidden' || raf) return
    lastTs = 0
    raf = requestAnimationFrame(tick)
  }

  function pauseLoop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') pauseLoop()
    else loopIfNeeded()
  }

  function start() {
    const canvas = emberCanvasRef.value
    if (!canvas) return
    applyDeviceProfile()
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return
    syncCanvasSize()
    refreshOrigin()

    resizeObserver = new ResizeObserver(() => {
      syncCanvasSize()
      refreshOrigin()
    })
    resizeObserver.observe(canvas)

    // Canvas fills the positioned hero via absolute inset-0; observe it for offscreen pause.
    intersectObserver = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        if (visible) loopIfNeeded()
        else pauseLoop()
      },
      { threshold: 0.05 },
    )
    intersectObserver.observe(canvas)

    document.addEventListener('visibilitychange', onVisibility)
    visible = true
    loopIfNeeded()
  }

  function stop() {
    pauseLoop()
    document.removeEventListener('visibilitychange', onVisibility)
    resizeObserver?.disconnect()
    intersectObserver?.disconnect()
    resizeObserver = null
    intersectObserver = null
    ctx = null
    embers = []
    lastTs = 0
    riseAcc = 0
    fallAcc = 0
  }

  return { start, stop, burstFall }
}

const { start: startEmbers, stop: stopEmbers, burstFall } = useEmbers()

function onHatPlay() {
  const now = performance.now()
  if (now - lastHatPlay < HAT_PLAY_DEBOUNCE_MS) return
  lastHatPlay = now

  window.clearTimeout(sprinkleTimer)
  window.clearTimeout(hatTipTimer)
  sprinkling.value = true
  burstFall(12)

  hatTipping.value = false
  void nextTick(() => {
    hatTipping.value = true
    hatTipTimer = window.setTimeout(() => {
      hatTipping.value = false
    }, HAT_TIP_MS)
  })

  sprinkleTimer = window.setTimeout(() => {
    sprinkling.value = false
  }, HAT_TIP_MS)
}

onMounted(() => {
  bakeWandCursor()
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    startEmbers()
  }
})
onUnmounted(() => {
  window.clearTimeout(sprinkleTimer)
  window.clearTimeout(hatTipTimer)
  stopEmbers()
})
</script>
