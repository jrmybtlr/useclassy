import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(repoRoot, 'demos/vue/.output')
const sourceConfig = join(outputDir, 'server/wrangler.json')
const rootConfig = join(repoRoot, 'wrangler.json')

if (!existsSync(sourceConfig)) {
  console.error(`Missing ${relative(repoRoot, sourceConfig)}. Run the Nuxt build first.`)
  process.exit(1)
}

const config = JSON.parse(readFileSync(sourceConfig, 'utf8'))
const configDir = dirname(sourceConfig)

function resolveFromConfig(value) {
  if (typeof value !== 'string') return value
  return relative(repoRoot, resolve(configDir, value)).replaceAll('\\', '/')
}

if (typeof config.main === 'string') {
  config.main = resolveFromConfig(config.main)
}

if (config.assets?.directory) {
  config.assets.directory = resolveFromConfig(config.assets.directory)
}

writeFileSync(rootConfig, `${JSON.stringify(config, null, 2)}\n`)
console.log(`Wrote ${relative(repoRoot, rootConfig)} for Cloudflare deploy from repo root.`)
