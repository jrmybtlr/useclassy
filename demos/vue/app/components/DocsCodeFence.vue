<template>
  <CodeBlock :copy-text="code" :filename="lang" wrap>
    <code class="docs-shiki" v-html="html" />
  </CodeBlock>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { highlightCode, SHIKI_THEME, toLineHtml } from '~/utils/shiki'

const props = defineProps<{
  code: string
  lang?: string
}>()

const { data: highlighted } = useAsyncData(fenceKey(props.lang, props.code), () =>
  highlightCode(props.code, props.lang),
)

const html = computed(() => highlighted.value ?? toLineHtml(props.code))

function fenceKey(lang: string | undefined, code: string): string {
  let hash = 0
  const source = `${lang ?? ''}:${code}`
  for (let i = 0; i < source.length; i++) hash = (Math.imul(31, hash) + source.charCodeAt(i)) | 0
  return `shiki:${SHIKI_THEME}:${hash}`
}
</script>
