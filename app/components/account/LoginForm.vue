<script setup lang="ts">
const api = useApi()
const auth = useAuth()
// 登录成功后的去向由容器决定：弹窗留在原页面，受保护页面则跳回来源
const emit = defineEmits<{ success: [] }>()
const passwordId = useId()
// 响应式状态
const state = reactive({
  // 表单模式
  mode: 'login' as 'login' | 'register' | 'reset',
  // 用户名或邮箱
  account: '',
  // 注册用户名
  username: '',
  // 邮箱验证码
  code: '',
  // 登录或新密码
  password: '',
  // 是否显示密码明文
  showPassword: false,
  // 提交状态
  busy: false,
  // 发送验证码状态
  sending: false,
  // 验证码冷却秒数
  cooldown: 0,
  // 表单提示
  message: '',
  // 表单错误
  error: '',
})
const {
  mode,
  account,
  username,
  code,
  password,
  showPassword,
  busy,
  sending,
  cooldown,
  message,
  error,
} = toRefs(state)
const title = computed(
  () => ({ login: '登录', register: '注册', reset: '重置密码' })[state.mode]
)
useIntervalFn(() => {
  if (state.cooldown > 0) state.cooldown -= 1
}, 1000)
function switchMode(value: typeof state.mode) {
  state.mode = value
  state.message = ''
  state.error = ''
  state.password = ''
  state.showPassword = false
  state.code = ''
}
async function sendCode() {
  if (state.sending || state.cooldown) return
  state.sending = true
  state.error = ''
  try {
    if (state.mode === 'reset') await api.sendResetCode(state.account.trim())
    else await api.sendCode(state.account.trim())
    state.cooldown = 60
    state.message = '验证码已发送，请查收邮箱。'
  } catch (error) {
    state.error = apiErrorMessage(error)
  } finally {
    state.sending = false
  }
}
async function submit() {
  if (state.busy) return
  state.busy = true
  state.error = ''
  state.message = ''
  try {
    if (state.mode === 'reset') {
      await api.resetPassword(state.account.trim(), state.code, state.password)
      switchMode('login')
      state.message = '密码已重置，请登录。'
      return
    }
    if (state.mode === 'register')
      await api.register({
        username: state.username.trim(),
        email: state.account.trim(),
        password: state.password,
        email_code: state.code,
      })
    await auth.login(state.account.trim(), state.password)
    emit('success')
  } catch (error) {
    state.error = apiErrorMessage(error)
  } finally {
    state.busy = false
  }
}
</script>

<template>
  <form
    class="mt-6 space-y-4 text-left"
    @submit.prevent="submit"
  >
    <label
      v-if="mode === 'register'"
      class="block text-xs text-ink-2"
      >用户名
      <input
        v-model="username"
        required
        minlength="3"
        maxlength="32"
        autocomplete="username"
        class="account-input"
        placeholder="3–32 位中文、字母、数字或下划线"
      />
    </label>
    <label class="block text-xs text-ink-2"
      >{{ mode === 'login' ? '用户名 / 邮箱' : '邮箱' }}
      <input
        v-model="account"
        :type="mode === 'login' ? 'text' : 'email'"
        required
        maxlength="254"
        :autocomplete="mode === 'login' ? 'username' : 'email'"
        class="account-input"
        :placeholder="mode === 'login' ? '输入用户名或邮箱' : '输入邮箱地址'"
      />
    </label>
    <div class="text-xs text-ink-2">
      <label :for="passwordId">{{
        mode === 'reset' ? '新密码' : '密码'
      }}</label>
      <span class="relative mt-2 block">
        <input
          :id="passwordId"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          required
          :minlength="mode === 'login' ? 1 : 8"
          maxlength="128"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          :placeholder="mode === 'login' ? '输入密码' : '设置至少 8 位密码'"
          class="account-input account-password"
        />
        <button
          type="button"
          :aria-label="showPassword ? '隐藏密码' : '显示密码'"
          :aria-pressed="showPassword"
          class="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-ink-3 transition-colors hover:text-ink"
          @click="showPassword = !showPassword"
        >
          <Icon
            :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'"
            class="size-4"
          />
        </button>
      </span>
    </div>
    <div
      v-if="mode !== 'login'"
      class="flex items-end gap-2"
    >
      <label class="min-w-0 flex-1 text-xs text-ink-2"
        >邮箱验证码
        <input
          v-model="code"
          required
          pattern="[0-9]{4,8}"
          maxlength="8"
          inputmode="numeric"
          autocomplete="one-time-code"
          class="account-input"
          placeholder="输入验证码"
        />
      </label>
      <UiButton
        variant="ghost"
        :pill="false"
        class="min-h-11 rounded-lg bg-surface-2 text-brand"
        :loading="sending"
        :disabled="cooldown > 0 || !account"
        @click="sendCode"
        >{{ cooldown ? `${cooldown}s` : '发送验证码' }}</UiButton
      >
    </div>
    <p
      v-if="error"
      role="alert"
      class="text-sm text-danger"
    >
      {{ error }}
    </p>
    <p
      v-if="message"
      role="status"
      class="text-sm text-ink-2"
    >
      {{ message }}
    </p>
    <button
      type="submit"
      :disabled="busy"
      :aria-busy="busy || undefined"
      class="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
    >
      <Icon
        v-if="busy"
        name="lucide:loader-circle"
        class="size-4 animate-spin motion-reduce:animate-none"
      />
      {{ title }}
    </button>
    <div class="flex items-center justify-between gap-3 text-xs text-ink-3">
      <button
        type="button"
        :disabled="busy"
        class="min-h-11 cursor-pointer transition-colors hover:text-brand disabled:cursor-wait"
        @click="switchMode(mode === 'register' ? 'login' : 'register')"
      >
        {{ mode === 'register' ? '已有账号，去登录' : '注册账号' }}
      </button>
      <button
        type="button"
        :disabled="busy"
        class="min-h-11 cursor-pointer transition-colors hover:text-brand disabled:cursor-wait"
        @click="switchMode(mode === 'reset' ? 'login' : 'reset')"
      >
        {{ mode === 'reset' ? '返回登录' : '忘记密码' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.account-input {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  height: 2.75rem;
  border: 1px solid var(--color-line-strong);
  border-radius: 0.75rem;
  padding: 0 1rem;
  background: var(--color-surface-1);
  color: var(--color-ink);
  font-size: 1rem;
  transition: border-color 150ms;
}
.account-input::placeholder {
  color: var(--color-ink-3);
}
.account-password {
  margin-top: 0;
  padding-right: 2.75rem;
}
.account-input:focus {
  border-color: var(--color-brand);
}
</style>
