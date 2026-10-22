import { MAIN_NAV } from '~/constants/navigation'

/** 导航一开始就移动玻璃滑块，不等待目标页面的数据加载。 */
export function useNavigationSelection() {
  const route = useRoute()
  const router = useRouter()
  const pendingPath = shallowRef<string | null>(null)
  const path = computed(() => pendingPath.value ?? route.path)
  function isActive(to: string) {
    return to === '/' ? path.value === '/' : path.value.startsWith(to)
  }
  const activeNav = computed(
    () => MAIN_NAV.find(link => isActive(link.to))?.to ?? ''
  )
  const removeBefore = router.beforeEach(to => {
    pendingPath.value = to.path
  })
  const removeAfter = router.afterEach((_to, _from, failure) => {
    if (failure) pendingPath.value = null
  })
  watch(
    () => route.path,
    () => {
      pendingPath.value = null
    }
  )
  onScopeDispose(() => {
    removeBefore()
    removeAfter()
  })
  return { activeNav, isActive }
}
