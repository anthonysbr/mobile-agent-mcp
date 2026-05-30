#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleMcpToolCall, MCP_TOOLS } from './mcp/tools.js';
import { createRuntime } from './runtime.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

const runtime = createRuntime();

const server = new Server(
  { name: PACKAGE_NAME, version: PACKAGE_VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: MCP_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = handleMcpToolCall(
    runtime,
    name,
    (args as Record<string, unknown> | undefined) ?? undefined,
  );

  return {
    content: [{ type: 'text', text: result.text }],
    ...(result.isError ? { isError: true } : {}),
  };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function shutdown(): void {
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((error) => {
  process.stderr.write(
    `[${PACKAGE_NAME}] fatal: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
