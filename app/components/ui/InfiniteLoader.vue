<script setup lang="ts">
import { useIntersectionObserver, useMounted } from '@vueuse/core'

const props = defineProps<{
  hasMore: boolean
  pending?: boolean
  error?: string
  disabled?: boolean
  loadMore: () => Promise<unknown>
}>()

const target = useTemplateRef<HTMLElement>('target')
const mounted = useMounted()
const active = shallowRef(false)
let requesting = false

function nearViewport() {
  const element = target.value
  if (!element?.getClientRects().length) return false
  const rect = element.getBoundingClientRect()
  return rect.top <= window.innerHeight + 400 && rect.bottom >= 0
}

// 一次只发一个请求；空页或不足一屏时继续加载，直到哨兵离开预取区域。
async function loadVisiblePages() {
  if (requesting || !isSupported.value) return
  requesting = true
  try {
    while (
      active.value &&
      props.hasMore &&
      !props.pending &&
      !props.error &&
      !props.disabled
    ) {
      await nextTick()
      if (!active.value || !nearViewport()) break
      await props.loadMore()
      await nextTick()
    }
  } finally {
    requesting = false
  }
}

async function retry() {
  if (requesting || props.pending || props.disabled) return
  requesting = true
  try {
    await props.loadMore()
    await nextTick()
  } finally {
    requesting = false
  }
  void loadVisiblePages()
}

const { isSupported, pause, resume } = useIntersectionObserver(
  target,
  ([entry]) => {
    if (entry?.isIntersecting) void loadVisiblePages()
  },
  { rootMargin: '0px 0px 400px 0px' }
)

watch(
  () => [props.hasMore, props.pending, props.error, props.disabled],
  () => void loadVisiblePages(),
  { flush: 'post' }
)

onMounted(() => {
  active.value = true
  void loadVisiblePages()
})
onActivated(() => {
  active.value = true
  resume()
  void loadVisiblePages()
})
onDeactivated(() => {
  active.value = false
  pause()
})
onBeforeUnmount(() => {
  active.value = false
})
</script>

<template>
  <div
    v-if="hasMore"
    ref="target"
    class="mt-6 flex min-h-12 items-center justify-center text-sm text-ink-3"
    role="status"
    aria-live="polite"
    :aria-busy="pending"
    data-infinite-loader
  >
    <UiButton
      v-if="error || (mounted && !isSupported)"
      :loading="pending"
      :disabled="disabled"
      variant="outline"
      @click="retry"
    >
      {{ error ? '重试加载' : '加载更多' }}
    </UiButton>
    <span
      v-else
      class="flex items-center gap-2"
    >
      <Icon
        v-if="pending"
        name="lucide:loader-circle"
        class="size-4 motion-safe:animate-spin"
      />
      {{ pending ? '正在加载…' : '向下滚动加载更多' }}
    </span>
  </div>
</template>
