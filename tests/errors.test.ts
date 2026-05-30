import { describe, expect, it } from 'vitest';
import { AgentError, ErrorCode, formatError, getExitCode } from '../src/errors.js';

describe('errors', () => {
  it('keeps the original cause unwrapped', () => {
    const cause = new Error('boom');
    const err = new AgentError('failed', ErrorCode.COMMAND_FAILED, cause);
    expect(err.cause).toBe(cause);
  });

  it('formatError prefixes AgentError with its code', () => {
    expect(formatError(new AgentError('nope', ErrorCode.FLOW_NOT_FOUND))).toBe(
      '[FLOW_NOT_FOUND] nope',
    );
  });

  it('formatError passes through plain errors and values', () => {
    expect(formatError(new Error('plain'))).toBe('plain');
    expect(formatError('weird')).toBe('weird');
  });

  it('maps error codes to stable exit codes', () => {
    expect(getExitCode(new AgentError('x', ErrorCode.CONFIG_INVALID))).toBe(2);
    expect(getExitCode(new AgentError('x', ErrorCode.FLOW_NOT_FOUND))).toBe(3);
    expect(getExitCode(new AgentError('x', ErrorCode.MAESTRO_NOT_FOUND))).toBe(4);
    expect(getExitCode(new Error('unknown'))).toBe(1);
  });
});
