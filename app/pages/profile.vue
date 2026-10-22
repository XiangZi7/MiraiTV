<script setup lang="ts">
import { PROFILE_TABS } from '~/constants/navigation'
definePageMeta({ middleware: 'auth' })
const api = useApi()
const { user } = useAuth()
const {
  data: CURRENT_USER,
  error,
  status,
  refresh,
} = await usePageData(
  () => `private:profile:${user.value?.id}`,
  () => api.profile()
)
const {
  data: preview,
  error: previewError,
  refresh: refreshPreview,
} = await usePageData(
  () => `private:profile-preview:${user.value?.id}`,
  async () => {
    const [watchlist, history] = await Promise.all([
      api.watchlist(1, 4),
      api.history(1, 4),
    ])
    return { collections: watchlist.collections, history: history.items }
  }
)
const COLLECTIONS = computed(() => preview.value?.collections ?? [])
const WATCH_HISTORY = computed(() => preview.value?.history ?? [])
const STAT_ITEMS = computed(() =>
  CURRENT_USER.value
    ? [
        { label: '片单', value: CURRENT_USER.value.stats.collections },
        { label: '看过', value: CURRENT_USER.value.stats.watched },
      ]
    : []
)
useSeo(() => ({
  title: CURRENT_USER.value?.name ?? '个人中心',
  noindex: true,
}))
</script>

<template>
  <div class="pb-4">
    <UiRequestState
      class="container-page"
      :pending="status === 'pending'"
      :error="error"
      @retry="refresh"
    />
    <template v-if="CURRENT_USER">
      <!-- ============================== 个人横幅 ============================== -->
      <section class="profile-masthead relative isolate -mt-24 pt-24">
        <div
          class="profile-backdrop"
          aria-hidden="true"
        >
          <img
            v-if="CURRENT_USER.background"
            :src="backendAsset(CURRENT_USER.background)"
            alt="个人主页背景"
            fetchpriority="high"
            decoding="async"
            class="profile-cover"
          />
        </div>

        <div class="relative container-page pt-24">
          <div class="flex flex-wrap items-end justify-between gap-6">
            <div class="flex items-end gap-5">
              <UiAvatar
                :name="CURRENT_USER.name"
                :src="backendAsset(CURRENT_USER.avatar)"
                :tint="CURRENT_USER.tint"
                size="xl"
                ring
                class="shadow-2xl shadow-black/50"
              />

              <div class="pb-1">
                <div class="flex items-center gap-2.5">
                  <h1
                    class="text-2xl font-semibold tracking-tight text-shadow-hero"
                  >
                    {{ CURRENT_USER.name }}
                  </h1>
                  <UiBadge
                    v-if="CURRENT_USER.badge"
                    tone="brand"
                    size="md"
                  >
                    {{ CURRENT_USER.badge }}
                  </UiBadge>
                </div>
                <p class="mt-2 text-[0.8125rem] text-ink-2 text-shadow-hero">
                  {{ CURRENT_USER.bio }}
                </p>
              </div>
            </div>

            <UiButton
              variant="glass"
              icon="lucide:pencil"
              to="/settings"
              >编辑资料</UiButton
            >
          </div>

          <!-- 统计数据 -->
          <dl class="mt-8 flex flex-wrap gap-10">
            <div
              v-for="stat in STAT_ITEMS"
              :key="stat.label"
            >
              <dd class="text-xl font-semibold text-ink tabular-nums">
                {{ stat.value }}
              </dd>
              <dt class="mt-1 text-xs text-ink-3">{{ stat.label }}</dt>
            </div>
          </dl>
        </div>

        <!-- ============================== 内容页签 ============================== -->
        <div class="relative container-page mt-8">
          <nav
            aria-label="个人中心导航"
            class="flex items-center gap-7 border-b border-line/60"
          >
            <NuxtLink
              v-for="item in PROFILE_TABS"
              :key="item.to"
              :to="item.to"
              :aria-current="item.to === '/profile' ? 'page' : undefined"
              :class="
                cn(
                  'relative pb-2.5 text-sm font-medium transition-colors duration-200 ease-out-soft',
                  item.to === '/profile'
                    ? 'text-ink'
                    : 'text-ink-3 hover:text-ink-2'
                )
              "
            >
              {{ item.label }}
              <span
                v-if="item.to === '/profile'"
                class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-ink"
              />
            </NuxtLink>
          </nav>
        </div>
      </section>

      <!-- 最近创建的片单 -->
      <section class="container-page mt-10">
        <UiSectionHeader
          title="我的片单"
          kicker="Collections"
        >
          <template #actions>
            <UiTextLink to="/watchlist">查看全部</UiTextLink>
          </template>
        </UiSectionHeader>

        <div class="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MediaCollectionCard
            v-for="collection in COLLECTIONS"
            :key="collection.id"
            :collection="collection"
          />
        </div>
      </section>

      <UiRequestState
        class="container-page"
        :error="previewError"
        @retry="refreshPreview"
      />
      <!-- 最近观看 -->
      <section class="container-page mt-14">
        <UiSectionHeader
          title="最近观看"
          kicker="Recently Watched"
        >
          <template #actions>
            <UiTextLink to="/history">观看历史</UiTextLink>
          </template>
        </UiSectionHeader>

        <div class="mt-5 grid gap-3 lg:grid-cols-2">
          <MediaContinueCard
            v-for="record in WATCH_HISTORY.slice(0, 4)"
            :key="record.id"
            :record="record"
          />
        </div>
      </section>
    </template>
    <h1
      v-else
      class="sr-only"
    >
      个人中心
    </h1>
  </div>
</template>

<style scoped>
.profile-backdrop {
  position: absolute;
  inset: 0 0 -6rem;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 75% 12%, #d4c7ed, transparent 70%),
    radial-gradient(ellipse at 15% 30%, #c8dfef, transparent 65%);
  mask-image: linear-gradient(#000 0%, #000 35%, #000b 65%, transparent 100%);
}
.profile-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}
.profile-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    #f3f5fa26,
    #f3f5fa80 40%,
    #f3f5fad9 75%
  );
}
</style>
