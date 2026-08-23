import { llmsTxt, sendMarkdown } from '../utils/site-markdown'

export default defineEventHandler((event) => sendMarkdown(event, llmsTxt))
