import fs from 'node:fs';
import path from 'node:path';
import type { Platform, ResolvedConfig } from '../config.js';
import { ErrorCode, MobileAgentError } from '../errors.js';
import { commandExists, runCommand } from './exec.js';
import { resolveDevServerEnv } from './dev-server.js';
import { captureScreenshot } from './screenshot.js';

export interface RunFlowOptions {
  flow: string;
  platform?: Platform;
  env?: Record<string, string>;
  captureAfter?: boolean;
}

const DEFAULT_MAESTRO_TIMEOUT_MS = 10 * 60 * 1000;

function resolveFlowPath(config: ResolvedConfig, flow: string): string {
  const withYaml = flow.endsWith('.yaml') || flow.endsWith('.yml') ? flow : `${flow}.yaml`;
  const direct = path.join(config.flowsDir, withYaml);
  if (fs.existsSync(direct)) {
    return direct;
  }

  const bare = path.join(config.flowsDir, flow);
  if (fs.existsSync(bare)) {
    return bare;
  }

  throw new MobileAgentError(
    `Flow not found: ${flow} (looked in ${config.flowsDir})`,
    ErrorCode.FLOW_NOT_FOUND,
  );
}

export function requireMaestro(bin: string): void {
  if (!commandExists(bin)) {
    throw new MobileAgentError(
      `Maestro not found (${bin}). Install: curl -Ls "https://get.maestro.mobile.dev" | bash`,
      ErrorCode.MAESTRO_NOT_FOUND,
    );
  }
}

export function runMaestroFlow(config: ResolvedConfig, options: RunFlowOptions): string {
  requireMaestro(config.maestroBin);

  const platform = options.platform ?? 'ios';
  const flowPath = resolveFlowPath(config, options.flow);
  const appId = config.maestroAppIds[platform];
  const mergedEnv: Record<string, string> = {
    ...resolveDevServerEnv(config.devServerUrl),
    ...config.maestroDefaultEnv,
    ...(appId ? { MAESTRO_APP_ID: appId } : {}),
    ...options.env,
  };

  const args = ['test'];
  for (const [key, value] of Object.entries(mergedEnv)) {
    args.push('-e', `${key}=${value}`);
  }

  const device = process.env.MAESTRO_DEVICE;
  if (device) {
    args.push('--device', device);
  }

  args.push(flowPath);

  const header = [
    `[mobile-agent] Running ${flowPath}`,
    `[mobile-agent] platform=${platform}`,
    `[mobile-agent] projectRoot=${config.projectRoot}`,
    `[mobile-agent] env=${Object.keys(mergedEnv).join(', ') || '(none)'}`,
  ].join('\n');

  const timeoutMs = Number(process.env.MAESTRO_TIMEOUT_MS ?? DEFAULT_MAESTRO_TIMEOUT_MS);
  const result = runCommand(config.maestroBin, args, {
    cwd: config.projectRoot,
    allowFailure: true,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_MAESTRO_TIMEOUT_MS,
  });

  if (options.captureAfter !== false) {
    try {
      captureScreenshot(config, platform);
    } catch {
      // Screenshot failure should not mask flow result.
    }
  }

  const output = [header, result.stdout, result.stderr].filter(Boolean).join('\n');

  if (result.status !== 0) {
    throw new MobileAgentError(
      output || `Maestro exited with code ${result.status}`,
      ErrorCode.COMMAND_FAILED,
    );
  }

  return output;
}

export function runMaestroFlows(
  config: ResolvedConfig,
  flows: string[],
  options: Omit<RunFlowOptions, 'flow'>,
): string {
  const outputs: string[] = [];
  for (const flow of flows) {
    outputs.push(runMaestroFlow(config, { ...options, flow }));
  }
  return outputs.join('\n\n');
}
