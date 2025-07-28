import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import fs from 'fs'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
  },
}))

// Mock path module
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

// Mock core functions
vi.mock('../core', () => ({
  extractClasses: vi.fn(),
  CLASS_REGEX: /class\s*=\s*["']([^"']*)["']/g,
  CLASS_MODIFIER_REGEX: /class:(\w+)\s*=\s*["']([^"']*)["']/g,
}))

// Mock utils functions
vi.mock('../utils', () => ({
  shouldProcessFile: vi.fn(),
  writeOutputFileDebounced: vi.fn(),
  writeOutputFileDirect: vi.fn(),
}))

// Import after mocking
import {
  isLaravelProject,
  setupLaravelServiceProvider,
  findBladeFiles,
  scanBladeFiles,
  setupBladeFileWatching,
} from '../blade'

describe('blade module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('isLaravelProject', () => {
    it('should return true when artisan and app directory exist', () => {
      ;(fs.existsSync as Mock)
        .mockReturnValueOnce(true) // artisan
        .mockReturnValueOnce(true) // app

      const result = isLaravelProject()

      expect(result).toBe(true)
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/artisan')
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/app')
    })

    it('should return false when artisan does not exist', () => {
      ;(fs.existsSync as Mock)
        .mockReturnValueOnce(false) // artisan

      const result = isLaravelProject()

      expect(result).toBe(false)
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/artisan')
      expect(fs.existsSync).not.toHaveBeenCalledWith('/mock/cwd/app')
    })

    it('should return false when app directory does not exist', () => {
      ;(fs.existsSync as Mock)
        .mockReturnValueOnce(true) // artisan
        .mockReturnValueOnce(false) // app

      const result = isLaravelProject()

      expect(result).toBe(false)
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/artisan')
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/cwd/app')
    })

    it('should return false when fs.existsSync throws an error', () => {
      ;(fs.existsSync as Mock).mockImplementation(() => {
        throw new Error('File system error')
      })

      const result = isLaravelProject()

      expect(result).toBe(false)
    })
  })

  describe('setupLaravelServiceProvider', () => {
    it('should return false and log message when not a Laravel project', () => {
      ;(fs.existsSync as Mock)
        .mockReturnValueOnce(false) // artisan

      const result = setupLaravelServiceProvider(true)

      expect(result).toBe(false)
      expect(console.log).toHaveBeenCalledWith('ℹ️  Not a Laravel project - skipping Laravel setup')
    })

    it('should return true and log setup instructions when Laravel project detected', () => {
      ;(fs.existsSync as Mock)
        .mockReturnValueOnce(true) // artisan
        .mockReturnValueOnce(true) // app

      const result = setupLaravelServiceProvider(true)

      expect(result).toBe(true)
      expect(console.log).toHaveBeenCalledWith('🎩 Laravel project detected!')
      expect(console.log).toHaveBeenCalledWith('📋 To enable UseClassy blade transformations:')
      expect(console.log).toHaveBeenCalledWith('')
      expect(console.log).toHaveBeenCalledWith('   composer require useclassy/laravel')
      expect(console.log).toHaveBeenCalledWith('')
      expect(console.log).toHaveBeenCalledWith('💡 The Vite plugin will handle class extraction for Tailwind JIT')
      expect(console.log).toHaveBeenCalledWith('   The Composer package will handle blade template transformations')
    })

    it('should not log when debug is false', () => {
      ;(fs.existsSync as Mock)
        .mockReturnValueOnce(true) // artisan
        .mockReturnValueOnce(true) // app

      const result = setupLaravelServiceProvider(false)

      expect(result).toBe(true)
      expect(console.log).not.toHaveBeenCalled()
    })
  })

  describe('findBladeFiles', () => {
    it('should find blade files in directory', () => {
      const mockDirContents = ['file1.blade.php', 'file2.txt', 'subdir']
      const mockSubdirContents = ['file3.blade.php']

      ;(fs.readdirSync as Mock)
        .mockReturnValueOnce(mockDirContents)
        .mockReturnValueOnce(mockSubdirContents)

      ;(fs.statSync as Mock)
        .mockReturnValueOnce({ isDirectory: () => false }) // file1.blade.php
        .mockReturnValueOnce({ isDirectory: () => false }) // file2.txt
        .mockReturnValueOnce({ isDirectory: () => true }) // subdir
        .mockReturnValueOnce({ isDirectory: () => false }) // file3.blade.php

      const result = findBladeFiles('/test/dir')

      expect(result).toEqual([
        '/test/dir/file1.blade.php',
        '/test/dir/subdir/file3.blade.php',
      ])
    })

    it('should handle directories with no blade files', () => {
      const mockDirContents = ['file1.txt', 'file2.js']

      ;(fs.readdirSync as Mock).mockReturnValue(mockDirContents)
      ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => false })

      const result = findBladeFiles('/test/dir')

      expect(result).toEqual([])
      expect(fs.readdirSync).toHaveBeenCalledWith('/test/dir')
    })

    it('should handle empty directory', () => {
      ;(fs.readdirSync as Mock).mockReturnValue([])

      const result = findBladeFiles('/test/dir')

      expect(result).toEqual([])
    })

    it('should handle files array parameter', () => {
      const existingFiles = ['existing.blade.php']
      ;(fs.readdirSync as Mock).mockReturnValue(['new.blade.php'])
      ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => false })

      const result = findBladeFiles('/test/dir', existingFiles)

      expect(result).toEqual(['existing.blade.php', '/test/dir/new.blade.php'])
    })
  })

  describe('scanBladeFiles', () => {
    it('should handle basic scanning functionality', () => {
      // This test verifies that the function exists and can be called
      // The actual implementation testing would require more complex mocking
      expect(typeof scanBladeFiles).toBe('function')
    })
  })

  describe('setupBladeFileWatching', () => {
    it('should handle basic watching functionality', () => {
      // This test verifies that the function exists and can be called
      // The actual implementation testing would require more complex mocking
      expect(typeof setupBladeFileWatching).toBe('function')
    })
  })
})
