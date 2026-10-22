import type { AsyncDataOptions, NuxtApp } from 'nuxt/app'
import type { MaybeRefOrGetter } from 'vue'

/**
 * 让已取回的数据一直留在 payload 里
 *
 * Nuxt 默认只在首屏 hydration 时复用 payload，之后每次进入页面都会重新回源，
 * 返回浏览过的页面就会「跳回去又转圈」。手动 refresh（重试按钮）仍强制回源。
 */
export function cachedPayload<T>(): NonNullable<
  AsyncDataOptions<T>['getCachedData']
> {
  return (key, app, context) =>
    context.cause === 'refresh:manual'
      ? undefined
      : ((app.payload.data[key] ?? app.static?.data?.[key]) as T | undefined)
}

/** 页面主数据：等同 useAsyncData，默认复用已缓存的结果 */
export function usePageData<T>(
  key: MaybeRefOrGetter<string>,
  handler: (app?: NuxtApp, context?: { signal: AbortSignal }) => Promise<T>,
  options: Omit<AsyncDataOptions<T>, 'getCachedData'> = {}
) {
  return useAsyncData<T>(key, handler as never, {
    ...options,
    getCachedData: cachedPayload<T>(),
  })
}
