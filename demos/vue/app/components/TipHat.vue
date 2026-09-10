<template>
  <canvas
    ref="emberCanvasRef"
    class="pointer-events-none absolute inset-0 z-10 size-full max-h-none max-w-none contain-paint"
    aria-hidden="true"
  ></canvas>
  <button
    ref="hatWrapRef"
    type="button"
    class="group relative z-20 inline-flex touch-manipulation appearance-none items-center justify-center border-0 bg-transparent p-4 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400/70"
    :style="wandCursorStyle"
    aria-label="Tip the hat"
    @pointerenter="onHatEnter"
    @pointerleave="onHatLeave"
    @pointercancel="onHatLeave"
    @click="onHatClick"
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
/** Continuous brim sprinkle while the pointer is over the hat. */
const hovering = ref(false)
/** Drives `animate-hat-tip` from JS so each tap can restart it (iOS sticky :hover cannot). */
const hatTipping = ref(false)
let hatTipTimer = 0
let lastBurst = 0
const HAT_TIP_MS = 700
const HAT_CLICK_DEBOUNCE_MS = 80
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

type EmberKind = 'rise' | 'fall' | 'burst'

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  decay: number
  colorIndex: number
  kind: EmberKind
}

const PALETTE = Array.from(
  { length: 24 },
  (_, i) => `hsl(${(i * 15) % 360} 95% ${64 + (i % 4) * 4}%)`,
)

/** Pre-bucketed rgb fills so we can draw same-color embers with one fillStyle. */
const PALETTE_RGB = PALETTE.map((hsl) => {
  const match = /hsl\((\d+) 95% (\d+)%\)/.exec(hsl)
  const h = Number(match?.[1] ?? 0) / 360
  const l = Number(match?.[2] ?? 64) / 100
  const s = 0.95
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return `rgb(${Math.round(f(0) * 255)},${Math.round(f(8) * 255)},${Math.round(f(4) * 255)})`
})

