<script setup lang="ts">
import type { createFluidBackground } from '~/lib/fluid-background'

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const background = useTemplateRef<HTMLDivElement>('background')
const route = useRoute()
const visibility = useDocumentVisibility()
const motion = usePreferredReducedMotion()
const transparency = usePreferredReducedTransparency()
const state = reactive({
  ready: false,
  mounted: false,
  failed: false,
  inView: true,
})
let renderer: ReturnType<typeof createFluidBackground> = null
let loading = false
let elapsed = 0
const enabled = computed(
  () =>
    state.mounted &&
    !state.failed &&
    motion.value !== 'reduce' &&
    transparency.value !== 'reduce'
)
const running = computed(
  () =>
    enabled.value &&
    state.inView &&
    visibility.value === 'visible' &&
    !route.path.startsWith('/play/')
)
const { pause, resume } = useRafFn(
  ({ delta }) => {
    // Resume from the same current after a hidden tab or video playback.
    elapsed += Math.min(delta, 64) / 1000
    renderer?.draw(elapsed)
  },
  { immediate: false, fpsLimit: 30 }
)

async function sync() {
  pause()
  if (!enabled.value) {
    state.ready = false
    renderer?.destroy(false)
    renderer = null
    return
  }
  if (!running.value) return
  if (!renderer) {
    if (loading || !canvas.value) return
    loading = true
    try {
      const { createFluidBackground } = await import('~/lib/fluid-background')
      if (!running.value || !canvas.value) return
      renderer = createFluidBackground(canvas.value)
      if (!renderer) {
        state.failed = true
        return
      }
      renderer.resize()
      renderer.draw(elapsed)
      state.ready = true
    } catch {
      state.failed = true
    } finally {
      loading = false
    }
  }
  if (renderer && running.value) resume()
}

watch([enabled, running], sync)
useIntersectionObserver(background, ([entry]) => {
  state.inView = entry?.isIntersecting ?? false
})
useResizeObserver(canvas, () => {
  renderer?.resize()
  renderer?.draw(elapsed)
})
useEventListener(canvas, 'webglcontextlost', (event: Event) => {
  if (!state.mounted) return
  event.preventDefault()
  pause()
  renderer?.destroy(false)
  renderer = null
  state.ready = false
  state.failed = true
})
useEventListener(canvas, 'webglcontextrestored', () => {
  if (state.mounted) state.failed = false
})
onMounted(() => {
  state.mounted = true
})
onBeforeUnmount(() => {
  state.mounted = false
  pause()
  renderer?.destroy()
  renderer = null
})
</script>

<template>
  <div
    ref="background"
    class="fluid-background"
    aria-hidden="true"
  >
    <canvas
      ref="canvas"
      class="fluid-canvas"
      :class="{ 'is-ready': state.ready }"
    />
  </div>
</template>

<style scoped>
.fluid-background {
  position: absolute;
  inset: 0 0 auto;
  height: var(--ambient-height);
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  background:
    radial-gradient(
      ellipse at 12% 8%,
      var(--color-ambient-blue),
      transparent 65%
    ),
    radial-gradient(
      ellipse at 82% 20%,
      var(--color-ambient-lilac),
      transparent 65%
    ),
    var(--color-ambient-white);
  mask-image: linear-gradient(
    to bottom,
    black 0%,
    rgb(0 0 0 / 90%) 22%,
    rgb(0 0 0 / 45%) 58%,
    transparent 100%
  );
}
.fluid-canvas {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 1.2s ease;
}
.fluid-canvas.is-ready {
  opacity: 1;
}
@media (min-width: 640px) and (max-width: 1023px) {
  .fluid-background {
    /* The home sidebar sits below the banner at tablet widths. */
    height: var(--ambient-height-stacked);
  }
}
@media (prefers-reduced-motion: reduce),
  (prefers-reduced-transparency: reduce) {
  .fluid-canvas {
    display: none;
  }
}
</style>
