<script setup lang="ts">
const site = useSite()
/**
 * 全站登录弹窗：挂在布局上，由 useLoginDialog 控制开合
 * 登录成功后留在当前页面，只在受保护页面被拦下时才跳回来源
 */
const { open, redirect, hide, show } = useLoginDialog()
const panelRef = useTemplateRef<HTMLElement>('panelRef')
const titleId = useId()
let previousFocus: HTMLElement | null = null
const route = useRoute()
const router = useRouter()

// ?login=<来源路径> 由 auth 中间件写入，落地后自动弹出并把参数清掉
watch(
  () => route.query.login,
  value => {
    if (typeof value !== 'string') return
    show(value)
    if (!import.meta.client) return
    const query = { ...route.query }
    delete query.login
    void router.replace({ path: route.path, query, hash: route.hash })
  },
  { immediate: true }
)

onClickOutside(panelRef, hide)
onKeyStroke('Escape', () => open.value && hide())

// 弹窗打开时锁定背景滚动
const locked = useScrollLock(
  import.meta.client ? document.documentElement : null
)
watch(
  open,
  async value => {
    locked.value = value
    if (!import.meta.client) return
    if (value) {
      previousFocus = document.activeElement as HTMLElement | null
      await nextTick()
      panelRef.value?.querySelector('input')?.focus()
    } else previousFocus?.focus()
  },
  { immediate: true }
)
onScopeDispose(() => (locked.value = false))

function keepFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const elements = panelRef.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), a[href]'
  )
  if (!elements?.length) return
  const first = elements[0]!
  const last = elements[elements.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

async function done() {
  const target = redirect.value
  hide()
  if (target) await navigateTo(target)
}
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out-soft motion-reduce:transition-none"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-out-soft motion-reduce:transition-none"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-ink/40 px-4 py-6 backdrop-blur-sm"
        >
          <Transition
            appear
            enter-active-class="transition duration-200 ease-out-soft motion-reduce:transition-none"
            enter-from-class="opacity-0 scale-95 translate-y-2"
          >
            <section
              ref="panelRef"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              class="relative m-auto w-full max-w-sm rounded-2xl border border-line bg-base p-6 shadow-2xl sm:p-8"
              @keydown="keepFocus"
            >
              <UiIconButton
                icon="lucide:x"
                label="关闭"
                class="absolute top-2 right-2 size-11 cursor-pointer"
                @click="hide"
              />
              <img
                src="/brand/mirai-mark.webp"
                alt=""
                width="40"
                height="40"
                class="size-10"
              />
              <h2
                :id="titleId"
                class="mt-4 text-xl font-semibold tracking-tight text-ink"
              >
                欢迎来到 {{ site.siteName }}
              </h2>
              <p class="mt-2 text-sm text-ink-3">登录后同步片单与观看记录</p>
              <AccountLoginForm @success="done" />
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
