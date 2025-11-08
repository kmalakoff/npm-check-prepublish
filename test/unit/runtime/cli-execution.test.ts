/**
 * Tests for CLI execution
 */

import assert from 'assert';
import { join } from 'path';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../../lib/test-helpers.ts';

describe('CLI Execution', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('cli-exec-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should run CLI with --version', () => {
    copyFixture('cli-tool', tempDir);
    runCommand('npm install', tempDir);

    // Run CLI with --version
    const cliPath = join(tempDir, 'bin', 'cli.js');
    const result = runCommand(`node ${cliPath} --version`, tempDir);

    assert.equal(result.exitCode, 0, 'CLI should exit with code 0');
    assert.ok(result.stdout.includes('1.0.0'), 'Should output version');
  });

  it('should run CLI with --help', () => {
    copyFixture('cli-tool', tempDir);
    runCommand('npm install', tempDir);

    // Run CLI with --help
    const cliPath = join(tempDir, 'bin', 'cli.js');
    const result = runCommand(`node ${cliPath} --help`, tempDir);

    assert.equal(result.exitCode, 0, 'CLI should exit with code 0');
    assert.ok(result.stdout.includes('Usage'), 'Should output usage information');
    assert.ok(result.stdout.includes('Options'), 'Should output options');
  });

  it('should handle CLI execution from installed package', () => {
    copyFixture('cli-tool', tempDir);

    // Install and pack
    runCommand('npm install', tempDir);
    runCommand('npm pack', tempDir);

    // Install in new directory
    const installDir = createTempDir('cli-install-');

    try {
      // Create package.json in install directory so npm doesn't walk up to project root
      runCommand('npm init -y', installDir);

      const tarball = runCommand('ls *.tgz', tempDir).stdout.trim();
      const tarballPath = join(tempDir, tarball);
      runCommand(`npm install --production ${tarballPath}`, installDir);

      // Run the installed CLI
      const cliPath = join(installDir, 'node_modules', 'test-cli-tool', 'bin', 'cli.js');
      const result = runCommand(`node ${cliPath} --version`, installDir);

      assert.equal(result.exitCode, 0, 'Installed CLI should work');
      assert.ok(result.stdout.includes('1.0.0'), 'Should output version');
    } finally {
      cleanupTempDir(installDir);
    }
  });
});
