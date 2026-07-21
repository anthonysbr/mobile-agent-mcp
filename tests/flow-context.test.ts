import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from '../src/config.js';
import { runMaestroFlowWithContext } from '../src/driver/maestro.js';

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
}));

const tempDirs: string[] = [];

function flowsDirWith(...flows: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-ctx-'));
  tempDirs.push(dir);
  for (const flow of flows) {
    fs.writeFileSync(path.join(dir, flow), 'appId: x\n---\n- launchApp\n');
  }
  return dir;
}

function makeConfig(flowsDir: string): ResolvedConfig {
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
  };
}

beforeEach(() => {
  spawnSync.mockReset();
});

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('runMaestroFlowWithContext', () => {
  it('attaches diagnosis and logs on failure', () => {
    spawnSync.mockImplementation((command: string, args?: string[]) => {
      if (command === 'command' || command === 'where') {
        return { status: 0, stdout: '', stderr: '' };
      }
      if (command === 'maestro' && args?.[0] === 'test') {
        return { status: 1, stdout: '', stderr: 'Element not found: Login' };
      }
      if (command === 'log') {
        return { status: 0, stdout: 'ReactNativeJS: ignored', stderr: '' };
      }
      if (command === 'xcrun') {
        return { status: 0, stdout: 'saved', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    const flowsDir = flowsDirWith('login.yaml');
    const result = runMaestroFlowWithContext(makeConfig(flowsDir), {
      flow: 'login',
      platform: 'ios',
      logLines: 20,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnosis?.category).toBe('element_not_found');
    expect(result.logs.lineCount).toBeGreaterThan(0);
  });
});
