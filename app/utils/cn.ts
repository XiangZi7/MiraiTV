import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 class：解决条件 class 拼接与 Tailwind 同类冲突覆盖
 * 入参放宽为 unknown，便于直接传入模板里的 $attrs.class
 */
export function cn(...inputs: unknown[]) {
  return twMerge(clsx(inputs as ClassValue[]))
}

/**
 * 剔除 attrs 中的 class
 *
 * 组件根节点需要 `v-bind="omitClass($attrs)"` 搭配 `:class="cn(基础类, $attrs.class)"`，
 * 否则 Vue 会把调用方的 class 直接拼接到基础类之后，同属性的 Tailwind 工具类
 * 由样式表顺序决定胜负，出现「传了 absolute 却被内部的 relative 覆盖」这类问题。
 */
export function omitClass(attrs: Record<string, unknown>) {
  const { class: _className, ...rest } = attrs
  return rest
}
