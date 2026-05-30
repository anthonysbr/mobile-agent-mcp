import { type SpawnSyncOptionsWithStringEncoding, spawnSync } from 'node:child_process';
import path from 'node:path';
import { AgentError, ErrorCode } from '../errors.js';

export interface CommandResult {
  stdout: string;
  stderr: string;
  status: number | null;
  stdoutBuffer?: Buffer;
}

export interface RunCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  allowFailure?: boolean;
  encoding?: BufferEncoding | 'buffer';
  timeoutMs?: number;
}

export function withMaestroPath(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const home = env.HOME ?? env.USERPROFILE ?? '';
  const maestroBinDir = home ? path.join(home, '.maestro', 'bin') : '';
  const pathValue = maestroBinDir ? `${env.PATH ?? ''}${path.delimiter}${maestroBinDir}` : env.PATH;
  return { ...env, PATH: pathValue };
}

function formatCommandFailure(command: string, args: string[], result: CommandResult): string {
  const joined = [command, ...args].join(' ');
  const details = [result.stdout, result.stderr].filter(Boolean).join('\n');
  return details ? `${joined}\n${details}` : `${joined} (exit ${result.status ?? 'unknown'})`;
}

export function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {},
): CommandResult {
  const encoding = options.encoding ?? 'utf-8';
  const spawnOptions =
    encoding === 'buffer'
      ? {
          cwd: options.cwd,
          env: withMaestroPath(options.env),
          timeout: options.timeoutMs,
        }
      : ({
          encoding,
          cwd: options.cwd,
          env: withMaestroPath(options.env),
          timeout: options.timeoutMs,
        } as SpawnSyncOptionsWithStringEncoding);

  const result = spawnSync(command, args, spawnOptions);

  if (result.error) {
    const code =
      result.error.name === 'ENOENT' ? ErrorCode.TOOL_UNAVAILABLE : ErrorCode.COMMAND_FAILED;
    throw new AgentError(`Failed to run ${command}: ${result.error.message}`, code, result.error);
  }

  const stdoutBuffer = Buffer.isBuffer(result.stdout) ? result.stdout : undefined;
  const stdout =
    typeof result.stdout === 'string'
      ? result.stdout.trim()
      : stdoutBuffer?.length
        ? '[binary]'
        : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
  const status = result.status;
  const commandResult: CommandResult = { stdout, stderr, status, stdoutBuffer };

  if (result.signal === 'SIGTERM' || result.signal === 'SIGKILL') {
    throw new AgentError(
      `Command timed out after ${options.timeoutMs}ms: ${command} ${args.join(' ')}`,
      ErrorCode.COMMAND_FAILED,
    );
  }

  if (status !== 0 && !options.allowFailure) {
    throw new AgentError(
      formatCommandFailure(command, args, commandResult),
      ErrorCode.COMMAND_FAILED,
    );
  }

  return commandResult;
}

export function commandExists(command: string, env?: NodeJS.ProcessEnv): boolean {
  const check = process.platform === 'win32' ? 'where' : 'command';
  const checkArgs = process.platform === 'win32' ? [command] : ['-v', command];
  const result = spawnSync(check, checkArgs, {
    encoding: 'utf-8',
    env: withMaestroPath(env),
  });
  return result.status === 0;
}
