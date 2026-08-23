<template>
  <footer class="flex grow flex-col border-t border-neutral-900">
    <div class="mx-auto flex w-full max-w-4xl grow bg-neutral-950">
      <GutterRail />
      <div
        class="flex min-w-0 flex-1 items-center justify-center bg-white/1 py-6 font-mono text-sm tracking-wide text-neutral-500 uppercase"
      >
        MIT License © {{ new Date().getFullYear() }} Jeremy Butler
      </div>
      <GutterRail />
    </div>
  </footer>
</template>
