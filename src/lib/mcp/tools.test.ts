import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerWildTrackTools } from './tools';

describe('MCP tool schemas', () => {
  it('serves Zod schemas through the SDK and rejects invalid input before tool execution', async () => {
    const server = new McpServer({ name: 'schema-test', version: '1.0.0' });
    const client = new Client({ name: 'schema-test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    registerWildTrackTools(server);

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const { tools } = await client.listTools();
      const animalList = tools.find((tool) => tool.name === 'list_animals');
      expect(animalList).toBeDefined();
      expect(animalList?.inputSchema.properties?.limit).toMatchObject({
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 25,
      });

      const result = await client.callTool({ name: 'list_animals', arguments: { limit: 0 } });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain('limit');
    } finally {
      await client.close();
      await server.close();
    }
  });
});
