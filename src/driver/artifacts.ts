import fs from 'node:fs';
import type { Platform } from '../config.js';
import type { ScreenshotResult } from '../results/types.js';

export const SCREENSHOT_RESOURCE_URI = 'mobile-agent://screenshot/latest';
export const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024;

export class ArtifactRegistry {
  private latestScreenshot: ScreenshotResult | null = null;

  recordScreenshot(result: ScreenshotResult): void {
    this.latestScreenshot = result;
  }

  getLatestScreenshot(): ScreenshotResult | null {
    return this.latestScreenshot;
  }

  readScreenshotBase64(result: ScreenshotResult): {
    data: string;
    omitted?: 'too_large' | 'missing';
  } {
    if (!fs.existsSync(result.path)) {
      return { data: '', omitted: 'missing' };
    }

    const stat = fs.statSync(result.path);
    if (stat.size > MAX_INLINE_IMAGE_BYTES) {
      return { data: '', omitted: 'too_large' };
    }

    return { data: fs.readFileSync(result.path).toString('base64') };
  }

  readLatestScreenshotBytes(): Buffer | null {
    const latest = this.latestScreenshot;
    if (!latest || !fs.existsSync(latest.path)) {
      return null;
    }
    return fs.readFileSync(latest.path);
  }
}

export function formatScreenshotSummary(result: ScreenshotResult): string {
  return `Screenshot saved: ${result.path} (${result.platform})`;
}

export function makeScreenshotResult(path: string, platform: Platform): ScreenshotResult {
  return {
    path,
    platform,
    capturedAt: new Date().toISOString(),
  };
}
