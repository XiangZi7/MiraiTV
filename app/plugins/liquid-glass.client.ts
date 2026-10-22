import type { GlassWatcher } from '~/lib/liquid-glass'

export default defineNuxtPlugin(nuxtApp => {
  let watcher: GlassWatcher | undefined
  let disposed = false

  nuxtApp.hook('app:mounted', async () => {
    const { watchLiquidGlass } = await import('~/lib/liquid-glass')
    if (!disposed) watcher = watchLiquidGlass()
  })

  function dispose() {
    disposed = true
    watcher?.stop()
  }
  nuxtApp.vueApp.onUnmount(dispose)
  if (import.meta.hot) import.meta.hot.dispose(dispose)
})
