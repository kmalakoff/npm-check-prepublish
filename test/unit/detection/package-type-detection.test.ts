/**
 * Tests for package type detection logic
 */

import assert from 'assert';
import { CheckPrepublish } from '../../../src/checker.ts';

describe('Package Type Detection', () => {
  it('should detect MCP server type from mcpName', () => {
    const mockPackageJson = {
      name: '@mcpeasy/mcp-pdf',
      version: '1.0.0',
      mcpName: 'io.github.kmalakoff/mcp-pdf',
      main: './dist/cjs/index.js',
      bin: 'bin/server.js',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const info = checker.detectPackageType();

    assert.equal(info.type, 'mcp-server');
    assert.equal(info.name, '@mcpeasy/mcp-pdf');
    assert.equal(info.version, '1.0.0');
    assert.equal(info.serverName, 'mcp-pdf');
  });

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
    assert.equal(info.serverName, undefined);
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
    assert.equal(info.serverName, undefined);
  });

  it('should prioritize mcpName over bin for type detection', () => {
    const mockPackageJson = {
      name: '@mcpeasy/mcp-test',
      version: '1.0.0',
      mcpName: 'io.github.test/mcp-test',
      bin: 'bin/server.js',
      main: './dist/cjs/index.js',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const info = checker.detectPackageType();

    assert.equal(info.type, 'mcp-server');
    assert.equal(info.serverName, 'mcp-test');
  });
});
