import type { H3Event } from 'h3'
import { signVisitorIp } from './proxy-context'

export const SESSION_COOKIE = 'miraitv_session'

export function checkMutationOrigin(event: H3Event) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(event.method)) return
  const origin = getHeader(event, 'origin')
  const site = getHeader(event, 'sec-fetch-site')
  const expected = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  if (site === 'cross-site' || (origin && origin !== expected)) {
    throw createError({ statusCode: 403, statusMessage: '不允许跨站操作' })
  }
}

export function clearAuthSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export function saveSession(event: H3Event, token: string, maxAge: number) {
  const config = useRuntimeConfig(event)
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: !import.meta.dev && String(config.authCookieSecure) === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

/** 只向配置的 FastAPI 转发凭据；不透传浏览器 Cookie 或 App Key。 */
export async function backendRequest(event: H3Event, path: string) {
  const config = useRuntimeConfig(event)
  const headers: Record<string, string> = { accept: 'application/json' }
  const token = getCookie(event, SESSION_COOKIE)
  if (token) headers.authorization = `Bearer ${token}`
  if (config.apiKey) headers['x-app-key'] = config.apiKey
  // SSR 内部请求也保留原浏览器信息，避免后端只看到 Worker/Node。
  for (const name of [
    'user-agent', 'x-device', 'sec-ch-ua', 'sec-ch-ua-platform', 'sec-ch-ua-mobile',
  ]) {
    const value = getHeader(event, name)
    if (value) headers[name] = value
  }
  headers['x-client-platform'] = 'web'
  if (config.appVersion) headers['x-app-version'] = String(config.appVersion)
  // 追加真实连接这一跳，FastAPI 按 TRUSTED_PROXIES 从右向左验证。
  const forwardedFor = event.context.miraiForwardedFor ?? getHeader(event, 'x-forwarded-for')
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor
  const contentType = getHeader(event, 'content-type')
  if (contentType) headers['content-type'] = contentType
  const url = new URL(`${String(config.apiBase).replace(/\/$/, '')}/${path}`)
  url.search = getRequestURL(event).search
  if (config.proxySecret && event.context.miraiClientIp) {
    Object.assign(headers, await signVisitorIp(
      String(config.proxySecret),
      event.context.miraiClientIp,
      event.method,
      decodeURIComponent(url.pathname)
    ))
  }
  try {
    return await $fetch.raw(url.href, {
      method: event.method,
      headers,
      body: ['GET', 'HEAD'].includes(event.method) ? undefined : await readRawBody(event, false),
      retry: 0,
      timeout: path.endsWith('/sources') || path.endsWith('/play') ? 120_000 : 45_000,
      ignoreResponseError: true,
      redirect: 'manual',
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: '后端服务暂时无法连接，请稍后重试' })
  }
}
