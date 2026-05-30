import { beforeEach, describe, expect, it, vi } from 'vitest';

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
}));

const { adbReverse } = await import('../src/driver/adb.js');
const { ErrorCode } = await import('../src/errors.js');

beforeEach(() => {
  spawnSync.mockReset();
});

describe('adbReverse', () => {
  it('reverses each port and reports success', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });

    const out = adbReverse([8081, 4000]);

    const reverseCalls = spawnSync.mock.calls.filter(
      (call) => call[0] === 'adb' && (call[1] as string[])?.[0] === 'reverse',
    );
    expect(reverseCalls).toHaveLength(2);
    expect(reverseCalls[0][1]).toEqual(['reverse', 'tcp:8081', 'tcp:8081']);
    expect(reverseCalls[1][1]).toEqual(['reverse', 'tcp:4000', 'tcp:4000']);
    expect(out).toBe('adb reverse ok (8081, 4000)');
  });

  it('throws TOOL_UNAVAILABLE when adb is missing', () => {
    spawnSync.mockImplementation((command: string) => {
      if (command === 'command' || command === 'where') {
        return { status: 1, stdout: '', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    expect(() => adbReverse([8081])).toThrowError(
      expect.objectContaining({ code: ErrorCode.TOOL_UNAVAILABLE }),
    );
  });
});
