<template>
  <!-- 底部内边距为移动端导航栏让出空间，含 iOS 安全区 -->
  <div
    class="app-shell min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0"
  >
    <AppFluidBackground />
    <a
      href="#main-content"
      class="sr-only fixed top-2 left-2 z-[100] rounded-lg bg-brand px-4 py-3 text-white focus:not-sr-only"
      >跳到主要内容</a
    >
    <AppHeader />

    <!-- 顶栏为 fixed，这里用等高内边距让内容从其下方开始 -->
    <main
      id="main-content"
      tabindex="-1"
      class="scroll-mt-20 pt-20 sm:scroll-mt-24 sm:pt-24"
    >
      <slot />
    </main>

    <AppFooter />
    <AppBottomNav />
    <AccountLoginDialog />
  </div>
</template>
