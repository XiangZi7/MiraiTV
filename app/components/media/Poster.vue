<script setup lang="ts">
import type { MediaItem } from '~/types/media'
import { DEFAULT_POSTER } from '~/constants/media'

/**
 * 海报容器：原图比例、圆角、悬停反馈与遮罩插槽
 * 图源按容器朝向选择：横版容器优先剧照、竖版容器优先海报，任一缺失时相互回退
 * 列表卡片统一尺寸；相近比例轻裁切铺满，差异较大时居中完整展示并用同图补边
 * poster 与 backdrop 都为空或图片加载失败时，使用统一的影院主题默认封面
 */
type PosterRatio = 'poster' | 'backdrop' | 'square' | 'wide'

const props = withDefaults(
  defineProps<{
    media: MediaItem
    ratio?: PosterRatio
    /** 悬停时显示播放按钮 */
    playable?: boolean
    /** 小尺寸场景：隐藏占位标题，避免挤成几个字 */
    compact?: boolean
    /** 首屏图片：取消懒加载并提升下载优先级 */
    priority?: boolean
    /** 父布局已知图片宽度时可覆盖浏览器的资源选择提示。 */
    sizes?: string
    /** 详情与播放页按原图比例展示，列表卡片保持统一尺寸。 */
    natural?: boolean
    /** 自动适配兼顾铺满和完整；cover / contain 可显式指定展示方式。 */
    fit?: 'auto' | 'cover' | 'contain'
  }>(),
  { ratio: 'poster', fit: 'auto' }
)

const RATIO_CLASS: Record<PosterRatio, string> = {
  poster: 'aspect-2/3',
  backdrop: 'aspect-video',
  square: 'aspect-square',
  wide: 'aspect-6/5',
}

/** 容器是否偏横向，决定图源优先级 */
const LANDSCAPE: Record<PosterRatio, boolean> = {
  poster: false,
  backdrop: true,
  square: false,
  wide: true,
}

const source = computed(() => {
  const { poster, backdrop } = props.media
  const prefer = LANDSCAPE[props.ratio] ? backdrop : poster
  return prefer || (LANDSCAPE[props.ratio] ? poster : backdrop) || ''
})
const imageSource = computed(() => mediaImageUrl(source.value, 480))
const imageSrcset = computed(() => mediaImageSrcset(source.value))
const imageSizes = computed(
  () =>
    props.sizes ??
    (props.natural
      ? '(min-width: 1024px) 280px, 45vw'
      : LANDSCAPE[props.ratio]
        ? '(min-width: 1024px) 320px, 50vw'
        : '(min-width: 1024px) 200px, (min-width: 640px) 180px, 45vw')
)

/** 占位封面上的文字，优先使用原名以贴近实际海报排版 */
const placeholderTitle = computed(
  () => props.media.originalTitle ?? props.media.title
)

const image = useTemplateRef<HTMLImageElement>('image')
const container = useTemplateRef<HTMLDivElement>('container')
// 响应式状态
const state = reactive({
  // 图片加载失败时使用默认封面，避免露出浏览器破图标记
  imageFailed: false,
})
const { imageFailed } = toRefs(state)

function onImageError() {
  state.imageFailed = true
}
// 响应式状态
const dimensions = reactive({
  // 原图宽度
  width: 0,
  // 原图高度
  height: 0,
  // 容器实际宽度，兼容推荐区的拉伸布局
  frameWidth: 0,
  // 容器实际高度
  frameHeight: 0,
})
const posterStyle = computed(() =>
  props.natural &&
  props.ratio === 'poster' &&
  dimensions.width &&
  dimensions.height
    ? { aspectRatio: `${dimensions.width} / ${dimensions.height}` }
    : undefined
)
const shouldContain = computed(() => {
  if (props.fit !== 'auto') return props.fit === 'contain'
  if (props.natural && props.ratio === 'poster') return true
  const { width, height, frameWidth, frameHeight } = dimensions
  if (!width || !height || !frameWidth || !frameHeight) return true

  const imageRatio = width / height
  const frameRatio = frameWidth / frameHeight
  // 铺满后保留至少 85% 的画面；超出这个范围则完整显示，避免主体和海报文字被大幅裁掉。
  const retained = Math.min(imageRatio / frameRatio, frameRatio / imageRatio)
  return retained < 0.85
})
const needsBackdrop = computed(
  () => shouldContain.value && !(props.natural && props.ratio === 'poster')
)

