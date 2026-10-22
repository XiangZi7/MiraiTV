<script setup lang="ts">
import type { PromotedApp } from '~/types/site-content'

defineProps<{ apps: PromotedApp[] }>()
</script>

<template>
  <section
    v-if="apps.length"
    aria-label="App 推广"
    class="mt-3 sm:mt-7"
  >
    <UiSectionHeader
      title="发现好用的 App"
      kicker="Selected Apps"
      description="我们的 App 与合作推荐。"
      compact
    >
      <template #actions>
        <span class="text-[0.625rem] text-ink-3 sm:hidden">App 推广</span>
      </template>
    </UiSectionHeader>
    <div class="mt-2 grid gap-2 sm:mt-5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="app in apps"
        :key="app.id"
        class="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-card border border-line bg-linear-to-br from-surface-2 to-surface-1 p-2.5 sm:flex sm:flex-col sm:items-stretch sm:gap-0 sm:rounded-panel sm:p-5"
      >
        <div class="contents sm:flex sm:items-start sm:gap-4">
          <div
            class="col-start-1 row-span-3 row-start-1 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line-strong bg-brand-soft sm:size-14 sm:rounded-card"
          >
            <img
              v-if="app.iconUrl"
              :src="app.iconUrl"
              alt=""
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              class="size-full object-cover"
            />
            <Icon
              v-else
              name="lucide:app-window"
              class="size-5 text-brand sm:size-6"
              aria-hidden="true"
            />
          </div>
          <div
            class="col-start-2 row-start-1 min-w-0 self-end sm:flex-1 sm:self-auto"
          >
            <span class="hidden text-xs text-ink-2 sm:inline"
              >App 推广<span v-if="app.badge"> · {{ app.badge }}</span></span
            >
            <h3
              class="truncate text-sm font-semibold sm:mt-1 sm:text-lg sm:break-words sm:whitespace-normal"
            >
              {{ app.name }}
            </h3>
          </div>
        </div>
        <p
          class="col-start-2 row-start-2 truncate text-xs leading-5 text-ink-2 sm:mt-4 sm:text-sm sm:leading-6 sm:font-medium sm:whitespace-normal sm:text-ink"
        >
          {{ app.tagline }}
        </p>
        <p
          v-if="app.description"
          class="hidden text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap text-ink-2 sm:mt-2 sm:block"
        >
          {{ app.description }}
        </p>
        <div
          v-if="app.platforms.length"
          class="col-start-2 row-start-3 min-w-0 text-[0.625rem] leading-4 text-ink-3 sm:mt-4 sm:flex sm:flex-wrap sm:gap-2"
          aria-label="支持平台"
        >
          <span class="block truncate sm:hidden">{{
            app.platforms.join(' · ')
          }}</span>
          <span
            v-for="platform in app.platforms"
            :key="platform"
            class="hidden rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-2 sm:inline"
            >{{ platform }}</span
          >
        </div>
        <div class="col-start-3 row-span-3 row-start-1 sm:mt-auto sm:pt-5">
          <a
            :href="app.targetUrl"
            target="_blank"
            rel="noopener noreferrer sponsored"
            class="inline-flex min-h-11 max-w-20 items-center justify-center gap-1 rounded-xl border border-brand/30 bg-brand-soft px-2 py-1.5 text-center text-xs leading-4 font-medium break-words text-ink transition-colors hover:bg-surface-3 sm:w-full sm:max-w-none sm:justify-between sm:gap-3 sm:rounded-card sm:px-4 sm:py-2.5 sm:text-left sm:text-sm"
          >
            {{ app.buttonLabel
            }}<Icon
              name="lucide:arrow-up-right"
              class="hidden size-4 text-brand sm:block"
              aria-hidden="true"
            />
            <span class="sr-only">{{ app.name }}（在新窗口打开）</span>
          </a>
        </div>
      </article>
    </div>
  </section>
</template>
