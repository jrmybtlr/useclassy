export function useMarkdownAlternate(href: string) {
  useHead({
    link: [
      { rel: 'alternate', type: 'text/markdown', href, title: 'Markdown' },
      { rel: 'describedby', href: '/llms.txt', title: 'llms.txt' },
    ],
  })
}
