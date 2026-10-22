<script setup lang="ts">
const api = useApi()
const auth = useAuth()
// 响应式状态
const state = reactive({
  // 用户名
  username: auth.user.value?.username ?? '',
  // 联系邮箱
  email: auth.user.value?.email ?? '',
  // 联系电话
  phone: auth.user.value?.phone ?? '',
  // 个性签名
  bio: auth.user.value?.bio ?? '',
  // 当前密码
  currentPassword: '',
  // 新密码
  newPassword: '',
  // 操作状态
  busy: false,
  // 操作提示
  message: '',
  // 操作错误
  error: '',
  // 等待用户确认裁剪的原图
  cropFile: null as File | null,
  // 本次编辑的图片类型
  cropKind: 'avatar' as 'avatar' | 'background',
})
const {
  username,
  email,
  phone,
  bio,
  currentPassword,
  newPassword,
  busy,
  message,
  error,
  cropFile,
  cropKind,
} = toRefs(state)
async function run(action: () => Promise<unknown>, message = '已保存') {
  if (state.busy) return
  state.busy = true
  state.error = ''
  state.message = ''
  try {
    await action()
    state.message = message
    clearNuxtData(key => key.startsWith('private:profile:'))
  } catch (error) {
    state.error = apiErrorMessage(error)
  } finally {
    state.busy = false
  }
}
async function saveProfile() {
  await run(async () => {
    auth.user.value = await api.updateProfile({
      username: state.username,
      email: state.email || null,
      phone: state.phone || null,
      bio: state.bio || null,
    })
  })
}
function upload(event: Event, kind: 'avatar' | 'background') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    state.error = `${kind === 'avatar' ? '头像' : '背景'}不能超过 5 MB`
    input.value = ''
    return
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    state.error = '请选择 JPEG、PNG 或 WebP 图片'
    input.value = ''
    return
  }
  state.error = ''
  state.message = ''
  state.cropKind = kind
  state.cropFile = file
  input.value = ''
}
function confirmCrop(file: File) {
  void run(
    async () => {
      auth.user.value =
        state.cropKind === 'avatar'
          ? await api.uploadAvatar(file)
          : await api.uploadBackground(file)
      state.cropFile = null
    },
    state.cropKind === 'avatar' ? '头像已更新' : '背景已更新'
  )
}
function deleteBackground() {
  void run(async () => {
    auth.user.value = await api.deleteBackground()
  }, '已恢复默认背景')
}
function deleteAvatar() {
  void run(async () => {
    auth.user.value = await api.deleteAvatar()
  }, '已恢复默认头像')
}
function changePassword() {
  void run(async () => {
    await api.changePassword(state.currentPassword, state.newPassword)
    auth.user.value = null
    clearNuxtData(key => key.startsWith('private:'))
    // 改密会吊销当前会话，回发现页并弹出登录框
    await navigateTo({ path: '/', query: { login: '/profile' } })
  })
}
function logout() {
  void run(auth.logout)
}
</script>

<template>
  <div class="space-y-6">
    <UiPanel>
      <div class="flex flex-wrap items-center gap-4">
        <UiAvatar
          :name="auth.user.value?.username"
          :src="backendAsset(auth.user.value?.avatar_url)"
          size="lg"
        />
        <label class="text-sm text-ink-2"
          >更换头像（最多 5 MB）<input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            :disabled="busy"
            class="mt-2 block max-w-full text-xs"
            @change="upload($event, 'avatar')"
        /></label>
        <UiButton
          variant="ghost"
          size="sm"
          :disabled="busy || !auth.user.value?.avatar_url"
          @click="deleteAvatar"
          >恢复默认头像</UiButton
        >
      </div>
    </UiPanel>
    <UiPanel>
      <h2 class="text-lg font-medium">个人主页背景</h2>
      <div
        class="relative mt-4 aspect-4/1 overflow-hidden rounded-card bg-surface-2"
      >
        <img
          v-if="auth.user.value?.background_url"
          :src="backendAsset(auth.user.value.background_url)"
          alt="当前主页背景"
          class="size-full object-cover"
        />
        <div
          v-else
          class="flex size-full items-center justify-center bg-brand-soft text-sm text-ink-3"
        >
          默认背景
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-4">
        <label class="text-sm text-ink-2"
          >上传背景（最多 5 MB）<input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            :disabled="busy"
            class="mt-2 block max-w-full text-xs"
            @change="upload($event, 'background')"
        /></label>
        <UiButton
          variant="ghost"
          size="sm"
          :disabled="busy || !auth.user.value?.background_url"
          @click="deleteBackground"
          >恢复默认背景</UiButton
        >
      </div>
    </UiPanel>
    <AccountImageCropDialog
      v-if="cropFile"
      :file="cropFile"
      :kind="cropKind"
      :busy="busy"
      :upload-error="error"
      @confirm="confirmCrop"
      @cancel="cropFile = null"
    />
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
    <UiPanel>
      <h2 class="text-lg font-medium">个人资料</h2>
      <form
        class="mt-4 grid gap-4 sm:grid-cols-2"
        @submit.prevent="saveProfile"
      >
        <label class="text-xs text-ink-2"
          >用户名<input
            v-model="username"
            required
            minlength="3"
            maxlength="32"
            autocomplete="username"
            class="settings-input glass-surface"
        /></label>
        <label class="text-xs text-ink-2"
          >邮箱<input
            v-model="email"
            type="email"
            maxlength="254"
            autocomplete="email"
            class="settings-input glass-surface"
        /></label>
        <label class="text-xs text-ink-2"
          >电话<input
            v-model="phone"
            type="tel"
            maxlength="25"
            autocomplete="tel"
            class="settings-input glass-surface"
        /></label>
        <label class="text-xs text-ink-2"
          >个性签名<textarea
            v-model="bio"
            maxlength="500"
            class="settings-input h-24"
          />
        </label>
        <div>
          <UiButton
            type="submit"
            :loading="busy"
            >保存资料</UiButton
          >
        </div>
      </form>
    </UiPanel>
    <UiPanel>
      <h2 class="text-lg font-medium">修改密码</h2>
      <form
        class="mt-4 grid gap-4 sm:grid-cols-2"
        @submit.prevent="changePassword"
      >
        <label class="text-xs text-ink-2"
          >当前密码<input
            v-model="currentPassword"
            type="password"
            required
            maxlength="128"
            autocomplete="current-password"
            class="settings-input glass-surface"
        /></label>
        <label class="text-xs text-ink-2"
          >新密码<input
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            maxlength="128"
            autocomplete="new-password"
            class="settings-input glass-surface"
        /></label>
        <p class="text-xs text-ink-3 sm:col-span-2">
          修改密码后所有设备需要重新登录。
        </p>
        <div>
          <UiButton
            type="submit"
            :loading="busy"
            >修改密码</UiButton
          >
        </div>
      </form>
    </UiPanel>
    <UiButton
      variant="danger"
      :loading="busy"
      @click="logout"
      >退出登录</UiButton
    >
  </div>
</template>

<style scoped>
.settings-input {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  min-height: 2.5rem;
  border: 1px solid var(--color-line-strong);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: var(--color-ink);
}
.settings-input:focus {
  border-color: var(--color-brand);
}
</style>
