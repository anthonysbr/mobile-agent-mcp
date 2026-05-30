import { ErrorCode, MobileAgentError } from '../errors.js';
import { commandExists, runCommand } from './exec.js';

export function adbReverse(ports: number[]): string {
  if (!commandExists('adb')) {
    throw new MobileAgentError('adb not installed', ErrorCode.TOOL_UNAVAILABLE);
  }

  for (const port of ports) {
    runCommand('adb', ['reverse', `tcp:${port}`, `tcp:${port}`]);
  }

  return `[mobile-agent] adb reverse OK (${ports.join(', ')})`;
}
