import { describe, expect, it } from 'vitest';
import { resolveDevServerEnv } from '../src/driver/dev-server.js';

describe('resolveDevServerEnv', () => {
  it('returns nothing when unconfigured', () => {
    expect(resolveDevServerEnv(undefined)).toEqual({});
  });

  it('builds the url from host env and config defaults', () => {
    const env = resolveDevServerEnv(
      { scheme: 'exp', port: 8081, hostEnv: 'DEV_HOST', outputEnvKey: 'EXPO_URL' },
      { DEV_HOST: '10.0.0.5' } as NodeJS.ProcessEnv,
    );
    expect(env).toEqual({ EXPO_URL: 'exp://10.0.0.5:8081' });
  });

  it('EXPO_DEV_PORT overrides the configured port', () => {
    const env = resolveDevServerEnv({ port: 8081, hostEnv: 'DEV_HOST' }, {
      DEV_HOST: '10.0.0.5',
      EXPO_DEV_PORT: '9000',
    } as NodeJS.ProcessEnv);
    expect(env.EXPO_URL).toBe('exp://10.0.0.5:9000');
  });
});
