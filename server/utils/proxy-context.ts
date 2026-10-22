function normalizeIp(value: string): string | undefined {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split('.').every(part => Number(part) <= 255 && String(Number(part)) === part)
      ? value
      : undefined
  }
  if (!value.includes(':') || /[^a-f\d:.]/i.test(value)) return undefined
  if (/^::ffff:(?:\d{1,3}\.){3}\d{1,3}$/i.test(value))
    return normalizeIp(value.slice(7))
  try {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1)
  } catch {
    return undefined
  }
}

export function visitorIp(headers: Headers) {
  const address = normalizeIp(headers.get('cf-connecting-ip')?.trim() ?? '')
  if (!address) return undefined
  // Overwrite Headers 模式的 240/4 是伪 IPv4，保留真正的 IPv6。
  const original = normalizeIp(headers.get('cf-connecting-ipv6')?.trim() ?? '')
  if (
    !address.includes(':') &&
    Number(address.split('.')[0]) >= 240 &&
    original?.includes(':')
  )
    return original
  return address
}

export async function signVisitorIp(
  secret: string,
  address: string,
  method: string,
  path: string
) {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}\n${method}\n${path}\n${address}`)
  )
  const signature = Array.from(new Uint8Array(signed), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')
  return {
    'x-mirai-client-ip': address,
    'x-mirai-proxy-time': timestamp,
    'x-mirai-proxy-signature': signature,
  }
}
