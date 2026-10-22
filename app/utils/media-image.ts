/** 仅处理本站加密图片路由，不改写外部原图、头像或本地占位图。 */
export function mediaImageUrl(source: string, width: number): string {
  try {
    const url = new URL(source)
    if (
      url.protocol !== 'https:' ||
      !/^\/api\/v1\/images\/v2\.[A-Za-z0-9_-]+$/.test(url.pathname)
    )
      return source
    url.searchParams.set('w', String(width))
    return url.href
  } catch {
    return source
  }
}

export function mediaImageSrcset(source: string): string | undefined {
  if (mediaImageUrl(source, 240) === source) return undefined
  return [240, 360, 480, 720, 1080]
    .map(width => `${mediaImageUrl(source, width)} ${width}w`)
    .join(', ')
}
