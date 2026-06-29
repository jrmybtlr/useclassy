#!/usr/bin/env node
import { runInitSetup } from './init-setup'
import type { InitLanguage } from './init-setup'

const INIT_LANGUAGES = ['vue', 'react', 'blade'] as const

function isInitLanguage(value: string): value is InitLanguage {
  return (INIT_LANGUAGES as readonly string[]).includes(value)
}

function printHelp(): void {
  console.log(`vite-plugin-useclassy — setup helper

Usage:
  npx vite-plugin-useclassy init [options]

Options:
  --language <vue|react|blade>   Framework language for useClassy (default: vue)
  --dry-run                        Print actions without writing files
  -h, --help                       Show this message
`)
}

function parseArgs(argv: string[]): {
  cmd: string | null
  language: InitLanguage
  dryRun: boolean
} {
  const rest = argv.slice(2)
  let language: InitLanguage = 'vue'
  let dryRun = false
  let cmd: string | null = null

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]

    if (arg === 'init') {
      cmd = 'init'
      continue
    }
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--language' || arg === '-l') {
      const value = rest[i + 1]
      if (value && isInitLanguage(value)) {
        language = value
        i++
      }
      continue
    }
    if (arg === '-h' || arg === '--help') {
      printHelp()
      process.exit(0)
    }
  }

  return { cmd, language, dryRun }
}

function exitWithHelp(code: number): never {
  printHelp()
  process.exit(code)
}

function main(): void {
  const { cmd, language, dryRun } = parseArgs(process.argv)

  if (cmd !== 'init') {
    if (cmd !== null)
      console.error(`Unknown command: ${cmd}`)
    exitWithHelp(1)
  }

  const result = runInitSetup({ cwd: process.cwd(), language, dryRun })

  for (const line of result.messages)
    console.log(line)

  if (dryRun)
    console.log('\nDry run: no files were modified.')
}

main()
