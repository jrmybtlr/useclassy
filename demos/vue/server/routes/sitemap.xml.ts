const SITE = 'https://useclassy.com'

const routes = [
  '/',
  '/docs',
  '/index.md',
  '/docs.md',
  '/llms.txt',
  '/llms-full.txt',
  '/skill.md',
  '/skill/examples.md',
  '/.well-known/llms.txt',
]

function entry(path: string, priority: string): string {
  return `  <url>
    <loc>${SITE}${path === '/' ? '/' : path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')

  const urls = routes.map((path) => {
    if (path === '/' || path === '/docs')
      return entry(path, '1.0')
    if (path === '/index.md' || path === '/llms.txt' || path === '/docs.md' || path === '/skill.md')
      return entry(path, '0.9')
    return entry(path, '0.7')
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
})
