<script setup lang="ts">
import type { MediaItem } from '~/types/media'
import { DEFAULT_POSTER } from '~/constants/media'

const props = defineProps<{
  media: MediaItem
  index: number
  total: number
  active: boolean
}>()
const emit = defineEmits<{ previous: []; next: [] }>()
// 响应式状态
const state = reactive({
  // 海报加载失败时显示站内默认图
  artworkFailed: false,
  // 首张优先加载，其余图片在首次切换到时请求，保留已加载图片完成淡出。
  artworkRequested: props.active || props.index === 0,
})
const { artworkFailed, artworkRequested } = toRefs(state)
watch(
  () => props.active,
  active => {
    if (active) state.artworkRequested = true
  }
)
const current = computed(() => props.media)
const highlights = computed(() => {
  const media = current.value
  if (!media) return []
  return [
    media.year,
    media.region,
    ...[...new Set(media.genres)]
      .filter(genre => genre !== String(media.year) && genre !== media.region)
      .slice(0, 2),
  ]
})
const artworkSource = computed(
  () => current.value?.backdrop || current.value?.poster || DEFAULT_POSTER
)
const artwork = computed(() =>
  state.artworkFailed ? DEFAULT_POSTER : artworkSource.value
)
const cover = useTemplateRef<HTMLImageElement>('cover')
watch(artworkSource, () => {
  state.artworkFailed = false
})
onMounted(() => {
  if (cover.value?.complete && !cover.value.naturalWidth)
    state.artworkFailed = true
})
</script>

