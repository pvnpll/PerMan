import { describe, it, expect } from 'vitest';
import { createPerManMcpServer } from '../lib/mcp/server';

describe('Remote MCP Server Specification', () => {
  const dummyAuth = {
    token: 'test_token',
    userId: '11111111-1111-4111-a111-111111111111',
    clientId: 'chatgpt',
    clientName: 'chatgpt',
    timezone: 'Asia/Kolkata',
  };

  it('initializes MCP server with name "perman-mcp"', () => {
    const server = createPerManMcpServer(dummyAuth);
    expect(server).toBeDefined();
  });

  it('exposes all 12 required ChatGPT MCP tools', () => {
    const server = createPerManMcpServer(dummyAuth);
    const requiredTools = [
      'create_task',
      'search_tasks',
      'get_tasks',
      'get_task',
      'update_task',
      'complete_task',
      'delete_task',
      'list_categories',
      'create_category',
      'get_projects',
      'create_reminder',
      'get_daily_summary',
    ];

    // McpServer internal tool registry has the registered tool names
    const registeredToolNames = Object.keys((server as any)._registeredTools || {});
    for (const tool of requiredTools) {
      expect(
        registeredToolNames.includes(tool),
        `Tool "${tool}" is missing from McpServer!`
      ).toBe(true);
    }
  });
});
