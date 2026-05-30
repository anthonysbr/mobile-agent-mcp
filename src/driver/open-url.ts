import type { Platform } from '../config.js';
import { AgentError, ErrorCode } from '../errors.js';
import { commandExists, runCommand } from './exec.js';

export function openUrl(url: string, platform: Platform): string {
  if (!url.trim()) {
    throw new AgentError('url is required', ErrorCode.VALIDATION);
  }

  if (platform === 'ios') {
    if (process.platform !== 'darwin') {
      throw new AgentError(
        'iOS open-url requires macOS with xcrun simctl',
        ErrorCode.TOOL_UNAVAILABLE,
      );
    }

    runCommand('xcrun', ['simctl', 'bootstatus', 'booted', '-b'], { allowFailure: true });
    runCommand('open', ['-a', 'Simulator'], { allowFailure: true });
    runCommand('xcrun', ['simctl', 'openurl', 'booted', url]);
  } else {
    if (!commandExists('adb')) {
      throw new AgentError('adb required for Android open-url', ErrorCode.TOOL_UNAVAILABLE);
    }

    const result = runCommand(
      'adb',
      ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url],
      { allowFailure: true },
    );

    if (result.status !== 0) {
      throw new AgentError(
        result.stderr || result.stdout || 'adb open-url failed',
        ErrorCode.COMMAND_FAILED,
      );
    }
  }

  return `opened ${url} (${platform})`;
}
