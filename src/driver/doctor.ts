import fs from 'node:fs';
import type { ResolvedConfig } from '../config.js';
import { commandExists, runCommand } from './exec.js';

export type DoctorStatus = 'ok' | 'warn' | 'fail';

export interface DoctorCheck {
  name: string;
  status: DoctorStatus;
  message: string;
}

function push(
  checks: DoctorCheck[],
  name: string,
  status: DoctorStatus,
  message: string,
): void {
  checks.push({ name, status, message });
}

export function runDoctor(config: ResolvedConfig): DoctorCheck[] {
  const checks: DoctorCheck[] = [];

  if (config.configPath) {
    push(checks, 'config', 'ok', `Found ${config.configPath}`);
  } else {
    push(
      checks,
      'config',
      'warn',
      'No mobile-agent.config.json found; env vars and defaults only',
    );
  }

  if (fs.existsSync(config.flowsDir)) {
    push(checks, 'flowsDir', 'ok', config.flowsDir);
  } else {
    push(checks, 'flowsDir', 'fail', `Missing flowsDir: ${config.flowsDir}`);
  }

  fs.mkdirSync(config.screenshotDir, { recursive: true });
  push(checks, 'screenshotDir', 'ok', config.screenshotDir);

  if (process.platform === 'darwin') {
    const simctl = runCommand('xcrun', ['simctl', 'list', 'devices', 'booted'], {
      allowFailure: true,
    });
    push(
      checks,
      'simctl',
      simctl.status === 0 ? 'ok' : 'fail',
      simctl.status === 0 ? 'xcrun simctl available' : simctl.stderr || 'simctl unavailable',
    );
  } else {
    push(checks, 'simctl', 'warn', 'iOS simctl requires macOS');
  }

  if (commandExists('adb')) {
    const adb = runCommand('adb', ['devices'], { allowFailure: true });
    const hasDevice = adb.stdout.split('\n').some((line) => line.trim().endsWith('device'));
    push(
      checks,
      'adb',
      hasDevice ? 'ok' : 'warn',
      hasDevice ? 'adb device connected' : 'adb installed but no device/emulator detected',
    );
  } else {
    push(checks, 'adb', 'warn', 'adb not installed (Android workflows unavailable)');
  }

  if (commandExists(config.maestroBin)) {
    const version = runCommand(config.maestroBin, ['--version'], { allowFailure: true });
    push(
      checks,
      'maestro',
      'ok',
      `Maestro available (${version.stdout || version.stderr || 'unknown version'})`,
    );
  } else {
    push(
      checks,
      'maestro',
      'fail',
      `Maestro not found (${config.maestroBin}). Install: curl -Ls "https://get.maestro.mobile.dev" | bash`,
    );
  }

  if (config.smokeFlows.length > 0) {
    push(checks, 'smokeFlows', 'ok', config.smokeFlows.join(', '));
  } else {
    push(checks, 'smokeFlows', 'warn', 'Nothing in smokeFlows; run-all will fail');
  }

  return checks;
}

export function formatDoctorReport(checks: DoctorCheck[]): string {
  const lines = checks.map((check) => {
    const icon = check.status === 'ok' ? 'OK' : check.status === 'warn' ? 'WARN' : 'FAIL';
    return `[${icon}] ${check.name}: ${check.message}`;
  });
  return lines.join('\n');
}

export function doctorHasFailures(checks: DoctorCheck[]): boolean {
  return checks.some((check) => check.status === 'fail');
}
