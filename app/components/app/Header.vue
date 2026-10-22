<script setup lang="ts">
import { MAIN_NAV } from '~/constants/navigation'

/**
 * 全站顶栏：品牌 + 主导航 + 搜索 + 工具区
 * 全程保留透明折射，滚动时只加强轮廓
 */
const router = useRouter()

// 响应式状态
const state = reactive({
  // 顶栏搜索关键词
  keyword: '',
})

const { keyword } = toRefs(state)

const { y } = useWindowScroll()

/** 滚动超过一屏头部高度后加上底色 */
const scrolled = computed(() => y.value > 24)
const { activeNav, isActive } = useNavigationSelection()

function submitSearch(value: string) {
  router.push(
    value.trim() ? { path: '/search', query: { q: value.trim() } } : '/search'
  )
}
</script>

<template>
  <header
    :class="
      cn(
        'site-header fixed inset-x-0 top-2 z-50 px-3 sm:top-3 sm:px-6',
        scrolled && 'is-scrolled'
      )
    "
  >
    <div
      class="header-shell glass-surface glass-refract mx-auto flex h-14 max-w-[85rem] items-center gap-2 rounded-full px-4 sm:h-16 sm:gap-5 sm:px-6 lg:gap-10"
    >
      <UiLogo />

      <!-- 主导航 -->
      <nav
        aria-label="主导航"
        class="glass-track hidden items-center gap-1 lg:flex"
      >
        <UiGlassIndicator :active="activeNav" />
        <NuxtLink
          v-for="link in MAIN_NAV"
          :key="link.to"
          :to="link.to"
          :data-glass-key="link.to"
          :aria-current="isActive(link.to) ? 'page' : undefined"
          :class="
            cn(
              'relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-200 ease-out-soft',
              isActive(link.to)
                ? 'glass-selected'
                : 'text-ink-2 hover:bg-white/5 hover:text-ink'
            )
          "
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="flex flex-1 items-center justify-end gap-2">
        <!-- 顶栏搜索框 -->
        <div class="hidden w-full max-w-72 md:block">
          <UiSearchInput
            v-model="keyword"
            placeholder="搜索电影、剧集、动漫…"
            @submit="submitSearch"
          />
        </div>

        <UiIconButton
          icon="lucide:search"
          label="搜索"
          to="/search"
          class="md:hidden"
        />
        <AppWatchHistory />
        <UiIconButton
          icon="lucide:heart"
          label="我的收藏"
          to="/watchlist"
          class="hidden min-[24rem]:inline-flex"
        />

        <AccountUserMenu />
      </div>
    </div>
  </header>
</template>

<style scoped>
.header-shell {
  transition: border-color 200ms;
}
.is-scrolled .header-shell {
  border-color: rgb(255 255 255 / 42%);
}
</style>
