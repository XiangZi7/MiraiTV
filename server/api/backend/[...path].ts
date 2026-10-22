import type { ApiResponse } from '../../../app/types/web-api'
import type { LoginData } from '../../../app/types/account'
import {
  backendRequest,
  checkMutationOrigin,
  clearAuthSession,
  saveSession,
} from '../../utils/backend'

// 明确限定 Web 使用的接口，避免成为任意 URL 转发器。
const routes: [RegExp, string[]][] = [
  [
    /^web\/(providers|home|catalog|search|search\/suggestions|schedule|site-content)$/,
    ['GET'],
  ],
  [/^web\/media\/[^/]+(?:\/(?:sources|play))?$/, ['GET']],
  [/^web\/me\/(profile|watchlist)$/, ['GET']],
  [/^web\/me\/activity\/sync$/, ['POST']],
  [/^web\/me\/favorites$/, ['PUT']],
  [/^web\/me\/favorites\/[^/]+$/, ['GET', 'DELETE']],
  [/^web\/me\/history\/media\/[^/]+$/, ['GET']],
  [/^web\/me\/history$/, ['GET', 'PUT', 'DELETE']],
  [/^web\/me\/history\/\d+$/, ['DELETE']],
  [
    /^auth\/(login|register|email\/code|logout|logout-all|password\/reset|password\/reset\/code)$/,
    ['POST'],
  ],
  [/^auth\/password$/, ['PUT']],
  [/^users\/me$/, ['GET', 'PATCH']],
  [/^users\/me\/(?:avatar|background)$/, ['POST', 'DELETE']],
  [
    /^users\/(?:\d+\/(?:avatar|background)|avatar\/[a-f0-9]+\.(?:jpg|png|webp))$/,
    ['GET'],
  ],
  [/^images\/proxy$/, ['GET']],
]

export default defineEventHandler(async event => {
  const path = getRouterParam(event, 'path') ?? ''
  if (
    path.includes('..') ||
    path.includes('\\') ||
    !routes.some(
      ([pattern, methods]) =>
        pattern.test(path) && methods.includes(event.method)
    )
  ) {
    throw createError({ statusCode: 404, statusMessage: '接口不存在' })
  }
  checkMutationOrigin(event)
  setHeader(event, 'cache-control', 'no-store')
  const response = await backendRequest(event, path)
  setResponseStatus(event, response.status)
  for (const name of ['content-type', 'retry-after', 'www-authenticate']) {
    const value = response.headers.get(name)
    if (value) setHeader(event, name, value)
  }
  if (path === 'auth/login' && response.ok) {
    const body = response._data as ApiResponse<LoginData>
    if (!body.data?.access_token)
      throw createError({ statusCode: 502, statusMessage: '登录响应无效' })
    saveSession(event, body.data.access_token, body.data.expires_in)
    // Token 不进入浏览器 JSON 或 Nuxt SSR payload。
    return { ...body, data: { user: body.data.user } }
  }
  if (
    response.status === 401 ||
    (response.ok &&
      ['auth/logout', 'auth/logout-all', 'auth/password'].includes(path))
  )
    clearAuthSession(event)
  return response._data
})
