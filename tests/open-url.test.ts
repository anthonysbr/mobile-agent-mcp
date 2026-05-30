import { beforeEach, describe, expect, it, vi } from 'vitest';

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
}));

const { openUrl } = await import('../src/driver/open-url.js');
const { ErrorCode } = await import('../src/errors.js');

beforeEach(() => {
  spawnSync.mockReset();
});

describe('openUrl (android)', () => {
  it('fires an intent VIEW with the url', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });

    const out = openUrl('myapp://home', 'android');

    const start = spawnSync.mock.calls.find(
      (call) => call[0] === 'adb' && (call[1] as string[])?.includes('start'),
    );
    expect(start).toBeDefined();
    expect(start![1]).toEqual([
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      'myapp://home',
    ]);
    expect(out).toBe('opened myapp://home (android)');
  });

  it('rejects an empty url', () => {
    expect(() => openUrl('   ', 'android')).toThrowError(
      expect.objectContaining({ code: ErrorCode.VALIDATION }),
    );
  });

  it('throws TOOL_UNAVAILABLE when adb is missing', () => {
    spawnSync.mockImplementation((command: string) => {
      if (command === 'command' || command === 'where') {
        return { status: 1, stdout: '', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    expect(() => openUrl('myapp://home', 'android')).toThrowError(
      expect.objectContaining({ code: ErrorCode.TOOL_UNAVAILABLE }),
    );
  });
});
