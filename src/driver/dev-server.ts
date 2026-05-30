import { runCommand } from './exec.js';

export function detectLanIp(): string {
  if (process.platform === 'darwin') {
    for (const iface of ['en0', 'en1']) {
      const result = runCommand('ipconfig', ['getifaddr', iface], { allowFailure: true });
      if (result.status === 0 && result.stdout) {
        return result.stdout;
      }
    }
  }

  return '127.0.0.1';
}

export interface DevServerUrlConfig {
  scheme?: string;
  port?: number;
  hostEnv?: string;
  outputEnvKey?: string;
}

export function resolveDevServerEnv(
  config: DevServerUrlConfig | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  if (!config) {
    return {};
  }

  const hostEnv = config.hostEnv ?? 'EXPO_DEV_HOST';
  const host = env[hostEnv] ?? detectLanIp();
  const port = env.EXPO_DEV_PORT ?? String(config.port ?? 8081);
  const scheme = config.scheme ?? 'exp';
  const outputEnvKey = config.outputEnvKey ?? 'EXPO_URL';

  return { [outputEnvKey]: `${scheme}://${host}:${port}` };
}
