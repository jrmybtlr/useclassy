<template>
  <div 
  class="flex flex-col gap-8 h-screen w-screen items-center justify-center"
  class:dark="bg-gray-900 text-white"
  >
    <!-- Title -->
     <div class="flex w-fit group items-center flex-col gap-8 cursor-alias">
      <div
        class="text-red-500 text-9xl transition-all translate-y-8 duration-300"
        class:group-hover="rotate-8 -translate-y-4"
      >
        🎩
      </div>
      <h1 
        class="text-red-500 text-xs"
        class:hover="text-blue-600 font-bold"
        class:md="text-2xl"
        class:lg="font-bold text-9xl"
        >
        useClassy
      </h1>
    </div>

    <!-- Input -->
    <input
      placeholder="Enter your text"
      class="w-full max-w-sm px-6 h-12 border border-gray-300 rounded-full"
      class:hover="border-blue-600"
      class:focus="border-emerald-600 outline-none ring-2 ring-blue-500"
      class:dark="bg-gray-800 text-white border-blue-600 border-2"
      class:dark:placeholder="text-white"
    />  
  </div>

</template>
