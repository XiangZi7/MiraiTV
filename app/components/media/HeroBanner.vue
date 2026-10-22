<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Autoplay, EffectFade } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import type { MediaItem } from '~/types/media'
import 'swiper/css'
import 'swiper/css/a11y'
import 'swiper/css/effect-fade'

const props = defineProps<{ slides: MediaItem[] }>()
const reducedMotion = usePreferredReducedMotion()
// 响应式状态
const state = reactive({
  // 实际选中的推荐序号，隐藏其他幻灯片内的交互元素
  activeIndex: 0,
  // KeepAlive 返回后恢复自动轮播
  active: true,
})
const { activeIndex } = toRefs(state)
// Swiper 实例由库维护，不放入深层响应式代理。
let carousel: SwiperInstance | undefined
const slideKey = computed(() => props.slides.map(slide => slide.id).join('|'))
const autoplay = {
  delay: 5000,
  disableOnInteraction: false,
  pauseOnMouseEnter: true,
}

function syncAutoplay() {
  if (!carousel || carousel.destroyed) return
  if (
    state.active &&
    props.slides.length > 1 &&
    reducedMotion.value !== 'reduce'
  ) {
    if (!carousel.autoplay.running) carousel.autoplay.start()
  } else carousel.autoplay.stop()
}
function ready(instance: SwiperInstance) {
  carousel = instance
  state.activeIndex = instance.realIndex
  syncAutoplay()
}
function changed(instance: SwiperInstance) {
  state.activeIndex = instance.realIndex
}
function go(direction: 'previous' | 'next') {
  if (!carousel || carousel.destroyed) return
  if (direction === 'next') carousel.slideNext()
  else carousel.slidePrev()
}
watch([reducedMotion, () => props.slides.length], syncAutoplay)
onActivated(() => {
  state.active = true
  carousel?.update()
  syncAutoplay()
})
onDeactivated(() => {
  state.active = false
  syncAutoplay()
})
onBeforeUnmount(() => {
  carousel?.autoplay.stop()
  carousel = undefined
})
</script>

<template>
  <Swiper
    v-if="slides.length"
    :key="slideKey"
    class="hero-carousel"
    :modules="[A11y, Autoplay, EffectFade]"
    :slides-per-view="1"
    :loop="slides.length > 1"
    :speed="reducedMotion === 'reduce' ? 0 : 500"
    :autoplay="autoplay"
    effect="fade"
    :fade-effect="{ crossFade: true }"
    :a11y="{
      containerMessage: '本周推荐',
      containerRoleDescriptionMessage: '轮播',
      itemRoleDescriptionMessage: '幻灯片',
      slideLabelMessage: '第 {{index}} 个，共 {{slidesLength}} 个',
    }"
    @swiper="ready"
    @real-index-change="changed"
  >
    <SwiperSlide
      v-for="(media, index) in slides"
      :key="media.id"
    >
      <MediaHeroSlide
        :media="media"
        :index="index"
        :total="slides.length"
        :active="activeIndex === index"
        @previous="go('previous')"
        @next="go('next')"
      />
    </SwiperSlide>
  </Swiper>
</template>

<style scoped>
.hero-carousel {
  min-width: 0;
  width: 100%;
  border-radius: 2rem;
}
.hero-carousel :deep(.swiper-slide) {
  height: auto;
}
.hero-carousel:not(.swiper-initialized) :deep(.swiper-slide:not(:first-child)) {
  visibility: hidden;
}
@media (max-width: 639px) {
  .hero-carousel {
    border-radius: 1.5rem;
  }
}
</style>
