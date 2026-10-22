/**
 * 全站登录弹窗的开关
 * 登录不再占用独立页面：需要登录时就地弹出，成功后留在原页面
 */

/** 只接受站内绝对路径，挡住外部跳转 */
function safeTarget(value?: string | null) {
  return value &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !/[\u0000-\u001f]/u.test(value)
    ? value
    : null
}

export function useLoginDialog() {
  const open = useState('login-dialog', () => false)
  // 受保护页面被拦下时记下来源，登录成功后再回去
  const redirect = useState<string | null>('login-dialog-redirect', () => null)

  function show(target?: string | null) {
    redirect.value = safeTarget(target)
    open.value = true
  }

  function hide() {
    open.value = false
    redirect.value = null
  }

  return { open, redirect, show, hide }
}
