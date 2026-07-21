import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from '../src/config.js';
import { validateFlow, writeFlow } from '../src/driver/flow-io.js';
import { ErrorCode } from '../src/errors.js';

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
}));

const tempDirs: string[] = [];

function makeConfig(root: string): ResolvedConfig {
  return {
    projectRoot: root,
    flowsDir: path.join(root, 'flows'),
    screenshotDir: path.join(root, 'shots'),
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

describe('flow-io', () => {
  it('blocks path traversal in flow names', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-flowio-'));
    tempDirs.push(root);
    fs.mkdirSync(path.join(root, 'flows'), { recursive: true });
    expect(() => writeFlow(makeConfig(root), '../escape', undefined, 'smoke')).toThrow(
      expect.objectContaining({ code: ErrorCode.VALIDATION }),
    );
  });

  it('writes and validates a flow', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-flowio-'));
    tempDirs.push(root);
    const config = makeConfig(root);

    const written = writeFlow(config, 'login', undefined, 'login');
    expect(written.written).toBe(true);
    expect(fs.existsSync(written.flowPath)).toBe(true);

    spawnSync.mockImplementation((command: string) => {
      if (command === 'command' || command === 'where') {
        return { status: 0, stdout: '', stderr: '' };
      }
      if (command === 'maestro') {
        return { status: 0, stdout: '', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    const valid = validateFlow(config, 'login');
    expect(valid.valid).toBe(true);
    expect(valid.method).toBe('maestro_dry_run');
  });

  it('rejects overwrite by default', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-flowio-'));
    tempDirs.push(root);
    const config = makeConfig(root);
    writeFlow(config, 'smoke', undefined, 'smoke');
    expect(() => writeFlow(config, 'smoke', undefined, 'smoke')).toThrow(
      expect.objectContaining({ code: ErrorCode.VALIDATION }),
    );
  });
});
