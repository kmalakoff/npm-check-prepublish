/**
 * Tests for MCP server startup and execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'assert';
import { readdirSync } from 'fs';
import { join } from 'path';
import { cleanupTempDir, copyFixture, createTempDir, runCommand } from '../../lib/test-helpers.ts';

describe('MCP Server Startup', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('mcp-server-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should start MCP server and connect to it', async () => {
    copyFixture('mcp-server', tempDir);

    // Install dependencies, build, and pack
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
      runCommand(`npm install --production ${tarballPath}`, installDir);

      // Create client and connect via stdio (transport spawns the server)
      const serverPath = join(installDir, 'node_modules', 'test-mcp-server', 'bin', 'server.js');
      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
      });

      const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

      await client.connect(transport);

      try {
        // List available tools
        const toolsResult = await client.listTools();
        assert.ok(toolsResult.tools.length > 0, 'Server should provide tools');

        const testTool = toolsResult.tools.find((t) => t.name === 'test-tool');
        assert.ok(testTool, 'Server should provide test-tool');
        assert.equal(testTool.description, 'A test tool');

        // Call the test tool
        const callResult = await client.callTool({
          name: 'test-tool',
          arguments: { message: 'Hello MCP' },
        });

        const content = callResult.content as Array<{ type: string; text?: string }>;
        assert.ok(content.length > 0, 'Tool should return content');
        assert.equal(content[0].type, 'text');
        assert.ok(content[0].text?.includes('Echoing: Hello MCP'), 'Tool should echo message');
      } finally {
        await client.close();
      }
    } finally {
      cleanupTempDir(installDir);
    }
  });

  it('should handle server that fails to start', async () => {
    const installDir = createTempDir('install-');

    try {
      // Try to connect to a non-existent server
      const nonExistentPath = join(installDir, 'does-not-exist.js');

      await assert.rejects(
        async () => {
          const transport = new StdioClientTransport({
            command: 'node',
            args: [nonExistentPath],
          });

          const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

          await client.connect(transport);
        },
        (_error: any) => {
          // Should fail to spawn or connect
          return true;
        },
        'Should reject when server cannot be spawned'
      );
    } finally {
      cleanupTempDir(installDir);
    }
  });

  it('should check server responds to multiple tool calls', async () => {
    copyFixture('mcp-server', tempDir);

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
      runCommand(`npm install --production ${tarballPath}`, installDir);

      const serverPath = join(installDir, 'node_modules', 'test-mcp-server', 'bin', 'server.js');

      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
      });

      const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

      await client.connect(transport);

      try {
        // Call tool multiple times
        const call1 = await client.callTool({
          name: 'test-tool',
          arguments: { message: 'First call' },
        });

        const call2 = await client.callTool({
          name: 'test-tool',
          arguments: { message: 'Second call' },
        });

        // Verify both calls worked
        const content1 = call1.content as Array<{ type: string; text?: string }>;
        const content2 = call2.content as Array<{ type: string; text?: string }>;
        assert.ok(content1[0].text?.includes('First call'));
        assert.ok(content2[0].text?.includes('Second call'));
      } finally {
        await client.close();
      }
    } finally {
      cleanupTempDir(installDir);
    }
  });
});
