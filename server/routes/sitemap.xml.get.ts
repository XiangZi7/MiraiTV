import type {
  ApiResponse,
  HomeResult,
  MediaPage,
  MetadataProviderInfo,
  ScheduleResult,
} from '../../app/types/web-api'

interface SitemapConfig {
  apiBase: string
  apiKey: string
}

// 只取公开数据，不转发访问者 Cookie；同一后端十分钟只聚合一次。
const sitemapMediaIds = defineCachedFunction(
  async (config: SitemapConfig) => {
    const get = async <T>(
      path: string,
      query?: Record<string, string | number>
    ) => {
      const response = await $fetch<ApiResponse<T>>(
        `${config.apiBase.replace(/\/+$/, '')}/${path}`,
        {
          headers: config.apiKey ? { 'x-app-key': config.apiKey } : {},
          query,
          retry: 0,
          timeout: 15_000,
        }
      )
      if (response.code !== 200 || !response.data)
        throw new Error('Public content unavailable')
      return response.data
    }
    const [home, schedule, providers] = await Promise.allSettled([
      get<HomeResult>('web/home'),
      get<ScheduleResult>('web/schedule'),
      get<MetadataProviderInfo[]>('web/providers'),
    ])
    const ids = new Set<string>()
    const add = (items: { id: string }[]) => {
      for (const item of items) if (item.id) ids.add(item.id)
    }
    if (home.status === 'fulfilled') {
      const data = home.value
      add(data.hero)
      add(data.popularMovies)
      add(data.editorsPick.related)
      if (data.editorsPick.feature) add([data.editorsPick.feature])
      add(data.weeklySchedule.map(item => item.media))
      for (const section of data.sections) add(section.items)
    }
    if (schedule.status === 'fulfilled')
      add(schedule.value.items.map(item => item.media))
    if (providers.status === 'fulfilled') {
      // 每个源 / 类型只取最新一页，避免地图请求遍历整个上游片库。
      const pages = await Promise.allSettled(
        providers.value.flatMap(provider =>
          provider.kinds.map(kind =>
            get<MediaPage>('web/catalog', {
              provider: provider.key,
              kind,
              pageSize: 50,
            })
          )
        )
      )
      for (const page of pages)
        if (page.status === 'fulfilled') add(page.value.items)
    }
    if (!ids.size)
      throw createError({
        statusCode: 503,
        statusMessage: 'Sitemap content temporarily unavailable',
      })
    return [...ids].sort()
  },
  { name: 'sitemap-media', maxAge: 600, getKey: config => config.apiBase }
)

function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    character =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]!
  )
}

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl).replace(/\/+$/, '')
  const ids = await sitemapMediaIds({
    apiBase: String(config.apiBase),
    apiKey: String(config.apiKey),
  })
  const paths = [
    '/',
    '/anime',
    '/movies',
    '/movies?kind=documentary',
    '/series',
    '/schedule',
    '/search',
    ...ids.map(id => `/detail/${encodeURIComponent(id)}`),
  ]
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths
      .map(
        path =>
          `  <url><loc>${escapeXml(new URL(path, `${siteUrl}/`).href)}</loc></url>`
      )
      .join('\n') +
    '\n</urlset>\n'
  )
})
