import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CONFIG_FILENAME,
  assertPlatform,
  findConfigFile,
  loadConfig,
  parsePorts,
} from '../src/config.js';
import { ErrorCode, MobileAgentError } from '../src/errors.js';
import { handleMcpToolCall } from '../src/mcp/tools.js';
import { MobileAgentRuntime } from '../src/runtime.js';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('config', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('finds mobile-agent.config.json walking up directories', () => {
    const root = makeTempDir('mobile-agent-root-');
    tempDirs.push(root);
    const nested = path.join(root, 'apps', 'mobile');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(
      path.join(root, CONFIG_FILENAME),
      JSON.stringify({ flowsDir: 'custom/flows' }),
    );

    expect(findConfigFile(nested)).toBe(path.join(root, CONFIG_FILENAME));
  });

  it('loads file values and resolves paths from project root', () => {
    const root = makeTempDir('mobile-agent-load-');
    tempDirs.push(root);
    fs.writeFileSync(
      path.join(root, CONFIG_FILENAME),
      JSON.stringify({
        projectRoot: '.',
        flowsDir: 'tests/fixtures/flows',
        screenshotDir: 'tests/fixtures/shots',
        smokeFlows: ['a', 'b'],
        maestro: { defaultEnv: { APP_ID: 'com.example.app' } },
      }),
    );

    const config = loadConfig({ startDir: root });
    expect(config.projectRoot).toBe(root);
    expect(config.flowsDir).toBe(path.join(root, 'tests/fixtures/flows'));
    expect(config.screenshotDir).toBe(path.join(root, 'tests/fixtures/shots'));
    expect(config.smokeFlows).toEqual(['a', 'b']);
    expect(config.maestroDefaultEnv).toEqual({ APP_ID: 'com.example.app' });
  });

  it('env vars override file config', () => {
    const root = makeTempDir('mobile-agent-env-');
    tempDirs.push(root);
    fs.writeFileSync(
      path.join(root, CONFIG_FILENAME),
      JSON.stringify({ flowsDir: 'from-file' }),
    );

    const config = loadConfig({
      startDir: root,
      env: {
        MOBILE_AGENT_FLOWS_DIR: 'from-env',
      },
    });

    expect(config.flowsDir).toBe(path.join(root, 'from-env'));
  });

  it('discovers config via MOBILE_AGENT_PROJECT_ROOT from foreign cwd', () => {
    const root = makeTempDir('mobile-agent-root-env-');
    tempDirs.push(root);
    fs.writeFileSync(
      path.join(root, CONFIG_FILENAME),
      JSON.stringify({ flowsDir: 'flows' }),
    );

    const config = loadConfig({
      startDir: os.tmpdir(),
      env: { MOBILE_AGENT_PROJECT_ROOT: root },
    });

    expect(config.configPath).toBe(path.join(root, CONFIG_FILENAME));
    expect(config.flowsDir).toBe(path.join(root, 'flows'));
  });

  it('rejects invalid config schema', () => {
    const root = makeTempDir('mobile-agent-invalid-');
    tempDirs.push(root);
    fs.writeFileSync(
      path.join(root, CONFIG_FILENAME),
      JSON.stringify({ devServerUrl: { port: 'not-a-number' } }),
    );

    expect(() => loadConfig({ startDir: root })).toThrow(MobileAgentError);
    try {
      loadConfig({ startDir: root });
    } catch (error) {
      expect(error).toMatchObject({ code: ErrorCode.CONFIG_INVALID });
    }
  });

  it('assertPlatform accepts ios and android only', () => {
    expect(assertPlatform(undefined)).toBe('ios');
    expect(assertPlatform('android')).toBe('android');
    expect(() => assertPlatform('flutter')).toThrow(MobileAgentError);
  });

  it('parsePorts validates numeric range', () => {
    expect(parsePorts(['8081', '4000'])).toEqual([8081, 4000]);
    expect(() => parsePorts(['0'])).toThrow(MobileAgentError);
    expect(() => parsePorts(['70000'])).toThrow(MobileAgentError);
  });
});

describe('mcp tools', () => {
  it('returns structured error for unknown tool', async () => {
    const runtime = new MobileAgentRuntime({ startDir: process.cwd() });
    const result = await handleMcpToolCall(runtime, 'missing_tool', {});
    expect(result.isError).toBe(true);
    expect(result.text).toContain('Unknown tool');
  });
});