<template>
  <section
    class="hero-card"
    :aria-label="current.title"
    :aria-hidden="!active"
    :inert="!active"
  >
    <img
      v-if="artworkRequested"
      :src="mediaImageUrl(artwork, 1080)"
      alt=""
      aria-hidden="true"
      class="hero-ambience"
      decoding="async"
    />
    <div class="hero-shade" />

    <div class="hero-content glass-surface">
      <div class="hero-eyebrow">
        <span class="size-1.5 rounded-full bg-brand" /> MIRAI SPOTLIGHT
        <span class="ml-2 text-ink-3">每一帧，都值得期待</span>
      </div>
      <div class="hero-body">
        <div class="hero-copy">
          <div class="hero-details">
            <span class="inline-flex items-center gap-1.5 text-xs text-brand"
              ><Icon
                name="lucide:sparkles"
                class="size-3.5"
              />本周推荐</span
            >
            <h2
              class="hero-title"
              :title="current.title"
            >
              {{ current.title }}
            </h2>
            <p
              v-if="
                current.originalTitle && current.originalTitle !== current.title
              "
              class="mt-1.5 hidden truncate text-xs tracking-wider text-ink-2 sm:block"
            >
              {{ current.originalTitle }}
            </p>
            <UiMetaRow
              class="hero-meta mt-2.5"
              :items="highlights"
            >
              <UiRating
                v-if="current.rating"
                :value="current.rating"
                size="md"
              />
            </UiMetaRow>
            <p
              v-if="current.synopsis"
              class="hero-summary mt-2.5 line-clamp-2 text-[0.8125rem] leading-[1.375rem] text-ink-2"
            >
              {{ current.synopsis }}
            </p>
          </div>
          <div class="hero-actions mt-4 flex flex-wrap gap-3">
            <UiButton
              :to="`/play/${current.id}`"
              icon="lucide:play"
              class="h-11 px-4 sm:px-6"
              >立即观看</UiButton
            >
            <UiButton
              :to="`/detail/${current.id}`"
              variant="glass"
              icon="lucide:info"
              aria-label="作品详情"
              class="h-11 px-4 sm:px-5"
              ><span class="hero-detail-label">作品详情</span></UiButton
            >
          </div>
        </div>
        <div class="hero-artwork">
          <img
            v-if="artworkRequested"
            :key="artwork"
            ref="cover"
            :src="mediaImageUrl(artwork, 780)"
            :srcset="mediaImageSrcset(artwork)"
            sizes="(min-width: 640px) 360px, 72px"
            :alt="current.title"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            :loading="index === 0 ? 'eager' : 'lazy'"
            decoding="async"
            class="hero-cover"
            @error="artworkFailed = true"
          />
        </div>
      </div>
      <div class="hero-bottom">
        <span class="text-[0.625rem] tracking-[0.25em] text-ink-3"
          >YOUR NEXT FAVORITE STORY</span
        >
        <UiGlassSurface
          refraction
          class="hero-controls flex items-center gap-3 !rounded-full px-2 py-1"
        >
          <UiIconButton
            icon="lucide:chevron-left"
            label="上一个推荐"
            size="sm"
            :disabled="total < 2"
            @click="emit('previous')"
          />
          <span
            class="text-xs tabular-nums"
            :aria-label="`第 ${index + 1} 个推荐，共 ${total} 个`"
            ><span class="text-ink">{{
              String(index + 1).padStart(2, '0')
            }}</span
            ><span class="hero-total"
              ><span class="mx-2 text-ink-3">/</span
              ><span class="text-ink-3">{{
                String(total).padStart(2, '0')
              }}</span></span
            ></span
          >
          <UiIconButton
            icon="lucide:chevron-right"
            label="下一个推荐"
            size="sm"
            :disabled="total < 2"
            @click="emit('next')"
          />
        </UiGlassSurface>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-card {
  position: relative;
  isolation: isolate;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  border-radius: 2rem;
  background: #edf2fc;
}
.hero-ambience {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.45;
  transform: scale(1.12);
}
.hero-shade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 86% 30%, #dfe8fb40, transparent 70%),
    linear-gradient(100deg, #f4f7ffbd, #f4f7ff60 60%, #f2f4ff20);
}
.hero-content {
  border-radius: inherit;
  position: relative;
  display: flex;
  min-height: 304px;
  height: 100%;
  flex-direction: column;
  gap: 8px;
  padding: 12px 24px 10px;
}
.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  letter-spacing: 0.15em;
  color: #516a90;
}
.hero-body {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  align-items: center;
  flex: 1;
  gap: 24px;
}
.hero-copy {
  min-width: 0;
  padding-block: 4px;
}
.hero-artwork {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 220px;
}
.hero-cover {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 1px solid #ffffffb0;
  border-radius: 18px;
  box-shadow:
    0 16px 36px #334e7320,
    0 2px 6px #334e7314;
}
.hero-title {
  margin-top: 10px;
  font-size: clamp(1.625rem, 2.4vw, 2.25rem);
  line-height: 1.28;
  font-weight: 650;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.hero-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
@media (min-width: 640px) {
  .hero-artwork {
    /* Let the cover use the card height without making the banner taller. */
    position: absolute;
    inset: 36px 24px 56px auto;
    width: calc((100% - 72px) / 2.15);
    height: auto;
    max-height: 288px;
    margin-block: auto;
  }
}
@media (max-width: 639px) {
  .hero-card {
    border-radius: 1.5rem;
  }
  .hero-content {
    min-height: 0;
    gap: 0;
    padding: 12px;
  }
  .hero-body {
    display: block;
    position: relative;
  }
  .hero-artwork {
    position: absolute;
    top: 0;
    right: 0;
    width: 72px;
    height: 100px;
  }
  .hero-cover {
    border-radius: 14px;
  }
  .hero-eyebrow,
  .hero-summary,
  .hero-detail-label,
  .hero-bottom > span,
  .hero-total {
    display: none;
  }
  .hero-copy {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 0;
  }
  .hero-details {
    flex: 1;
    min-height: 100px;
    padding-right: 88px;
  }
  .hero-details > p {
    margin-top: 6px;
  }
  .hero-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    margin-top: 4px;
    font-size: 1.125rem;
  }
  .hero-meta {
    margin-top: 6px;
    gap: 4px;
    font-size: 0.6875rem;
  }
  .hero-actions {
    margin-top: 8px;
    padding-right: 120px;
    gap: 6px;
    flex-wrap: nowrap;
  }
  .hero-actions > a {
    padding-inline: 12px;
    font-size: 12px;
  }
  .hero-actions > a:last-child {
    width: 40px;
    padding-inline: 0;
  }
  .hero-bottom {
    position: absolute;
    bottom: 12px;
    right: 12px;
    height: 44px;
  }
  .hero-controls {
    gap: 4px;
    padding: 3px;
  }
  .hero-controls :deep(button) {
    width: 44px;
    height: 44px;
  }
}
</style>
