export default defineEventHandler(event => {
  const url = getRequestURL(event)
  if (url.hostname !== 'miraitv.pages.dev') return

  // 旧 Pages 域名的书签和分享链接保留原路径、查询参数。
  return sendRedirect(
    event,
    `https://tv.yxcr.top${url.pathname}${url.search}`,
    301
  )
})
