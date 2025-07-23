import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  debounce,
  hashFunction,
  loadIgnoredDirectories,
  writeGitignore,
  isInIgnoredDirectory,
  writeOutputFileDirect,
  shouldProcessFile,
} from '../utils'

// Mock fs and path modules
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    renameSync: vi.fn(),
  },
}))

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    normalize: vi.fn(p => p),
    relative: vi.fn((base, filePath) => filePath.replace(base + '/', '')),
  },
}))

// Mock process.cwd()
vi.stubGlobal('process', {
  ...process,
  cwd: vi.fn().mockReturnValue('/mock/cwd'),
})

// Mock console methods
vi.stubGlobal('console', {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
})

describe('utils module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      vi.useFakeTimers()
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)

      // Call multiple times in quick succession
      debouncedFn()
      debouncedFn()
      debouncedFn()

      // Function should not have been called yet
      expect(mockFn).not.toHaveBeenCalled()

      // Advance timer
      vi.advanceTimersByTime(110)

      // Function should have been called once
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should reset timer on subsequent calls', async () => {
      vi.useFakeTimers()
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)

      // Call once
      debouncedFn()

      // Wait 50ms
      vi.advanceTimersByTime(50)

      // Call again, which should reset the timer
      debouncedFn()

      // Wait another 60ms (totaling 110ms from start)
      vi.advanceTimersByTime(60)

      // Function should not have been called yet (because of reset)
      expect(mockFn).not.toHaveBeenCalled()

      // Advance to reach delay after second call
      vi.advanceTimersByTime(50)

      // Now it should have been called
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('hashFunction', () => {
    it('should generate consistent hashes for same input', () => {
      const input = 'test string'
      const hash1 = hashFunction(input)
      const hash2 = hashFunction(input)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different inputs', () => {
      const hash1 = hashFunction('test string 1')
      const hash2 = hashFunction('test string 2')

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty string', () => {
      const hash = hashFunction('')
      expect(typeof hash).toBe('number')
    })

    it('should handle special characters', () => {
      const hash1 = hashFunction('test')
      const hash2 = hashFunction('test!@#$%')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('loadIgnoredDirectories', () => {
    it('should read from .gitignore file when it exists', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(
        'node_modules\ndist\n.cache\n# comment\n*.log\n!important',
      )

      const result = loadIgnoredDirectories()

      expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/.gitignore')
      expect(fs.readFileSync).toHaveBeenCalledWith(
        '/mock/cwd/.gitignore',
        'utf-8',
      )
      expect(result).toEqual(['node_modules', 'dist', '.cache'])
    })

    it('should return default directories when .gitignore doesn\'t exist', () => {
      (fs.existsSync as Mock).mockReturnValue(false)

      const result = loadIgnoredDirectories()

      expect(result).toEqual(['node_modules', 'dist'])
    })

    it('should handle fs errors gracefully', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation(() => {
        throw new Error('Test error')
      })

      const result = loadIgnoredDirectories()

      expect(console.warn).toHaveBeenCalled()
      expect(result).toEqual(['node_modules', 'dist'])
    })

    it('should filter out comments and patterns', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(
        '# This is a comment\nnode_modules\n# Another comment\ndist\n*.log\n!important\n.cache',
      )

      const result = loadIgnoredDirectories()

      expect(result).toEqual(['node_modules', 'dist', '.cache'])
    })

    it('should handle empty .gitignore file', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue('')

      const result = loadIgnoredDirectories()

      expect(result).toEqual([])
    })

    it('should handle .gitignore with only comments', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue('# Only comments\n# No actual entries')

      const result = loadIgnoredDirectories()

      expect(result).toEqual([])
    })
  })

  describe('writeGitignore', () => {
    it('should append to existing .gitignore', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue('node_modules\ndist\n')

      writeGitignore('.classy')

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        '/mock/cwd/.gitignore',
        expect.stringContaining('.classy/'),
      )
    })

    it('should create .gitignore if it doesn\'t exist', () => {
      (fs.existsSync as Mock).mockReturnValue(false)

      writeGitignore('.classy')

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/cwd/.gitignore',
        expect.stringContaining('.classy/'),
      )
    })

    it('should not append if entry already exists', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(
        'node_modules\ndist\n.classy/\n',
      )

      writeGitignore('.classy')

      expect(fs.appendFileSync).not.toHaveBeenCalled()
    })

    it('should handle fs errors gracefully', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation(() => {
        throw new Error('Test error')
      })

      writeGitignore('.classy')

      expect(console.warn).toHaveBeenCalled()
    })

    it('should handle writeFileSync errors', () => {
      (fs.existsSync as Mock).mockReturnValue(false);
      (fs.writeFileSync as Mock).mockImplementation(() => {
        throw new Error('Write error')
      })

      writeGitignore('.classy')

      expect(console.warn).toHaveBeenCalled()
    })

    it('should handle appendFileSync errors', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue('node_modules\n');
      (fs.appendFileSync as Mock).mockImplementation(() => {
        throw new Error('Append error')
      })

      writeGitignore('.classy')

      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('isInIgnoredDirectory', () => {
    it('should return true for files in ignored directories', () => {
      (path.relative as Mock).mockReturnValue('node_modules/some/file.js')

      const result = isInIgnoredDirectory('/some/path', ['node_modules'])

      expect(result).toBe(true)
    })

    it('should return false for files not in ignored directories', () => {
      (path.relative as Mock).mockReturnValue('src/components/Button.vue')

      const result = isInIgnoredDirectory('/some/path', ['node_modules'])

      expect(result).toBe(false)
    })

    it('should return false when ignoredDirectories is empty', () => {
      const result = isInIgnoredDirectory('/some/path', [])

      expect(result).toBe(false)
    })

    it('should handle exact directory matches', () => {
      (path.relative as Mock).mockReturnValue('node_modules')

      const result = isInIgnoredDirectory('/some/path', ['node_modules'])

      expect(result).toBe(true)
    })

    it('should handle multiple ignored directories', () => {
      (path.relative as Mock).mockReturnValue('dist/build/file.js')

      const result = isInIgnoredDirectory('/some/path', ['node_modules', 'dist'])

      expect(result).toBe(true)
    })

    it('should handle nested ignored directories', () => {
      (path.relative as Mock).mockReturnValue('node_modules/lodash/dist/lodash.js')

      const result = isInIgnoredDirectory('/some/path', ['node_modules'])

      expect(result).toBe(true)
    })
  })

  describe('writeOutputFileDirect', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      (fs.writeFileSync as Mock).mockImplementation(() => {});
      (fs.mkdirSync as Mock).mockImplementation(() => {});
      (fs.renameSync as Mock).mockImplementation(() => {});
      (fs.appendFileSync as Mock).mockImplementation(() => {});
      (fs.existsSync as Mock).mockReturnValue(false)
    })

    it('should write classes to output file', () => {
      const mockClasses = new Set(['hover:bg-blue-500', 'focus:outline-none']);
      (fs.existsSync as Mock).mockReturnValue(false)

      writeOutputFileDirect(mockClasses, '.classy', 'output.html')

      // Check if directory was created
      expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/cwd/.classy', {
        recursive: true,
      })

      // Check if .gitignore was written in the .classy directory
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/cwd/.classy/.gitignore',
        expect.stringContaining('Ignore all files'),
      )

      // The function should write the output file (at least the .classy/.gitignore and temp file)
      expect(fs.writeFileSync).toHaveBeenCalledTimes(3)
      expect(fs.renameSync).toHaveBeenCalledWith(
        '/mock/cwd/.classy/.output.html.tmp',
        '/mock/cwd/.classy/output.html',
      )
    })

    it('should skip write if no classes and file exists', () => {
      const mockClasses = new Set([]);
      // Mock existsSync to return true for the output file but false for other paths
      (fs.existsSync as Mock).mockImplementation((path) => {
        if (path.includes('output.html')) return true
        return false
      })

      writeOutputFileDirect(mockClasses, '.classy', 'output.html')

      // When no classes and file exists, function returns early without calling writeGitignore
      expect(fs.writeFileSync).toHaveBeenCalledTimes(0)
      expect(fs.renameSync).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      const mockClasses = new Set(['hover:bg-blue-500']);

      // Mock existsSync to avoid early return
      (fs.existsSync as Mock).mockReturnValue(false);

      // Mock mkdirSync to throw an error
      (fs.mkdirSync as Mock).mockImplementation(() => {
        throw new Error('Test error')
      })

      // Create a spy specifically for console.error
      const errorSpy = vi.spyOn(console, 'error')

      writeOutputFileDirect(mockClasses, '.classy', 'output.html')

      expect(errorSpy).toHaveBeenCalled()
    })

    it('should handle writeFileSync errors', () => {
      const mockClasses = new Set(['hover:bg-blue-500']);
      (fs.existsSync as Mock).mockReturnValue(false);
      (fs.writeFileSync as Mock).mockImplementation((path) => {
        if (path.includes('.tmp')) {
          throw new Error('Write error')
        }
      })

      const errorSpy = vi.spyOn(console, 'error')

      writeOutputFileDirect(mockClasses, '.classy', 'output.html')

      expect(errorSpy).toHaveBeenCalled()
    })

    it('should handle renameSync errors', () => {
      const mockClasses = new Set(['hover:bg-blue-500']);
      (fs.existsSync as Mock).mockReturnValue(false);
      (fs.renameSync as Mock).mockImplementation(() => {
        throw new Error('Rename error')
      })

      const errorSpy = vi.spyOn(console, 'error')

      writeOutputFileDirect(mockClasses, '.classy', 'output.html')

      expect(errorSpy).toHaveBeenCalled()
    })

    it('should filter out classes without modifiers', () => {
      const mockClasses = new Set(['hover:bg-blue-500', 'flex', 'p-4']);
      (fs.existsSync as Mock).mockReturnValue(false)

      writeOutputFileDirect(mockClasses, '.classy', 'output.html')

      // Should write both .gitignore and output file (only classes with modifiers)
      expect(fs.writeFileSync).toHaveBeenCalledTimes(3)
      expect(fs.renameSync).toHaveBeenCalled()
    })

    it('should handle empty class set', () => {
      const mockClasses = new Set([]);
      (fs.existsSync as Mock).mockReturnValue(false)

      writeOutputFileDirect(mockClasses, '.classy', 'output.html')

      // Should still create directory and .gitignore
      expect(fs.mkdirSync).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/cwd/.classy/.gitignore',
        expect.any(String),
      )
    })
  })

  describe('shouldProcessFile', () => {
    it('should return true for supported file types that aren\'t ignored', () => {
      (path.relative as Mock).mockReturnValue('src/components/Button.vue')

      const result = shouldProcessFile('src/components/Button.vue', [
        'node_modules',
        'dist',
      ])

      expect(result).toBe(true)
    })

    it('should return false for files in ignored directories', () => {
      (path.relative as Mock).mockReturnValue('node_modules/some/file.js')

      const result = shouldProcessFile('node_modules/some/file.js', [
        'node_modules',
      ])

      expect(result).toBe(false)
    })

    it('should return false for unsupported file types', () => {
      const result = shouldProcessFile('src/styles.css', ['node_modules'])

      expect(result).toBe(false)
    })

    it('should return false for virtual files', () => {
      const result = shouldProcessFile('virtual:some-module.js', [
        'node_modules',
      ])

      expect(result).toBe(false)
    })

    it('should return false for files with null bytes', () => {
      const result = shouldProcessFile('file\0.js', ['node_modules'])

      expect(result).toBe(false)
    })

    it('should return false for runtime files', () => {
      const result = shouldProcessFile('runtime-file.js', ['node_modules'])

      expect(result).toBe(false)
    })

    it('should return false for files in output directory', () => {
      const result = shouldProcessFile('.classy/output.html', ['node_modules'])

      expect(result).toBe(false)
    })

    it('should handle null/undefined filePath', () => {
      const result = shouldProcessFile(null as unknown as string, ['node_modules'])

      expect(result).toBe(false)
    })

    it('should handle empty filePath', () => {
      const result = shouldProcessFile('', ['node_modules'])

      expect(result).toBe(false)
    })

    it('should handle filePath with only extension', () => {
      const result = shouldProcessFile('.vue', ['node_modules'])

      expect(result).toBe(false)
    })

    it('should handle filePath with multiple dots', () => {
      const result = shouldProcessFile('component.test.vue', ['node_modules'])

      expect(result).toBe(false)
    })
  })
})
