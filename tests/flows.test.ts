import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { formatFlowList, listFlows } from '../src/driver/flows.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('listFlows', () => {
  it('lists yaml flow names sorted', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-flows-list-'));
    tempDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'b-flow.yaml'), '');
    fs.writeFileSync(path.join(dir, 'a-flow.yml'), '');

    expect(listFlows(dir)).toEqual(['a-flow', 'b-flow']);
    expect(formatFlowList(dir, listFlows(dir))).toContain('a-flow.yaml');
  });
});
