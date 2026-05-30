import {
  assertPlatform,
  loadConfig,
  parseEnvPairs,
  parsePorts,
  type LoadConfigOptions,
  type Platform,
} from './config.js';
import { ErrorCode, MobileAgentError } from './errors.js';
import { adbReverse } from './driver/adb.js';
import {
  doctorHasFailures,
  formatDoctorReport,
  runDoctor,
} from './driver/doctor.js';
import { resolveDevServerEnv } from './driver/dev-server.js';
import { listDevices } from './driver/devices.js';
import { runMaestroFlow, runMaestroFlows } from './driver/maestro.js';
import { openUrl } from './driver/open-url.js';
import { captureScreenshot } from './driver/screenshot.js';

export interface RuntimeOptions extends LoadConfigOptions {}

export class MobileAgentRuntime {
  private cachedConfig: ReturnType<typeof loadConfig> | null = null;

  constructor(private readonly options: RuntimeOptions = {}) {}

  getConfig() {
    if (!this.cachedConfig) {
      this.cachedConfig = loadConfig(this.options);
    }
    return this.cachedConfig;
  }

  refreshConfig() {
    this.cachedConfig = null;
    return this.getConfig();
  }

  listDevices(): string {
    return listDevices();
  }

  screenshot(platform?: string): string {
    return captureScreenshot(this.getConfig(), assertPlatform(platform));
  }

  runFlow(flow: string, platform?: string, env?: Record<string, string>): string {
    return runMaestroFlow(this.getConfig(), {
      flow,
      platform: assertPlatform(platform),
      env,
    });
  }

  runSmoke(platform?: string, env?: Record<string, string>): string {
    const config = this.getConfig();
    if (config.smokeFlows.length === 0) {
      throw new MobileAgentError(
        'Add smokeFlows to mobile-agent.config.json to use run-all.',
        ErrorCode.NOT_CONFIGURED,
      );
    }
    return runMaestroFlows(config, config.smokeFlows, {
      platform: assertPlatform(platform),
      env,
    });
  }

  adbReverse(ports?: number[]): string {
    return adbReverse(ports ?? [8081]);
  }

  openUrl(url: string, platform?: string): string {
    return openUrl(url, assertPlatform(platform));
  }

  openDevUrl(platform?: string): string {
    const config = this.getConfig();
    const env = resolveDevServerEnv(config.devServerUrl);
    const url = Object.values(env)[0];
    if (!url) {
      throw new MobileAgentError(
        'Set devServerUrl in mobile-agent.config.json first.',
        ErrorCode.NOT_CONFIGURED,
      );
    }
    return openUrl(url, assertPlatform(platform));
  }

  doctor(): string {
    return formatDoctorReport(runDoctor(this.getConfig()));
  }

  doctorFailed(): boolean {
    return doctorHasFailures(runDoctor(this.getConfig()));
  }
}

export function createRuntime(options?: RuntimeOptions): MobileAgentRuntime {
  return new MobileAgentRuntime(options);
}

/** @deprecated Prefer MobileAgentRuntime */
export interface MobileAgentActions {
  listDevices(): string;
  screenshot(platform?: string): string;
  runFlow(flow: string, platform?: string, env?: Record<string, string>): string;
  runSmoke(platform?: string, env?: Record<string, string>): string;
  adbReverse(ports?: number[]): string;
  openUrl(url: string, platform?: string): string;
  openDevUrl(platform?: string): string;
  doctor(): string;
}

export function createMobileAgent(options?: RuntimeOptions): MobileAgentActions {
  const runtime = createRuntime(options);
  return {
    listDevices: () => runtime.listDevices(),
    screenshot: (platform) => runtime.screenshot(platform),
    runFlow: (flow, platform, env) => runtime.runFlow(flow, platform, env),
    runSmoke: (platform, env) => runtime.runSmoke(platform, env),
    adbReverse: (ports) => runtime.adbReverse(ports),
    openUrl: (url, platform) => runtime.openUrl(url, platform),
    openDevUrl: (platform) => runtime.openDevUrl(platform),
    doctor: () => runtime.doctor(),
  };
}

export { assertPlatform, parseEnvPairs, parsePorts };
export type { Platform };
