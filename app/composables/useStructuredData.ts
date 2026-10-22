import type { MaybeRefOrGetter } from 'vue'
import type { MediaDetail } from '~/types/web-api'
import type { MediaItem } from '~/types/media'

/**
 * schema.org 结构化数据
 * 描述站点、作品与集合页，供搜索引擎理解页面内容。
 */

/** JSON-LD 要写进 <script>，必须转义掉能提前闭合标签的字符 */
function serialize(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** 把一组 schema.org 对象挂到当前页面 */
export function useStructuredData(graph: MaybeRefOrGetter<unknown[]>) {
  useHead({
    script: computed(() => {
      const items = toValue(graph).filter(Boolean)
      if (!items.length) return []
      return [
        {
          key: 'structured-data',
          type: 'application/ld+json',
          innerHTML: serialize(
            items.length === 1
              ? items[0]
              : { '@context': 'https://schema.org', '@graph': items }
          ),
        },
      ]
    }),
  })
}

/** 站点本身 + 站内搜索，用于首页 */
export function websiteSchema(
  siteUrl: string,
  site: { siteName: string; siteDescription: string; siteLogo: string }
) {
  const home = absoluteUrl('/', siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.siteName,
    url: home,
    description: site.siteDescription,
    inLanguage: 'zh-CN',
    publisher: {
      '@type': 'Organization',
      name: site.siteName,
      logo: {
        '@type': 'ImageObject',
        url: new URL(site.siteLogo, home).href,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/search', siteUrl)}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** 面包屑，让结果页显示层级而不是裸 URL */
export function breadcrumbSchema(
  trail: { name: string; path: string }[],
  siteUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, siteUrl),
    })),
  }
}

/** 影视条目：电影走 Movie，有分集的走 TVSeries */
export function mediaSchema(
  detail: MediaDetail,
  siteUrl: string,
  siteName: string
) {
  const media = detail.media
  const series = media.kind !== 'movie' && (media.episodes ?? 0) !== 1
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': series ? 'TVSeries' : 'Movie',
    name: media.title,
    url: absoluteUrl(`/detail/${encodeURIComponent(media.id)}`, siteUrl),
    description: mediaDescription(media, siteName),
    inLanguage: 'zh-CN',
  }
  if (media.originalTitle && media.originalTitle !== media.title)
    schema.alternateName = media.originalTitle
  if (media.poster) schema.image = new URL(media.poster, siteUrl).href
  if (media.year) schema.datePublished = String(media.year)
  if (media.genres.length) schema.genre = media.genres
  if (media.region)
    schema.countryOfOrigin = { '@type': 'Country', name: media.region }
  if (series && media.episodes) schema.numberOfEpisodes = media.episodes
  // 评分人数缺失时不编造 ratingCount：缺字段会被忽略，编造会被判为无效标记
  if (media.rating != null && media.ratingCount && media.ratingCount > 0)
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: media.rating,
      bestRating: 10,
      worstRating: 0,
      ratingCount: media.ratingCount,
    }
  const cast = detail.cast.filter(person => person.name).slice(0, 10)
  if (cast.length)
    schema.actor = cast.map(person => ({
      '@type': 'Person',
      name: person.name,
    }))
  return schema
}

/** 分类页的作品列表，帮助搜索引擎理解页面是集合页 */
export function itemListSchema(
  items: MediaItem[],
  siteUrl: string,
  limit = 20
) {
  const listed = items.slice(0, limit)
  if (!listed.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: listed.length,
    itemListElement: listed.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/detail/${encodeURIComponent(item.id)}`, siteUrl),
      name: item.title,
    })),
  }
}
