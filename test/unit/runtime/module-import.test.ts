/**
 * Tests for module imports from installed packages
 */

import assert from 'assert';
import { readdirSync } from 'fs';
import { join } from 'path';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../../lib/test-helpers.ts';

describe('Module Import', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('module-import-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should import module from installed package', async () => {
    copyFixture('minimal-module', tempDir);

    // Install, build, and pack
    runCommand('npm install', tempDir);
    runCommand('npm run build', tempDir);
    runCommand('npm pack', tempDir);

    // Find tarball and install it
    const files = readdirSync(tempDir);
    const tarball = files.find((f) => f.endsWith('.tgz'));
    assert.ok(tarball, 'Tarball should exist');
    const installDir = createTempDir('install-');

    try {
      // Create package.json in install directory so npm doesn't walk up to project root
      runCommand('npm init -y', installDir);

      const tarballPath = join(tempDir, tarball);
      const installResult = runCommand(`npm install --production "${tarballPath}"`, installDir);
      assert.equal(installResult.exitCode, 0, `npm install should succeed: ${installResult.stdout}`);

      // Import the module using the full path to the main file
      const packagePath = join(installDir, 'node_modules', 'test-minimal-module', 'dist', 'index.js');
      const module = await import(packagePath);

      // Verify exported function exists and works
      assert.ok(module.hello, 'Module should export hello function');
      assert.equal(typeof module.hello, 'function', 'hello should be a function');
      assert.equal(module.hello('World'), 'Hello, World!');
    } finally {
      cleanupTempDir(installDir);
    }
  });

  it('should handle module with named exports', async () => {
    copyFixture('minimal-module', tempDir);

    // Install, build, and pack
    runCommand('npm install', tempDir);
    runCommand('npm run build', tempDir);
    runCommand('npm pack', tempDir);

    // Install and import
    const files = readdirSync(tempDir);
    const tarball = files.find((f) => f.endsWith('.tgz'));
    assert.ok(tarball, 'Tarball should exist');
    const installDir = createTempDir('install-');

    try {
      // Create package.json in install directory so npm doesn't walk up to project root
      runCommand('npm init -y', installDir);

      const tarballPath = join(tempDir, tarball);
      const installResult = runCommand(`npm install --production ${tarballPath}`, installDir);
      assert.equal(installResult.exitCode, 0, `npm install should succeed: ${installResult.stdout}`);

      const packagePath = join(installDir, 'node_modules', 'test-minimal-module', 'dist', 'index.js');
      const module = await import(packagePath);

      // Verify named export works
      const { hello } = module;
      assert.ok(hello, 'Should have named export: hello');
      assert.equal(hello('Test'), 'Hello, Test!');
    } finally {
      cleanupTempDir(installDir);
    }
  });

  it('should check module exports match expected API', async () => {
    copyFixture('minimal-module', tempDir);

    runCommand('npm install', tempDir);
    runCommand('npm run build', tempDir);
    runCommand('npm pack', tempDir);

    const files = readdirSync(tempDir);
    const tarball = files.find((f) => f.endsWith('.tgz'));
    assert.ok(tarball, 'Tarball should exist');
    const installDir = createTempDir('install-');

    try {
      // Create package.json in install directory so npm doesn't walk up to project root
      runCommand('npm init -y', installDir);

      const tarballPath = join(tempDir, tarball);
      const installResult = runCommand(`npm install --production ${tarballPath}`, installDir);
      assert.equal(installResult.exitCode, 0, `npm install should succeed: ${installResult.stdout}`);

      const packagePath = join(installDir, 'node_modules', 'test-minimal-module', 'dist', 'index.js');
      const module = await import(packagePath);

      // Check that module has expected shape
      const exportedNames = Object.keys(module);
      assert.ok(exportedNames.includes('hello'), 'Module should export "hello"');
      assert.equal(exportedNames.length, 1, 'Module should have exactly one export');
    } finally {
      cleanupTempDir(installDir);
    }
  });
});
