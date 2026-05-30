import fs from 'node:fs';
import path from 'node:path';
import type { Platform, ResolvedConfig } from '../config.js';
import { AgentError, ErrorCode } from '../errors.js';
import { runCommand } from './exec.js';

export function captureScreenshot(config: ResolvedConfig, platform: Platform): string {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(config.screenshotDir, `${platform}-${timestamp}.png`);

  if (platform === 'ios') {
    if (process.platform !== 'darwin') {
      throw new AgentError(
        'iOS screenshots require macOS with xcrun simctl',
        ErrorCode.TOOL_UNAVAILABLE,
      );
    }
    runCommand('xcrun', ['simctl', 'io', 'booted', 'screenshot', outputPath]);
  } else {
    const result = runCommand('adb', ['exec-out', 'screencap', '-p'], {
      allowFailure: true,
      encoding: 'buffer',
    });
    if (result.status !== 0 || !result.stdoutBuffer?.length) {
      throw new AgentError(
        result.stderr || result.stdout || 'adb screencap failed',
        ErrorCode.COMMAND_FAILED,
      );
    }
    fs.writeFileSync(outputPath, result.stdoutBuffer);
  }

  return outputPath;
}
