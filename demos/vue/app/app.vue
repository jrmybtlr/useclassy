<template>
  <div
    class="min-h-screen"
    class:dark="bg-zinc-950 text-white"
  >
    <div
      class="container mx-auto flex w-full min-w-0 max-w-2xl flex-col px-4 sm:px-6"
    >
      <SiteNav class="pt-4" class:md="pt-6" />
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [
    {
      rel: "icon",
      type: "image/png",
      href: "/favicon.png",
    },
  ],
});

useSeoMeta({
  ogImage: "https://assets.useclassy.com/og-image.png",
  twitterImage: "https://assets.useclassy.com/og-image-twitter.png",
  twitterCard: "summary_large_image",
});
</script>
