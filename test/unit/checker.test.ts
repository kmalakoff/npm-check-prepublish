/**
 * Tests for package type detection logic
 */

import assert from 'assert';
import { CheckPrepublish } from '../../src/checker.ts';
import { arrayIncludes } from '../lib/compat.ts';

describe('Package Type Detection', () => {
  it('should detect CLI tool type from bin field', () => {
    const mockPackageJson = {
      name: 'my-cli',
      version: '1.0.0',
      bin: { 'my-cli': 'bin/cli.js' },
      main: './dist/index.js',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const info = checker.detectPackageType();

    assert.equal(info.type, 'cli');
    assert.equal(info.name, 'my-cli');
    assert.equal(info.version, '1.0.0');
  });

  it('should detect normal module type', () => {
    const mockPackageJson = {
      name: 'my-utils',
      version: '1.0.0',
      main: './dist/index.js',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const info = checker.detectPackageType();

    assert.equal(info.type, 'module');
    assert.equal(info.name, 'my-utils');
    assert.equal(info.version, '1.0.0');
  });
});

describe('Required Files Detection', () => {
  it('should detect files from main, module, types, bin', () => {
    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = { name: 'test-package', version: '1.0.0', main: './dist/cjs/index.js', module: './dist/esm/index.js', types: './dist/esm/index.d.ts', bin: 'bin/cli.js' };
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();
    assert.ok(arrayIncludes(files, 'package.json'));
    assert.ok(arrayIncludes(files, './dist/cjs/index.js'));
    assert.ok(arrayIncludes(files, './dist/esm/index.js'));
    assert.ok(arrayIncludes(files, './dist/esm/index.d.ts'));
    assert.ok(arrayIncludes(files, 'bin/cli.js'));
  });
  it('should handle bin as object', () => {
    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = { name: 'test-cli', version: '1.0.0', bin: { 'test-cli': 'bin/cli.js', 'test-cli-alt': 'bin/alt.js' } };
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();
    assert.ok(arrayIncludes(files, 'bin/cli.js'));
    assert.ok(arrayIncludes(files, 'bin/alt.js'));
  });
  it('should append additional required files from config', () => {
    const checker = new CheckPrepublish({ packageDir: process.cwd(), requiredFiles: ['README.md', 'LICENSE'] });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = { name: 'test-package', version: '1.0.0', main: './dist/index.js' };
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();
    assert.ok(arrayIncludes(files, 'README.md'));
    assert.ok(arrayIncludes(files, 'LICENSE'));
    assert.ok(arrayIncludes(files, './dist/index.js'));
  });
  it('should handle minimal package.json', () => {
    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = { name: 'minimal-package', version: '1.0.0' };
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();
    assert.ok(arrayIncludes(files, 'package.json'));
    assert.equal(files.length, 1);
  });
});
