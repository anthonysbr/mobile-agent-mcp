import { AgentError, ErrorCode } from '../errors.js';
import type { BootSimulatorResult } from '../results/types.js';
import { runCommand } from './exec.js';

interface SimDevice {
  udid: string;
  name: string;
  booted: boolean;
}

function parseAvailableDevices(output: string): SimDevice[] {
  const devices: SimDevice[] = [];
  for (const line of output.split('\n')) {
    const match = line.match(/^\s*(.+?) \(([A-F0-9-]+)\) \((Booted|Shutdown)\)/);
    if (!match) {
      continue;
    }
    devices.push({
      name: match[1].trim(),
      udid: match[2],
      booted: match[3] === 'Booted',
    });
  }
  return devices;
}

function pickDevice(devices: SimDevice[], deviceName?: string): SimDevice | null {
  if (deviceName) {
    return devices.find((d) => d.name === deviceName) ?? null;
  }

  const booted = devices.find((d) => d.booted);
  if (booted) {
    return booted;
  }

  return (
    devices.find((d) => /iPhone/i.test(d.name)) ??
    devices.find((d) => /iPad/i.test(d.name)) ??
    devices[0] ??
    null
  );
}

export function bootSimulator(deviceName?: string): BootSimulatorResult {
  if (process.platform !== 'darwin') {
    throw new AgentError('iOS simulators require macOS', ErrorCode.TOOL_UNAVAILABLE);
  }

  const listed = runCommand('xcrun', ['simctl', 'list', 'devices', 'available'], {
    allowFailure: true,
  });

  if (listed.status !== 0) {
    throw new AgentError(listed.stderr || 'simctl list failed', ErrorCode.COMMAND_FAILED);
  }

  const devices = parseAvailableDevices(listed.stdout);
  const target = pickDevice(devices, deviceName);

  if (!target) {
    throw new AgentError(
      deviceName ? `Simulator not found: ${deviceName}` : 'No available iOS simulators found',
      ErrorCode.TOOL_UNAVAILABLE,
    );
  }

  if (target.booted) {
    return {
      booted: true,
      deviceName: target.name,
      udid: target.udid,
      message: `Simulator already booted: ${target.name}`,
    };
  }

  const boot = runCommand('xcrun', ['simctl', 'boot', target.udid], { allowFailure: true });
  if (boot.status !== 0 && !/current state Booted/i.test(boot.stderr)) {
    throw new AgentError(
      boot.stderr || boot.stdout || 'simctl boot failed',
      ErrorCode.COMMAND_FAILED,
    );
  }

  runCommand('open', ['-a', 'Simulator'], { allowFailure: true });

  return {
    booted: true,
    deviceName: target.name,
    udid: target.udid,
    message: `Booted simulator: ${target.name}`,
  };
}
