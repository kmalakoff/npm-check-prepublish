/**
 * Custom MCP server tests for package verification
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export async function testMcpServer(client: Client): Promise<void> {
  // Test the test-tool
  const result = await client.callTool({
    name: 'test-tool',
    arguments: { message: 'verification test' },
  });

  const content = result.content as Array<{ type: string; text?: string }>;
  if (!content || content.length === 0) {
    throw new Error('test-tool returned no content');
  }

  const textContent = content.find((c: any) => c.type === 'text');
  if (!textContent || !textContent.text.includes('verification test')) {
    throw new Error('test-tool did not echo message correctly');
  }
}
