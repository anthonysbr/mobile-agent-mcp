import type { ArtifactRegistry } from '../driver/artifacts.js';
import { SCREENSHOT_RESOURCE_URI } from '../driver/artifacts.js';

export function listScreenshotResources() {
  return [
    {
      uri: SCREENSHOT_RESOURCE_URI,
      name: 'Latest screenshot',
      description: 'Most recent device screenshot captured by mobile-agent-mcp',
      mimeType: 'image/png',
    },
  ];
}

export function readScreenshotResource(artifacts: ArtifactRegistry) {
  const latest = artifacts.getLatestScreenshot();
  if (!latest) {
    throw new Error('No screenshot captured yet');
  }

  const bytes = artifacts.readLatestScreenshotBytes();
  if (!bytes) {
    throw new Error(`Screenshot file missing: ${latest.path}`);
  }

  return {
    contents: [
      {
        uri: SCREENSHOT_RESOURCE_URI,
        mimeType: 'image/png',
        blob: bytes.toString('base64'),
      },
    ],
  };
}
