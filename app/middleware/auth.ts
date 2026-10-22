export default defineNuxtRouteMiddleware(to => {
  const user = useState('session-user')
  if (user.value) return
  // 目标页面没有会话取不到数据，先回发现页；query 把来源带过去，
  // 服务端重定向会丢掉内存状态，只有 URL 能让弹窗在落地后自动打开。
  return navigateTo({ path: '/', query: { login: to.fullPath } })
})
