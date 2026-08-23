import { indexMarkdown } from '../utils/site-markdown'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  return indexMarkdown
})
