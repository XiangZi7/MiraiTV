<script setup lang="ts">
import type { PosterTint } from '~/types/media'

/**
 * 分类页通用页头：右侧氛围图 + 大标题 + 一句话定位
 * actions 插槽贴在标题行右侧，默认插槽用于承载页签与筛选条
 */
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    tint?: PosterTint
    background?: string
    /** Let utility pages share the app's ambient background. */
    ambient?: boolean
  }>(),
  { tint: () => ({ from: '#dfeafa', to: '#f3f5fa' }) }
)
</script>

<template>
  <section
    :class="
      ambient ? 'relative' : 'relative isolate -mt-14 overflow-hidden pt-14'
    "
  >
    <template v-if="!ambient">
      <!-- 二次元日景靠右，左侧留白承载标题与筛选。 -->
      <div
        class="absolute inset-y-0 right-0 w-full lg:w-[68%]"
        :style="tintToBackdrop(tint)"
      />
      <img
        v-if="background"
        :src="background"
        alt=""
        fetchpriority="high"
        decoding="async"
        class="absolute inset-0 size-full object-cover object-[70%_48%]"
        data-category-background
      />
      <div
        class="absolute inset-0 bg-linear-to-r from-base/95 via-base/45 via-40% to-transparent to-90%"
      />
      <div
        class="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-base to-transparent"
      />
      <div
        class="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-base/60 to-transparent"
      />
    </template>

    <div
      :class="[
        'relative container-page',
        ambient ? 'pt-5 pb-4 sm:pt-7' : 'pt-20 pb-7',
      ]"
    >
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            class="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-tight text-shadow-hero"
          >
            {{ title }}
          </h1>
          <p
            v-if="subtitle"
            class="mt-2 text-sm text-ink-2 text-shadow-hero"
          >
            {{ subtitle }}
          </p>
        </div>

        <div
          v-if="$slots.actions"
          class="flex shrink-0 items-center gap-3 pb-1"
        >
          <slot name="actions" />
        </div>
      </div>

      <div
        v-if="$slots.default"
        class="glass-surface mt-7 rounded-panel p-4 sm:p-5"
      >
        <slot />
      </div>
    </div>
  </section>
</template>
