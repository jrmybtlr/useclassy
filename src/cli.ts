#!/usr/bin/env node
import { runInitSetup, INIT_LANGUAGES } from './init-setup'
import type { InitLanguage } from './init-setup'

function isInitLanguage(value: string): value is InitLanguage {
  return (INIT_LANGUAGES as readonly string[]).includes(value)
}

function printHelp(): void {
  console.log(`vite-plugin-useclassy — setup helper

Usage:
  npx vite-plugin-useclassy init [options]

Options:
  --language <vue|react|blade|svelte>   Framework language for useClassy (default: vue)
  --with-skills                    Install the UseClassy agent skill (.agents/skills),
                                   Cursor rules, and an AGENTS.md section
  --with-claude                    With --with-skills: also copy the skill to
                                   .claude/skills for Claude Code
  --force                          Overwrite skill/rule files that differ from templates
  --dry-run                        Print actions without writing files
  -h, --help                       Show this message

Notes:
  --with-cursor is an alias for --with-skills.
`)
}

function parseArgs(argv: string[]): {
  cmd: string | null
  language: InitLanguage
  dryRun: boolean
  withSkills: boolean
  withClaude: boolean
  force: boolean
} {
  const rest = argv.slice(2)
  let language: InitLanguage = 'vue'
  let dryRun = false
  let withSkills = false
  let withClaude = false
  let force = false
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
    if (arg === '--with-skills' || arg === '--with-cursor') {
      withSkills = true
      continue
    }
    if (arg === '--with-claude') {
      withClaude = true
      continue
    }
    if (arg === '--force') {
      force = true
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

  return { cmd, language, dryRun, withSkills, withClaude, force }
}

function exitWithHelp(code: number): never {
  printHelp()
  process.exit(code)
}

function main(): void {
  const {
    cmd,
    language,
    dryRun,
    withSkills,
    withClaude,
    force,
  } = parseArgs(process.argv)

  if (cmd !== 'init') {
    if (cmd !== null)
      console.error(`Unknown command: ${cmd}`)
    exitWithHelp(1)
  }

  if (withClaude && !withSkills) {
    console.error('--with-claude requires --with-skills')
    exitWithHelp(1)
  }

  const result = runInitSetup({
    cwd: process.cwd(),
    language,
    dryRun,
    withSkills,
    withClaude,
    force,
  })

  for (const line of result.messages)
    console.log(line)

  if (dryRun)
    console.log('\nDry run: no files were modified.')
}

main()
