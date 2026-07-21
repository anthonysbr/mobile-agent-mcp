import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertPlatform,
  CONFIG_FILENAME,
  findConfigFile,
  loadConfig,
  parsePorts,
} from '../src/config.js';
import { AgentError, ErrorCode } from '../src/errors.js';
import { handleMcpToolCallAsync } from '../src/mcp/tools.js';
import { createRuntime } from '../src/runtime.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tmp(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe('config', () => {
  it('walks up to find mobile-agent.config.json', () => {
    const root = tmp('ma-root-');
    const nested = path.join(root, 'apps', 'mobile');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(root, CONFIG_FILENAME), JSON.stringify({ flowsDir: 'flows' }));
    expect(findConfigFile(nested)).toBe(path.join(root, CONFIG_FILENAME));
  });

  it('resolves paths from project root', () => {
    const root = tmp('ma-load-');
    fs.writeFileSync(
      path.join(root, CONFIG_FILENAME),
      JSON.stringify({
        flowsDir: 'e2e/flows',
        screenshotDir: 'shots',
        smokeFlows: ['a'],
        maestro: { defaultEnv: { APP_ID: 'com.example.app' } },
      }),
    );

    const cfg = loadConfig({ startDir: root });
    expect(cfg.flowsDir).toBe(path.join(root, 'e2e/flows'));
    expect(cfg.maestroDefaultEnv).toEqual({ APP_ID: 'com.example.app' });
  });

  it('MOBILE_AGENT_PROJECT_ROOT wins over cwd', () => {
    const root = tmp('ma-env-');
    fs.writeFileSync(path.join(root, CONFIG_FILENAME), JSON.stringify({ flowsDir: 'flows' }));

    const cfg = loadConfig({
      startDir: os.tmpdir(),
      env: { MOBILE_AGENT_PROJECT_ROOT: root },
    });

    expect(cfg.configPath).toBe(path.join(root, CONFIG_FILENAME));
  });

  it('rejects bad config', () => {
    const root = tmp('ma-bad-');
    fs.writeFileSync(
      path.join(root, CONFIG_FILENAME),
      JSON.stringify({ devServerUrl: { port: 'nope' } }),
    );
    expect(() => loadConfig({ startDir: root })).toThrow(AgentError);
    try {
      loadConfig({ startDir: root });
    } catch (e) {
      expect(e).toMatchObject({ code: ErrorCode.CONFIG_INVALID });
    }
  });

  it('assertPlatform', () => {
    expect(assertPlatform(undefined)).toBe('ios');
    expect(() => assertPlatform('web')).toThrow(AgentError);
  });

  it('parsePorts', () => {
    expect(parsePorts(['8081'])).toEqual([8081]);
    expect(() => parsePorts(['0'])).toThrow(AgentError);
  });
});

describe('mcp', () => {
  it('unknown tool → isError', async () => {
    const runtime = createRuntime({ startDir: process.cwd() });
    const result = await handleMcpToolCallAsync(runtime, 'nope', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
