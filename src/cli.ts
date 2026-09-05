#!/usr/bin/env node
import {
  runInitSetup,
  INIT_LANGUAGES,
  INIT_ENGINES,
} from './init-setup'
import type { InitEngine, InitLanguage } from './init-setup'

function isInitLanguage(value: string): value is InitLanguage {
  return (INIT_LANGUAGES as readonly string[]).includes(value)
}

function isInitEngine(value: string): value is InitEngine {
  return (INIT_ENGINES as readonly string[]).includes(value)
}

function printHelp(): void {
  console.log(`vite-plugin-useclassy — setup helper

Usage:
  npx vite-plugin-useclassy init [options]

Options:
  --language <vue|react|blade|svelte>   Framework language for useClassy (default: vue)
  --engine <tailwind|unocss>           CSS engine to configure (default: auto-detect;
                                       prefers Tailwind when both are present)
  --with-skills                    Install agent skill, Cursor rules, and AGENTS.md
                                   (default: on)
  --no-skills                      Skip agent skill / Cursor rules / AGENTS.md install
  --with-claude                    Also copy the skill to .claude/skills for Claude Code
  --force                          Overwrite skill/rule files that differ from templates
  --dry-run                        Print actions without writing files
  -h, --help                       Show this message

Notes:
  --with-cursor is an alias for --with-skills.
  Agent resources install by default so coding agents pick up UseClassy syntax.
  Pass --no-skills to opt out. --with-claude still works with the default install.
`)
}

function parseArgs(argv: string[]): {
  cmd: string | null
  language: InitLanguage
  engine: InitEngine | undefined
  dryRun: boolean
  withSkills: boolean
  withClaude: boolean
  force: boolean
} {
  const rest = argv.slice(2)
  let language: InitLanguage = 'vue'
  let engine: InitEngine | undefined
  let dryRun = false
  let withSkills = true
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
    if (arg === '--no-skills') {
      withSkills = false
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
      if (!value || !isInitLanguage(value)) {
        console.error(
          `Invalid --language. Expected one of: ${INIT_LANGUAGES.join(', ')}`,
        )
        process.exit(1)
      }
      language = value
      i++
      continue
    }
    if (arg === '--engine' || arg === '-e') {
      const value = rest[i + 1]
      if (!value || !isInitEngine(value)) {
        console.error(
          `Invalid --engine. Expected one of: ${INIT_ENGINES.join(', ')}`,
        )
        process.exit(1)
      }
      engine = value
      i++
      continue
    }
    if (arg === '-h' || arg === '--help') {
      printHelp()
      process.exit(0)
    }
  }

  return { cmd, language, engine, dryRun, withSkills, withClaude, force }
}

function exitWithHelp(code: number): never {
  printHelp()
  process.exit(code)
}

function main(): void {
  const {
    cmd,
    language,
    engine,
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
    console.error('--with-claude cannot be used with --no-skills')
    exitWithHelp(1)
  }

  const result = runInitSetup({
    cwd: process.cwd(),
    language,
    engine,
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
