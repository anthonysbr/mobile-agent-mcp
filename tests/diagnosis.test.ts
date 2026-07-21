import { describe, expect, it } from 'vitest';
import { diagnoseFailure } from '../src/driver/diagnosis.js';

describe('diagnoseFailure', () => {
  it('detects maestro missing', () => {
    const result = diagnoseFailure({
      maestroOutput: '',
      logs: '',
      errorCode: 'MAESTRO_NOT_FOUND',
    });
    expect(result.category).toBe('maestro_missing');
  });

  it('detects flow not found', () => {
    const result = diagnoseFailure({
      maestroOutput: '',
      logs: '',
      errorCode: 'FLOW_NOT_FOUND',
    });
    expect(result.category).toBe('flow_not_found');
  });

  it('detects metro unreachable', () => {
    const result = diagnoseFailure({
      maestroOutput: 'Unable to load script from assets',
      logs: '',
    });
    expect(result.category).toBe('metro_unreachable');
    expect(result.suggestedTools).toContain('adb_reverse');
  });

  it('detects js errors', () => {
    const result = diagnoseFailure({
      maestroOutput: '',
      logs: 'ReactNativeJS: TypeError: undefined is not a function',
    });
    expect(result.category).toBe('js_error');
  });

  it('detects element not found', () => {
    const result = diagnoseFailure({
      maestroOutput: 'Element not found: Login button',
      logs: '',
    });
    expect(result.category).toBe('element_not_found');
  });

  it('detects app not running', () => {
    const result = diagnoseFailure({
      maestroOutput: '',
      logs: 'logcat: no lines matched (package com.example.app)',
    });
    expect(result.category).toBe('app_not_running');
  });

  it('detects simulator not booted', () => {
    const result = diagnoseFailure({
      maestroOutput: 'adb screencap failed',
      logs: 'no booted iOS simulator',
    });
    expect(result.category).toBe('simulator_not_booted');
  });

  it('falls back to unknown with tail output', () => {
    const result = diagnoseFailure({
      maestroOutput: 'something odd happened',
      logs: 'line one\nline two',
    });
    expect(result.category).toBe('unknown');
    expect(result.message).toContain('something odd happened');
  });
});
