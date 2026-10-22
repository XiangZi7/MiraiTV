import type { AccountUser } from '~/types/account'

export function useAuth() {
  const user = useState<AccountUser | null>('session-user', () => null)
  const api = useApi()
  const route = useRoute()
  const dialog = useLoginDialog()
  const loggedIn = computed(() => user.value !== null)
  async function login(account: string, password: string) {
    const result = await api.login(account, password)
    clearNuxtData(key => key.startsWith('private:'))
    user.value = result.user
  }
  async function logout() {
    await api.logout()
    user.value = null
    clearNuxtData(key => key.startsWith('private:'))
    await navigateTo('/')
  }
  /** 需要登录的操作入口：未登录时就地弹出登录框，不离开当前页面 */
  function requireLogin() {
    if (loggedIn.value) return true
    dialog.show(route.fullPath)
    return false
  }
  return { user, loggedIn, login, logout, requireLogin }
}
