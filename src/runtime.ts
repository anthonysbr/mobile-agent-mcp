import { assertPlatform, type LoadConfigOptions, loadConfig } from './config.js';
import { adbReverse } from './driver/adb.js';
import { resolveDevServerEnv } from './driver/dev-server.js';
import { listDevices } from './driver/devices.js';
import {
  type DoctorCheck,
  doctorHasFailures,
  formatDoctorReport,
  runDoctor,
} from './driver/doctor.js';
import { runMaestroFlow, runMaestroFlows } from './driver/maestro.js';
import { openUrl } from './driver/open-url.js';
import { captureScreenshot } from './driver/screenshot.js';
import { AgentError, ErrorCode } from './errors.js';

export class Runtime {
  private config: ReturnType<typeof loadConfig>;
  private lastDoctor: DoctorCheck[] | null = null;

  constructor(private readonly options: LoadConfigOptions = {}) {
    this.config = loadConfig(this.options);
  }

  private cfg() {
    return this.config;
  }

  listDevices() {
    return listDevices();
  }

  screenshot(platform?: string) {
    return captureScreenshot(this.cfg(), assertPlatform(platform));
  }

  runFlow(flow: string, platform?: string, env?: Record<string, string>) {
    return runMaestroFlow(this.cfg(), {
      flow,
      platform: assertPlatform(platform),
      env,
    });
  }

  runSmoke(platform?: string, env?: Record<string, string>) {
    const config = this.cfg();
    if (!config.smokeFlows.length) {
      throw new AgentError(
        'smokeFlows is empty in mobile-agent.config.json',
        ErrorCode.NOT_CONFIGURED,
      );
    }
    return runMaestroFlows(config, config.smokeFlows, {
      platform: assertPlatform(platform),
      env,
    });
  }

  adbReverse(ports?: number[]) {
    return adbReverse(ports ?? [8081]);
  }

  openUrl(url: string, platform?: string) {
    return openUrl(url, assertPlatform(platform));
  }

  openDevUrl(platform?: string) {
    const env = resolveDevServerEnv(this.cfg().devServerUrl);
    const url = Object.values(env)[0];
    if (!url) {
      throw new AgentError('devServerUrl missing in config', ErrorCode.NOT_CONFIGURED);
    }
    return openUrl(url, assertPlatform(platform));
  }

  doctor() {
    this.lastDoctor = runDoctor(this.cfg());
    return formatDoctorReport(this.lastDoctor);
  }

  doctorFailed() {
    const checks = this.lastDoctor ?? runDoctor(this.cfg());
    return doctorHasFailures(checks);
  }
}

export function createRuntime(options?: LoadConfigOptions) {
  return new Runtime(options);
}

export const MobileAgentRuntime = Runtime;
