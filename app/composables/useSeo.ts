import type { MediaItem } from '~/types/media'

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
export function metaDescription(text?: string | null, fallback = '') {
  const value = (text ?? '').split('[简介原文]')[0]!.replace(/\s+/g, ' ').trim()
  const description = value || fallback
  return description.length > 155
    ? `${description.slice(0, 154)}…`
    : description
}

/** 作品的一句话描述，简介缺失时用年份 / 地区 / 题材兜底 */
export function mediaDescription(media: MediaItem, siteName: string) {
  const facts = [
    media.year,
    media.region,
    media.genres.slice(0, 3).join('、') || null,
    media.episodes ? `全 ${media.episodes} 集` : null,
    media.rating ? `评分 ${media.rating.toFixed(1)}` : null,
  ].filter(Boolean)
  return metaDescription(
    media.synopsis,
    `${media.title}${facts.length ? `：${facts.join(' · ')}` : ''}。在 ${siteName} 在线观看。`
  )
}

/**
 * 统一页面 SEO：标题、描述、canonical、Open Graph 与 Twitter 卡片
 * 传入 getter 可随数据更新，首屏数据由 SSR 写入 meta。
 */
export function useSeo(input: SeoInput | (() => SeoInput)) {
  const route = useRoute()
  const site = useSite()
  const { siteUrl } = site
  const resolved = computed(() =>
    typeof input === 'function' ? input() : input
  )
  const canonical = computed(() =>
    absoluteUrl(resolved.value.canonicalPath ?? route.path, siteUrl)
  )
  const usesDefaultImage = computed(
    () => !resolved.value.image && site.siteImage === '/og-image.jpg'
  )
  const image = computed(
    () =>
      new URL(
        resolved.value.image || site.siteImage,
        `${siteUrl.replace(/\/+$/, '')}/`
      ).href
  )
  const description = computed(() =>
    metaDescription(resolved.value.description, site.siteDescription)
  )

  useSeoMeta({
    title: () => `${resolved.value.title} · ${site.siteName}`,
    description: () => description.value,
    robots: () =>
      resolved.value.noindex || route.query.login !== undefined
        ? 'noindex, follow'
        : 'index, follow, max-image-preview:large',
    ogType: () => resolved.value.type ?? 'website',
    ogSiteName: () => site.siteName,
    ogLocale: 'zh_CN',
    ogTitle: () => `${resolved.value.title} · ${site.siteName}`,
    ogDescription: () => description.value,
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
    twitterTitle: () => `${resolved.value.title} · ${site.siteName}`,
    twitterDescription: () => description.value,
    twitterImage: () => image.value,
    twitterImageAlt: () => resolved.value.title,
  })

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
  })
  return { siteUrl, canonical }
}
