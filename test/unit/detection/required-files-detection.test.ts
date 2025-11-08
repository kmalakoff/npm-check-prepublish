/**
 * Tests for required files detection from package.json
 */

import assert from 'assert';
import { CheckPrepublish } from '../../../src/checker.ts';

describe('Required Files Detection', () => {
  it('should detect files from main, module, types, bin', () => {
    const mockPackageJson = {
      name: 'test-package',
      version: '1.0.0',
      main: './dist/cjs/index.js',
      module: './dist/esm/index.js',
      types: './dist/esm/index.d.ts',
      bin: 'bin/cli.js',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();

    assert.ok(files.includes('package.json'));
    assert.ok(files.includes('./dist/cjs/index.js'));
    assert.ok(files.includes('./dist/esm/index.js'));
    assert.ok(files.includes('./dist/esm/index.d.ts'));
    assert.ok(files.includes('bin/cli.js'));
  });

  it('should handle bin as object', () => {
    const mockPackageJson = {
      name: 'test-cli',
      version: '1.0.0',
      bin: {
        'test-cli': 'bin/cli.js',
        'test-cli-alt': 'bin/alt.js',
      },
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();

    assert.ok(files.includes('bin/cli.js'));
    assert.ok(files.includes('bin/alt.js'));
  });

  it('should append additional required files from config', () => {
    const mockPackageJson = {
      name: 'test-package',
      version: '1.0.0',
      main: './dist/index.js',
    };

    const checker = new CheckPrepublish({
      packageDir: process.cwd(),
      requiredFiles: ['README.md', 'LICENSE'],
    });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();

    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('LICENSE'));
    assert.ok(files.includes('./dist/index.js'));
  });

  it('should handle minimal package.json', () => {
    const mockPackageJson = {
      name: 'minimal-package',
      version: '1.0.0',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();

    // Should at least have package.json
    assert.ok(files.includes('package.json'));
    assert.equal(files.length, 1);
  });
});
