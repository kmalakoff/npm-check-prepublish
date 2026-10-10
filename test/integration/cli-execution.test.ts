/**
 * Tests for CLI execution
 */

import assert from 'assert';
import { readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { arrayFind, stringEndsWith, stringIncludes } from '../lib/compat.ts';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../lib/test-helpers.ts';

const __dirname = dirname(typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url));
const NCP_BIN = join(__dirname, '..', '..', 'bin', 'cli.js');

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
    assert.ok(stringIncludes(result.stdout, '1.0.0'), 'Should output version');
  });

  it('should run CLI with --help', () => {
    copyFixture('cli-tool', tempDir);
    runCommand('npm install', tempDir);

    // Run CLI with --help
    const cliPath = join(tempDir, 'bin', 'cli.js');
    const result = runCommand(`node ${cliPath} --help`, tempDir);

    assert.equal(result.exitCode, 0, 'CLI should exit with code 0');
    assert.ok(stringIncludes(result.stdout, 'Usage'), 'Should output usage information');
    assert.ok(stringIncludes(result.stdout, 'Options'), 'Should output options');
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
      assert.ok(stringIncludes(result.stdout, '1.0.0'), 'Should output version');
    } finally {
      cleanupTempDir(installDir);
    }
  });

  it('should exit 21 naming a malformed .ncprc.json before any check runs', () => {
    copyFixture('minimal-module', tempDir);
    writeFileSync(join(tempDir, '.ncprc.json'), '{ "requiredFiles": [');

    // The CLI reads config from its working directory
    const result = runCommand(`node "${NCP_BIN}"`, tempDir);

    assert.equal(result.exitCode, 21, 'ncp should exit with its error code');
    assert.ok(stringIncludes(result.stderr, join(tempDir, '.ncprc.json')), `Should name .ncprc.json: ${result.stderr}`);
    assert.ok(!stringIncludes(result.stdout, 'Verifying'), 'Checks should not start');
    assert.equal(
      arrayFind(readdirSync(tempDir), (f: string) => stringEndsWith(f, '.tgz')),
      undefined,
      'Nothing should be packed'
    );
  });

  it('should exit 21 naming package.json when it is missing', () => {
    const result = runCommand(`node "${NCP_BIN}"`, tempDir);

    assert.equal(result.exitCode, 21, 'ncp should exit with its error code');
    assert.ok(stringIncludes(result.stderr, join(tempDir, 'package.json')), `Should name package.json: ${result.stderr}`);
  });

  it('should exit 21 naming a malformed package.json when .ncprc.json is valid', () => {
    writeFileSync(join(tempDir, '.ncprc.json'), JSON.stringify({ skipBuild: true }));
    writeFileSync(join(tempDir, 'package.json'), '{ "name": "x",');

    const result = runCommand(`node "${NCP_BIN}"`, tempDir);

    assert.equal(result.exitCode, 21, 'ncp should exit with its error code');
    assert.ok(stringIncludes(result.stderr, join(tempDir, 'package.json')), `Should name package.json: ${result.stderr}`);
  });
});
