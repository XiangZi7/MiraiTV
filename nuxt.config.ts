import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true,

  // 仅 Nitro 可读取；生产用 NUXT_API_BASE / NUXT_API_KEY 覆盖。
  runtimeConfig: {
    apiBase: 'http://127.0.0.1:8081/api/v1',
    apiKey: '',
    proxySecret: '',
    appVersion: '',
    authCookieSecure: true,
    // 需要 301 跳转到 siteUrl 的旧域名，逗号分隔；默认不启用。
    redirectHosts: '',
    public: {
      // canonical、og:url、robots 与 sitemap 都基于它；换域名只改这一处。
      // 生产用 NUXT_PUBLIC_SITE_URL 覆盖。
      siteUrl: 'http://localhost:3000',
      gaId: '',
      siteName: 'MiraiTV',
      siteDescription:
        '在 MiraiTV 发现电影、剧集与动漫：每日新番排期、高分推荐与剧场版，支持多播放源在线观看。',
      siteLogo: '/brand/mirai-mark.webp',
      siteImage: '/og-image.jpg',
      siteTagline: '好的电影，是另一种人生体验。',
    },
  },

  // Nitro 自动识别部署平台：本地使用 Node，Cloudflare Pages 生成 dist 与 SSR Worker。

  // 页面含登录状态，禁止共享页面缓存；元数据缓存由 FastAPI 管理。
  routeRules: {
    '/api/**': {
      headers: {
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
    // HTML 的 no-store 在 render:response 中设置。Pages 会合并 _headers 中
    // 所有匹配规则，不能用 /** 给页面设缓存后再靠更具体的静态规则覆盖。
    // /_nuxt/** 沿用 Nitro 的内容哈希资源缓存规则。
    ...Object.fromEntries(
      ['/images/**', '/brand/**', '/icons/**'].map(path => [
        path,
        { headers: { 'cache-control': 'public, max-age=86400' } },
      ])
    ),
    '/robots.txt': { headers: { 'cache-control': 'public, max-age=3600' } },
    '/sitemap.xml': { headers: { 'cache-control': 'public, max-age=600' } },
    ...Object.fromEntries(
      [
        '/play/**',
        '/profile',
        '/history',
        '/watchlist',
        '/settings',
        '/login',
      ].map(path => [path, { headers: { 'x-robots-tag': 'noindex, follow' } }])
    ),
  },

  modules: ['@nuxt/icon', '@vueuse/nuxt', '@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN', class: 'light' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#f3f5fa' },
      ],
      link: [
        // 新路径让浏览器重新获取图标；提供标签页常用的尺寸。
        {
          rel: 'icon',
          type: 'image/x-icon',
          sizes: '16x16 32x32 48x48 64x64',
          href: '/favicon-v2.ico',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/icons/favicon-16.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/icons/favicon-32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '48x48',
          href: '/icons/favicon-48.png',
        },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
    },
  },

  icon: {
    mode: 'svg',
    class: 'inline-block shrink-0',
  },

  features: {
    // 样式由项目统一管理，无需 Nuxt 注入默认过渡样式
    inlineStyles: false,
  },
})
