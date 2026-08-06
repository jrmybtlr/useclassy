import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  detectTailwindFlavor,
  installAgentResources,
  mergeTailwindClassAttributes,
  patchAgentsMdContent,
  patchTailwindV3ConfigContent,
  patchTailwindV4Stylesheet,
  patchViteConfigContent,
  resolveTemplatesRoot,
  runInitSetup,
} from '../init-setup'

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'useclassy-init-'))
}

afterEach(() => {
  // no global cleanup; each test uses its own temp dir
})

describe('patchViteConfigContent', () => {
  it('inserts import and useClassy plugin', () => {
    const src = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
  ],
})
`
    const out = patchViteConfigContent(src, 'vue')
    expect(out).toContain('import useClassy from \'vite-plugin-useclassy\'')
    expect(out).toContain('language: \'vue\'')
    expect(out).toMatch(/plugins:\s*\[\s*\n\s*useClassy/)
  })

  it('does not duplicate useClassy', () => {
    const src = `import useClassy from 'vite-plugin-useclassy'
export default { plugins: [useClassy({ language: 'vue' })] }
`
    expect(patchViteConfigContent(src, 'vue')).toBe(src)
  })
})

describe('patchTailwindV3ConfigContent', () => {
  it('adds content entry', () => {
    const src = `export default { content: [] }
`
    const out = patchTailwindV3ConfigContent(src)
    expect(out).toContain('./.classy/output.classy.html')
  })

  it('is a no-op when manifest already referenced', () => {
    const src = `export default { content: ["./.classy/output.classy.html"] }
`
    expect(patchTailwindV3ConfigContent(src)).toBe(src)
  })
})

describe('patchTailwindV4Stylesheet', () => {
  it('inserts @source after tailwind import', () => {
    const dir = tempDir()
    const cssPath = path.join(dir, 'src', 'main.css')
    fs.mkdirSync(path.dirname(cssPath), { recursive: true })
    fs.writeFileSync(
      cssPath,
      '@import "tailwindcss";\n',
      'utf-8',
    )
    const r = patchTailwindV4Stylesheet(cssPath, dir, false)
    expect(r.changed).toBe(true)
    const text = fs.readFileSync(cssPath, 'utf-8')
    expect(text).toContain('@source "')
    expect(text).toContain('.classy/output.classy.html')
  })
})

describe('detectTailwindFlavor', () => {
  it('detects v4 when @tailwindcss/vite is present', () => {
    const dir = tempDir()
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        devDependencies: { '@tailwindcss/vite': '^4.0.0' },
      }),
      'utf-8',
    )
    expect(detectTailwindFlavor(dir)).toBe('v4')
  })

  it('detects v3 when tailwind.config exists', () => {
    const dir = tempDir()
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { tailwindcss: '^3.4.0' } }),
      'utf-8',
    )
    fs.writeFileSync(path.join(dir, 'tailwind.config.js'), 'export default {}')
    expect(detectTailwindFlavor(dir)).toBe('v3')
  })
})

describe('mergeTailwindClassAttributes', () => {
  it('merges vue patterns', () => {
    const out = mergeTailwindClassAttributes(['class'], 'vue')
    expect(out).toContain('class')
    expect(out).toContain('class:[\\w:-]*')
  })

  it('adds className for react', () => {
    const out = mergeTailwindClassAttributes([], 'react')
    expect(out).toContain('className')
    expect(out).toContain('className:[\\w:-]*')
  })

  it('uses vue-style patterns for svelte', () => {
    const out = mergeTailwindClassAttributes(['class'], 'svelte')
    expect(out).toContain('class')
    expect(out).toContain('class:[\\w:-]*')
    expect(out).not.toContain('className')
  })
})

describe('patchAgentsMdContent', () => {
  it('creates a section when AGENTS.md is missing or empty', () => {
    const out = patchAgentsMdContent('')
    expect(out).toContain('# AGENTS.md')
    expect(out).toContain('<!-- useclassy:start -->')
    expect(out).toContain('.agents/skills/useclassy/SKILL.md')
  })

  it('appends without clobbering existing content', () => {
    const out = patchAgentsMdContent('# AGENTS.md\n\n## Build\n\nRun pnpm dev.\n')
    expect(out).toContain('## Build')
    expect(out).toContain('Run pnpm dev.')
    expect(out).toContain('## UseClassy')
  })

  it('is idempotent when the fenced section matches', () => {
    const once = patchAgentsMdContent('# AGENTS.md\n')
    expect(patchAgentsMdContent(once)).toBe(once)
  })

  it('refreshes a stale fenced section without touching other content', () => {
    const stale = `# AGENTS.md

## Build

Run pnpm dev.

<!-- useclassy:start -->
## UseClassy

old guidance
<!-- useclassy:end -->

## Deploy

Ship it.
`
    const out = patchAgentsMdContent(stale)
    expect(out).toContain('## Build')
    expect(out).toContain('Run pnpm dev.')
    expect(out).toContain('## Deploy')
    expect(out).toContain('Ship it.')
    expect(out).toContain('Full authoring and refactoring guide')
    expect(out).not.toContain('old guidance')
    expect(patchAgentsMdContent(out)).toBe(out)
  })
})

describe('installAgentResources', () => {
  it('resolves packaged templates from source layout', () => {
    const root = resolveTemplatesRoot()
    expect(root).not.toBeNull()
    expect(fs.existsSync(path.join(root!, 'useclassy-skill', 'SKILL.md'))).toBe(
      true,
    )
  })

  it('installs the skill into .agents/skills (dry-run writes nothing)', () => {
    const dir = tempDir()
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'app' }),
      'utf-8',
    )

    // 1 skill dir x 2 files + 2 cursor rules + AGENTS.md
    const dry = installAgentResources(dir, true)
    expect(dry.every(r => !r.error)).toBe(true)
    expect(dry.filter(r => r.changed)).toHaveLength(5)
    expect(
      fs.existsSync(path.join(dir, '.agents', 'skills', 'useclassy', 'SKILL.md')),
    ).toBe(false)

    const written = installAgentResources(dir, false)
    expect(written.filter(r => r.changed)).toHaveLength(5)

    const agentsSkill = path.join(dir, '.agents', 'skills', 'useclassy', 'SKILL.md')
    const skill = fs.readFileSync(agentsSkill, 'utf-8')
    expect(skill).toContain('name: useclassy')
    expect(skill).toContain('## Refactor existing code')
    expect(skill).not.toContain('## Setup')

    // Default install avoids .claude so Cursor does not load a duplicate skill.
    expect(fs.existsSync(path.join(dir, '.claude'))).toBe(false)
    expect(
      fs.existsSync(path.join(dir, '.agents', 'skills', 'useclassy', 'examples.md')),
    ).toBe(true)

    expect(
      fs.existsSync(path.join(dir, '.cursor', 'rules', 'useclassy-setup.mdc')),
    ).toBe(true)
    expect(
      fs.existsSync(
        path.join(dir, '.cursor', 'rules', 'useclassy-authoring.mdc'),
      ),
    ).toBe(true)

    expect(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf-8')).toContain(
      '## UseClassy',
    )

    const again = installAgentResources(dir, false)
    expect(again.every(r => !r.changed && !r.error && !r.skipped)).toBe(true)
  })

  it('copies into .claude/skills only when withClaude is set', () => {
    const dir = tempDir()
    const written = installAgentResources(dir, false, { withClaude: true })
    expect(written.filter(r => r.changed)).toHaveLength(7)

    const agentsSkill = fs.readFileSync(
      path.join(dir, '.agents', 'skills', 'useclassy', 'SKILL.md'),
      'utf-8',
    )
    const claudeSkill = fs.readFileSync(
      path.join(dir, '.claude', 'skills', 'useclassy', 'SKILL.md'),
      'utf-8',
    )
    expect(claudeSkill).toBe(agentsSkill)
  })

  it('skips differing local skill files unless force is set', () => {
    const dir = tempDir()
    installAgentResources(dir, false)

    const skillPath = path.join(dir, '.agents', 'skills', 'useclassy', 'SKILL.md')
    fs.writeFileSync(skillPath, '# customized locally\n', 'utf-8')

    const skipped = installAgentResources(dir, false)
    const skillResult = skipped.find(r => r.path === skillPath)
    expect(skillResult?.skipped).toBe(true)
    expect(skillResult?.changed).toBe(false)
    expect(fs.readFileSync(skillPath, 'utf-8')).toBe('# customized locally\n')

    const forced = installAgentResources(dir, false, { force: true })
    expect(forced.find(r => r.path === skillPath)?.changed).toBe(true)
    expect(fs.readFileSync(skillPath, 'utf-8')).toContain('name: useclassy')
  })

  it('still writes AGENTS.md when templates are missing', () => {
    const dir = tempDir()
    const results = installAgentResources(dir, false, {
      templatesRoot: path.join(dir, 'missing-templates'),
    })

    expect(results.some(r => r.error?.includes('Could not find package templates'))).toBe(
      true,
    )
    expect(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf-8')).toContain(
      '## UseClassy',
    )
  })

  it('runInitSetup --with-skills installs agent files', () => {
    const dir = tempDir()
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'app',
        devDependencies: { '@tailwindcss/vite': '^4.0.0' },
      }),
      'utf-8',
    )
    fs.writeFileSync(
      path.join(dir, 'vite.config.ts'),
      `import { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [] })\n`,
      'utf-8',
    )
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'src', 'main.css'),
      '@import "tailwindcss";\n',
      'utf-8',
    )

    const result = runInitSetup({
      cwd: dir,
      language: 'vue',
      dryRun: true,
      withSkills: true,
    })

    expect(result.messages.some(m => m.includes('[dry-run] Would write')
      && m.includes(path.join('.agents', 'skills')))).toBe(true)
    expect(result.messages.some(m => m.includes(path.join('.claude', 'skills')))).toBe(
      false,
    )
    expect(result.messages.some(m => m.includes('AGENTS.md'))).toBe(true)
  })

  it('leaves agent files alone without the flag', () => {
    const dir = tempDir()
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'app' }),
      'utf-8',
    )

    const result = runInitSetup({ cwd: dir, language: 'vue', dryRun: false })

    expect(result.agentFiles).toBeUndefined()
    expect(fs.existsSync(path.join(dir, '.agents'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(false)
  })
})
