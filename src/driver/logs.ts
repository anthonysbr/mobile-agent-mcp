import { spawn } from 'node:child_process';
import type { Platform, ResolvedConfig } from '../config.js';
import { AgentError, ErrorCode } from '../errors.js';
import type { LogSnapshot } from '../results/types.js';
import { commandExists, runCommand } from './exec.js';

export type LogSource = 'metro' | 'logcat' | 'sim' | 'auto';

export interface TailLogsOptions {
  platform: Platform;
  source?: LogSource;
  lines?: number;
}

export interface CollectLogsOptions extends TailLogsOptions {
  durationMs?: number;
}

const MAX_COLLECT_DURATION_MS = 10_000;
const COLLECT_POLL_MS = 500;

export function resolveLogSource(
  platform: Platform,
  source?: LogSource,
): Exclude<LogSource, 'auto'> {
  if (source && source !== 'auto') {
    return source;
  }
  return platform === 'android' ? 'logcat' : 'sim';
}

export function applyLogFilters(text: string, filters: string[] | undefined): string {
  if (!filters?.length) {
    return text;
  }
  return text
    .split('\n')
    .filter((line) => filters.some((filter) => line.includes(filter)))
    .join('\n');
}

function metroPort(config: ResolvedConfig): number {
  return config.log?.metroPort ?? config.devServerUrl?.port ?? 8081;
}

function androidPackage(config: ResolvedConfig): string {
  const pkg = config.log?.androidPackage ?? config.maestroAppIds.android;
  if (!pkg) {
    throw new AgentError(
      'log.androidPackage or maestro.appId.android required for logcat',
      ErrorCode.NOT_CONFIGURED,
    );
  }
  return pkg;
}

export function isMetroPortOpen(port: number): boolean {
  const result = runCommand('curl', ['-sf', `http://127.0.0.1:${port}/status`], {
    allowFailure: true,
  });
  return result.status === 0;
}

function tailLogcatText(config: ResolvedConfig, lines: number): string {
  if (!commandExists('adb')) {
    throw new AgentError('adb not installed', ErrorCode.TOOL_UNAVAILABLE);
  }

  const pkg = androidPackage(config);
  const pidResult = runCommand('adb', ['shell', 'pidof', '-s', pkg], { allowFailure: true });
  const pid = pidResult.stdout.trim();

  const args = ['logcat', '-d', '-t', String(lines)];
  if (pid) {
    args.push('--pid', pid);
  }

  const result = runCommand('adb', args, { allowFailure: true });
  let output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  output = applyLogFilters(output, config.log?.filters);

  if (!output.trim()) {
    return `logcat: no lines matched (package ${pkg})`;
  }
  return output;
}

function tailSimText(lines: number, filters: string[] | undefined): string {
  if (process.platform !== 'darwin') {
    throw new AgentError('iOS sim logs require macOS', ErrorCode.TOOL_UNAVAILABLE);
  }

  const result = runCommand('log', ['show', '--style', 'compact', '--last', '1m'], {
    allowFailure: true,
    timeoutMs: 15_000,
  });

  const rows = (result.stdout || result.stderr).split('\n').slice(-lines);
  const output = applyLogFilters(rows.join('\n'), filters);
  return output.trim() || 'sim: no log lines in the last minute';
}

function buildSnapshot(
  platform: Platform,
  source: Exclude<LogSource, 'auto'>,
  text: string,
  metroReachable?: boolean,
): LogSnapshot {
  const lines = text.split('\n').filter((line) => line.length > 0);
  return {
    platform,
    source,
    text,
    lineCount: lines.length,
    truncated: false,
    metroReachable,
  };
}

function tailMetroSnapshot(config: ResolvedConfig, platform: Platform, lines: number): LogSnapshot {
  const port = metroPort(config);
  const up = isMetroPortOpen(port);
  const filters = config.log?.filters ?? ['ReactNative', 'Expo', 'Metro'];

  if (!up) {
    throw new AgentError(`Metro not responding on port ${port}`, ErrorCode.LOG_SOURCE_UNAVAILABLE);
  }

  const body = platform === 'android' ? tailLogcatText(config, lines) : tailSimText(lines, filters);
  return buildSnapshot(platform, 'metro', body, true);
}