function measure() {
  const element = image.value
  if (element?.complete && !element.naturalWidth) {
    state.imageFailed = true
    return
  }
  if (!element?.complete || !element.naturalWidth || !element.naturalHeight)
    return
  dimensions.width = element.naturalWidth
  dimensions.height = element.naturalHeight
}

watch(source, () => {
  state.imageFailed = false
  dimensions.width = 0
  dimensions.height = 0
})
// SSR 图片可能在水合前已从缓存加载，补读一次，避免漏掉 load 事件。
let observer: ResizeObserver | undefined
onMounted(() => {
  measure()
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    dimensions.frameWidth = entry.contentRect.width
    dimensions.frameHeight = entry.contentRect.height
  })
  if (container.value) observer.observe(container.value)
})
onBeforeUnmount(() => observer?.disconnect())

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const rootClass = computed(() =>
  cn(
    'rounded-poster group/poster bg-surface-2 isolate overflow-hidden',
    // 遮罩与播放按钮依赖它定位
    'relative',
    RATIO_CLASS[props.ratio],
    attrs.class
  )
)
</script>

<template>
  <div
    ref="container"
    class="cinema-surface"
    v-bind="omitClass($attrs)"
    :class="rootClass"
    :style="posterStyle"
  >
    <template v-if="source && !imageFailed">
      <!-- 留白处用放大模糊的同一张图兜底，比纯色黑边自然 -->
      <img
        v-if="needsBackdrop"
        :src="imageSource"
        :srcset="imageSrcset"
        :sizes="imageSizes"
        alt=""
        aria-hidden="true"
        :loading="priority ? 'eager' : 'lazy'"
        decoding="async"
        class="absolute inset-0 size-full scale-110 object-cover opacity-65 blur-xl"
      />

      <img
        ref="image"
        :src="imageSource"
        :srcset="imageSrcset"
        :sizes="imageSizes"
        :alt="media.title"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : 'auto'"
        decoding="async"
        :class="
          cn(
            'absolute inset-0 block size-full rounded-[inherit] object-center transition-transform duration-500 ease-out-soft',
            ratio !== 'poster' &&
              !shouldContain &&
              'group-hover/poster:scale-105',
            shouldContain ? 'object-contain' : 'object-cover'
          )
        "
        @load="measure"
        @error="onImageError"
      />
    </template>

    <!-- 统一的默认封面，作品信息放在底部以免遮住主体。 -->
    <div
      v-else
      class="relative size-full"
      data-poster-fallback
    >
      <img
        :src="DEFAULT_POSTER"
        :alt="`${media.title}（暂无封面）`"
        width="512"
        height="768"
        :loading="priority ? 'eager' : 'lazy'"
        decoding="async"
        class="absolute inset-0 size-full object-cover object-center transition-transform duration-500 ease-out-soft motion-safe:group-hover/poster:scale-105"
      />
      <div
        v-if="!compact"
        class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-3 pt-8 pb-4 sm:px-4"
      >
        <span
          class="mb-1.5 block text-[0.5625rem] font-medium tracking-[0.2em] text-white/45 uppercase"
          >MiraiTV</span
        >
        <span
          class="line-clamp-2 font-display text-sm leading-snug font-medium break-words text-white/85 text-shadow-hero"
        >
          {{ placeholderTitle }}
        </span>
      </div>
    </div>

    <!-- 底部暗角，保证叠加文字可读 -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/35 to-transparent"
    />

    <!-- 悬停播放按钮 -->
    <div
      v-if="playable"
      class="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-300 ease-out-soft group-hover/poster:opacity-100"
    >
      <span
        class="glass-surface glass-on-image flex size-11 items-center justify-center rounded-full"
      >
        <Icon
          name="lucide:play"
          class="size-4 translate-x-px fill-white text-white"
        />
      </span>
    </div>

    <slot />
  </div>
</template>
