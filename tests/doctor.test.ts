import { describe, expect, it } from 'vitest';
import { doctorHasFailures, formatDoctorJson, formatDoctorReport } from '../src/driver/doctor.js';

describe('doctor report', () => {
  it('renders OK/WARN/FAIL prefixes', () => {
    const report = formatDoctorReport([
      { name: 'config', status: 'ok', message: 'found' },
      { name: 'adb', status: 'warn', message: 'no device' },
      { name: 'maestro', status: 'fail', message: 'missing' },
    ]);
    expect(report).toBe('[OK] config: found\n[WARN] adb: no device\n[FAIL] maestro: missing');
  });

  it('flags failures only on fail status', () => {
    expect(doctorHasFailures([{ name: 'a', status: 'warn', message: '' }])).toBe(false);
    expect(doctorHasFailures([{ name: 'a', status: 'fail', message: '' }])).toBe(true);
  });

  it('formatDoctorJson returns parseable JSON', () => {
    const json = formatDoctorJson([{ name: 'config', status: 'ok', message: 'found' }]);
    expect(JSON.parse(json).checks).toHaveLength(1);
  });
});
