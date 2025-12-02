/**
 * File system compatibility utilities for older Node.js versions
 * - rmSync: Node 14.14.0+
 * - cpSync: Node 16.7.0+
 */
import fs from 'fs';
import { join } from 'path';
import rimraf from 'rimraf2';

/**
 * Recursively remove a file or directory (works on Node 12+)
 */
export function rimrafSync(path: string): void {
  rimraf.sync(path, { disableGlob: true });
}

/**
 * Recursively copy a directory (works on Node 12+)
 */
export function cpSync(src: string, dest: string, options?: { recursive?: boolean }): void {
  if (!fs.existsSync(src)) {
    throw new Error(`ENOENT: no such file or directory, stat '${src}'`);
  }

  const stat = fs.statSync(src);

  if (stat.isFile()) {
    // Ensure parent directory exists
    const parentDir = dest.substring(0, dest.lastIndexOf('/'));
    if (parentDir && !fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  } else if (stat.isDirectory()) {
    if (!options?.recursive) {
      throw new Error(`EISDIR: illegal operation on a directory, read '${src}'`);
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      cpSync(srcPath, destPath, options);
    }
  }
}
