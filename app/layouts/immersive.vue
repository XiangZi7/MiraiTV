<template>
  <!-- 沉浸式布局：无顶栏与页脚，仍保留登录弹窗入口 -->
  <div class="min-h-dvh bg-black">
    <a
      href="#main-content"
      class="sr-only fixed top-2 left-2 z-[100] rounded-lg bg-brand px-4 py-3 text-white focus:not-sr-only"
    >跳到主要内容</a>
    <main id="main-content" tabindex="-1">
      <slot />
    </main>
    <AccountLoginDialog />
  </div>
</template>
