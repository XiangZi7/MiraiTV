<script setup lang="ts">
const { user, loggedIn, logout } = useAuth()
const loginDialog = useLoginDialog()
const route = useRoute()
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const menu = useTemplateRef<HTMLElement>('menu')
const menuId = useId()
// 响应式状态
const state = reactive({
  // 头像气泡是否展开
  open: false,
  // 是否正在退出登录
  busy: false,
  // 退出失败时的提示
  error: '',
})
const { open, busy, error } = toRefs(state)

function close(restoreFocus = false) {
  state.open = false
  if (restoreFocus) trigger.value?.focus()
}
onClickOutside(root, () => close())
watch(
  () => route.fullPath,
  () => close()
)
watch(loggedIn, () => close())
function onFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) close()
}
async function openMenu() {
  state.open = true
  await nextTick()
  menu.value?.querySelector('a')?.focus()
}
async function signOut() {
  if (state.busy) return
  state.busy = true
  state.error = ''
  try {
    await logout()
    close()
  } catch (error) {
    state.error = apiErrorMessage(error)
  } finally {
    state.busy = false
  }
}
</script>

<template>
  <div
    ref="root"
    class="relative ml-1 shrink-0"
    @keydown.esc.stop="close(true)"
    @focusout="onFocusOut"
  >
    <button
      v-if="loggedIn"
      ref="trigger"
      type="button"
      aria-label="账号菜单"
      title="账号菜单"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      class="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-ink-2 transition-colors duration-200 hover:bg-brand-soft hover:text-ink"
      @click="open = !open"
      @keydown.down.prevent="openMenu"
    >
      <UiAvatar
        v-if="user?.avatar_url"
        :name="user?.username"
        :src="backendAsset(user?.avatar_url)"
        size="sm"
      />
      <Icon
        v-else
        name="lucide:user-round"
        class="size-5"
        aria-hidden="true"
      />
    </button>
    <button
      v-else
      type="button"
      aria-label="登录"
      title="登录"
      aria-haspopup="dialog"
      class="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-ink-2 transition-colors duration-200 hover:bg-brand-soft hover:text-ink"
      @click="loginDialog.show(route.fullPath)"
    >
      <Icon
        name="lucide:user-round"
        class="size-5"
        aria-hidden="true"
      />
    </button>
    <Transition
      enter-active-class="transition duration-150 motion-reduce:transition-none"
      enter-from-class="translate-y-1 opacity-0"
      leave-active-class="transition duration-100 motion-reduce:transition-none"
      leave-to-class="translate-y-1 opacity-0"
    >
      <nav
        v-if="open && loggedIn"
        :id="menuId"
        ref="menu"
        aria-label="账号菜单"
        class="glass-surface glass-popover absolute top-full right-0 z-30 mt-3 w-52 rounded-xl p-1.5"
      >
        <span
          aria-hidden="true"
          class="absolute -top-1.5 right-4 size-3 rotate-45 border-t border-l border-line-strong bg-base"
        />
        <p
          class="truncate border-b border-line px-3 pt-2.5 pb-3 text-xs text-ink-3"
        >
          {{ user?.username }}
        </p>
        <NuxtLink
          to="/profile"
          class="mt-1 flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Icon
            name="lucide:user-round"
            class="size-4"
          />
          个人中心
        </NuxtLink>
        <button
          type="button"
          :disabled="busy"
          :aria-busy="busy || undefined"
          class="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm text-danger transition-colors hover:bg-danger/10 disabled:cursor-wait disabled:opacity-60"
          @click="signOut"
        >
          <Icon
            :name="busy ? 'lucide:loader-circle' : 'lucide:log-out'"
            :class="
              cn('size-4', busy && 'animate-spin motion-reduce:animate-none')
            "
          />
          {{ busy ? '退出中…' : '退出登录' }}
        </button>
        <p
          v-if="error"
          role="alert"
          class="px-3 py-2 text-xs text-danger"
        >
          {{ error }}
        </p>
      </nav>
    </Transition>
  </div>
</template>
