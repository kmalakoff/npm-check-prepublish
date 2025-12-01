/**
 * Integration tests for full package verification workflow
 * Tests the complete check() method on real packages
 */

import assert from 'assert';
import { CheckPrepublish } from '../../src/checker.ts';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../lib/test-helpers.ts';

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
      result.errors.some((e) => e.includes('dist/index.js')),
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
      result.errors.some((e) => e.includes('README.md') || e.includes('LICENSE')),
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
      logs.some((log) => log.includes('Verifying')),
      'Should log verification messages'
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
