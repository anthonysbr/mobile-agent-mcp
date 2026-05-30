import { commandExists, runCommand } from './exec.js';

export function listDevices(): string {
  const sections: string[] = [];

  if (process.platform === 'darwin') {
    sections.push('=== iOS Simulators (booted) ===');
    const booted = runCommand('xcrun', ['simctl', 'list', 'devices', 'booted'], { allowFailure: true });
    sections.push(booted.stdout || booted.stderr || '(none)');

    sections.push('');
    sections.push('=== iOS Simulators (available) ===');
    const available = runCommand('xcrun', ['simctl', 'list', 'devices', 'available'], { allowFailure: true });
    const filtered = available.stdout
      .split('\n')
      .filter((line) => /iPhone|iPad/.test(line))
      .slice(0, 10)
      .join('\n');
    sections.push(filtered || available.stderr || '(none)');
  } else {
    sections.push('=== iOS Simulators ===');
    sections.push('simctl requires macOS');
  }

  sections.push('');
  sections.push('=== Android (adb) ===');
  if (commandExists('adb')) {
    const adb = runCommand('adb', ['devices', '-l'], { allowFailure: true });
    sections.push(adb.stdout || adb.stderr || '(none)');
  } else {
    sections.push('adb not installed');
  }

  sections.push('');
  sections.push('=== Maestro ===');
  if (commandExists('maestro')) {
    const version = runCommand('maestro', ['--version'], { allowFailure: true });
    sections.push(`Maestro: OK (${version.stdout || version.stderr || 'unknown'})`);
  } else {
    sections.push('Maestro not found. Install: curl -Ls "https://get.maestro.mobile.dev" | bash');
  }

  return sections.join('\n');
}
