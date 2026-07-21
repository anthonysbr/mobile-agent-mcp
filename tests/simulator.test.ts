import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
}));

const { bootSimulator } = await import('../src/driver/simulator.js');
const { ErrorCode } = await import('../src/errors.js');

beforeEach(() => {
  spawnSync.mockReset();
  vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bootSimulator', () => {
  it('returns already booted device without rebooting', () => {
    spawnSync.mockImplementation((command: string, args?: string[]) => {
      if (command === 'xcrun' && args?.[0] === 'simctl' && args?.[1] === 'list') {
        return {
          status: 0,
          stdout: '    iPhone 16 (ABC-123) (Booted)\n',
          stderr: '',
        };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    const result = bootSimulator();
    expect(result.booted).toBe(true);
    expect(result.deviceName).toBe('iPhone 16');
    expect(spawnSync.mock.calls.some((call) => call[1]?.[0] === 'boot')).toBe(false);
  });

  it('boots a shutdown simulator', () => {
    spawnSync.mockImplementation((command: string, args?: string[]) => {
      if (command === 'xcrun' && args?.[0] === 'simctl' && args?.[1] === 'list') {
        return {
          status: 0,
          stdout: '    iPhone 16 (ABC-123) (Shutdown)\n',
          stderr: '',
        };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    const result = bootSimulator('iPhone 16');
    expect(result.booted).toBe(true);
    expect(result.udid).toBe('ABC-123');
  });

  it('throws when simulator is missing', () => {
    spawnSync.mockImplementation((command: string, args?: string[]) => {
      if (command === 'xcrun' && args?.[0] === 'simctl') {
        return { status: 0, stdout: '\n', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    expect(() => bootSimulator('Missing')).toThrow(
      expect.objectContaining({ code: ErrorCode.TOOL_UNAVAILABLE }),
    );
  });
});
