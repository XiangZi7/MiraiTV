<script setup lang="ts">
/** 在同一轨道内移动一块玻璃，位置变化不重建折射图。 */
const props = defineProps<{ active: string }>()
const lens = useTemplateRef<HTMLElement>('lens')
// 响应式状态
const state = reactive({
  // 当前按钮相对轨道的横向位置
  x: 0,
  // 当前按钮相对轨道的纵向位置
  y: 0,
  // 玻璃胶囊的目标宽度
  width: 0,
  // 玻璃胶囊的目标高度
  height: 0,
  // 首次测量完成前由按钮本身显示选中底色
  ready: false,
})
const { ready } = toRefs(state)
const position = computed(() => ({
  transform: `translate3d(${state.x}px, ${state.y}px, 0)`,
  width: `${state.width}px`,
  height: `${state.height}px`,
}))
let observer: ResizeObserver | undefined
let mounted = false
function measure() {
  const track = lens.value?.parentElement
  if (!mounted || !track) return
  const selected = Array.from(
    track.querySelectorAll<HTMLElement>('[data-glass-key]')
  ).find(element => element.dataset.glassKey === props.active)
  state.ready = !!selected?.offsetWidth
  if (selected && state.ready) {
    state.x = selected.offsetLeft
    state.y = selected.offsetTop
    state.width = selected.offsetWidth
    state.height = selected.offsetHeight
    track.setAttribute('data-glass-ready', '')
  } else {
    track.removeAttribute('data-glass-ready')
  }
}
watch(
  () => props.active,
  () => nextTick(measure),
  { flush: 'post' }
)
onMounted(() => {
  mounted = true
  measure()
  observer = new ResizeObserver(measure)
  const track = lens.value?.parentElement
  if (track) {
    observer.observe(track)
    track
      .querySelectorAll('[data-glass-key]')
      .forEach(element => observer?.observe(element))
  }
  void document.fonts.ready.then(measure)
})
onActivated(() => nextTick(measure))
onBeforeUnmount(() => {
  mounted = false
  observer?.disconnect()
  lens.value?.parentElement?.removeAttribute('data-glass-ready')
})
</script>

<template>
  <span
    ref="lens"
    aria-hidden="true"
    class="glass-indicator glass-surface"
    :class="{ 'is-ready': ready }"
    :style="position"
  />
</template>

<style scoped>
.glass-indicator {
  --glass-tint: rgb(255 255 255 / 24%);
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: 9999px;
  opacity: 0;
}
.glass-indicator.is-ready {
  opacity: 1;
  transition:
    transform 480ms cubic-bezier(0.22, 1.12, 0.36, 1),
    width 480ms cubic-bezier(0.22, 1.12, 0.36, 1),
    height 300ms ease,
    opacity 160ms ease;
}
</style>
