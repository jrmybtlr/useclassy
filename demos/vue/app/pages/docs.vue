<template>
  <section class="sticky top-0 z-20 border-b border-neutral-900 bg-neutral-950">
    <div class="mx-auto flex w-full max-w-4xl">
      <GutterRail />
      <DocsToc class="min-w-0 flex-1" :headings="readmeHeadings" />
      <GutterRail />
    </div>
  </section>

  <section>
    <div class="mx-auto flex w-full max-w-4xl bg-neutral-950">
      <GutterRail />
      <article class="min-w-0 flex-1 bg-white/1 px-6 py-10" class:sm="px-12 py-12">
        <DocsMarkdown :tokens="readmeTokens" />
      </article>
      <GutterRail />
    </div>
  </section>
</template>

<script setup lang="ts">
import { readmeHeadings, readmeTokens } from '~/utils/readme'

useMarkdownAlternate('/docs.md')

useSeoMeta({
  title: 'Docs — UseClassy',
  description: 'Install and use UseClassy with Tailwind CSS or UnoCSS.',
  ogTitle: 'Docs — UseClassy',
  ogDescription: 'Install and use UseClassy with Tailwind CSS or UnoCSS.',
  ogImage: 'https://assets.useclassy.com/og-image.png',
  ogUrl: 'https://useclassy.com/docs',
  twitterTitle: 'Docs — UseClassy',
  twitterDescription: 'Install and use UseClassy with Tailwind CSS or UnoCSS.',
  twitterImage: 'https://assets.useclassy.com/og-image-twitter.png',
  twitterCard: 'summary_large_image',
})
</script>
