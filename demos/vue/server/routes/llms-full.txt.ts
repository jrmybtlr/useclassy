import { docsMarkdown, llmsFullTxt, sendMarkdown } from '../utils/site-markdown'

export default defineEventHandler((event) => sendMarkdown(event, llmsFullTxt(docsMarkdown)))
