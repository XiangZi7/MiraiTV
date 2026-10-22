export default defineEventHandler(event => {
  const url = getRequestURL(event)
  const config = useRuntimeConfig(event)
  const hosts = String(config.redirectHosts)
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean)
  if (!hosts.includes(url.hostname.toLowerCase())) return

  const target = new URL(String(config.public.siteUrl))
  // 配置中误包含主站域名时也不能产生重定向循环。
  if (target.hostname.toLowerCase() === url.hostname.toLowerCase()) return
  if (!['http:', 'https:'].includes(target.protocol)) return
  target.pathname = url.pathname
  target.search = url.search
  return sendRedirect(event, target.href, 301)
})
