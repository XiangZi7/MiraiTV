import type { MediaItem } from '~/types/media'

/** 站点名与默认描述，标题后缀和 og:site_name 共用 */
export const SITE_NAME = 'MiraiTV'
export const SITE_DESCRIPTION =
  '在 MiraiTV 发现电影、剧集与动漫：每日新番排期、高分推荐与剧场版，支持多播放源在线观看。'

export interface SeoInput {
  /** 页面标题，不含站点后缀 */
  title: string
  description?: string | null
  /** 社交卡片图，通常用作品海报 */
  image?: string | null
  /** og:type，作品页用 video.* 以便社交平台识别 */
  type?: 'website' | 'video.movie' | 'video.tv_show'
  /** 不希望被收录的页面：个人中心、播放页、带关键词的搜索结果 */
  noindex?: boolean
  /** 覆盖 canonical 的路径，播放页指向对应详情页 */
  canonicalPath?: string
}

/** 把站内路径拼成 canonical / og:url 需要的绝对地址 */
export function absoluteUrl(path: string, siteUrl: string) {
  const base = siteUrl.replace(/\/+$/, '')
  return new URL(path.startsWith('/') ? path : `/${path}`, `${base}/`).href
}

/** 简介用于 description：压掉换行、去掉元数据源的原文标记并截断 */
export function metaDescription(
  text?: string | null,
  fallback = SITE_DESCRIPTION
) {
  const value = (text ?? '').split('[简介原文]')[0]!.replace(/\s+/g, ' ').trim()
  const description = value || fallback
  return description.length > 155
    ? `${description.slice(0, 154)}…`
    : description
}

/** 作品的一句话描述，简介缺失时用年份 / 地区 / 题材兜底 */
export function mediaDescription(media: MediaItem) {
  const facts = [
    media.year,
    media.region,
    media.genres.slice(0, 3).join('、') || null,
    media.episodes ? `全 ${media.episodes} 集` : null,
    media.rating ? `评分 ${media.rating.toFixed(1)}` : null,
  ].filter(Boolean)
  return metaDescription(
    media.synopsis,
    `${media.title}${facts.length ? `：${facts.join(' · ')}` : ''}。在 ${SITE_NAME} 在线观看。`
  )
}

/**
 * 统一页面 SEO：标题、描述、canonical、Open Graph 与 Twitter 卡片
 * 传入 getter 可随数据更新，首屏数据由 SSR 写入 meta。
 */
export function useSeo(input: SeoInput | (() => SeoInput)) {
  const route = useRoute()
  const siteUrl = useRuntimeConfig().public.siteUrl
  const resolved = computed(() =>
    typeof input === 'function' ? input() : input
  )
  const canonical = computed(() =>
    absoluteUrl(resolved.value.canonicalPath ?? route.path, siteUrl)
  )
  const usesDefaultImage = computed(() => !resolved.value.image)
  const image = computed(
    () =>
      new URL(
        resolved.value.image || '/og-image.jpg',
        `${siteUrl.replace(/\/+$/, '')}/`
      ).href
  )

  useSeoMeta({
    title: () => `${resolved.value.title} · ${SITE_NAME}`,
    description: () => metaDescription(resolved.value.description),
    robots: () =>
      resolved.value.noindex || route.query.login !== undefined
        ? 'noindex, follow'
        : 'index, follow, max-image-preview:large',
    ogType: () => resolved.value.type ?? 'website',
    ogSiteName: SITE_NAME,
    ogLocale: 'zh_CN',
    ogTitle: () => `${resolved.value.title} · ${SITE_NAME}`,
    ogDescription: () => metaDescription(resolved.value.description),
    ogUrl: () => canonical.value,
    ogImage: () => image.value,
    ogImageSecureUrl: () =>
      image.value.startsWith('https://') ? image.value : undefined,
    // 默认分享图采用 JPEG；作品海报的格式和尺寸由图片源决定。
    ogImageType: () => (usesDefaultImage.value ? 'image/jpeg' : undefined),
    ogImageWidth: () => (usesDefaultImage.value ? 1200 : undefined),
    ogImageHeight: () => (usesDefaultImage.value ? 630 : undefined),
    ogImageAlt: () => resolved.value.title,
    twitterCard: 'summary_large_image',
    twitterTitle: () => `${resolved.value.title} · ${SITE_NAME}`,
    twitterDescription: () => metaDescription(resolved.value.description),
    twitterImage: () => image.value,
    twitterImageAlt: () => resolved.value.title,
  })

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
  })
  return { siteUrl, canonical }
}
