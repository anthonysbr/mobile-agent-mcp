import fs from 'node:fs';
import path from 'node:path';
import type { Platform, ResolvedConfig } from '../config.js';
import { AgentError, ErrorCode } from '../errors.js';
import type { FlowRunResult, SmokeFlowFailure, SmokeRunResult } from '../results/types.js';
import { resolveDevServerEnv } from './dev-server.js';
import { diagnoseFailure } from './diagnosis.js';
import { commandExists, runCommand } from './exec.js';
import { tailLogsSnapshot } from './logs.js';
import { captureScreenshotSafe } from './screenshot.js';

export interface RunFlowOptions {
  flow: string;
  platform?: Platform;
  env?: Record<string, string>;
  captureAfter?: boolean;
}

export interface RunFlowContextOptions extends RunFlowOptions {
  logLines?: number;
}

const DEFAULT_MAESTRO_TIMEOUT_MS = 10 * 60 * 1000;

export function resolveFlowPath(config: ResolvedConfig, flow: string): string {
  const withYaml = flow.endsWith('.yaml') || flow.endsWith('.yml') ? flow : `${flow}.yaml`;
  const direct = path.join(config.flowsDir, withYaml);
  if (fs.existsSync(direct)) {
    return direct;
  }

  const bare = path.join(config.flowsDir, flow);
  if (fs.existsSync(bare)) {
    return bare;
  }

  throw new AgentError(
    `Flow not found: ${flow} (looked in ${config.flowsDir})`,
    ErrorCode.FLOW_NOT_FOUND,
  );
}

export function requireMaestro(bin: string): void {
  if (!commandExists(bin)) {
    throw new AgentError(
      `Maestro not found (${bin}). Install: curl -Ls "https://get.maestro.mobile.dev" | bash`,
      ErrorCode.MAESTRO_NOT_FOUND,
    );
  }
}

function buildMergedEnv(
  config: ResolvedConfig,
  platform: Platform,
  env?: Record<string, string>,
): Record<string, string> {
  const appId = config.maestroAppIds[platform];
  return {
    ...resolveDevServerEnv(config.devServerUrl),
    ...config.maestroDefaultEnv,
    ...(appId ? { MAESTRO_APP_ID: appId } : {}),
    ...env,
  };
}

function executeMaestro(
  config: ResolvedConfig,
  flowPath: string,
  _platform: Platform,
  mergedEnv: Record<string, string>,
): { exitCode: number; stdout: string; stderr: string } {
  const args = ['test'];
  for (const [key, value] of Object.entries(mergedEnv)) {
    args.push('-e', `${key}=${value}`);
  }

  const device = process.env.MAESTRO_DEVICE;
  if (device) {
    args.push('--device', device);
  }

  args.push(flowPath);

  const timeoutMs = Number(process.env.MAESTRO_TIMEOUT_MS ?? DEFAULT_MAESTRO_TIMEOUT_MS);
  const result = runCommand(config.maestroBin, args, {
    cwd: config.projectRoot,
    allowFailure: true,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_MAESTRO_TIMEOUT_MS,
  });

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function runMaestroFlowCore(config: ResolvedConfig, options: RunFlowOptions): FlowRunResult {
  requireMaestro(config.maestroBin);

  const platform = options.platform ?? 'ios';
  const flowPath = resolveFlowPath(config, options.flow);
  const mergedEnv = buildMergedEnv(config, platform, options.env);
  const execution = executeMaestro(config, flowPath, platform, mergedEnv);

  let screenshot = null;
  if (options.captureAfter !== false) {
    screenshot = captureScreenshotSafe(config, platform);
  }

  return {
    flow: options.flow,
    flowPath,
    platform,
    exitCode: execution.exitCode,
    stdout: execution.stdout,
    stderr: execution.stderr,
    env: mergedEnv,
    screenshot,
    ok: execution.exitCode === 0,
  };
}

export function runMaestroFlow(config: ResolvedConfig, options: RunFlowOptions): FlowRunResult {
  const result = runMaestroFlowCore(config, options);
  if (!result.ok) {
    const output = [result.flowPath, result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new AgentError(
      output || `Maestro exited with code ${result.exitCode}`,
      ErrorCode.COMMAND_FAILED,
    );
  }
  return result;
}

export function runMaestroFlowWithContext(config: ResolvedConfig, options: RunFlowContextOptions) {
  let result: FlowRunResult;
  try {
    result = runMaestroFlowCore(config, { ...options, captureAfter: true });
  } catch (error) {
    if (error instanceof AgentError && error.code === ErrorCode.FLOW_NOT_FOUND) {
      const logs = tailLogsSnapshot(config, {
        platform: options.platform ?? 'ios',
        lines: options.logLines ?? 80,
      });
      return {
        flow: options.flow,
        flowPath: '',
        platform: options.platform ?? 'ios',
        exitCode: 1,
        stdout: '',
        stderr: error.message,
        env: {},
        screenshot: null,
        ok: false,
        logs,
        diagnosis: diagnoseFailure({
          maestroOutput: error.message,
          logs: logs.text,
          errorCode: error.code,
          metroReachable: logs.metroReachable,
        }),
      };
    }
    throw error;
  }

  const logs = tailLogsSnapshot(config, {
    platform: result.platform,
    lines: options.logLines ?? 80,
  });

  const diagnosis = result.ok
    ? null
    : diagnoseFailure({
        maestroOutput: [result.stdout, result.stderr].filter(Boolean).join('\n'),
        logs: logs.text,
        metroReachable: logs.metroReachable,
      });

  if (!result.ok) {
    if (!result.screenshot) {
      result.screenshot = captureScreenshotSafe(config, result.platform);
    }
  }

  return { ...result, logs, diagnosis };
}

export function runMaestroFlows(
  config: ResolvedConfig,
  flows: string[],
  options: Omit<RunFlowOptions, 'flow'>,
): SmokeRunResult {
  const platform = options.platform ?? 'ios';
  const passed: string[] = [];
  const failed: SmokeFlowFailure[] = [];

  for (const flow of flows) {
    const result = runMaestroFlowWithContext(config, { ...options, flow, platform });
    if (result.ok) {
      passed.push(flow);
      continue;
    }

    failed.push({
      flow,
      exitCode: result.exitCode,
      diagnosis: result.diagnosis,
      screenshot: result.screenshot,
      stdout: result.stdout,
      stderr: result.stderr,
    });
    break;
  }

  return {
    platform,
    passed,
    failed,
    readyForCommit: failed.length === 0,
  };
}

export function runMaestroFlowsAll(
  config: ResolvedConfig,
  flows: string[],
  options: Omit<RunFlowOptions, 'flow'>,
): SmokeRunResult {
  const platform = options.platform ?? 'ios';
  const passed: string[] = [];
  const failed: SmokeFlowFailure[] = [];

  for (const flow of flows) {
    const result = runMaestroFlowWithContext(config, { ...options, flow, platform });
    if (result.ok) {
      passed.push(flow);
      continue;
    }

    failed.push({
      flow,
      exitCode: result.exitCode,
      diagnosis: result.diagnosis,
      screenshot: result.screenshot,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  return {
    platform,
    passed,
    failed,
    readyForCommit: failed.length === 0,
  };
}
