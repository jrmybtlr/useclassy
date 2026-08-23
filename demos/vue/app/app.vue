<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useHead } from '#imports'

useHead({
  htmlAttrs: {
    lang: 'en',
    class: 'scheme-only-dark',
  },
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: '/favicon.png',
    },
    {
      rel: 'preload',
      href: '/fonts/gilroy/Semibold/Gilroy-SemiBold.woff',
      as: 'font',
      type: 'font/woff',
      crossorigin: 'anonymous',
    },
    {
      rel: 'preload',
      href: '/fonts/gilroy/Bold/Gilroy-Bold.woff',
      as: 'font',
      type: 'font/woff',
      crossorigin: 'anonymous',
    },
  ],
})
</script>
