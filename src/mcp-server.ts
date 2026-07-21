#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { listScreenshotResources, readScreenshotResource } from './mcp/resources.js';
import { handleMcpToolCallAsync, MCP_TOOLS } from './mcp/tools.js';
import { createRuntime } from './runtime.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

const runtime = createRuntime();

const server = new Server(
  { name: PACKAGE_NAME, version: PACKAGE_VERSION },
  { capabilities: { tools: {}, resources: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: MCP_TOOLS,
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: listScreenshotResources(),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== 'mobile-agent://screenshot/latest') {
    throw new Error(`Unknown resource: ${request.params.uri}`);
  }
  return readScreenshotResource(runtime.artifacts);
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleMcpToolCallAsync(
    runtime,
    name,
    (args as Record<string, unknown> | undefined) ?? undefined,
  );

  return {
    content: result.content,
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
