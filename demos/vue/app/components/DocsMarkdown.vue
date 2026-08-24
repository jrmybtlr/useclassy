<template>
  <div class="docs-md min-w-0">
    <template v-for="(token, i) in blocks" :key="i">
      <component
        :is="headingTag(token.depth)"
        v-if="token.type === 'heading'"
        :id="slugify(token.text)"
        class="scroll-mt-20 font-display tracking-tight text-balance"
        :class="headingClass(token.depth, i)"
      >
        <DocsInline :tokens="token.tokens" />
      </component>

      <p
        v-else-if="token.type === 'paragraph'"
        class="text-pretty text-neutral-400"
        :class="paragraphClass(i)"
      >
        <DocsInline :tokens="token.tokens" />
      </p>

      <div v-else-if="token.type === 'code'" class="mt-5" class:sm="mt-6">
        <DocsCodeFence :code="token.text" :lang="token.lang" />
      </div>

      <div v-else-if="token.type === 'table'" class="mt-6 overflow-x-auto" class:sm="mt-8">
        <table class="w-full min-w-md border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-neutral-900">
              <th
                v-for="(cell, ci) in token.header"
                :key="ci"
                class="py-2.5 pr-4 font-display font-semibold whitespace-nowrap text-neutral-300"
              >
                <DocsInline :tokens="cell.tokens" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in token.rows" :key="ri" class="border-b border-neutral-900/80">
              <td
                v-for="(cell, ci) in row"
                :key="ci"
                class="py-2.5 pr-4 align-top text-neutral-400"
              >
                <DocsInline :tokens="cell.tokens" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul
        v-else-if="token.type === 'list' && !token.ordered"
        class="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-pretty text-neutral-400"
      >
        <li v-for="(item, ii) in token.items" :key="ii">
          <DocsMarkdown :tokens="item.tokens" nested />
        </li>
      </ul>

      <ol
        v-else-if="token.type === 'list' && token.ordered"
        class="mt-4 list-decimal space-y-2 pl-5 text-base leading-relaxed text-pretty text-neutral-400"
        :start="typeof token.start === 'number' ? token.start : 1"
      >
        <li v-for="(item, ii) in token.items" :key="ii">
          <DocsMarkdown :tokens="item.tokens" nested />
        </li>
      </ol>

      <template v-else-if="token.type === 'text'">
        <DocsInline v-if="token.tokens?.length" :tokens="token.tokens" />
        <template v-else>{{ token.text }}</template>
      </template>

      <hr v-else-if="token.type === 'hr'" class="mt-12 border-0 border-t border-neutral-900" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Token } from 'marked'
import { slugify } from '~/utils/readme'

const props = defineProps<{
  tokens: Token[]
  nested?: boolean
}>()

const blocks = computed(() => props.tokens.filter((token) => token.type !== 'space'))

function headingTag(depth: number): 'h1' | 'h2' | 'h3' | 'h4' {
  if (depth <= 1) return 'h1'
  if (depth === 2) return 'h2'
  if (depth === 3) return 'h3'
  return 'h4'
}

function headingClass(depth: number, index: number): string {
  if (depth <= 1) return 'text-3xl font-semibold tracking-[-0.03em] sm:text-4xl'
  if (depth === 2)
    return index === 0
      ? 'text-2xl font-bold sm:text-3xl'
      : 'mt-12 text-2xl font-bold sm:mt-16 sm:text-3xl'
  if (depth === 3) return 'mt-8 text-lg font-bold'
  return 'mt-6 text-base font-bold'
}

function paragraphClass(index: number): string {
  if (props.nested) return 'text-base leading-relaxed'
  if (index === 0) return 'text-xl/normal tracking-tight'
  return 'mt-4 text-base leading-relaxed'
}
</script>
