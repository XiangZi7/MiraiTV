import { visitorIp } from '../utils/proxy-context'

export default defineEventHandler(event => {
  // Nitro 的 SSR 内部请求会继承 context，避免丢失浏览器的真实连接地址。
  if (event.context.miraiForwardedFor) return
  // 只读取 Nitro 平台提供的原始请求；Node 入口不能凭 CF 请求头冒充边缘平台。
  const edgeRequest = event.context.cloudflare?.request ??
    event.context._platform?.cloudflare?.request
  if (edgeRequest) {
    const address = visitorIp(edgeRequest.headers)
    if (address) {
      event.context.miraiClientIp = address
      event.context.miraiForwardedFor = address
      event.node.req.headers['x-forwarded-for'] = address
      return
    }
  }
  const direct = getRequestIP(event)
  if (!direct) return
  const previous = getHeader(event, 'x-forwarded-for')
  event.context.miraiForwardedFor = previous ? `${previous}, ${direct}` : direct
  // Nuxt 的 SSR 适配层会重建 event，但会保留请求头。
  event.node.req.headers['x-forwarded-for'] = event.context.miraiForwardedFor
})
