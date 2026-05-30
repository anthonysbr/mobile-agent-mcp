import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from '../src/config.js';

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
}));

const { runMaestroFlow } = await import('../src/driver/maestro.js');
const { ErrorCode } = await import('../src/errors.js');

const tempDirs: string[] = [];

function flowsDirWith(...flows: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-flows-'));
  tempDirs.push(dir);
  for (const flow of flows) {
    fs.writeFileSync(path.join(dir, flow), 'appId: x\n---\n');
  }
  return dir;
}

function makeConfig(flowsDir: string, overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    projectRoot: path.dirname(flowsDir),
    flowsDir,
    screenshotDir: path.join(flowsDir, 'shots'),
    smokeFlows: [],
    maestroBin: 'maestro',
    maestroDefaultEnv: {},
    maestroAppIds: {},
    devServerUrl: undefined,
    configPath: null,
    ...overrides,
  };
}

/** spawnSync stub: pretend every binary exists and every command succeeds. */
function allOk() {
  spawnSync.mockImplementation((command: string) => {
    if (command === 'command' || command === 'where') {
      return { status: 0, stdout: '', stderr: '' };
    }
    return { status: 0, stdout: 'ok', stderr: '' };
  });
}

function maestroCall() {
  return spawnSync.mock.calls.find(
    (call) => call[0] === 'maestro' && Array.isArray(call[1]) && call[1][0] === 'test',
  );
}

beforeEach(() => {
  spawnSync.mockReset();
  delete process.env.MAESTRO_DEVICE;
});

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('runMaestroFlow', () => {
  it('builds maestro test args with merged env and flow path', () => {
    allOk();
    const flowsDir = flowsDirWith('login.yaml');
    const config = makeConfig(flowsDir, {
      maestroDefaultEnv: { BASE: '1' },
      maestroAppIds: { ios: 'com.example.ios' },
    });

    runMaestroFlow(config, {
      flow: 'login',
      platform: 'ios',
      env: { EXTRA: '2' },
      captureAfter: false,
    });

    const call = maestroCall();
    expect(call).toBeDefined();
    const args = call![1] as string[];
    expect(args).toContain('-e');
    expect(args).toContain('BASE=1');
    expect(args).toContain('MAESTRO_APP_ID=com.example.ios');
    expect(args).toContain('EXTRA=2');
    expect(args[args.length - 1]).toBe(path.join(flowsDir, 'login.yaml'));
    expect((call![2] as { cwd?: string }).cwd).toBe(config.projectRoot);
  });

  it('caller env overrides config defaults', () => {
    allOk();
    const flowsDir = flowsDirWith('login.yaml');
    const config = makeConfig(flowsDir, { maestroDefaultEnv: { TOKEN: 'old' } });

    runMaestroFlow(config, {
      flow: 'login',
      env: { TOKEN: 'new' },
      captureAfter: false,
    });

    const args = maestroCall()![1] as string[];
    expect(args).toContain('TOKEN=new');
    expect(args).not.toContain('TOKEN=old');
  });

  it('adds --device when MAESTRO_DEVICE is set', () => {
    allOk();
    process.env.MAESTRO_DEVICE = 'emulator-5554';
    const flowsDir = flowsDirWith('login.yaml');

    runMaestroFlow(makeConfig(flowsDir), { flow: 'login', captureAfter: false });

    const args = maestroCall()![1] as string[];
    expect(args).toContain('--device');
    expect(args).toContain('emulator-5554');
  });

  it('throws FLOW_NOT_FOUND for a missing flow', () => {
    allOk();
    const flowsDir = flowsDirWith();
    expect(() =>
      runMaestroFlow(makeConfig(flowsDir), { flow: 'ghost', captureAfter: false }),
    ).toThrowError(expect.objectContaining({ code: ErrorCode.FLOW_NOT_FOUND }));
  });

  it('throws MAESTRO_NOT_FOUND when the binary is missing', () => {
    spawnSync.mockImplementation((command: string) => {
      if (command === 'command' || command === 'where') {
        return { status: 1, stdout: '', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });
    const flowsDir = flowsDirWith('login.yaml');
    expect(() =>
      runMaestroFlow(makeConfig(flowsDir), { flow: 'login', captureAfter: false }),
    ).toThrowError(expect.objectContaining({ code: ErrorCode.MAESTRO_NOT_FOUND }));
  });

  it('throws COMMAND_FAILED when maestro exits non-zero', () => {
    spawnSync.mockImplementation((command: string, args?: string[]) => {
      if (command === 'command' || command === 'where') {
        return { status: 0, stdout: '', stderr: '' };
      }
      if (command === 'maestro' && args?.[0] === 'test') {
        return { status: 1, stdout: '', stderr: 'flow failed' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });
    const flowsDir = flowsDirWith('login.yaml');
    expect(() =>
      runMaestroFlow(makeConfig(flowsDir), { flow: 'login', captureAfter: false }),
    ).toThrowError(expect.objectContaining({ code: ErrorCode.COMMAND_FAILED }));
  });
});
