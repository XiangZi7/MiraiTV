export function apiErrorMessage(error: unknown): string {
  const value = error as {
    data?: {
      message?: string
      statusMessage?: string
      detail?: string | { msg: string }[]
    }
    message?: string
    statusMessage?: string
  }
  const data = value?.data
  if (data?.message) return data.message
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail))
    return data.detail.map(item => item.msg).join('；')
  return (
    data?.statusMessage ??
    value?.statusMessage ??
    value?.message ??
    '请求失败，请稍后重试'
  )
}

export function backendAsset(
  url: string | null | undefined
): string | undefined {
  return url?.startsWith('/api/v1/')
    ? url.replace('/api/v1/', '/api/backend/')
    : (url ?? undefined)
}
