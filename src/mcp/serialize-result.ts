import type { ArtifactRegistry } from '../driver/artifacts.js';
import type { AgentEnvelope, ScreenshotResult } from '../results/types.js';

export interface McpContentBlock {
  type: 'text' | 'image';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface McpToolResponse {
  content: McpContentBlock[];
  isError?: boolean;
}

export function serializeEnvelope<T>(
  envelope: AgentEnvelope<T>,
  isError?: boolean,
): McpToolResponse {
  const failed = isError ?? !envelope.ok;
  return {
    content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
    ...(failed ? { isError: true } : {}),
  };
}

function attachScreenshotToEnvelope<T extends { screenshot?: ScreenshotResult | null }>(
  envelope: AgentEnvelope<T>,
  artifacts: ArtifactRegistry,
): AgentEnvelope<T & { screenshot?: ScreenshotResult | null }> {
  const screenshot = envelope.data.screenshot;
  if (!screenshot) {
    return envelope;
  }

  const read = artifacts.readScreenshotBase64(screenshot);
  if (!read.omitted) {
    return envelope;
  }

  return {
    ...envelope,
    data: {
      ...envelope.data,
      screenshot: { ...screenshot, imageOmitted: read.omitted },
    },
  };
}

export function serializeWithScreenshot<T extends { screenshot?: ScreenshotResult | null }>(
  envelope: AgentEnvelope<T>,
  artifacts: ArtifactRegistry,
  isError?: boolean,
): McpToolResponse {
  const payload = attachScreenshotToEnvelope(envelope, artifacts);
  const screenshot = payload.data.screenshot;
  const content: McpContentBlock[] = [{ type: 'text', text: JSON.stringify(payload, null, 2) }];

  if (screenshot) {
    const read = artifacts.readScreenshotBase64(screenshot);
    if (read.data) {
      content.push({ type: 'image', data: read.data, mimeType: 'image/png' });
    }
  }

  const failed = isError ?? !envelope.ok;
  return {
    content,
    ...(failed ? { isError: true } : {}),
  };
}

export function serializeScreenshotResult(
  envelope: AgentEnvelope<ScreenshotResult>,
  artifacts: ArtifactRegistry,
): McpToolResponse {
  const read = artifacts.readScreenshotBase64(envelope.data);
  const payload = read.omitted
    ? { ...envelope, data: { ...envelope.data, imageOmitted: read.omitted } }
    : envelope;

  const content: McpContentBlock[] = [{ type: 'text', text: JSON.stringify(payload, null, 2) }];
  if (read.data) {
    content.push({ type: 'image', data: read.data, mimeType: 'image/png' });
  }

  return { content };
}

export function serializeText(text: string, isError?: boolean): McpToolResponse {
  return {
    content: [{ type: 'text', text }],
    ...(isError ? { isError: true } : {}),
  };
}

export function serializeError(message: string): McpToolResponse {
  return serializeText(message, true);
}
