export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const ENVELOPE_HINT =
  'Returns JSON envelope { schemaVersion, ok, summary, data }. Screenshot tools also include an inline image when supported.';

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'doctor',
    description: `Preflight checks for config, flows, Maestro, adb/simctl, log sources. ${ENVELOPE_HINT}`,
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_devices',
    description: `Booted iOS sims, Android emulators, USB devices, Maestro version. ${ENVELOPE_HINT}`,
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_flows',
    description: `Maestro flow names available under flowsDir. ${ENVELOPE_HINT}`,
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'tail_logs',
    description: `Recent Metro, logcat, or iOS sim logs (snapshot). Prefer collect_logs for bounded polling. ${ENVELOPE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ios', 'android'] },
        source: { type: 'string', enum: ['metro', 'logcat', 'sim', 'auto'] },
        lines: { type: 'number' },
      },
    },
  },
  {
    name: 'collect_logs',
    description: `Collect logs with optional bounded polling (durationMs max 10000). ${ENVELOPE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ios', 'android'] },
        source: { type: 'string', enum: ['metro', 'logcat', 'sim', 'auto'] },
        lines: { type: 'number' },
        durationMs: { type: 'number' },
      },
    },
  },
  {
    name: 'screenshot',
    description: `Capture PNG screenshot; returns JSON plus inline image. ${ENVELOPE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ios', 'android'] },
      },
    },
  },
  {
    name: 'run_maestro_flow',
    description: `Run one Maestro flow from flowsDir. Returns structured result with optional screenshot. ${ENVELOPE_HINT}`,
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
    name: 'run_flow_with_context',
    description: `Run a flow and attach logs, screenshot, and RN-specific diagnosis on failure. ${ENVELOPE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        flow: { type: 'string' },
        platform: { type: 'string', enum: ['ios', 'android'] },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        logLines: { type: 'number' },
      },
      required: ['flow'],
    },
  },
  {
    name: 'run_smoke_flows',
    description: `Run smokeFlows from config in order; stops on first failure. ${ENVELOPE_HINT}`,
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
    name: 'metro_status',
    description: `Check Metro bundler reachability on the configured port. ${ENVELOPE_HINT}`,
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'reload_app',
    description: `Send reload to Metro on the configured port. ${ENVELOPE_HINT}`,
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'boot_simulator',
    description: `Boot an iOS simulator (first iPhone by default). ${ENVELOPE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        deviceName: { type: 'string' },
      },
    },
  },
  {
    name: 'validate_flow',
    description: `Validate a Maestro flow file under flowsDir. ${ENVELOPE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        flow: { type: 'string' },
      },
      required: ['flow'],
    },
  },
  {
    name: 'write_flow',
    description: `Write a Maestro flow under flowsDir (path traversal blocked). ${ENVELOPE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        flow: { type: 'string' },
        content: { type: 'string' },
        template: { type: 'string', enum: ['login', 'deeplink', 'smoke'] },
        overwrite: { type: 'boolean' },
      },
      required: ['flow'],
    },
  },
  {
    name: 'adb_reverse',
    description: `USB Android: reverse tcp ports to the host. Default 8081. ${ENVELOPE_HINT}`,
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
    description: `Deep link or URL on sim/device. ${ENVELOPE_HINT}`,
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
    description: `Opens devServerUrl from config (e.g. exp://…). ${ENVELOPE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ios', 'android'] },
      },
    },
  },
];
