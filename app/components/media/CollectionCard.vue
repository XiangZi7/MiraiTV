<script setup lang="ts">
import type { Collection } from '~/types/media'

/** 片单卡：氛围底图 + 收录作品小海报叠放 + 名称与收录数 */
defineProps<{
  collection: Collection
}>()
</script>

<template>
  <NuxtLink
    :to="`/watchlist?collection=${collection.id}`"
    class="group block"
  >
    <div class="relative isolate aspect-16/10 overflow-hidden rounded-card">
      <div
        class="absolute inset-0"
        :style="tintToBackdrop(collection.tint)"
      />
      <MediaPoster
        v-if="collection.items?.[0]"
        :media="collection.items[0]"
        ratio="backdrop"
        fit="cover"
        compact
        class="absolute inset-0 size-full rounded-none opacity-75"
      />

      <!-- 底部文字的可读性遮罩，先铺在小海报之下 -->
      <div
        class="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/92 to-transparent"
      />

      <!-- 收录作品小海报：向右依次叠放，悬停时轻微散开 -->
      <div
        class="absolute top-[42%] right-4 flex -translate-y-1/2 items-center"
      >
        <div
          v-for="(item, index) in collection.items?.slice(0, 3)"
          :key="item.id"
          class="w-14 overflow-hidden rounded-poster shadow-xl ring-1 shadow-black/60 ring-white/10 transition-transform duration-500 ease-out-soft group-hover:-translate-y-1"
          :class="index > 0 && '-ml-7'"
          :style="{ ...tintToGradient(item.tint), zIndex: index }"
        >
          <MediaPoster
            :media="item"
            compact
          />
        </div>
      </div>

      <div
        class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5"
      >
        <h3 class="truncate text-[0.8125rem] font-medium text-ink">
          {{ collection.name }}
        </h3>
        <span class="shrink-0 text-xs text-ink-2 tabular-nums"
          >{{ collection.count }} 部</span
        >
      </div>
    </div>
  </NuxtLink>
</template>
