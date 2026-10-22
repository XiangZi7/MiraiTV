<script setup lang="ts">
import type { Announcement } from '~/types/site-content'

defineProps<{ items: Announcement[] }>()
</script>

<template>
  <section
    v-if="items.length"
    aria-label="站点公告"
    class="glass-surface rounded-panel"
  >
    <div
      class="flex items-center gap-2 border-b border-line px-3 py-2 text-xs font-medium sm:px-5 sm:py-3 sm:text-sm"
    >
      <Icon
        name="lucide:megaphone"
        class="size-4 text-brand"
        aria-hidden="true"
      />
      站点公告
      <span class="ml-auto text-xs font-normal text-ink-3">MiraiTV Notes</span>
    </div>
    <details
      v-for="item in items"
      :key="item.id"
      class="group border-b border-line last:border-0"
    >
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface-2 sm:min-h-12 sm:gap-4 sm:px-5 sm:py-3 [&::-webkit-details-marker]:hidden"
      >
        <span class="min-w-0 font-medium break-words">{{ item.title }}</span>
        <Icon
          name="lucide:chevron-down"
          class="size-4 shrink-0 text-ink-2 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div class="px-3 pt-1 pb-3 sm:px-5 sm:pb-5">
        <p
          class="max-w-prose text-sm leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap text-ink-2"
        >
          {{ item.content }}
        </p>
        <a
          v-if="item.linkUrl"
          :href="item.linkUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand hover:underline"
        >
          {{ item.linkLabel
          }}<Icon
            name="lucide:arrow-up-right"
            class="size-4"
            aria-hidden="true"
          />
          <span class="sr-only">（在新窗口打开）</span>
        </a>
      </div>
    </details>
  </section>
</template>
