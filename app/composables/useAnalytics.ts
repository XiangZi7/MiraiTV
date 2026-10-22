import type { AnalyticsTracker } from '~/types/analytics'

/** 统一业务上报入口；SSR、开发环境或关闭 GA 时安全跳过。 */
export function useAnalytics() {
  const app = useNuxtApp()
  const track: AnalyticsTracker = (event, params) => {
    if (import.meta.server) return false
    try {
      return app.$trackEvent?.(event, params) ?? false
    } catch {
      return false
    }
  }
  function trackSearch(term: string, location = 'search_page') {
    return track('search', {
      search_term: term,
      search_location: location,
    })
  }
  return { track, trackSearch }
}
