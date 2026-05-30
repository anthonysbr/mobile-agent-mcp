import { formatError } from '../errors.js';
import type { Runtime } from '../runtime.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'list_devices',
    description: 'Booted iOS sims, Android emulators, USB devices, Maestro version.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'doctor',
    description: 'Run before a long flow. OK/WARN/FAIL on config, flows, tools.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'screenshot',
    description: 'PNG under screenshotDir. Returns absolute path.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ios', 'android'] },
      },
    },
  },
  {
    name: 'run_maestro_flow',
    description: 'Flow name or path under flowsDir. Extra env merges with config.',
    inputSchema: {
      type: 'object',
      properties: {
        flow: { type: 'string' },
        platform: { type: 'string', enum: ['ios', 'android'] },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['flow'],
    },
  },
  {
    name: 'run_smoke_flows',
    description: 'Runs smokeFlows from config, in order.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ios', 'android'] },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
  {
    name: 'adb_reverse',
    description: 'USB Android: reverse tcp ports to the host. Default 8081.',
    inputSchema: {
      type: 'object',
      properties: {
        ports: {
          type: 'array',
          items: { type: 'number' },
        },
      },
    },
  },
  {
    name: 'open_url',
    description: 'Deep link or URL on sim/device.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        platform: { type: 'string', enum: ['ios', 'android'] },
      },
      required: ['url'],
    },
  },
  {
    name: 'open_dev_url',
    description: 'Opens devServerUrl from config (e.g. exp://…).',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ios', 'android'] },
      },
    },
  },
];

function stringEnv(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'string') {
      out[key] = v;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function handleMcpToolCall(
  runtime: Runtime,
  name: string,
  args: Record<string, unknown> | undefined,
): { text: string; isError?: boolean } {
  try {
    switch (name) {
      case 'list_devices':
        return { text: runtime.listDevices() };
      case 'doctor':
        return { text: runtime.doctor(), isError: runtime.doctorFailed() };
      case 'screenshot':
        return {
          text: runtime.screenshot(typeof args?.platform === 'string' ? args.platform : undefined),
        };
      case 'run_maestro_flow': {
        const flow = args?.flow;
        if (typeof flow !== 'string' || !flow.trim()) {
          throw new Error('flow is required');
        }
        return {
          text: runtime.runFlow(
            flow,
            typeof args?.platform === 'string' ? args.platform : undefined,
            stringEnv(args?.env),
          ),
        };
      }
      case 'run_smoke_flows':
        return {
          text: runtime.runSmoke(
            typeof args?.platform === 'string' ? args.platform : undefined,
            stringEnv(args?.env),
          ),
        };
      case 'adb_reverse': {
        const ports = Array.isArray(args?.ports)
          ? args.ports.filter((port): port is number => typeof port === 'number')
          : undefined;
        return { text: runtime.adbReverse(ports) };
      }
      case 'open_url': {
        const url = args?.url;
        if (typeof url !== 'string' || !url.trim()) {
          throw new Error('url is required');
        }
        return {
          text: runtime.openUrl(
            url,
            typeof args?.platform === 'string' ? args.platform : undefined,
          ),
        };
      }
      case 'open_dev_url':
        return {
          text: runtime.openDevUrl(typeof args?.platform === 'string' ? args.platform : undefined),
        };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { text: formatError(error), isError: true };
  }
}
