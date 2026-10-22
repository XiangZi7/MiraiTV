<script setup lang="ts">
import type Cropper from 'cropperjs'

const props = defineProps<{
  file: File
  kind: 'avatar' | 'background'
  busy: boolean
  uploadError?: string
}>()
const emit = defineEmits<{ confirm: [file: File]; cancel: [] }>()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const stage = useTemplateRef<HTMLDivElement>('stage')
const title = computed(() =>
  props.kind === 'avatar' ? '裁剪头像' : '裁剪主页背景'
)
const ratio = computed(() => (props.kind === 'avatar' ? 1 : 4))
// 响应式状态
const state = reactive({
  // 图片与裁剪区域是否就绪
  ready: false,
  // 本地导出状态
  exporting: false,
  // 图片解码或导出错误
  error: '',
})
const { ready, exporting, error } = toRefs(state)
let cropper: Cropper | undefined
let sourceUrl = ''
let disposed = false

function reset() {
  const image = cropper?.getCropperImage()
  const canvas = cropper?.getCropperCanvas()
  const selection = cropper?.getCropperSelection()
  if (!image || !canvas || !selection) return
  image.$resetTransform().$center('contain')
  const bounds = canvas.getBoundingClientRect()
  const picture = image.getBoundingClientRect()
  const width = Math.min(picture.width, picture.height * ratio.value) * 0.9
  const height = width / ratio.value
  selection.$change(
    (bounds.width - width) / 2,
    (bounds.height - height) / 2,
    width,
    height,
    ratio.value
  )
}

onMounted(async () => {
  dialog.value?.showModal()
  try {
    const { default: CropperClass } = await import('cropperjs')
    if (disposed || !stage.value) return
    sourceUrl = URL.createObjectURL(props.file)
    const image = new Image()
    image.src = sourceUrl
    image.alt = '待裁剪图片'
    cropper = new CropperClass(image, {
      container: stage.value,
      template: `<cropper-canvas background style="height:100%" theme-color="var(--color-brand)">
        <cropper-image scalable translatable></cropper-image>
        <cropper-shade hidden></cropper-shade>
        <cropper-handle action="move" plain></cropper-handle>
        <cropper-selection aspect-ratio="${ratio.value}" initial-coverage="0.8" movable resizable keyboard>
          <cropper-grid role="grid" covered></cropper-grid>
          <cropper-crosshair centered></cropper-crosshair>
          <cropper-handle action="move" theme-color="transparent"></cropper-handle>
          <cropper-handle action="nw-resize"></cropper-handle>
          <cropper-handle action="ne-resize"></cropper-handle>
          <cropper-handle action="sw-resize"></cropper-handle>
          <cropper-handle action="se-resize"></cropper-handle>
        </cropper-selection>
      </cropper-canvas>`,
    })
    await cropper.getCropperImage()?.$ready()
    if (disposed) return
    reset()
    state.ready = true
  } catch {
    state.error = '无法读取这张图片，请重新选择 JPEG、PNG 或 WebP 图片'
  }
})

onBeforeUnmount(() => {
  disposed = true
  cropper?.destroy()
  if (sourceUrl) URL.revokeObjectURL(sourceUrl)
  dialog.value?.close()
})

function cancel() {
  if (!props.busy && !state.exporting) emit('cancel')
}
function zoom(amount: number) {
  cropper?.getCropperImage()?.$zoom(amount)
}
async function confirm() {
  if (!state.ready || props.busy || state.exporting) return
  state.exporting = true
  state.error = ''
  try {
    const selection = cropper?.getCropperSelection()
    if (!selection || selection.width <= 0 || selection.height <= 0)
      throw new Error('请选择裁剪区域')
    const width = props.kind === 'avatar' ? 512 : 1600
    const canvas = await selection.$toCanvas({
      width,
      height: width / ratio.value,
      beforeDraw: (context, output) => {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, output.width, output.height)
      },
    })
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    )
    if (!blob) throw new Error('图片导出失败，请重试')
    emit(
      'confirm',
      new File([blob], `${props.kind}.jpg`, { type: 'image/jpeg' })
    )
  } catch (error) {
    state.error = apiErrorMessage(error)
  } finally {
    state.exporting = false
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="title"
    class="glass-surface m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-panel p-5 text-ink backdrop:bg-black/40 sm:p-6"
    @cancel.prevent="cancel"
  >
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <UiIconButton
        icon="lucide:x"
        label="取消裁剪"
        :disabled="busy || exporting"
        @click="cancel"
      />
    </div>
    <p class="mt-2 text-sm text-ink-3">
      拖动图片或裁剪框调整位置，拖动边角调整范围。
    </p>
    <div
      ref="stage"
      class="mt-5 h-80 max-h-[50dvh] overflow-hidden rounded-card bg-base"
      :aria-busy="!ready"
    />
    <div class="mt-4 flex items-center gap-2">
      <UiIconButton
        icon="lucide:minus"
        label="缩小图片"
        :disabled="!ready || busy || exporting"
        @click="zoom(-0.1)"
      />
      <UiIconButton
        icon="lucide:plus"
        label="放大图片"
        :disabled="!ready || busy || exporting"
        @click="zoom(0.1)"
      />
      <UiButton
        variant="ghost"
        size="sm"
        :disabled="!ready || busy || exporting"
        @click="reset"
        >重置裁剪</UiButton
      >
      <span class="ml-auto text-xs text-ink-3">{{
        kind === 'avatar' ? '正方形头像' : '宽幅背景'
      }}</span>
    </div>
    <p
      v-if="error || uploadError"
      role="alert"
      class="mt-3 text-sm text-danger"
    >
      {{ error || uploadError }}
    </p>
    <div class="mt-5 flex justify-end gap-3">
      <UiButton
        variant="ghost"
        :disabled="busy || exporting"
        @click="cancel"
        >取消</UiButton
      >
      <UiButton
        :disabled="!ready"
        :loading="busy || exporting"
        @click="confirm"
        >确认裁剪并上传</UiButton
      >
    </div>
  </dialog>
</template>
