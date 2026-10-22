import type { AccountUser } from '~/types/account'
import type { ApiResponse } from '~/types/web-api'

export default defineNuxtPlugin({
  name: 'session',
  async setup() {
    const user = useState<AccountUser | null>('session-user', () => null)
    // 客户端从 SSR payload 恢复，避免重复请求和首屏头像闪烁。
    if (import.meta.server || !useNuxtApp().isHydrating) {
      const response = await useRequestFetch()<ApiResponse<AccountUser>>(
        '/api/session',
        { retry: 0 }
      )
      user.value = response.data
    }
  },
})
