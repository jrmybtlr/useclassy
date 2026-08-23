<template>
  <footer class="flex grow flex-col border-t border-neutral-900">
    <div class="mx-auto flex w-full max-w-4xl grow bg-neutral-950">
      <GutterRail />
      <div
        class="flex min-w-0 flex-1 flex-col items-center gap-3 bg-white/1 px-6 py-6 font-mono text-sm tracking-wide text-neutral-500 uppercase"
        class:sm="flex-row justify-between px-12"
      >
        <span>MIT License © {{ new Date().getFullYear() }} Jeremy Butler</span>
        <a
          href="https://github.com/jrmybtlr/useclassy"
          class="inline-flex items-center gap-2 transition-colors duration-200 ease-out"
          class:hover="text-white"
          class:focus-visible="outline-2 outline-offset-2 outline-accent"
          target="_blank"
          rel="noreferrer"
        >
          <IconGithub />
          GitHub
        </a>
      </div>
      <GutterRail />
    </div>
  </footer>
</template>
