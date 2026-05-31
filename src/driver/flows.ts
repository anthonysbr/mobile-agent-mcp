import fs from 'node:fs';
import path from 'node:path';
import { AgentError, ErrorCode } from '../errors.js';

export function listFlows(flowsDir: string): string[] {
  if (!fs.existsSync(flowsDir)) {
    throw new AgentError(`flowsDir not found: ${flowsDir}`, ErrorCode.FLOW_NOT_FOUND);
  }

  return fs
    .readdirSync(flowsDir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .map((name) => name.replace(/\.(yaml|yml)$/, ''))
    .sort((a, b) => a.localeCompare(b));
}

export function formatFlowList(flowsDir: string, flows: string[]): string {
  if (flows.length === 0) {
    return `No flows in ${flowsDir}`;
  }
  return flows.map((flow) => path.join(flowsDir, `${flow}.yaml`)).join('\n');
}
