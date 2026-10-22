import type { SiteContent } from '~/types/site-content'

/** 首页在主数据之前启动请求，公告组件复用同一份 SSR payload。 */
export function useSiteContent() {
  const api = useApi()
  return useAsyncData<SiteContent>('site-content', () => api.siteContent(), {
    default: () => ({
      announcementsEnabled: true,
      promotionsEnabled: false,
      announcements: [],
      apps: [],
    }),
  })
}
