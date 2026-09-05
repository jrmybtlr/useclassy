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
    if (ent.isDirectory()) files.push(...walk(full))
    else if (/\.(css|js)$/.test(ent.name)) files.push(full)
  }
  return files
}

const haystack = walk(dist)
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')

const checks = [
  {
    label: 'hover:text-sky-400 (quoted className:hover)',
    needles: ['hover\\:text-sky-400', 'hover:text-sky-400'],
  },
  {
    label: 'group-hover/item:bg-red-500 (named group)',
    needles: ['group-hover\\/item\\:bg-red-500', 'group-hover/item:bg-red-500'],
  },
  {
    label: 'data-[state=open]:ring-2 (arbitrary variant)',
    needles: ['data-\\[state\\=open\\]\\:ring-2', 'data-[state=open]:ring-2'],
  },
  {
    label: 'hover:underline (single-quoted className:hover)',
    needles: ['hover\\:underline', 'hover:underline'],
  },
]

let failed = false
for (const check of checks) {
  const found = check.needles.some((needle) => haystack.includes(needle))
  if (!found) {
    console.error(`unocss-react-demo: missing ${check.label} in dist CSS/JS.`)
    failed = true
  }
}

if (failed) process.exit(1)

console.log(
  'unocss-react-demo: found UseClassy named-group, arbitrary, and quoted variants in UnoCSS output.',
)
