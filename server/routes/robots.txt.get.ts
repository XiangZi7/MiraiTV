export default defineEventHandler(event => {
  const siteUrl = String(useRuntimeConfig(event).public.siteUrl).replace(
    /\/+$/,
    ''
  )
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /_nuxt/builds/',
    // 页面可抓取，爬虫才能读到 noindex；个人页同时由登录权限保护。
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
})
