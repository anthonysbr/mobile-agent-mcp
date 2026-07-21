import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from '../src/config.js';

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
}));

const { getMetroStatus, reloadApp } = await import('../src/driver/metro.js');

const config: ResolvedConfig = {
  projectRoot: '/tmp/project',
  flowsDir: '/tmp/project/flows',
  screenshotDir: '/tmp/project/shots',
  smokeFlows: [],
  maestroBin: 'maestro',
  maestroDefaultEnv: {},
  maestroAppIds: {},
  devServerUrl: { port: 8081 },
  configPath: null,
  log: { metroPort: 8081 },
};

beforeEach(() => {
  spawnSync.mockReset();
});

describe('metro', () => {
  it('reports reachable Metro with bundleUrl', () => {
    spawnSync.mockImplementation((command: string, args?: string[]) => {
      if (command === 'curl' && args?.includes('http://127.0.0.1:8081/status')) {
        return {
          status: 0,
          stdout: JSON.stringify({ bundleUrl: 'http://127.0.0.1:8081/index.bundle' }),
          stderr: '',
        };
      }
      return { status: 1, stdout: '', stderr: '' };
    });

    const status = getMetroStatus(config);
    expect(status.reachable).toBe(true);
    expect(status.bundleUrl).toContain('index.bundle');
  });

  it('reloads via Metro', () => {
    spawnSync.mockImplementation((command: string, args?: string[]) => {
      if (command !== 'curl' || !args) {
        return { status: 1, stdout: '', stderr: '' };
      }
      const url = args.find((arg) => arg.startsWith('http://')) ?? '';
      if (url.includes('/status')) {
        return { status: 0, stdout: '{}', stderr: '' };
      }
      if (url.includes('/reload')) {
        return { status: 0, stdout: 'ok', stderr: '' };
      }
      return { status: 1, stdout: '', stderr: '' };
    });

    const result = reloadApp(config);
    expect(result.reloaded).toBe(true);
  });
});
