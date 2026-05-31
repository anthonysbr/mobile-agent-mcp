import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from '../src/config.js';
import { applyLogFilters, resolveLogSource } from '../src/driver/logs.js';

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
  spawn: vi.fn(),
}));

const { tailLogs } = await import('../src/driver/logs.js');

afterEach(() => {
  spawnSync.mockReset();
});

function makeConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    projectRoot: '/tmp/project',
    flowsDir: '/tmp/project/flows',
    screenshotDir: '/tmp/project/shots',
    smokeFlows: [],
    maestroBin: 'maestro',
    maestroDefaultEnv: {},
    maestroAppIds: { android: 'com.example.app' },
    devServerUrl: { port: 8081 },
    log: { filters: ['ReactNativeJS'], metroPort: 8081 },
    configPath: null,
    ...overrides,
  };
}

describe('log helpers', () => {
  it('resolveLogSource picks platform defaults', () => {
    expect(resolveLogSource('ios', 'auto')).toBe('sim');
    expect(resolveLogSource('android', 'auto')).toBe('logcat');
    expect(resolveLogSource('ios', 'metro')).toBe('metro');
  });

  it('applyLogFilters keeps matching lines', () => {
    const text = 'alpha\nReactNativeJS: hello\nbeta';
    expect(applyLogFilters(text, ['ReactNativeJS'])).toBe('ReactNativeJS: hello');
  });
});

describe('tailLogs logcat', () => {
  it('runs adb logcat with pid when available', () => {
    spawnSync.mockImplementation((command: string, args?: string[]) => {
      if (command === 'command' || command === 'where') {
        return { status: 0, stdout: '', stderr: '' };
      }
      if (command === 'adb' && args?.[0] === 'shell') {
        return { status: 0, stdout: '1234', stderr: '' };
      }
      if (command === 'adb' && args?.[0] === 'logcat') {
        return { status: 0, stdout: 'ReactNativeJS: boom', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    const output = tailLogs(makeConfig(), { platform: 'android', source: 'logcat', lines: 50 });
    expect(output).toContain('ReactNativeJS: boom');

    const logcatCall = spawnSync.mock.calls.find(
      (call) => call[0] === 'adb' && (call[1] as string[])?.[0] === 'logcat',
    );
    expect(logcatCall?.[1]).toContain('--pid');
    expect(logcatCall?.[1]).toContain('1234');
  });
});

describe('tailLogs metro', () => {
  it('throws when metro port is down', () => {
    spawnSync.mockImplementation((command: string) => {
      if (command === 'curl') {
        return { status: 7, stdout: '', stderr: 'failed' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    expect(() => tailLogs(makeConfig(), { platform: 'ios', source: 'metro', lines: 20 })).toThrow(
      /Metro not responding/,
    );
  });
});
