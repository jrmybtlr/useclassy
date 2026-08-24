<template>
  <template v-for="(token, i) in tokens" :key="i">
    <DocsInline v-if="token.type === 'text' && token.tokens?.length" :tokens="token.tokens" />
    <template v-else-if="token.type === 'text' || token.type === 'escape'">{{
      token.text
    }}</template>
    <br v-else-if="token.type === 'br'" />
    <strong v-else-if="token.type === 'strong'" class="font-medium text-neutral-200">
      <DocsInline :tokens="token.tokens" />
    </strong>
    <em v-else-if="token.type === 'em'">
      <DocsInline :tokens="token.tokens" />
    </em>
    <code v-else-if="token.type === 'codespan'" class="docs-inline-code">{{ token.text }}</code>
    <NuxtLink
      v-else-if="token.type === 'link' && rewriteHref(token.href).startsWith('#')"
      :to="{ hash: rewriteHref(token.href) }"
      class="text-white underline decoration-white/25 underline-offset-4"
      class:hover="decoration-white"
      class:focus-visible="outline-2 outline-offset-2 outline-accent"
    >
      <DocsInline :tokens="token.tokens" />
    </NuxtLink>
    <NuxtLink
      v-else-if="token.type === 'link' && isInternalHref(rewriteHref(token.href))"
      :to="rewriteHref(token.href)"
      class="text-white underline decoration-white/25 underline-offset-4"
      class:hover="decoration-white"
      class:focus-visible="outline-2 outline-offset-2 outline-accent"
    >
      <DocsInline :tokens="token.tokens" />
    </NuxtLink>
    <a
      v-else-if="token.type === 'link'"
      :href="rewriteHref(token.href)"
      class="text-white underline decoration-white/25 underline-offset-4"
      class:hover="decoration-white"
      class:focus-visible="outline-2 outline-offset-2 outline-accent"
      :target="rewriteHref(token.href).startsWith('http') ? '_blank' : undefined"
      :rel="rewriteHref(token.href).startsWith('http') ? 'noreferrer' : undefined"
    >
      <DocsInline :tokens="token.tokens" />
    </a>
  </template>
</template>

<script setup lang="ts">
import type { Token } from 'marked'
import { isInternalHref, rewriteHref } from '~/utils/readme'

defineProps<{
  tokens: Token[]
}>()
</script>
