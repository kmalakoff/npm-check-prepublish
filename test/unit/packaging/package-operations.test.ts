/**
 * Tests for packaging operations: npm pack + install + structure verification
 * Grouped together since these operations are tightly coupled
 */

import find from 'array-find';
import assert from 'assert';
import endsWith from 'end-with';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../../lib/test-helpers.ts';

describe.only('Package Operations', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pkg-ops-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should create tarball with npm pack', () => {
    copyFixture('minimal-module', tempDir);

    // Install dependencies and build
    runCommand('npm install', tempDir);
    runCommand('npm run build', tempDir);

    // Run npm pack
    const packResult = runCommand('npm pack', tempDir);
    assert.equal(packResult.exitCode, 0, 'npm pack should succeed');

    // Verify tarball was created
    const files = readdirSync(tempDir);
    const tarball = find(files, (f: string) => endsWith(f, '.tgz'));
    assert.ok(tarball, 'Tarball file should exist');
    assert.ok(tarball && tarball.indexOf('test-minimal-module') >= 0, 'Tarball should have package name');
  });

  it('should install tarball in temp directory', () => {
    copyFixture('minimal-module', tempDir);

    // Install, build, and pack
    runCommand('npm install', tempDir);
    runCommand('npm run build', tempDir);
    const packResult = runCommand('npm pack', tempDir);
    assert.equal(packResult.exitCode, 0);

    // Find the tarball
    const files = readdirSync(tempDir);
    const tarball = find(files, (f: string) => endsWith(f, '.tgz'));
    assert.ok(tarball);

    // Create install directory
    const installDir = createTempDir('install-');

    try {
      // Create package.json in install directory so npm doesn't walk up to project root
      runCommand('npm init -y', installDir);

      // Install the tarball
      const tarballPath = join(tempDir, tarball);
      const installResult = runCommand(`npm install --production ${tarballPath}`, installDir);
      assert.equal(installResult.exitCode, 0, 'npm install should succeed');

      // Verify node_modules was created
      const nodeModulesPath = join(installDir, 'node_modules');
      assert.ok(existsSync(nodeModulesPath), 'node_modules should exist');

      // Verify package was installed
      const packagePath = join(installDir, 'node_modules', 'test-minimal-module');
      assert.ok(existsSync(packagePath), 'Package should be installed in node_modules');
    } finally {
      cleanupTempDir(installDir);
    }
  });

  it('should check required files are present in installed package', () => {
    copyFixture('minimal-module', tempDir);

    // Install, build, and pack
    runCommand('npm install', tempDir);
    runCommand('npm run build', tempDir);
    runCommand('npm pack', tempDir);

    // Find tarball and install it
    const files = readdirSync(tempDir);
    const tarball = find(files, (f: string) => endsWith(f, '.tgz'));
    assert.ok(tarball, 'Tarball should exist');
    const installDir = createTempDir('install-');

    try {
      // Create package.json in install directory so npm doesn't walk up to project root
      runCommand('npm init -y', installDir);

      const tarballPath = join(tempDir, tarball);
      runCommand(`npm install --production ${tarballPath}`, installDir);

      // Verify required files exist in installed package
      const packagePath = join(installDir, 'node_modules', 'test-minimal-module');

      assert.ok(existsSync(join(packagePath, 'package.json')), 'package.json should exist');
      assert.ok(existsSync(join(packagePath, 'dist')), 'dist/ should exist');
      assert.ok(existsSync(join(packagePath, 'dist', 'index.js')), 'dist/index.js should exist');
    } finally {
      cleanupTempDir(installDir);
    }
  });

  it('should check excluded files are NOT in package', () => {
    copyFixture('minimal-module', tempDir);

    // Install, build, and pack
    runCommand('npm install', tempDir);
    runCommand('npm run build', tempDir);
    runCommand('npm pack', tempDir);

    // Find tarball and install it
    const files = readdirSync(tempDir);
    const tarball = find(files, (f: string) => endsWith(f, '.tgz'));
    assert.ok(tarball, 'Tarball should exist');
    const installDir = createTempDir('install-');

    try {
      // Create package.json in install directory so npm doesn't walk up to project root
      runCommand('npm init -y', installDir); // ← ADD THIS LINE

      const tarballPath = join(tempDir, tarball);
      runCommand(`npm install --production ${tarballPath}`, installDir);

      // Verify excluded files do NOT exist
      const packagePath = join(installDir, 'node_modules', 'test-minimal-module');

      assert.ok(!existsSync(join(packagePath, 'src')), 'src/ should NOT be in package');
      assert.ok(!existsSync(join(packagePath, 'test')), 'test/ should NOT be in package');
      assert.ok(!existsSync(join(packagePath, '.env')), '.env should NOT be in package');
      assert.ok(!existsSync(join(packagePath, 'tsconfig.json')), 'tsconfig.json should NOT be in package');
    } finally {
      cleanupTempDir(installDir);
    }
  });

  it('should handle package with bin field', () => {
    copyFixture('cli-tool', tempDir);

    // Install and pack (no build needed for this fixture)
    runCommand('npm install', tempDir);
    const packResult = runCommand('npm pack', tempDir);
    assert.equal(packResult.exitCode, 0);

    // Install the tarball
    const files = readdirSync(tempDir);
    const tarball = find(files, (f: string) => endsWith(f, '.tgz'));
    assert.ok(tarball, 'Tarball should exist');
    const installDir = createTempDir('install-');

    try {
      // Create package.json in install directory so npm doesn't walk up to project root
      runCommand('npm init -y', installDir);

      const tarballPath = join(tempDir, tarball);
      runCommand(`npm install --production ${tarballPath}`, installDir);

      // Verify bin file exists
      const packagePath = join(installDir, 'node_modules', 'test-cli-tool');
      assert.ok(existsSync(join(packagePath, 'bin', 'cli.js')), 'bin/cli.js should exist');
      assert.ok(existsSync(join(packagePath, 'package.json')), 'package.json should exist');
    } finally {
      cleanupTempDir(installDir);
    }
  });
});