export function tailLogsSnapshot(config: ResolvedConfig, options: TailLogsOptions): LogSnapshot {
  const lines = options.lines ?? 100;
  const source = resolveLogSource(options.platform, options.source);

  if (source === 'logcat') {
    if (options.platform !== 'android') {
      throw new AgentError('logcat is Android only', ErrorCode.VALIDATION);
    }
    return buildSnapshot(options.platform, 'logcat', tailLogcatText(config, lines));
  }

  if (source === 'sim') {
    if (options.platform !== 'ios') {
      throw new AgentError('sim logs are iOS only', ErrorCode.VALIDATION);
    }
    return buildSnapshot(options.platform, 'sim', tailSimText(lines, config.log?.filters));
  }

  return tailMetroSnapshot(config, options.platform, lines);
}

export function tailLogs(config: ResolvedConfig, options: TailLogsOptions): string {
  const snapshot = tailLogsSnapshot(config, options);
  if (snapshot.metroReachable === false) {
    return `Metro not responding\n\n${snapshot.text}`;
  }
  if (snapshot.metroReachable) {
    return `Metro reachable\n\n${snapshot.text}`;
  }
  return snapshot.text;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function collectLogs(
  config: ResolvedConfig,
  options: CollectLogsOptions,
): Promise<LogSnapshot> {
  const durationMs = Math.min(options.durationMs ?? 0, MAX_COLLECT_DURATION_MS);
  const lines = options.lines ?? 100;

  if (durationMs <= 0) {
    return tailLogsSnapshot(config, options);
  }

  const deadline = Date.now() + durationMs;
  let latest = tailLogsSnapshot(config, { ...options, lines });

  while (Date.now() < deadline) {
    await sleep(COLLECT_POLL_MS);
    const next = tailLogsSnapshot(config, { ...options, lines });
    if (next.text !== latest.text) {
      latest = { ...next, truncated: next.lineCount >= lines };
    }
  }

  return { ...latest, truncated: latest.lineCount >= lines };
}

export function tailLogsFollow(config: ResolvedConfig, options: TailLogsOptions): Promise<number> {
  const source = resolveLogSource(options.platform, options.source);

  if (source === 'logcat') {
    if (options.platform !== 'android') {
      return Promise.reject(new AgentError('logcat is Android only', ErrorCode.VALIDATION));
    }
    if (!commandExists('adb')) {
      return Promise.reject(new AgentError('adb not installed', ErrorCode.TOOL_UNAVAILABLE));
    }
    const pkg = androidPackage(config);
    const pidResult = runCommand('adb', ['shell', 'pidof', '-s', pkg], { allowFailure: true });
    const pid = pidResult.stdout.trim();
    const args = pid ? ['logcat', '--pid', pid] : ['logcat'];
    return streamCommand('adb', args);
  }

  if (source === 'sim') {
    if (process.platform !== 'darwin') {
      return Promise.reject(
        new AgentError('iOS sim logs require macOS', ErrorCode.TOOL_UNAVAILABLE),
      );
    }
    return streamCommand('log', ['stream', '--style', 'compact']);
  }

  return Promise.reject(
    new AgentError('follow mode supports logcat or sim only', ErrorCode.VALIDATION),
  );
}

function streamCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

export function checkMetroLog(config: ResolvedConfig): { ok: boolean; message: string } {
  const port = metroPort(config);
  const up = isMetroPortOpen(port);
  return {
    ok: up,
    message: up ? `Metro on :${port}` : `Metro not on :${port}`,
  };
}

export function checkLogcatAvailable(): { ok: boolean; message: string } {
  if (!commandExists('adb')) {
    return { ok: false, message: 'adb not installed' };
  }
  const adb = runCommand('adb', ['devices'], { allowFailure: true });
  const hasDevice = adb.stdout.split('\n').some((line) => line.trim().endsWith('device'));
  return {
    ok: hasDevice,
    message: hasDevice ? 'logcat ready' : 'adb installed but no device',
  };
}

export function checkSimLogAvailable(): { ok: boolean; message: string } {
  if (process.platform !== 'darwin') {
    return { ok: false, message: 'sim logs require macOS' };
  }
  const booted = runCommand('xcrun', ['simctl', 'list', 'devices', 'booted'], {
    allowFailure: true,
  });
  const hasBooted = booted.stdout.includes('Booted');
  return {
    ok: hasBooted,
    message: hasBooted ? 'sim log stream ready' : 'no booted iOS simulator',
  };
}

export { metroPort };
