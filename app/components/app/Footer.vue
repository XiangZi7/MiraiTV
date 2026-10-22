<script setup lang="ts">
import { MAIN_NAV } from '~/constants/navigation'
const site = useSite()

/** 页脚：与整体气质一致的克制收尾 */
const SECONDARY_LINKS = [
  { label: '周番排期', to: '/schedule' },
  { label: '观看历史', to: '/history' },
  { label: '设置', to: '/settings' },
]
</script>

<template>
  <footer class="mt-12 border-t border-line/60 sm:mt-20">
    <div
      class="container-page grid grid-cols-1 gap-7 py-7 sm:flex sm:items-start sm:justify-between sm:gap-10 sm:py-10"
    >
      <div>
        <UiLogo />
        <p class="mt-3 text-xs leading-relaxed text-ink-3 sm:max-w-xs">
          与世界上最好的故事相遇。<br />
          所有影像内容版权归原作者所有。
        </p>
      </div>

      <nav
        aria-label="页脚导航"
        class="grid w-full grid-cols-2 gap-6 border-t border-line/60 pt-5 sm:flex sm:w-auto sm:gap-12 sm:border-0 sm:pt-0"
      >
        <div class="flex flex-col gap-2.5">
          <span
            class="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase"
          >
            Browse
          </span>
          <NuxtLink
            v-for="link in MAIN_NAV"
            :key="link.to"
            :to="link.to"
            class="flex min-h-8 items-center text-xs text-ink-2 transition-colors hover:text-ink sm:min-h-0"
          >
            {{ link.label }}
          </NuxtLink>
        </div>

        <div class="flex flex-col gap-2.5">
          <span
            class="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase"
          >
            Account
          </span>
          <NuxtLink
            v-for="link in SECONDARY_LINKS"
            :key="link.to"
            :to="link.to"
            class="flex min-h-8 items-center text-xs text-ink-2 transition-colors hover:text-ink sm:min-h-0"
          >
            {{ link.label }}
          </NuxtLink>
        </div>
      </nav>
    </div>

    <div class="border-t border-line/60">
      <div
        class="container-page py-4 text-center text-[0.6875rem] leading-relaxed text-ink-3 sm:py-5 sm:text-left"
      >
        © 2026 {{ site.siteName }} · {{ site.siteTagline }}
      </div>
    </div>
  </footer>
</template>
