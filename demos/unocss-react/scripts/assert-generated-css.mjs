import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

if (!fs.existsSync(dist)) {
  console.error('unocss-react-demo: dist/ is missing. Run vite build first.')
  process.exit(1)
}

function walk(dir) {
  const files = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory())
      files.push(...walk(full))
    else if (/\.(css|js)$/.test(ent.name))
      files.push(full)
  }
  return files
}

const haystack = walk(dist).map(file => fs.readFileSync(file, 'utf8')).join('\n')

// Source only has `className:hover="text-sky-400"` — never a raw `hover:text-sky-400`.
const found = haystack.includes('hover\\:text-sky-400')
  || haystack.includes('hover:text-sky-400')

if (!found) {
  console.error(
    'unocss-react-demo: UseClassy variant hover:text-sky-400 was not in dist CSS/JS.',
  )
  process.exit(1)
}

console.log('unocss-react-demo: found UseClassy hover:text-sky-400 in UnoCSS output.')