function emberColorIndex() {
  return (Math.random() * PALETTE.length) | 0
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
  const pool: Ember[] = []
  let lastTs = 0
  let riseAcc = 0
  let fallAcc = 0
  let origin: { cx: number; brimY: number; spread: number } | null = null
  let cheap = false
  let risePerSec = 20
  let fallPerSec = 40
  let maxEmbers = 360
  let burstCount = 160
  let visible = true
  let ctx: CanvasRenderingContext2D | null = null
  let cssW = 1
  let cssH = 1
  let resizeObserver: ResizeObserver | null = null
  let intersectObserver: IntersectionObserver | null = null

  const GRAVITY = 120
  const BURST_GRAVITY = 90
  const BURST_DRAG = 0.65

  function applyDeviceProfile() {
    cheap = isCheapDevice()
    risePerSec = cheap ? 8 : 20
    fallPerSec = cheap ? 18 : 40
    maxEmbers = cheap ? 140 : 360
    burstCount = cheap ? 56 : 160
  }

  function hostEl() {
    return emberCanvasRef.value?.parentElement ?? null
  }

  function syncCanvasSize() {
    const canvas = emberCanvasRef.value
    const host = hostEl()
    if (!canvas || !ctx || !host) return
    // Pixel squares — a retina backing store only doubles clear/fill cost.
    const dpr = 1
    // Size from the header, never from canvas.clientWidth — the buffer attributes are
    // intrinsic size and can fight Tailwind’s canvas { max-width:100%; height:auto }.
    cssW = Math.max(1, host.clientWidth)
    cssH = Math.max(1, host.clientHeight)
    const bw = Math.min(4096, Math.round(cssW * dpr))
    const bh = Math.min(4096, Math.round(cssH * dpr))
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    ctx.setTransform(bw / cssW, 0, 0, bh / cssH, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.globalCompositeOperation = 'lighter'
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

  function pushEmber(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    alpha: number,
    decay: number,
    kind: EmberKind,
  ) {
    if (embers.length >= maxEmbers) return
    const recycled = pool.pop()
    if (recycled) {
      recycled.x = x
      recycled.y = y
      recycled.vx = vx
      recycled.vy = vy
      recycled.size = size
      recycled.alpha = alpha
      recycled.decay = decay
      recycled.colorIndex = emberColorIndex()
      recycled.kind = kind
      embers.push(recycled)
      return
    }
    embers.push({
      x,
      y,
      vx,
      vy,
      size,
      alpha,
      decay,
      colorIndex: emberColorIndex(),
      kind,
    })
  }

  function spawnRise() {
    if (!origin) return
    pushEmber(
      origin.cx + (Math.random() - 0.5) * origin.spread * 2.2,
      origin.brimY + (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 42,
      -(24 + Math.random() * 54),
      1.4 + Math.random() * 1.8,
      0.5 + Math.random() * 0.35,
      0.36 + Math.random() * 0.3,
      'rise',
    )
  }

  function spawnFall() {
    if (!origin) return
    pushEmber(
      origin.cx + (Math.random() - 0.5) * origin.spread * 2.4,
      origin.brimY + (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 140,
      -40 + Math.random() * 130,
      1.5 + Math.random() * 2.4,
      0.6 + Math.random() * 0.35,
      0.18 + Math.random() * 0.22,
      'fall',
    )
  }

  function seedSprinkle(count = 14) {
    refreshOrigin()
    const n = cheap ? Math.min(count, 8) : count
    for (let i = 0; i < n; i++) spawnFall()
    loopIfNeeded()
  }

  function burstRadial(count = burstCount) {
    refreshOrigin()
    if (!origin) return
    const want = cheap ? Math.min(count, burstCount) : count
    const n = Math.min(want, maxEmbers - embers.length)
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5
      const speed = 220 + Math.random() * 620
      pushEmber(
        origin.cx + (Math.random() - 0.5) * 12,
        origin.brimY + (Math.random() - 0.5) * 12,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        2 + Math.random() * 4,
        0.8 + Math.random() * 0.2,
        0.35 + Math.random() * 0.45,
        'burst',
      )
    }
    loopIfNeeded()
  }

  // Bucket live embers by palette index for batched fills (avoid per-ember fillStyle).
  const drawBuckets: Ember[][] = Array.from({ length: PALETTE.length }, () => [])
  let idleWake = 0

  function clearIdleWake() {
    window.clearTimeout(idleWake)
    idleWake = 0
  }

  function scheduleIdleRise() {
    clearIdleWake()
    if (!visible || document.visibilityState === 'hidden' || risePerSec <= 0) return
    const remaining = Math.max(0, 1 - riseAcc)
    const ms = Math.max(16, (remaining / risePerSec) * 1000)
    idleWake = window.setTimeout(() => {
      idleWake = 0
      loopIfNeeded()
    }, ms)
  }

  function tick(ts: number) {
    const canvas = emberCanvasRef.value
    if (!ctx || !canvas) {
      raf = 0
      return
    }

    const rawDt = lastTs ? (ts - lastTs) / 1000 : 1 / 60
    const dt = Math.min(rawDt, 0.05)
    lastTs = ts

    ctx.clearRect(0, 0, cssW, cssH)

    let spawned = false
    if (hovering.value) {
      riseAcc = 0
      fallAcc += fallPerSec * dt
      while (fallAcc >= 1) {
        spawnFall()
        fallAcc -= 1
        spawned = true
      }
    } else {
      fallAcc = 0
      riseAcc += risePerSec * dt
      while (riseAcc >= 1) {
        spawnRise()
        riseAcc -= 1
        spawned = true
      }
    }

    for (const bucket of drawBuckets) bucket.length = 0

    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]!
      e.x += e.vx * dt
      e.y += e.vy * dt
      if (e.kind === 'burst') {
        const drag = 1 - BURST_DRAG * dt
        e.vx *= drag
        e.vy = e.vy * drag + BURST_GRAVITY * dt
      } else if (e.kind === 'fall') {
        e.vy += GRAVITY * dt
      }
      e.alpha -= e.decay * dt

      const offscreen = e.y > cssH + 20 || e.y < -20 || e.x < -20 || e.x > cssW + 20
      if (e.alpha <= 0 || offscreen) {
        const dead = e
        embers[i] = embers[embers.length - 1]!
        embers.pop()
        if (pool.length < maxEmbers) pool.push(dead)
        continue
      }

      drawBuckets[e.colorIndex]!.push(e)
    }

    for (let ci = 0; ci < drawBuckets.length; ci++) {
      const bucket = drawBuckets[ci]!
      if (!bucket.length) continue
      ctx.fillStyle = PALETTE_RGB[ci]!
      for (const e of bucket) {
        ctx.globalAlpha = e.alpha
        ctx.fillRect(e.x, e.y, e.size, e.size)
      }
    }
    ctx.globalAlpha = 1

    // Keep rAF while particles are live or we just spawned; otherwise sleep until idle rise.
    if (embers.length > 0 || spawned || hovering.value) {
      raf = requestAnimationFrame(tick)
    } else {
      raf = 0
      scheduleIdleRise()
    }
  }

  function loopIfNeeded() {
    if (!visible || document.visibilityState === 'hidden' || raf) return
    clearIdleWake()
    lastTs = 0
    raf = requestAnimationFrame(tick)
  }

  function pauseLoop() {
    cancelAnimationFrame(raf)
    raf = 0
    clearIdleWake()
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') pauseLoop()
    else loopIfNeeded()
  }

  function onHostResize() {
    syncCanvasSize()
    refreshOrigin()
  }

  function start() {
    const canvas = emberCanvasRef.value
    const host = hostEl()
    if (!canvas || !host) return
    applyDeviceProfile()
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.globalCompositeOperation = 'lighter'
    syncCanvasSize()
    refreshOrigin()

    resizeObserver = new ResizeObserver(onHostResize)
    resizeObserver.observe(host)

    intersectObserver = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        if (visible) loopIfNeeded()
        else pauseLoop()
      },
      { threshold: 0.05 },
    )
    intersectObserver.observe(host)

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
    pool.length = 0
    lastTs = 0
    riseAcc = 0
    fallAcc = 0
  }

  return { start, stop, burstRadial, seedSprinkle }
}

const {
  start: startEmbers,
  stop: stopEmbers,
  burstRadial,
  seedSprinkle,
} = useEmbers()

function onHatEnter() {
  hovering.value = true
  seedSprinkle(16)
}

function onHatLeave() {
  hovering.value = false
}

function burstEmbers() {
  const now = performance.now()
  if (now - lastBurst < HAT_CLICK_DEBOUNCE_MS) return
  lastBurst = now
  burstRadial()
}

function onHatClick() {
  burstEmbers()

  window.clearTimeout(hatTipTimer)
  hatTipping.value = false
  void nextTick(() => {
    hatTipping.value = true
    hatTipTimer = window.setTimeout(() => {
      hatTipping.value = false
    }, HAT_TIP_MS)
  })
}

defineExpose({ burstEmbers })

onMounted(() => {
  bakeWandCursor()
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    startEmbers()
  }
})
onUnmounted(() => {
  window.clearTimeout(hatTipTimer)
  stopEmbers()
})
</script>
