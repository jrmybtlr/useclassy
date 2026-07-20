<script lang="ts">
  let pressed = $state(false)
</script>

<div class="flex flex-col h-screen items-center justify-center">
  <h1
    class="font-bold text-4xl"
    class:md="text-7xl text-blue-200"
    class:hover="text-red-500"
  >
    Svelte Demo
  </h1>

  <button
    type="button"
    class="mt-12 text-4xl text-red-500"
    class:hover="text-blue-500"
    class:scale-110={pressed}
    onpointerdown={() => (pressed = true)}
    onpointerup={() => (pressed = false)}
    onpointerleave={() => (pressed = false)}
  >
    Native class directive
  </button>
</div>
