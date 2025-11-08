/**
 * Test helper functions (NO CLASSES per QUALITY.md T10/T11)
 */

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use project .tmp directory instead of system temp
const PROJECT_ROOT = join(__dirname, '../..');
const TMP_DIR = join(PROJECT_ROOT, '.tmp');

/**
 * Ensure .tmp directory exists
 */
function ensureTmpDir(): void {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }
}

/**
 * Create temp directory for testing
 */
export function createTempDir(prefix: string): string {
  ensureTmpDir();
  return mkdtempSync(join(TMP_DIR, prefix));
}

/**
 * Clean up temp directory
 */
export function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

/**
 * Copy fixture to temp location
 */
export function copyFixture(fixtureName: string, destDir: string): void {
  const fixturePath = join(__dirname, '../fixtures', fixtureName);
  cpSync(fixturePath, destDir, { recursive: true });
}

/**
 * Run command and return output
 */
export function runCommand(cmd: string, cwd: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
    return { stdout, exitCode: 0 };
  } catch (error: any) {
    return { stdout: error.stdout || '', exitCode: error.status || 1 };
  }
}
