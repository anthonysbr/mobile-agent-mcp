import { AgentError, ErrorCode } from '../errors.js';
import { commandExists, runCommand } from './exec.js';

export function adbReverse(ports: number[]): string {
  if (!commandExists('adb')) {
    throw new AgentError('adb not installed', ErrorCode.TOOL_UNAVAILABLE);
  }

  for (const port of ports) {
    runCommand('adb', ['reverse', `tcp:${port}`, `tcp:${port}`]);
  }

  return `adb reverse ok (${ports.join(', ')})`;
}
