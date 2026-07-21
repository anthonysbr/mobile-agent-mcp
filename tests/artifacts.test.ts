import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ArtifactRegistry, makeScreenshotResult } from '../src/driver/artifacts.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('ArtifactRegistry', () => {
  it('records and reads latest screenshot', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-art-'));
    tempDirs.push(dir);
    const file = path.join(dir, 'shot.png');
    fs.writeFileSync(file, Buffer.from('png-bytes'));

    const registry = new ArtifactRegistry();
    const result = makeScreenshotResult(file, 'ios');
    registry.recordScreenshot(result);

    expect(registry.getLatestScreenshot()?.path).toBe(file);
    expect(registry.readLatestScreenshotBytes()?.toString()).toBe('png-bytes');
    expect(registry.readScreenshotBase64(result).data).toBe(
      Buffer.from('png-bytes').toString('base64'),
    );
  });

  it('marks missing and too_large screenshots', () => {
    const registry = new ArtifactRegistry();
    const missing = makeScreenshotResult('/tmp/does-not-exist.png', 'android');
    expect(registry.readScreenshotBase64(missing).omitted).toBe('missing');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-big-'));
    tempDirs.push(dir);
    const big = path.join(dir, 'big.png');
    fs.writeFileSync(big, Buffer.alloc(5 * 1024 * 1024));
    const result = makeScreenshotResult(big, 'android');
    expect(registry.readScreenshotBase64(result).omitted).toBe('too_large');
  });
});
