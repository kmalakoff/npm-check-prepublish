/**
 * Tests for configuration file loading
 */

import assert from 'assert';
import path from 'path';
import url from 'url';
import { loadConfig, mergeConfig } from '../../../src/config.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', '..', 'fixtures');

describe('Config Loader', () => {
  describe('loadConfig', () => {
    it('should load config from .ncprc.json', () => {
      const config = loadConfig(path.join(FIXTURES, 'config-ncprc'));

      assert.strictEqual(config.skipCheckImport, true);
      assert.strictEqual(config.skipBuild, false);
      assert.deepStrictEqual(config.requiredFiles, ['README.md']);
    });

    it('should load config from package.json "ncp" field', () => {
      const config = loadConfig(path.join(FIXTURES, 'config-package-json'));

      assert.strictEqual(config.skipCheckBin, true);
      assert.deepStrictEqual(config.requiredFiles, ['LICENSE']);
    });

    it('should prefer .ncprc.json over package.json "ncp" field', () => {
      const config = loadConfig(path.join(FIXTURES, 'config-both'));

      // .ncprc.json has skipCheckImport: true, skipBuild: true
      // package.json has skipCheckBin: true, skipBuild: false
      // Should use .ncprc.json values
      assert.strictEqual(config.skipCheckImport, true);
      assert.strictEqual(config.skipBuild, true);
      // skipCheckBin from package.json should NOT be loaded (ncprc takes priority)
      assert.strictEqual(config.skipCheckBin, undefined);
    });

    it('should return empty object when no config found', () => {
      const config = loadConfig(path.join(FIXTURES, 'config-none'));

      assert.deepStrictEqual(config, {});
    });

    it('should return empty object for non-existent directory', () => {
      const config = loadConfig(path.join(FIXTURES, 'non-existent'));

      assert.deepStrictEqual(config, {});
    });
  });

  describe('mergeConfig', () => {
    it('should merge file config with CLI config', () => {
      const fileConfig = {
        skipCheckImport: true,
        skipBuild: false,
        requiredFiles: ['README.md'],
      };
      const cliConfig = {
        packageDir: '/some/path',
        skipBuild: true, // CLI overrides file
      };

      const merged = mergeConfig(fileConfig, cliConfig);

      assert.strictEqual(merged.packageDir, '/some/path');
      assert.strictEqual(merged.skipCheckImport, true); // from file
      assert.strictEqual(merged.skipBuild, true); // CLI overrides
      assert.deepStrictEqual(merged.requiredFiles, ['README.md']);
    });

    it('should use file config values when CLI values are undefined', () => {
      const fileConfig = {
        skipCheckImport: true,
        skipCheckBin: true,
      };
      const cliConfig = {
        packageDir: '/some/path',
        skipCheckImport: undefined, // explicitly undefined
      };

      const merged = mergeConfig(fileConfig, cliConfig);

      assert.strictEqual(merged.skipCheckImport, true); // from file (CLI is undefined)
      assert.strictEqual(merged.skipCheckBin, true); // from file
    });

    it('should combine requiredFiles arrays from both sources', () => {
      const fileConfig = {
        requiredFiles: ['README.md', 'LICENSE'],
      };
      const cliConfig = {
        requiredFiles: ['CHANGELOG.md'],
      };

      const merged = mergeConfig(fileConfig, cliConfig);

      assert.deepStrictEqual(merged.requiredFiles, ['README.md', 'LICENSE', 'CHANGELOG.md']);
    });

    it('should handle empty configs', () => {
      const merged = mergeConfig({}, {});

      assert.strictEqual(merged.skipBuild, undefined);
      assert.strictEqual(merged.skipCheckImport, undefined);
      assert.deepStrictEqual(merged.requiredFiles, []);
    });
  });
});
