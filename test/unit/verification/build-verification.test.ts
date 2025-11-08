/**
 * Tests for build verification
 */

import assert from 'assert';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../../lib/test-helpers.ts';

describe('Build Verification', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('build-check-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should run build successfully when build script exists', () => {
    copyFixture('minimal-module', tempDir);

    // Install dependencies first
    const installResult = runCommand('npm install', tempDir);
    assert.equal(installResult.exitCode, 0, 'npm install should succeed');

    // Run build
    const buildResult = runCommand('npm run build', tempDir);
    assert.equal(buildResult.exitCode, 0, 'npm run build should succeed');

    // Verify dist directory exists
    const distPath = join(tempDir, 'dist');
    assert.ok(existsSync(distPath), 'dist/ directory should exist after build');

    // Verify dist/index.js exists
    const indexPath = join(tempDir, 'dist', 'index.js');
    assert.ok(existsSync(indexPath), 'dist/index.js should exist after build');
  });

  it('should handle missing build script gracefully', () => {
    copyFixture('minimal-module', tempDir);

    // Install dependencies
    runCommand('npm install', tempDir);

    // Remove build script from package.json
    const packageJsonPath = join(tempDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    delete packageJson.scripts.build;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Try to run build (should fail gracefully)
    const buildResult = runCommand('npm run build', tempDir);
    assert.notEqual(buildResult.exitCode, 0, 'npm run build should fail when script missing');
  });
});
