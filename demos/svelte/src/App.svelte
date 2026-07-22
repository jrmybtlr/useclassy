<script lang="ts">
  type Status = 'active' | 'muted' | 'danger'

  let pressed = $state(false)
  let isActive = $state(true)
  let isDisabled = $state(false)
  let status = $state<Status>('active')
  let showBadge = $state(true)

  function cycleStatus() {
    status =
      status === 'active' ? 'muted' : status === 'muted' ? 'danger' : 'active'
  }
</script>

<div
  class="min-h-screen flex flex-col items-center gap-10 px-4 py-10"
  class:md="gap-12 py-16 px-8"
>
  <header class="flex flex-col items-center gap-3 text-center">
    <h1
      class="font-bold text-4xl"
      class:md="text-7xl text-blue-200"
      class:hover="text-red-500"
    >
      Svelte Demo
    </h1>
    <p class="max-w-xl text-sm text-zinc-400">
      Smoke coverage for quoted UseClassy modifiers, nested variants, and
      coexistence with native <code class="text-zinc-300">class:name</code> directives.
    </p>
  </header>

  <!-- Controls -->
  <section
    class="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-300"
    class:md="gap-6"
  >
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={isActive} />
      isActive
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={isDisabled} />
      isDisabled
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={showBadge} />
      showBadge
    </label>
    <button
      type="button"
      class="rounded bg-zinc-900 border border-zinc-700 px-2 py-1"
      class:hover="border-zinc-500"
      onclick={cycleStatus}
    >
      status: {status}
    </button>
  </section>

  <div class="w-full max-w-3xl flex flex-col gap-8" class:md="gap-10">
    <!-- Quoted static + nested -->
    <section class="flex flex-col gap-3">
      <div>
        <h2 class="text-base font-semibold text-zinc-100">
          Quoted modifiers + nested
        </h2>
        <p class="text-xs text-zinc-500">
          class:hover / class:sm:hover / class:md — UseClassy quoted values only
        </p>
      </div>
      <div
        class="px-5 py-3 rounded-lg bg-zinc-900 text-red-400"
        class:hover="text-blue-400"
        class:sm:hover="text-lg scale-105"
        class:md="text-2xl"
      >
        Hover · resize for sm/md
      </div>
    </section>

    <!-- Native directive preserved beside UseClassy -->
    <section class="flex flex-col gap-3">
      <div>
        <h2 class="text-base font-semibold text-zinc-100">
          Native class directive + UseClassy
        </h2>
        <p class="text-xs text-zinc-500">
          class:scale-110=&#123;pressed&#125; and class:disabled stay native; class:hover is rewritten
        </p>
      </div>
      <button
        type="button"
        class="px-6 py-3 rounded-lg text-2xl text-red-500 border border-zinc-700 transition"
        class:hover="text-blue-500 border-blue-500"
        class:focus="ring-2 ring-blue-300 outline-none"
        class:scale-110={pressed}
        class:opacity-50={isDisabled}
        disabled={isDisabled}
        onpointerdown={() => (pressed = true)}
        onpointerup={() => (pressed = false)}
        onpointerleave={() => (pressed = false)}
      >
        Hold to scale (native) · hover for UseClassy
      </button>
    </section>

    <!-- Shorthand native + multi UseClassy -->
    <section class="flex flex-col gap-3">
      <div>
        <h2 class="text-base font-semibold text-zinc-100">
          Shorthand native + multi modifiers
        </h2>
        <p class="text-xs text-zinc-500">
          class:active shorthand preserved next to class:hover / class:sm:focus
        </p>
      </div>
      <button
        type="button"
        class="px-5 py-3 rounded-lg font-semibold border border-zinc-600 bg-zinc-950"
        class:active={isActive}
        class:hover="bg-violet-600 text-white"
        class:sm:focus="ring-2 ring-violet-300 outline-none"
        class:lg:hover="scale-105"
        onclick={() => (isActive = !isActive)}
      >
        active shorthand · click toggles isActive ({isActive})
      </button>
    </section>

    <!-- Template literal class + UseClassy variants -->
    <section class="flex flex-col gap-3">
      <div>
        <h2 class="text-base font-semibold text-zinc-100">
          Template class + variants
        </h2>
        <p class="text-xs text-zinc-500">
          Static tokens in class=&#123;`…`&#125; extract; modifiers still merge
        </p>
      </div>
      <div
        class={`flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-700`}
        class:hover="border-emerald-500"
        class:sm:hover="bg-zinc-900"
      >
        <span
          class="inline-block size-2 rounded-full bg-zinc-600"
          class:hover="bg-emerald-400"
        ></span>
        Template base + hover border
      </div>
    </section>

    <!-- Status-driven native classes with UseClassy chrome -->
    <section class="flex flex-col gap-3">
      <div>
        <h2 class="text-base font-semibold text-zinc-100">
          Status via native directives
        </h2>
        <p class="text-xs text-zinc-500">
          Conditional visuals use native class:name=&#123;cond&#125;; chrome uses UseClassy quotes
        </p>
      </div>
      <button
        type="button"
        class="px-5 py-3 rounded-lg font-medium border border-zinc-700 transition"
        class:hover="underline"
        class:focus="ring-2 ring-zinc-400 outline-none"
        class:bg-emerald-600={status === 'active'}
        class:text-white={status === 'active' || status === 'danger'}
        class:bg-red-600={status === 'danger'}
        class:bg-zinc-800={status === 'muted'}
        class:text-zinc-300={status === 'muted'}
        onclick={cycleStatus}
      >
        Native status colors · UseClassy hover underline
      </button>
    </section>

    <!-- Badge toggle + nested responsive focus -->
    <section class="flex flex-col gap-3">
      <div>
        <h2 class="text-base font-semibold text-zinc-100">
          Mixed visibility + nested focus
        </h2>
        <p class="text-xs text-zinc-500">
          class:hidden=&#123;!showBadge&#125; with class:md:hover / class:focus-within
        </p>
      </div>
      <div
        class="px-5 py-4 rounded-lg bg-zinc-900 border border-zinc-800"
        class:md:hover="border-sky-500"
        class:focus-within="ring-2 ring-sky-400"
      >
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-sky-500/20 text-sky-300"
          class:hidden={!showBadge}
          class:hover="bg-sky-500/40"
        >
          badge
        </span>
        <input
          class="mt-3 block w-full rounded bg-zinc-950 border border-zinc-700 px-2 py-1 text-sm"
          class:focus="border-sky-400 outline-none"
          placeholder="focus-within the card"
        />
      </div>
    </section>
  </div>
</div>
