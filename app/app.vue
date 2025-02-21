<template>
  <div class="flex flex-col gap-8 h-screen w-screen items-center justify-center">
    <!-- Title -->
    <div 
      class="text-red-500 text-xs"
      class:hover="text-blue-600 font-bold"
      class:sm="text-sm"
      class:md="text-2xl"
      class:lg="font-bold text-emerald-600 text-9xl"
      >
      useClassy
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

    <!-- Input Long Example -->
    <input
      placeholder="Enter your text"
      class="w-full max-w-sm px-6 h-12 border border-gray-300 rounded-full hover:border-blue-600 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-blue-600 dark:border-2 dark:placeholder:text-white"
    />  
  </div>

</template>
