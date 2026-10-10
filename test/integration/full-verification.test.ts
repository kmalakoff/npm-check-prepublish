/**
 * Integration tests for full package verification workflow
 * Tests the complete check() method on real packages
 */

import assert from 'assert';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CheckPrepublish } from '../../src/checker.ts';
import { arrayFind, stringEndsWith, stringIncludes } from '../lib/compat.ts';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../lib/test-helpers.ts';

/**
 * Add a harmless env-style file to the fixture's "files" and prove the installed tarball ships it
 */
function shipEnvFile(packageDir: string, fileName: string): void {
  writeFileSync(join(packageDir, fileName), 'NCP_FIXTURE_VALUE=harmless\n');
  const packageJsonPath = join(packageDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  packageJson.files.push(fileName);
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const installDir = createTempDir('env-ship-');
  try {
    runCommand('npm pack', packageDir);
    const tarball = arrayFind(readdirSync(packageDir), (f: string) => stringEndsWith(f, '.tgz'));
    assert.ok(tarball, 'Tarball should exist');
    runCommand('npm init -y', installDir);
    const installResult = runCommand(`npm install --production "${join(packageDir, tarball)}"`, installDir);
    assert.equal(installResult.exitCode, 0, 'npm install should succeed');
    assert.ok(existsSync(join(installDir, 'node_modules', 'test-minimal-module', fileName)), `${fileName} should ship in the tarball`);
    cleanupTempDir(join(packageDir, tarball));
  } finally {
    cleanupTempDir(installDir);
  }
}

describe('Full Package Verification', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('full-check-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should check minimal module successfully', async () => {
    copyFixture('minimal-module', tempDir);

    // Install dependencies first
    runCommand('npm install', tempDir);

    // Create checker and run full verification
    const checker = new CheckPrepublish({ packageDir: tempDir });
    const result = await checker.check();

    // Should succeed
    assert.equal(result.success, true, 'Verification should succeed');
    assert.equal(result.errors.length, 0, 'Should have no errors');
    assert.ok(result.packageInfo, 'Should have package info');
    assert.equal(result.packageInfo?.name, 'test-minimal-module');
    assert.equal(result.packageInfo?.version, '1.0.0');
    assert.equal(result.packageInfo?.type, 'module');
  });

  it('should check CLI tool successfully', async () => {
    copyFixture('cli-tool', tempDir);

    // Install dependencies first
    runCommand('npm install', tempDir);

    const checker = new CheckPrepublish({ packageDir: tempDir });
    const result = await checker.check();

    assert.equal(result.success, true, 'CLI verification should succeed');
    assert.equal(result.errors.length, 0, 'Should have no errors');
    assert.equal(result.packageInfo?.name, 'test-cli-tool');
    assert.equal(result.packageInfo?.type, 'cli');
  });

  it('should handle verification with skipBuild option', async () => {
    copyFixture('minimal-module', tempDir);

    // Pre-build the module
    runCommand('npm install', tempDir);
    runCommand('npm run build', tempDir);

    // Verify with skipBuild
    const checker = new CheckPrepublish({
      packageDir: tempDir,
      skipBuild: true,
    });

    const result = await checker.check();
    assert.equal(result.success, true, 'Should succeed with skipBuild');
  });

  it('should fail when required files are missing', async () => {
    copyFixture('minimal-module', tempDir);

    // Remove dist directory to simulate missing files
    runCommand('rm -rf dist', tempDir);

    // Run without building (dist/ won't exist)
    const checker = new CheckPrepublish({
      packageDir: tempDir,
      skipBuild: true,
    });

    const result = await checker.check();

    // Should fail because dist/index.js is missing
    assert.equal(result.success, false, 'Should fail when files are missing');
    assert.ok(result.errors.length > 0, 'Should have error messages');
    assert.ok(
      result.errors.some((e) => stringIncludes(e, 'dist/index.js')),
      'Should mention missing file'
    );
  });

  it('should handle package with additional required files', async () => {
    copyFixture('minimal-module', tempDir);

    const checker = new CheckPrepublish({
      packageDir: tempDir,
      requiredFiles: ['README.md', 'LICENSE'],
    });

    const result = await checker.check();

    // Should fail because README.md and LICENSE don't exist
    assert.equal(result.success, false, 'Should fail when additional files are missing');
    assert.ok(
      result.errors.some((e) => stringIncludes(e, 'README.md') || stringIncludes(e, 'LICENSE')),
      'Should mention missing additional files'
    );
  });

  it('should provide detailed error information on failure', async () => {
    copyFixture('minimal-module', tempDir);

    // Remove dist directory to simulate missing files
    runCommand('rm -rf dist', tempDir);

    const checker = new CheckPrepublish({
      packageDir: tempDir,
      skipBuild: true,
    });

    const result = await checker.check();

    // Verify error structure
    assert.equal(result.success, false);
    assert.ok(Array.isArray(result.errors), 'Errors should be an array');
    assert.ok(result.errors.length > 0, 'Should have at least one error');

    // Each error should be a string
    result.errors.forEach((error) => {
      assert.equal(typeof error, 'string', 'Each error should be a string');
    });
  });

  it('should handle custom logger', async () => {
    copyFixture('minimal-module', tempDir);

    const logs: string[] = [];
    const customLogger = {
      log: (msg: string) => {
        logs.push(msg);
      },
    };

    const checker = new CheckPrepublish({
      packageDir: tempDir,
      logger: customLogger,
    });

    await checker.check();

    // Should have logged something
    assert.ok(logs.length > 0, 'Should have logged messages');
    assert.ok(
      logs.some((log) => stringIncludes(log, 'Verifying')),
      'Should log verification messages'
    );
  });

  it('should reject a packaged .env.test without a packaged .env', async () => {
    copyFixture('minimal-module', tempDir);
    shipEnvFile(tempDir, '.env.test');
    assert.ok(!existsSync(join(tempDir, '.env')), 'Fixture should not contain .env');

    const result = await new CheckPrepublish({ packageDir: tempDir, skipBuild: true }).check();

    assert.equal(result.success, false, 'Should fail when .env.test is packaged');
    assert.ok(
      result.errors.some((e) => stringIncludes(e, 'should NOT be in package: .env.test')),
      'Should name .env.test'
    );
  });

  it('should reject a packaged .envrc', async () => {
    copyFixture('minimal-module', tempDir);
    shipEnvFile(tempDir, '.envrc');

    const result = await new CheckPrepublish({ packageDir: tempDir, skipBuild: true }).check();

    assert.equal(result.success, false, 'Should fail when .envrc is packaged');
    assert.ok(
      result.errors.some((e) => stringIncludes(e, 'should NOT be in package: .envrc')),
      'Should name .envrc'
    );
  });

  it('should check complete workflow: build -> pack -> install -> test', async () => {
    copyFixture('minimal-module', tempDir);

    // Install dependencies first
    runCommand('npm install', tempDir);

    // Run full verification (includes build, pack, install, runtime checks)
    const checker = new CheckPrepublish({ packageDir: tempDir });
    const result = await checker.check();

    // Should succeed for all phases
    assert.equal(result.success, true, 'Complete workflow should succeed');
    assert.equal(result.errors.length, 0, 'Should have no errors in complete workflow');

    // Package info should be complete
    assert.ok(result.packageInfo, 'Should have package info');
    assert.equal(result.packageInfo?.name, 'test-minimal-module');
    assert.equal(result.packageInfo?.type, 'module');
    assert.equal(result.packageInfo?.main, './dist/index.js');
  });
});
