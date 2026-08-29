/**
 * Tests for build verification
 */

import assert from 'assert';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { rimrafSync } from '../../../src/fs-compat.ts';
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
    // minimal-module ships prebuilt dist with no build script; remove it so a real build is required
    rimrafSync(join(tempDir, 'dist'));

    // Give this copy a build script; other tests rely on the checked-in fixture having none
    writeFileSync(join(tempDir, 'build.js'), 'require("fs").mkdirSync("dist");\nrequire("fs").writeFileSync("dist/index.js", "");\n');
    const packageJsonPath = join(tempDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    packageJson.scripts = { build: 'node build.js' };
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

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
    // minimal-module has no scripts.build; other tests rely on that
    copyFixture('minimal-module', tempDir);

    // Install dependencies
    runCommand('npm install', tempDir);

    // Try to run build (should fail gracefully)
    const buildResult = runCommand('npm run build', tempDir);
    assert.notEqual(buildResult.exitCode, 0, 'npm run build should fail when script missing');
  });
});
