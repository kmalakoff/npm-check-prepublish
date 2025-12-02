/**
 * Tests for dual ESM/CJS exports
 * Verifies that the package can be imported correctly in both module systems
 */

import assert from 'assert';
import path from 'path';
import url from 'url';
import type { FileConfig, VerifyConfig } from '../../../src/index.ts';
// Import from source to test exports structure
// The actual ESM/CJS dual export is tested by tsds running tests in both modes
import { CheckPrepublish, loadConfig, mergeConfig } from '../../../src/index.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

describe('Dual ESM/CJS Exports', () => {
  describe('CheckPrepublish', () => {
    it('should export CheckPrepublish class', () => {
      assert.ok(CheckPrepublish, 'CheckPrepublish should be exported');
      assert.strictEqual(typeof CheckPrepublish, 'function', 'CheckPrepublish should be a constructor');
    });

    it('should be instantiable', () => {
      const checker = new CheckPrepublish({ packageDir: process.cwd() });
      assert.ok(checker, 'Should create instance');
      assert.strictEqual(typeof checker.check, 'function', 'Should have check method');
    });
  });

  describe('loadConfig', () => {
    it('should export loadConfig function', () => {
      assert.ok(loadConfig, 'loadConfig should be exported');
      assert.strictEqual(typeof loadConfig, 'function', 'loadConfig should be a function');
    });

    it('should return object when called', () => {
      const config = loadConfig(process.cwd());
      assert.strictEqual(typeof config, 'object', 'Should return an object');
    });
  });

  describe('mergeConfig', () => {
    it('should export mergeConfig function', () => {
      assert.ok(mergeConfig, 'mergeConfig should be exported');
      assert.strictEqual(typeof mergeConfig, 'function', 'mergeConfig should be a function');
    });

    it('should merge configs correctly', () => {
      const fileConfig: FileConfig = { skipBuild: true };
      const cliConfig: Partial<VerifyConfig> = { packageDir: '/test' };
      const merged = mergeConfig(fileConfig, cliConfig);

      assert.strictEqual(merged.skipBuild, true);
      assert.strictEqual(merged.packageDir, '/test');
    });
  });

  describe('Type exports', () => {
    it('should allow using FileConfig type', () => {
      const config: FileConfig = {
        skipBuild: true,
        skipCheckImport: false,
        requiredFiles: ['README.md'],
      };
      assert.ok(config, 'FileConfig type should work');
    });

    it('should allow using VerifyConfig type', () => {
      const config: VerifyConfig = {
        packageDir: '/test',
        skipBuild: true,
        logger: console,
      };
      assert.ok(config, 'VerifyConfig type should work');
    });
  });
});
