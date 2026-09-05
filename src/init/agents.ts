import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import type { FilePatchResult, InitSetupResult } from './types'

const SKILL_NAME = 'useclassy'
const SKILL_FILES = ['SKILL.md', 'examples.md'] as const

/** Canonical skill location — Cursor, Codex, and Copilot all read this. */
const AGENTS_SKILL_DIR = path.join('.agents', 'skills', SKILL_NAME)

/**
 * Claude Code only reads `.claude/skills` and does not see `.agents/skills`.
 * Opt-in via `--with-claude` so Cursor does not also load a duplicate copy
 * (Cursor discovers both `.agents/skills` and `.claude/skills`).
 */
const CLAUDE_SKILL_DIR = path.join('.claude', 'skills', SKILL_NAME)

/** Cursor-specific glob-scoped rules; other tools use AGENTS.md. */
const CURSOR_RULE_FILES = [
  {
    from: 'useclassy-project.cursor-rule.mdc',
    to: path.join('.cursor', 'rules', 'useclassy-project.mdc'),
  },
  {
    from: 'useclassy-setup.cursor-rule.mdc',
    to: path.join('.cursor', 'rules', 'useclassy-setup.mdc'),
  },
  {
    from: 'useclassy-authoring.cursor-rule.mdc',
    to: path.join('.cursor', 'rules', 'useclassy-authoring.mdc'),
  },
] as const

export type InstallAgentOptions = {
  templatesRoot?: string | null
  /** Overwrite skill/rule files that differ from the packaged templates. */
  force?: boolean
  /** Also copy the skill into `.claude/skills` for Claude Code. */
  withClaude?: boolean
}

function agentTemplateFiles(withClaude: boolean): { from: string, to: string }[] {
  const destinations = withClaude
    ? [AGENTS_SKILL_DIR, CLAUDE_SKILL_DIR]
    : [AGENTS_SKILL_DIR]

  const files: { from: string, to: string }[] = []

  for (const dest of destinations) {
    for (const name of SKILL_FILES) {
      files.push({
        from: path.join('useclassy-skill', name),
        to: path.join(dest, name),
      })
    }
  }

  return [...files, ...CURSOR_RULE_FILES]
}

const AGENTS_MD_START = '<!-- useclassy:start -->'
const AGENTS_MD_END = '<!-- useclassy:end -->'

const AGENTS_MD_SECTION = `${AGENTS_MD_START}
## UseClassy

This project uses \`vite-plugin-useclassy\`. Write Tailwind variants as modifier
attributes instead of inline variant prefixes:

- Vue, Svelte, Blade, HTML: \`class="rounded px-4" class:hover="bg-blue-500"\`
- React: \`className="rounded px-4" className:hover="bg-blue-500"\` (JSX expressions with string literals are also supported, e.g. \`className:hover={on ? 'a' : 'b'}\`)

Leave Vue \`:class\`, native Svelte \`class:name={cond}\` directives, and unrelated
dynamic base expressions unchanged.

Full authoring and refactoring guide: \`.agents/skills/${SKILL_NAME}/SKILL.md\`
${AGENTS_MD_END}`

/**
 * Resolve the packaged `templates/` directory (sibling of `dist/` or `src/`).
 */
export function resolveTemplatesRoot(
  fromUrl: string = import.meta.url,
): string | null {
  const here = path.dirname(fileURLToPath(fromUrl))
  const candidates = [
    path.join(here, '..', '..', 'templates'),
    path.join(here, '..', 'templates'),
    path.join(here, 'templates'),
    path.join(here, '..', '..', '..', 'templates'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'useclassy-skill', 'SKILL.md')))
      return candidate
  }

  return null
}

/**
 * Upserts the UseClassy section in AGENTS.md for agents that only read
 * project instruction files. Replaces the fenced block when present so
 * template updates propagate; leaves content outside the markers alone.
 */
