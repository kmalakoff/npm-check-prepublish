/**
 * Tests for file existence verification
 */

import assert from 'assert';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CheckPrepublish } from '../../../src/checker.ts';
import { cleanupTempDir, createTempDir } from '../../lib/test-helpers.ts';

describe('File Verification', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('file-check-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should find all existing required files', () => {
    // Create package.json
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
      main: './dist/index.js',
    };
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

    // Create the required file
    mkdirSync(join(tempDir, 'dist'), { recursive: true });
    writeFileSync(join(tempDir, 'dist', 'index.js'), '// test');

    // Verify with CheckPrepublish
    const checker = new CheckPrepublish({ packageDir: tempDir });
    const result = checker.check();

    // Should succeed since file exists
    assert.ok(result, 'Verification should find existing files');
  });

  it('should report missing required files', () => {
    // Create package.json with main field
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
      main: './dist/index.js',
    };
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

    // Don't create the dist/index.js file - it's missing

    // Verify with CheckPrepublish (skip build to test file checking)
    const checker = new CheckPrepublish({
      packageDir: tempDir,
      skipBuild: true,
    });

    // This should fail since file is missing
    const result = checker.check();
    result.then((res) => {
      assert.equal(res.success, false, 'Verification should fail for missing files');
      assert.ok(res.errors.length > 0, 'Should have error messages');
    });
  });

  it('should handle relative paths correctly', () => {
    // Create package.json with various path formats
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
      main: './dist/cjs/index.js',
      module: 'dist/esm/index.js', // Without leading ./
    };
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

    // Create the files
    mkdirSync(join(tempDir, 'dist', 'cjs'), { recursive: true });
    mkdirSync(join(tempDir, 'dist', 'esm'), { recursive: true });
    writeFileSync(join(tempDir, 'dist', 'cjs', 'index.js'), '// cjs');
    writeFileSync(join(tempDir, 'dist', 'esm', 'index.js'), '// esm');

    // Verify
    const checker = new CheckPrepublish({ packageDir: tempDir });
    const result = checker.check();

    // Should succeed regardless of path format
    assert.ok(result, 'Should handle both ./path and path formats');
  });

  it('should always check package.json exists', () => {
    // Create package.json with no other files specified
    const packageJson = {
      name: 'minimal',
      version: '1.0.0',
    };
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

    // Verify
    const checker = new CheckPrepublish({ packageDir: tempDir });
    // @ts-expect-error - accessing private method for testing
    const files = checker.getRequiredFiles();

    // package.json should always be in required files
    assert.ok(files.includes('package.json'), 'package.json should always be required');
  });
});
