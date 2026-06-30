import fs from "fs";
import path from "path";

type FsWithGlob = typeof fs & {
  globSync?: (pattern: string, options?: { cwd?: string; exclude?: string | string[] }) => string[];
};

const fsWithGlob = fs as FsWithGlob;

/**
 * Find files matching a glob pattern under root, or walk the tree when globSync is unavailable.
 */
export function globFiles(root: string, pattern: string, skipDirs: Set<string>): string[] {
  const exclude = [...skipDirs].map((dir) => `**/${dir}/**`);

  if (typeof fsWithGlob.globSync === "function") {
    const relative = fsWithGlob.globSync(pattern, { cwd: root, exclude });
    return relative.map((p) => path.join(root, p));
  }

  const suffix = pattern.startsWith("**/*") ? pattern.slice(4) : pattern.replace(/^\*\*/, "");

  const acc: string[] = [];

  function walk(dir: string): void {
    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (skipDirs.has(item)) continue;
        walk(fullPath);
        continue;
      }

      if (suffix && item.endsWith(suffix)) {
        acc.push(fullPath);
      }
    }
  }

  walk(root);
  return acc;
}
