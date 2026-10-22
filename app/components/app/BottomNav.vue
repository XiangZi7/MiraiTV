<script setup lang="ts">
import { MAIN_NAV } from '~/constants/navigation'

/**
 * 移动端与平板的底部主导航
 * lg 以上由顶栏承担导航，这里隐藏；底部留白考虑 iOS 安全区
 */
const { activeNav, isActive } = useNavigationSelection()
</script>

<template>
  <UiGlassSurface
    as="nav"
    refraction
    aria-label="主导航"
    class="mobile-dock fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg !rounded-full p-1.5 lg:hidden"
  >
    <div class="glass-track flex items-stretch">
      <UiGlassIndicator :active="activeNav" />
      <NuxtLink
        v-for="link in MAIN_NAV"
        :key="link.to"
        :to="link.to"
        :data-glass-key="link.to"
        :aria-current="isActive(link.to) ? 'page' : undefined"
        :class="
          cn(
            'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-full text-[0.6875rem] transition-colors duration-200 ease-out-soft',
            isActive(link.to) ? 'glass-selected' : 'text-ink-2 active:text-ink'
          )
        "
      >
        <Icon
          :name="link.icon ?? 'lucide:circle'"
          class="size-5"
        />
        {{ link.to === '/' ? '首页' : link.label }}
      </NuxtLink>
    </div>
  </UiGlassSurface>
</template>

<style scoped>
.mobile-dock {
  --glass-tint: rgb(248 251 255 / 34%);
}
</style>
