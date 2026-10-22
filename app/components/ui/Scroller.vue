<script setup lang="ts">
import { Swiper } from 'swiper/vue'
import { A11y, FreeMode } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import 'swiper/css'
import 'swiper/css/a11y'
import 'swiper/css/free-mode'

withDefaults(
  defineProps<{
    /** 每个栏目独立命名，便于辅助技术区分。 */
    label?: string
    alwaysShowArrows?: boolean
    stretch?: boolean
    /** 首页手机布局：一屏四部作品，缩短卡片间距。 */
    compact?: boolean
  }>(),
  { label: '作品推荐' }
)
const reducedMotion = usePreferredReducedMotion()
// 响应式状态
const state = reactive({
  // 到达开头时不显示向左切换按钮
  canScrollLeft: false,
  // 卡片不足一屏或到达末尾时不显示向右切换按钮
  canScrollRight: false,
})
const { canScrollLeft, canScrollRight } = toRefs(state)
let carousel: SwiperInstance | undefined
function update(instance: SwiperInstance) {
  carousel = instance
  state.canScrollLeft = !instance.isBeginning && !instance.isLocked
  state.canScrollRight = !instance.isEnd && !instance.isLocked
}
function move(direction: 'previous' | 'next') {
  if (!carousel || carousel.destroyed) return
  if (direction === 'next') carousel.slideNext()
  else carousel.slidePrev()
}
onActivated(() => carousel?.update())
onBeforeUnmount(() => {
  carousel = undefined
})
</script>

<template>
  <div
    :class="cn('group/scroller relative min-w-0', stretch && 'lg:h-full')"
    :aria-label="label"
    role="region"
  >
    <Swiper
      :class="
        cn(
          'card-carousel',
          stretch && 'lg:h-full',
          compact && 'card-carousel-compact'
        )
      "
      :modules="[A11y, FreeMode]"
      :slides-per-view="compact ? 4 : 'auto'"
      :slides-per-group-auto="true"
      :space-between="compact ? 8 : 16"
      :breakpoints="
        compact
          ? { 640: { slidesPerView: 'auto', spaceBetween: 16 } }
          : undefined
      "
      :free-mode="{ enabled: true, sticky: false }"
      :speed="reducedMotion === 'reduce' ? 0 : 400"
      :a11y="{
        containerMessage: label,
        itemRoleDescriptionMessage: '作品',
        slideLabelMessage: '第 {{index}} 部，共 {{slidesLength}} 部',
      }"
      @swiper="update"
      @slide-change="update"
      @update="update"
      @resize="update"
      @lock="update"
      @unlock="update"
      @from-edge="update"
      @reach-end="update"
      @reach-beginning="update"
    >
      <slot />
    </Swiper>
    <UiIconButton
      v-if="canScrollLeft"
      icon="lucide:chevron-left"
      label="向左滚动"
      variant="glass"
      size="lg"
      :class="
        cn(
          'absolute top-1/2 -left-3 z-10 -translate-y-1/2 xl:-left-5',
          compact && 'hidden sm:inline-flex',
          !alwaysShowArrows &&
            'sm:opacity-0 sm:group-hover/scroller:opacity-100 sm:focus-visible:opacity-100'
        )
      "
      @click="move('previous')"
    />
    <UiIconButton
      v-if="canScrollRight"
      icon="lucide:chevron-right"
      label="向右滚动"
      variant="glass"
      size="lg"
      :class="
        cn(
          'absolute top-1/2 -right-3 z-10 -translate-y-1/2 xl:-right-5',
          compact && 'hidden sm:inline-flex',
          !alwaysShowArrows &&
            'sm:opacity-0 sm:group-hover/scroller:opacity-100 sm:focus-visible:opacity-100'
        )
      "
      @click="move('next')"
    />
  </div>
</template>

<style scoped>
.card-carousel {
  /* Leave room inside Swiper's clip for the glass shadow and hover lift. */
  width: calc(100% + 24px);
  margin: -20px -12px -36px;
  padding: 20px 12px 36px;
}
.card-carousel :deep(.swiper-slide) {
  width: auto;
  height: auto;
}
.card-carousel:not(.swiper-initialized) :deep(.swiper-slide) {
  margin-right: 16px;
}
@media (max-width: 639px) {
  .card-carousel-compact :deep(.swiper-slide) {
    width: calc((100% - 24px) / 4);
  }
  .card-carousel-compact:not(.swiper-initialized) :deep(.swiper-slide) {
    margin-right: 8px;
  }
}
</style>
