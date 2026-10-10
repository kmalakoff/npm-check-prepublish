/**
 * Tests for configuration file loading
 */

import assert from 'assert';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import url from 'url';
import { loadConfig, mergeConfig } from '../../src/config.ts';
import { assertDeepStrictEqual, stringIncludes } from '../lib/compat.ts';
import { cleanupTempDir, createTempDir } from '../lib/test-helpers.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', 'fixtures');

describe('Config Loader', () => {
  describe('loadConfig', () => {
    it('should load config from .ncprc.json', () => {
      const config = loadConfig(path.join(FIXTURES, 'config-ncprc'));

      assert.strictEqual(config.skipCheckImport, true);
      assert.strictEqual(config.skipBuild, false);
      assertDeepStrictEqual(config.requiredFiles, ['README.md']);
    });

    it('should load config from package.json "ncp" field', () => {
      const config = loadConfig(path.join(FIXTURES, 'config-package-json'));

      assert.strictEqual(config.skipCheckBin, true);
      assertDeepStrictEqual(config.requiredFiles, ['LICENSE']);
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

      assertDeepStrictEqual(config, {});
    });

    it('should return empty object for non-existent directory', () => {
      const config = loadConfig(path.join(FIXTURES, 'non-existent'));

      assertDeepStrictEqual(config, {});
    });

    describe('unreadable or malformed files', () => {
      let tempDir: string;

      beforeEach(() => {
        tempDir = createTempDir('config-');
      });

      afterEach(() => {
        cleanupTempDir(tempDir);
      });

      function assertThrowsNaming(fileName: string): void {
        assert.throws(
          () => loadConfig(tempDir),
          (err: Error) => stringIncludes(err.message, path.join(tempDir, fileName))
        );
      }

      it('should throw naming a malformed .ncprc.json instead of falling back to package.json', () => {
        writeFileSync(path.join(tempDir, '.ncprc.json'), '{ "skipBuild": true,');
        writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', ncp: { skipCheckBin: true } }));

        assertThrowsNaming('.ncprc.json');
      });

      it('should throw naming an unreadable .ncprc.json', () => {
        mkdirSync(path.join(tempDir, '.ncprc.json'));

        assertThrowsNaming('.ncprc.json');
      });

      it('should throw naming a malformed package.json', () => {
        writeFileSync(path.join(tempDir, 'package.json'), '{ "name": "x", "ncp": {');

        assertThrowsNaming('package.json');
      });

      it('should not read package.json when .ncprc.json is valid', () => {
        writeFileSync(path.join(tempDir, '.ncprc.json'), JSON.stringify({ skipBuild: true }));
        writeFileSync(path.join(tempDir, 'package.json'), '{ "name": "x", "ncp": {');

        assertDeepStrictEqual(loadConfig(tempDir), { skipBuild: true });
      });
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
      assertDeepStrictEqual(merged.requiredFiles, ['README.md']);
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

      assertDeepStrictEqual(merged.requiredFiles, ['README.md', 'LICENSE', 'CHANGELOG.md']);
    });

    it('should handle empty configs', () => {
      const merged = mergeConfig({}, {});

      assert.strictEqual(merged.skipBuild, undefined);
      assert.strictEqual(merged.skipCheckImport, undefined);
      assertDeepStrictEqual(merged.requiredFiles, []);
    });
  });
});
