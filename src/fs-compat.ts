/**
 * File system compatibility utilities for older Node.js versions
 * - rmSync: Node 14.14.0+
 * - cpSync: Node 16.7.0+
 * - copyFileSync: Node 8.5.0+
 * - mkdtempSync: Node 5.10.0+
 * - mkdirSync recursive: Node 10.12.0+
 */
import fs from 'fs';
import mkdirp from 'mkdirp-classic';
import path from 'path';
import rimraf from 'rimraf2';
import tempSuffix from 'temp-suffix';

// Re-export mkdirp.sync directly
export const mkdirpSync: (dir: string) => void = mkdirp.sync;

/**
 * Recursively remove a file or directory (works on Node 0.8+)
 * Wraps rimraf.sync with disableGlob option
 */
export function rimrafSync(p: string): void {
  rimraf.sync(p, { disableGlob: true });
}

/**
 * Copy file with fallback for Node < 8.5.0 using safe-buffer
 */
function copyFileSync(src: string, dest: string): void {
  if (fs.copyFileSync) {
    fs.copyFileSync(src, dest);
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
}

/**
 * Create a unique temporary directory (works on Node 0.8+)
 */
export function mkdtempSync(prefix: string): string {
  if (fs.mkdtempSync) {
    return fs.mkdtempSync(prefix);
  }
  const dir = prefix + tempSuffix();
  mkdirpSync(dir);
  return dir;
}

/**
 * Recursively copy a directory (works on Node 0.8+)
 * Handles files, directories, and symlinks
 */
export function cpSync(src: string, dest: string, options?: { recursive?: boolean }): void {
  // Use lstatSync to detect symlinks (doesn't follow them)
  const lstat = fs.lstatSync(src);

  // Handle symlinks - preserve them as symlinks
  if (lstat.isSymbolicLink()) {
    const parentDir = path.dirname(dest);
    if (parentDir && !fs.existsSync(parentDir)) {
      mkdirpSync(parentDir);
    }
    const linkTarget = fs.readlinkSync(src);
    // Remove existing file/symlink at dest if it exists
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
    fs.symlinkSync(linkTarget, dest);
  } else if (lstat.isFile()) {
    const parentDir = path.dirname(dest);
    if (parentDir && !fs.existsSync(parentDir)) {
      mkdirpSync(parentDir);
    }
    copyFileSync(src, dest);
  } else if (lstat.isDirectory()) {
    if (!options || !options.recursive) {
      throw new Error(`EISDIR: illegal operation on a directory, read '${src}'`);
    }
    if (!fs.existsSync(dest)) {
      mkdirpSync(dest);
    }
    const entries = fs.readdirSync(src);
    for (let i = 0; i < entries.length; i++) {
      cpSync(path.join(src, entries[i]), path.join(dest, entries[i]), options);
    }
  }
}
