/** 品牌信息与页面共用运行时配置，换站名无需修改静态清单或重新构建。 */
export default defineEventHandler(event => {
  const site = useRuntimeConfig(event).public
  setHeader(event, 'content-type', 'application/manifest+json; charset=utf-8')
  setHeader(event, 'cache-control', 'no-cache')
  return {
    id: '/',
    name: site.siteName,
    short_name: site.siteName,
    description: site.siteDescription,
    lang: 'zh-CN',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f5fa',
    theme_color: '#f3f5fa',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
})
