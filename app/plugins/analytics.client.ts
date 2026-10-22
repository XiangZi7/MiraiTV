import type { AnalyticsTracker, AnalyticsWindow } from '~/types/analytics'

/** 先建立事件队列，首屏挂载且浏览器空闲后才下载 GA。 */
export default defineNuxtPlugin(nuxtApp => {
  const disabled = {
    provide: { trackEvent: (() => false) as AnalyticsTracker },
  }
  if (import.meta.dev) return disabled
  const id = useRuntimeConfig().public.gaId
  if (!/^G-[A-Z0-9]+$/.test(id)) return disabled

  let analytics: ReturnType<typeof createAnalyticsTracker>
  try {
    analytics = createAnalyticsTracker(
      window as Window & AnalyticsWindow,
      id,
      () => ({
        // 提交时保存页面归属，防止队列在切页后才加载导致事件归到别的页面。
        page_location: window.location.origin + window.location.pathname,
        page_title: analyticsText(document.title, true),
      })
    )
  } catch {
    return disabled
  }
  nuxtApp.hook('app:mounted', () => {
    const load = () => {
      if (document.getElementById('miraitv-analytics')) return
      const script = document.createElement('script')
      script.id = 'miraitv-analytics'
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
      script.async = true
      script.onload = analytics.markLoaded
      document.head.appendChild(script)
    }
    if ('requestIdleCallback' in window)
      window.requestIdleCallback(load, { timeout: 3000 })
    else setTimeout(load, 2000)
  })
  return { provide: { trackEvent: analytics.track } }
})
