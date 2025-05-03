import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import useClassy from '../index'
import type { Plugin } from 'vite'
import fs from 'fs'

// Mock process.cwd
vi.stubGlobal('process', {
  ...process,
  cwd: () => '/mock/cwd',
})

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(''),
    appendFileSync: vi.fn(),
  },
}))

// Mock path module
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn(p => p.split('/').slice(0, -1).join('/')),
    normalize: vi.fn(p => p),
    relative: vi.fn(() => 'not-in-ignored-dir'),
  },
}))

describe('useClassy plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic transformations', () => {
    it('should transform Vue class modifiers into Tailwind classes', async () => {
      // Mock the transform function directly
      const plugin = useClassy() as Plugin
      const transform = plugin.transform as (code: string, id: string) => Promise<{ code: string }>

      const input = `
        <div
          class="base-class"
          class:hover="text-blue-500"
          class:focus="font-bold"
          class:sm:hover="text-lg"
        >Content</div>
      `.trim()

      // Create mock context for transform
      const mockContext = {
        addWatchFile: vi.fn(),
      }

      // Call transform directly with this context
      const result = await transform.call(mockContext, input, 'test.vue')

      // Check that transformation was applied correctly
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')

      // Extract the transformed code
      const transformedCode = (result as { code: string }).code

      // Verify the virtual comment contains expected classes
      expect(transformedCode).toContain('hover:text-blue-500')
      expect(transformedCode).toContain('focus:font-bold')
      expect(transformedCode).toContain('sm:hover:text-lg')

      // Extract the transformed HTML (skip virtual comment line)
      const transformedHtml = transformedCode.split('\n').slice(1).join('\n')

      // Check that the transformed HTML has the correct classes
      expect(transformedHtml).toContain('class="base-class')
      expect(transformedHtml).toContain('hover:text-blue-500')
      expect(transformedHtml).toContain('focus:font-bold')
      expect(transformedHtml).toContain('sm:hover:text-lg')

      // Check that original class:modifier attributes are removed
      expect(transformedHtml).not.toContain('class:hover=')
      expect(transformedHtml).not.toContain('class:focus=')
      expect(transformedHtml).not.toContain('class:sm:hover=')
    })

    it('should transform React className modifiers into Tailwind classes', async () => {
      // Use React language option
      const plugin = useClassy({ language: 'react' }) as Plugin
      const transform = plugin.transform as (code: string, id: string) => Promise<{ code: string }>

      const input = `
        <div
          className="base-class"
          class:hover="text-blue-500"
          class:focus="font-bold"
          class:sm:hover="text-lg"
        >Content</div>
      `.trim()

      // Create mock context
      const mockContext = {
        addWatchFile: vi.fn(),
      }

      // Call transform directly
      const result = await transform.call(mockContext, input, 'test.jsx')

      // Extract the transformed code
      const transformedCode = (result as { code: string }).code

      // Verify the transformed code contains expected classes
      expect(transformedCode).toContain('hover:text-blue-500')
      expect(transformedCode).toContain('focus:font-bold')
      expect(transformedCode).toContain('sm:hover:text-lg')

      // Extract the transformed JSX (skip virtual comment line)
      const transformedJsx = transformedCode.split('\n').slice(1).join('\n')

      // Check that the transformed JSX has the correct classes
      expect(transformedJsx).toContain('className="base-class')
      expect(transformedJsx).toContain('hover:text-blue-500')
      expect(transformedJsx).toContain('focus:font-bold')
      expect(transformedJsx).toContain('sm:hover:text-lg')

      // Check that original className:modifier attributes are removed
      expect(transformedJsx).not.toContain('className:hover=')
      expect(transformedJsx).not.toContain('className:focus=')
      expect(transformedJsx).not.toContain('className:sm:hover=')
    })
  })

  describe('Output file generation', () => {
    it('should call writeFileSync to generate output file', async () => {
      // Clear any previous mocks
      vi.clearAllMocks()

      // Setup plugin
      const plugin = useClassy() as Plugin
      const transform = plugin.transform as (code: string, id: string) => Promise<{ code: string }>

      // Configure plugin for dev mode
      if (plugin.configResolved) {
        (plugin.configResolved as (config: { command: string }) => void)({
          command: 'serve',
        })
      }

      // Process some code with classes
      const mockContext = { addWatchFile: vi.fn() }
      await transform.call(
        mockContext,
        `<div class:hover="text-blue-500" class:focus="font-bold">Test</div>`,
        'test.vue',
      )

      // Trigger build end to generate output file
      if (plugin.buildEnd) {
        (plugin.buildEnd as () => void)()
      }

      // Check that fs.writeFileSync was called
      expect(fs.writeFileSync).toHaveBeenCalled()
    })
  })

  describe('File caching and watching', () => {
    it('should cache transformed files to avoid redundant processing', async () => {
      // Setup plugin
      const plugin = useClassy() as Plugin
      const transform = plugin.transform as (code: string, id: string) => Promise<{ code: string }>

      const input = `<div class:hover="text-blue-500">Test</div>`
      const mockContext = { addWatchFile: vi.fn() }

      // Transform the same input twice
      await transform.call(mockContext, input, 'test.vue')
      await transform.call(mockContext, input, 'test.vue')

      // Verify the file was added to watch list
      expect(mockContext.addWatchFile).toHaveBeenCalledWith('test.vue')
      expect(mockContext.addWatchFile).toHaveBeenCalledTimes(2)
    })
  })
})
