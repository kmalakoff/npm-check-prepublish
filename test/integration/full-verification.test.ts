/**
 * Integration tests for full package verification workflow
 * Tests the complete check() method on real packages
 */

import assert from 'assert';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CheckPrepublish } from '../../src/checker.ts';
import { arrayFind, assertDeepStrictEqual, stringEndsWith, stringIncludes } from '../lib/compat.ts';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../lib/test-helpers.ts';

// Where CheckPrepublish creates its temporary install projects
const CHECK_TMP_DIR = join(tmpdir(), 'npm-check-prepublish');

function listInstallProjects(): string[] {
  return existsSync(CHECK_TMP_DIR) ? readdirSync(CHECK_TMP_DIR).sort() : [];
}

/**
 * Run a check expected to fail in step 4 and prove it left no install project, tarball or cleanup warning behind
 */
async function assertStep4FailureCleansUp(packageDir: string, tarball: string, expectedError: string): Promise<void> {
  const logs: string[] = [];
  const before = listInstallProjects();
  const result = await new CheckPrepublish({ packageDir, skipBuild: true, logger: { log: (msg: string) => logs.push(msg) } }).check();

  assert.equal(result.success, false, 'Step 4 should fail');
  assert.ok(
    result.errors.some((e) => stringIncludes(e, expectedError)),
    `Should keep the original failure: ${result.errors.join('; ')}`
  );
  assert.ok(!logs.some((log) => stringIncludes(log, 'Warning: Failed to cleanup')), 'Cleanup should succeed');
  assert.ok(!existsSync(join(packageDir, tarball)), `${tarball} should be removed`);
  assertDeepStrictEqual(listInstallProjects(), before, 'Install project should be removed');
}

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

  it('should clean up after a packed module that throws on load', async () => {
    copyFixture('minimal-module', tempDir);
    writeFileSync(join(tempDir, 'dist', 'index.js'), "throw new Error('ncp fixture load failure');\n");

    await assertStep4FailureCleansUp(tempDir, 'test-minimal-module-1.0.0.tgz', 'ncp fixture load failure');
  });

  it('should clean up after a packed CLI that fails', async () => {
    copyFixture('cli-tool', tempDir);
    writeFileSync(join(tempDir, 'bin', 'cli.js'), '#!/usr/bin/env node\nprocess.exit(3);\n');

    await assertStep4FailureCleansUp(tempDir, 'test-cli-tool-1.0.0.tgz', 'CLI execution failed');
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
