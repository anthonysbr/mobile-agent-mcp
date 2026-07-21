import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ArtifactRegistry, makeScreenshotResult } from '../src/driver/artifacts.js';
import {
  serializeEnvelope,
  serializeScreenshotResult,
  serializeWithScreenshot,
} from '../src/mcp/serialize-result.js';
import { envelope } from '../src/results/types.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('serialize-result', () => {
  it('serializes envelope JSON', () => {
    const result = serializeEnvelope(envelope(true, 'ok', { value: 1 }));
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text ?? '')).toMatchObject({
      schemaVersion: 1,
      ok: true,
      data: { value: 1 },
    });
  });

  it('includes inline image for screenshots', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-ser-'));
    tempDirs.push(dir);
    const file = path.join(dir, 'shot.png');
    fs.writeFileSync(file, Buffer.from('abc'));

    const artifacts = new ArtifactRegistry();
    const screenshot = makeScreenshotResult(file, 'ios');
    artifacts.recordScreenshot(screenshot);

    const result = serializeScreenshotResult(envelope(true, 'shot', screenshot), artifacts);

    expect(result.content).toHaveLength(2);
    expect(result.content[1]).toMatchObject({ type: 'image', mimeType: 'image/png' });
  });

  it('marks failures as isError', () => {
    const result = serializeWithScreenshot(
      envelope(false, 'failed', {
        flow: 'x',
        flowPath: '/x.yaml',
        platform: 'ios',
        exitCode: 1,
        stdout: '',
        stderr: 'fail',
        env: {},
        screenshot: null,
        ok: false,
      }),
      new ArtifactRegistry(),
    );
    expect(result.isError).toBe(true);
  });
});
