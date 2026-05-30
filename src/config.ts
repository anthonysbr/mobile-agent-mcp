import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ErrorCode, MobileAgentError } from './errors.js';

export const CONFIG_FILENAME = 'mobile-agent.config.json';

export type Platform = 'ios' | 'android';

const DevServerUrlSchema = z.object({
  scheme: z.string().min(1).optional(),
  port: z.number().int().positive().max(65535).optional(),
  hostEnv: z.string().min(1).optional(),
  outputEnvKey: z.string().min(1).optional(),
});

const ConfigFileSchema = z.object({
  projectRoot: z.string().min(1).optional(),
  flowsDir: z.string().min(1).optional(),
  screenshotDir: z.string().min(1).optional(),
  smokeFlows: z.array(z.string().min(1)).optional(),
  devServerUrl: DevServerUrlSchema.optional(),
  maestro: z
    .object({
      bin: z.string().min(1).optional(),
      defaultEnv: z.record(z.string(), z.string()).optional(),
      appId: z
        .object({
          ios: z.string().min(1).optional(),
          android: z.string().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
});

export type MobileAgentConfigFile = z.infer<typeof ConfigFileSchema>;

export interface ResolvedConfig {
  projectRoot: string;
  flowsDir: string;
  screenshotDir: string;
  smokeFlows: string[];
  maestroBin: string;
  maestroDefaultEnv: Record<string, string>;
  maestroAppIds: Partial<Record<Platform, string>>;
  devServerUrl: MobileAgentConfigFile['devServerUrl'];
  configPath: string | null;
}

const DEFAULT_FLOWS_DIR = 'e2e/maestro/flows';
const DEFAULT_SCREENSHOT_DIR = 'artifacts/mobile-screenshots';

function readConfigFile(filePath: string): MobileAgentConfigFile {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new MobileAgentError(
      `Unable to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.CONFIG_INVALID,
      { cause: error },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new MobileAgentError(
      `Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.CONFIG_INVALID,
      { cause: error },
    );
  }

  const result = ConfigFileSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new MobileAgentError(
      `Invalid ${CONFIG_FILENAME} at ${filePath}: ${details}`,
      ErrorCode.CONFIG_INVALID,
    );
  }

  return result.data;
}

export function findConfigFile(startDir: string = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (dir === root) {
      break;
    }
    dir = path.dirname(dir);
  }

  return null;
}

function resolvePath(baseDir: string, value: string | undefined, fallback: string): string {
  const target = value ?? fallback;
  return path.resolve(baseDir, target);
}

export interface LoadConfigOptions {
  startDir?: string;
  overrides?: Partial<ResolvedConfig>;
  env?: NodeJS.ProcessEnv;
  /** When true, warn via thrown error if flowsDir does not exist. */
  strictPaths?: boolean;
}

export function loadConfig(options: LoadConfigOptions = {}): ResolvedConfig {
  const env = options.env ?? process.env;
  const startDir = options.startDir ?? process.cwd();
  const configSearchDir = env.MOBILE_AGENT_PROJECT_ROOT ?? startDir;
  const configPath = findConfigFile(configSearchDir);
  const fileConfig: MobileAgentConfigFile = configPath ? readConfigFile(configPath) : {};

  const configBaseDir = configPath ? path.dirname(configPath) : path.resolve(startDir);
  const projectRoot = resolvePath(
    configBaseDir,
    env.MOBILE_AGENT_PROJECT_ROOT ?? fileConfig.projectRoot,
    '.',
  );

  const flowsDir = resolvePath(
    projectRoot,
    env.MOBILE_AGENT_FLOWS_DIR ?? fileConfig.flowsDir,
    DEFAULT_FLOWS_DIR,
  );

  const screenshotDir = resolvePath(
    projectRoot,
    env.MOBILE_AGENT_SCREENSHOT_DIR ?? fileConfig.screenshotDir,
    DEFAULT_SCREENSHOT_DIR,
  );

  if (options.strictPaths && !fs.existsSync(flowsDir)) {
    throw new MobileAgentError(
      `flowsDir does not exist: ${flowsDir}. Set MOBILE_AGENT_FLOWS_DIR or update ${CONFIG_FILENAME}.`,
      ErrorCode.CONFIG_INVALID,
    );
  }

  const maestroBin = env.MAESTRO_BIN ?? fileConfig.maestro?.bin ?? 'maestro';
  const maestroDefaultEnv = fileConfig.maestro?.defaultEnv ?? {};
  const maestroAppIds = fileConfig.maestro?.appId ?? {};
  const devServerUrl = fileConfig.devServerUrl;
  const smokeFlows = fileConfig.smokeFlows ?? [];

  const resolved: ResolvedConfig = {
    projectRoot,
    flowsDir,
    screenshotDir,
    smokeFlows,
    maestroBin,
    maestroDefaultEnv,
    maestroAppIds,
    devServerUrl,
    configPath,
  };

  if (options.overrides) {
    return { ...resolved, ...options.overrides };
  }

  return resolved;
}

export function assertPlatform(value: string | undefined, fallback: Platform = 'ios'): Platform {
  if (!value || value === 'ios') {
    return 'ios';
  }
  if (value === 'android') {
    return 'android';
  }
  throw new MobileAgentError(
    `Unknown platform: ${value} (use ios or android)`,
    ErrorCode.PLATFORM_INVALID,
  );
}

export function parseEnvPairs(pairs: string[] | undefined): Record<string, string> {
  const env: Record<string, string> = {};
  for (const pair of pairs ?? []) {
    const index = pair.indexOf('=');
    if (index <= 0) {
      throw new MobileAgentError(
        `Invalid env pair: ${pair} (expected KEY=VALUE)`,
        ErrorCode.VALIDATION,
      );
    }
    env[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return env;
}

export function parsePorts(ports: string[]): number[] {
  const portArgs = ports.length > 0 ? ports : ['8081'];
  return portArgs.map((port) => {
    const value = Number(port);
    if (!Number.isInteger(value) || value <= 0 || value > 65535) {
      throw new MobileAgentError(`Invalid port: ${port}`, ErrorCode.VALIDATION);
    }
    return value;
  });
}
