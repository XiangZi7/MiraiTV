export default defineNuxtPlugin({
  name: 'activity',
  dependsOn: ['session'],
  setup(nuxtApp) {
    const activity = useActivityStore()
    const { user } = useAuth()
    nuxtApp.hook('app:mounted', () => {
      watch(
        () => user.value?.id ?? null,
        owner => {
          activity.changeAccount(owner)
          void activity.sync()
        },
        { immediate: true, flush: 'sync' }
      )
      // 网络恢复和回到页面时重试未上传的记录，并拉取其他设备的更新。
      useEventListener(window, 'online', () => void activity.sync())
      useEventListener(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') void activity.sync()
      })
    })
  },
})
