import { docsMarkdown, sendMarkdown } from '../utils/site-markdown'

export default defineEventHandler((event) => sendMarkdown(event, docsMarkdown))
