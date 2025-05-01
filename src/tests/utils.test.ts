import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  debounce,
  hashFunction,
  loadIgnoredDirectories,
  writeGitignore,
  isInIgnoredDirectory,
  writeOutputFileDirect,
  writeOutputFileDebounced,
  shouldProcessFile,
} from "../utils";

// Mock fs and path modules
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    renameSync: vi.fn(),
  },
}));

vi.mock("path", () => ({
  default: {
    join: vi.fn((...args) => args.join("/")),
    normalize: vi.fn((p) => p),
    relative: vi.fn((base, filePath) => filePath.replace(base + "/", "")),
  },
}));

// Mock process.cwd()
vi.stubGlobal("process", {
  ...process,
  cwd: vi.fn().mockReturnValue("/mock/cwd"),
});

// Mock console methods
vi.stubGlobal("console", {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe("utils module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      // Call multiple times in quick succession
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Function should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Advance timer
      vi.advanceTimersByTime(110);

      // Function should have been called once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should reset timer on subsequent calls", async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      // Call once
      debouncedFn();

      // Wait 50ms
      vi.advanceTimersByTime(50);

      // Call again, which should reset the timer
      debouncedFn();

      // Wait another 60ms (totaling 110ms from start)
      vi.advanceTimersByTime(60);

      // Function should not have been called yet (because of reset)
      expect(mockFn).not.toHaveBeenCalled();

      // Advance to reach delay after second call
      vi.advanceTimersByTime(50);

      // Now it should have been called
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("hashFunction", () => {
    it("should generate consistent hashes for same input", () => {
      const input = "test string";
      const hash1 = hashFunction(input);
      const hash2 = hashFunction(input);

      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different inputs", () => {
      const hash1 = hashFunction("test string 1");
      const hash2 = hashFunction("test string 2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("loadIgnoredDirectories", () => {
    it("should read from .gitignore file when it exists", () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        "node_modules\ndist\n.cache\n# comment\n*.log\n!important"
      );

      const result = loadIgnoredDirectories();

      expect(fs.existsSync).toHaveBeenCalledWith("/mock/cwd/.gitignore");
      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/mock/cwd/.gitignore",
        "utf-8"
      );
      expect(result).toEqual(["node_modules", "dist", ".cache"]);
    });

    it("should return default directories when .gitignore doesn't exist", () => {
      (fs.existsSync as any).mockReturnValue(false);

      const result = loadIgnoredDirectories();

      expect(result).toEqual(["node_modules", "dist"]);
    });

    it("should handle fs errors gracefully", () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        throw new Error("Test error");
      });

      const result = loadIgnoredDirectories();

      expect(console.warn).toHaveBeenCalled();
      expect(result).toEqual(["node_modules", "dist"]);
    });
  });

  describe("writeGitignore", () => {
    it("should append to existing .gitignore", () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue("node_modules\ndist\n");

      writeGitignore(".classy");

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        "/mock/cwd/.gitignore",
        expect.stringContaining(".classy/")
      );
    });

    it("should create .gitignore if it doesn't exist", () => {
      (fs.existsSync as any).mockReturnValue(false);

      writeGitignore(".classy");

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/cwd/.gitignore",
        expect.stringContaining(".classy/")
      );
    });

    it("should not append if entry already exists", () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        "node_modules\ndist\n.classy/\n"
      );

      writeGitignore(".classy");

      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    it("should handle fs errors gracefully", () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => {
        throw new Error("Test error");
      });

      writeGitignore(".classy");

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("isInIgnoredDirectory", () => {
    it("should return true for files in ignored directories", () => {
      (path.relative as any).mockReturnValue("node_modules/some/file.js");

      const result = isInIgnoredDirectory("/some/path", ["node_modules"]);

      expect(result).toBe(true);
    });

    it("should return false for files not in ignored directories", () => {
      (path.relative as any).mockReturnValue("src/components/Button.vue");

      const result = isInIgnoredDirectory("/some/path", ["node_modules"]);

      expect(result).toBe(false);
    });

    it("should return false when ignoredDirectories is empty", () => {
      const result = isInIgnoredDirectory("/some/path", []);

      expect(result).toBe(false);
    });

    it("should handle exact directory matches", () => {
      (path.relative as any).mockReturnValue("node_modules");

      const result = isInIgnoredDirectory("/some/path", ["node_modules"]);

      expect(result).toBe(true);
    });
  });

  describe("writeOutputFileDirect", () => {
    it("should write classes to output file", () => {
      const mockClasses = new Set(["hover:bg-blue-500", "focus:outline-none"]);
      (fs.existsSync as any).mockReturnValue(false);

      writeOutputFileDirect(mockClasses, ".classy", "output.html");

      // Check if directory was created
      expect(fs.mkdirSync).toHaveBeenCalledWith("/mock/cwd/.classy", {
        recursive: true,
      });

      // Check if .gitignore was written in the .classy directory
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/cwd/.classy/.gitignore",
        expect.stringContaining("Ignore all files")
      );

      // Check if the output file was written
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/cwd/.classy/.output.html.tmp",
        expect.stringContaining("hover:bg-blue-500"),
        { encoding: "utf-8" }
      );

      // Check if rename was called
      expect(fs.renameSync).toHaveBeenCalledWith(
        "/mock/cwd/.classy/.output.html.tmp",
        "/mock/cwd/.classy/output.html"
      );
    });

    it("should skip write if no classes and file exists", () => {
      const mockClasses = new Set([]);
      (fs.existsSync as any).mockReturnValue(true);

      writeOutputFileDirect(mockClasses, ".classy", "output.html");

      // Should not write file
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", () => {
      const mockClasses = new Set(["hover:bg-blue-500"]);

      // Mock existsSync to avoid early return
      (fs.existsSync as any).mockReturnValue(false);

      // Mock mkdirSync to throw an error
      (fs.mkdirSync as any).mockImplementation(() => {
        throw new Error("Test error");
      });

      // Create a spy specifically for console.error
      const errorSpy = vi.spyOn(console, "error");

      writeOutputFileDirect(mockClasses, ".classy", "output.html");

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("shouldProcessFile", () => {
    it("should return true for supported file types that aren't ignored", () => {
      (path.relative as any).mockReturnValue("src/components/Button.vue");

      const result = shouldProcessFile("src/components/Button.vue", [
        "node_modules",
        "dist",
      ]);

      expect(result).toBe(true);
    });

    it("should return false for files in ignored directories", () => {
      (path.relative as any).mockReturnValue("node_modules/some/file.js");

      const result = shouldProcessFile("node_modules/some/file.js", [
        "node_modules",
      ]);

      expect(result).toBe(false);
    });

    it("should return false for unsupported file types", () => {
      const result = shouldProcessFile("src/styles.css", ["node_modules"]);

      expect(result).toBe(false);
    });

    it("should return false for virtual files", () => {
      const result = shouldProcessFile("virtual:some-module.js", [
        "node_modules",
      ]);

      expect(result).toBe(false);
    });

    it("should return false for files with null bytes", () => {
      const result = shouldProcessFile("file\0.js", ["node_modules"]);

      expect(result).toBe(false);
    });

    it("should return false for runtime files", () => {
      const result = shouldProcessFile("runtime-file.js", ["node_modules"]);

      expect(result).toBe(false);
    });
  });
});