export function patchAgentsMdContent(content: string): string {
  const start = content.indexOf(AGENTS_MD_START)
  if (start !== -1) {
    const end = content.indexOf(AGENTS_MD_END, start)
    if (end === -1)
      return content

    const endInclusive = end + AGENTS_MD_END.length
    const existing = content.slice(start, endInclusive)
    if (existing === AGENTS_MD_SECTION)
      return content

    const before = content.slice(0, start).trimEnd()
    const after = content.slice(endInclusive).replace(/^\n*/, '')

    if (before.length === 0) {
      return after.length > 0
        ? `# AGENTS.md\n\n${AGENTS_MD_SECTION}\n${after}`
        : `# AGENTS.md\n\n${AGENTS_MD_SECTION}\n`
    }

    return after.length > 0
      ? `${before}\n\n${AGENTS_MD_SECTION}\n${after}`
      : `${before}\n\n${AGENTS_MD_SECTION}\n`
  }

  const trimmed = content.trimEnd()
  if (trimmed.length === 0)
    return `# AGENTS.md\n\n${AGENTS_MD_SECTION}\n`

  return `${trimmed}\n\n${AGENTS_MD_SECTION}\n`
}

export function patchAgentsMd(cwd: string, dryRun: boolean): FilePatchResult {
  const file = path.join(cwd, 'AGENTS.md')
  const original = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf-8')
    : ''

  const next = patchAgentsMdContent(original)
  if (next === original)
    return { path: file, changed: false }

  if (!dryRun)
    fs.writeFileSync(file, next, 'utf-8')

  return { path: file, changed: true }
}

function writeTemplateFile(
  source: string,
  dest: string,
  dryRun: boolean,
  force: boolean,
): FilePatchResult {
  if (!fs.existsSync(source)) {
    return {
      path: dest,
      changed: false,
      error: `Missing template: ${path.basename(source)}`,
    }
  }

  const content = fs.readFileSync(source, 'utf-8')
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf-8')
    if (existing === content)
      return { path: dest, changed: false }

    if (!force) {
      return {
        path: dest,
        changed: false,
        skipped: true,
      }
    }
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, content, 'utf-8')
  }

  return { path: dest, changed: true }
}

export function installAgentResources(
  cwd: string,
  dryRun: boolean,
  options: InstallAgentOptions = {},
): FilePatchResult[] {
  const {
    templatesRoot,
    force = false,
    withClaude = false,
  } = options

  const resolvedRoot = templatesRoot === undefined
    ? resolveTemplatesRoot()
    : templatesRoot
  const root
    = resolvedRoot
      && fs.existsSync(path.join(resolvedRoot, 'useclassy-skill', 'SKILL.md'))
      ? resolvedRoot
      : null

  const results: FilePatchResult[] = []

  if (!root) {
    results.push({
      path: '',
      changed: false,
      error:
        'Could not find package templates/. Reinstall vite-plugin-useclassy or copy templates manually from the README.',
    })
  }
  else {
    for (const file of agentTemplateFiles(withClaude)) {
      results.push(
        writeTemplateFile(
          path.join(root, file.from),
          path.join(cwd, file.to),
          dryRun,
          force,
        ),
      )
    }
  }

  // AGENTS.md section is inline and does not depend on packaged templates.
  results.push(patchAgentsMd(cwd, dryRun))

  return results
}

export function pushAgentMessages(
  result: InitSetupResult,
  patches: FilePatchResult[],
  dryRun: boolean,
): void {
  const writeLabel = dryRun ? '[dry-run] Would write' : 'Wrote'
  const written: string[] = []

  for (const patch of patches) {
    if (patch.error) {
      result.messages.push(`Agent skills: ${patch.error}`)
      continue
    }

    if (patch.skipped) {
      result.messages.push(
        `Agent skills: skipped ${patch.path} (local edits; pass --force to overwrite)`,
      )
      continue
    }

    if (patch.changed) {
      written.push(patch.path)
      result.messages.push(`${writeLabel} ${patch.path}`)
      continue
    }

    if (patch.path)
      result.messages.push(`Agent skills: no changes (${patch.path})`)
  }

  if (written.length > 0)
    result.agentFiles = written
}
