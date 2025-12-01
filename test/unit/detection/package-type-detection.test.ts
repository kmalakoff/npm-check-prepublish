/**
 * Tests for package type detection logic
 */

import assert from 'assert';
import { CheckPrepublish } from '../../../src/checker.ts';

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
