import type { FlowTemplate } from '../../driver/flow-io.js';
import type { LogSource } from '../../driver/logs.js';
import { formatError } from '../../errors.js';
import {
  bootSimulatorEnvelope,
  flowContextEnvelope,
  flowRunEnvelope,
  formatDoctorSummary,
  metroStatusEnvelope,
  reloadAppEnvelope,
  smokeRunEnvelope,
  validateFlowEnvelope,
  writeFlowEnvelope,
} from '../../results/format.js';
import { envelope } from '../../results/types.js';
import type { Runtime } from '../../runtime.js';
import type { McpToolResponse } from '../serialize-result.js';
import {
  serializeEnvelope,
  serializeError,
  serializeScreenshotResult,
  serializeWithScreenshot,
} from '../serialize-result.js';

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

function parseLogSourceArg(value: unknown): LogSource | undefined {
  if (value === 'metro' || value === 'logcat' || value === 'sim' || value === 'auto') {
    return value;
  }
  return undefined;
}

function platformArg(args: Record<string, unknown> | undefined): string | undefined {
  return typeof args?.platform === 'string' ? args.platform : undefined;
}

export function handleMcpToolCall(
  runtime: Runtime,
  name: string,
  args: Record<string, unknown> | undefined,
): McpToolResponse {
  try {
    switch (name) {
      case 'list_devices':
        return serializeEnvelope(envelope(true, 'Device list', { text: runtime.listDevices() }));
      case 'doctor': {
        const result = runtime.doctorStructured();
        return serializeEnvelope(
          envelope(!result.hasFailures, formatDoctorSummary(result.checks), result),
          result.hasFailures,
        );
      }
      case 'list_flows':
        return serializeEnvelope(envelope(true, 'Flow list', { text: runtime.listFlows() }));
      case 'tail_logs': {
        const snapshot = runtime.tailLogsSnapshot(
          platformArg(args),
          parseLogSourceArg(args?.source),
          typeof args?.lines === 'number' ? args.lines : undefined,
        );
        return serializeEnvelope(
          envelope(true, `Collected ${snapshot.lineCount} log line(s)`, snapshot),
        );
      }
      case 'collect_logs':
        throw new Error('collect_logs requires async handler');
      case 'screenshot': {
        const result = runtime.screenshot(platformArg(args));
        return serializeScreenshotResult(
          envelope(true, `Screenshot saved: ${result.path}`, result),
          runtime.artifacts,
        );
      }
      case 'run_maestro_flow': {
        const flow = args?.flow;
        if (typeof flow !== 'string' || !flow.trim()) {
          throw new Error('flow is required');
        }
        const result = runtime.runFlow(flow, platformArg(args), stringEnv(args?.env));
        return serializeWithScreenshot(flowRunEnvelope(result), runtime.artifacts);
      }
      case 'run_flow_with_context': {
        const flow = args?.flow;
        if (typeof flow !== 'string' || !flow.trim()) {
          throw new Error('flow is required');
        }
        const result = runtime.runFlowWithContext(
          flow,
          platformArg(args),
          stringEnv(args?.env),
          typeof args?.logLines === 'number' ? args.logLines : undefined,
        );
        return serializeWithScreenshot(flowContextEnvelope(result), runtime.artifacts);
      }
      case 'run_smoke_flows': {
        const result = runtime.runSmoke(platformArg(args), stringEnv(args?.env));
        const response = smokeRunEnvelope(result);
        const lastFail = result.failed.at(-1);
        if (lastFail?.screenshot) {
          return serializeWithScreenshot(
            { ...response, data: { ...result, screenshot: lastFail.screenshot } },
            runtime.artifacts,
          );
        }
        return serializeEnvelope(response);
      }
      case 'metro_status':
        return serializeEnvelope(metroStatusEnvelope(runtime.metroStatus()));
      case 'reload_app':
        return serializeEnvelope(reloadAppEnvelope(runtime.reloadApp()));
      case 'boot_simulator':
        return serializeEnvelope(
          bootSimulatorEnvelope(
            runtime.bootSimulator(
              typeof args?.deviceName === 'string' ? args.deviceName : undefined,
            ),
          ),
        );
      case 'validate_flow': {
        const flow = args?.flow;
        if (typeof flow !== 'string' || !flow.trim()) {
          throw new Error('flow is required');
        }
        return serializeEnvelope(validateFlowEnvelope(runtime.validateFlow(flow)));
      }
      case 'write_flow': {
        const flow = args?.flow;
        if (typeof flow !== 'string' || !flow.trim()) {
          throw new Error('flow is required');
        }
        const template =
          args?.template === 'login' || args?.template === 'deeplink' || args?.template === 'smoke'
            ? (args.template as FlowTemplate)
            : undefined;
        return serializeEnvelope(
          writeFlowEnvelope(
            runtime.writeFlow(
              flow,
              typeof args?.content === 'string' ? args.content : undefined,
              template,
              args?.overwrite === true,
            ),
          ),
        );
      }
      case 'adb_reverse': {
        const ports = Array.isArray(args?.ports)
          ? args.ports.filter((port): port is number => typeof port === 'number')
          : undefined;
        return serializeEnvelope(
          envelope(true, 'adb reverse applied', { text: runtime.adbReverse(ports) }),
        );
      }
      case 'open_url': {
        const url = args?.url;
        if (typeof url !== 'string' || !url.trim()) {
          throw new Error('url is required');
        }
        return serializeEnvelope(
          envelope(true, `Opened ${url}`, {
            text: runtime.openUrl(url, platformArg(args)),
          }),
        );
      }
      case 'open_dev_url':
        return serializeEnvelope(
          envelope(true, 'Opened dev URL', { text: runtime.openDevUrl(platformArg(args)) }),
        );
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return serializeError(formatError(error));
  }
}

export async function handleMcpToolCallAsync(
  runtime: Runtime,
  name: string,
  args: Record<string, unknown> | undefined,
): Promise<McpToolResponse> {
  if (name === 'collect_logs') {
    try {
      const snapshot = await runtime.collectLogs(
        platformArg(args),
        parseLogSourceArg(args?.source),
        typeof args?.lines === 'number' ? args.lines : undefined,
        typeof args?.durationMs === 'number' ? args.durationMs : undefined,
      );
      return serializeEnvelope(
        envelope(true, `Collected ${snapshot.lineCount} log line(s)`, snapshot),
      );
    } catch (error) {
      return serializeError(formatError(error));
    }
  }

  return handleMcpToolCall(runtime, name, args);
}
