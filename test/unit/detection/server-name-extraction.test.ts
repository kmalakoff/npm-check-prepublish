/**
 * Tests for server name extraction from mcpName
 */

import assert from 'assert';
import { CheckPrepublish } from '../../../src/checker.ts';

describe('Server Name Extraction', () => {
  it('should extract server name from mcpName (after /)', () => {
    const mockPackageJson = {
      name: '@mcpeasy/mcp-pdf',
      version: '1.0.0',
      mcpName: 'io.github.kmalakoff/mcp-pdf',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const serverName = checker.getServerName();

    assert.equal(serverName, 'mcp-pdf');
  });

  it('should handle mcpName without /', () => {
    const mockPackageJson = {
      name: '@mcpeasy/mcp-test',
      version: '1.0.0',
      mcpName: 'mcp-simple',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const serverName = checker.getServerName();

    assert.equal(serverName, 'mcp-simple');
  });

  it('should fallback to package name if no mcpName (scoped)', () => {
    const mockPackageJson = {
      name: '@mcpeasy/mcp-fallback',
      version: '1.0.0',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const serverName = checker.getServerName();

    assert.equal(serverName, 'mcp-fallback');
  });

  it('should fallback to package name if no mcpName (unscoped)', () => {
    const mockPackageJson = {
      name: 'mcp-simple',
      version: '1.0.0',
    };

    const checker = new CheckPrepublish({ packageDir: process.cwd() });
    // @ts-expect-error - accessing private property for testing
    checker.packageJson = mockPackageJson;
    // @ts-expect-error - accessing private method for testing
    const serverName = checker.getServerName();

    assert.equal(serverName, 'mcp-simple');
  });
});
