import { assertPlatform, type LoadConfigOptions, loadConfig } from './config.js';
import { adbReverse } from './driver/adb.js';
import { ArtifactRegistry } from './driver/artifacts.js';
import { resolveDevServerEnv } from './driver/dev-server.js';
import { listDevices } from './driver/devices.js';
import {
  buildDoctorResult,
  doctorHasFailures,
  formatDoctorReport,
  runDoctor,
} from './driver/doctor.js';
import { type FlowTemplate, validateFlow, writeFlow } from './driver/flow-io.js';
import { formatFlowList, listFlows } from './driver/flows.js';
import {
  tailLogsSnapshot as captureLogSnapshot,
  collectLogs,
  type LogSource,
  tailLogsFollow,
} from './driver/logs.js';
import {
  runMaestroFlowCore,
  runMaestroFlows,
  runMaestroFlowWithContext,
} from './driver/maestro.js';
import { getMetroStatus, reloadApp } from './driver/metro.js';
import { openUrl } from './driver/open-url.js';
import { captureScreenshot } from './driver/screenshot.js';
import { bootSimulator } from './driver/simulator.js';
import { AgentError, ErrorCode } from './errors.js';
import {
  formatDoctorSummary,
  formatFlowContextHuman,
  formatFlowRunHuman,
  formatLogSnapshotHuman,
  formatSmokeRunHuman,
} from './results/format.js';
import type {
  BootSimulatorResult,
  DoctorResult,
  FlowRunContextResult,
  FlowRunResult,
  LogSnapshot,
  MetroStatusResult,
  ReloadAppResult,
  ScreenshotResult,
  SmokeRunResult,
  ValidateFlowResult,
  WriteFlowResult,
} from './results/types.js';

export class Runtime {
  readonly artifacts = new ArtifactRegistry();
  private config: ReturnType<typeof loadConfig>;
  private lastDoctor: DoctorResult | null = null;

  constructor(private readonly options: LoadConfigOptions = {}) {
    this.config = loadConfig(this.options);
  }

  private cfg() {
    return this.config;
  }

  private recordScreenshot(result: ScreenshotResult): ScreenshotResult {
    this.artifacts.recordScreenshot(result);
    return result;
  }

  listDevices() {
    return listDevices();
  }

  listFlows() {
    const config = this.cfg();
    return formatFlowList(config.flowsDir, listFlows(config.flowsDir));
  }

  screenshot(platform?: string): ScreenshotResult {
    const result = captureScreenshot(this.cfg(), assertPlatform(platform));
    return this.recordScreenshot(result);
  }

  tailLogs(platform?: string, source?: LogSource, lines?: number): string {
    const snapshot = captureLogSnapshot(this.cfg(), {
      platform: assertPlatform(platform),
      source,
      lines,
    });
    return formatLogSnapshotHuman(snapshot);
  }

  tailLogsSnapshot(platform?: string, source?: LogSource, lines?: number): LogSnapshot {
    return captureLogSnapshot(this.cfg(), {
      platform: assertPlatform(platform),
      source,
      lines,
    });
  }

  async collectLogs(
    platform?: string,
    source?: LogSource,
    lines?: number,
    durationMs?: number,
  ): Promise<LogSnapshot> {
    return collectLogs(this.cfg(), {
      platform: assertPlatform(platform),
      source,
      lines,
      durationMs,
    });
  }

  tailLogsFollow(platform?: string, source?: LogSource) {
    return tailLogsFollow(this.cfg(), {
      platform: assertPlatform(platform),
      source,
    });
  }

  runFlow(flow: string, platform?: string, env?: Record<string, string>): FlowRunResult {
    const result = runMaestroFlowCore(this.cfg(), {
      flow,
      platform: assertPlatform(platform),
      env,
    });
    if (result.screenshot) {
      this.recordScreenshot(result.screenshot);
    }
    return result;
  }

  runFlowWithContext(
    flow: string,
    platform?: string,
    env?: Record<string, string>,
    logLines?: number,
  ): FlowRunContextResult {
    const result = runMaestroFlowWithContext(this.cfg(), {
      flow,
      platform: assertPlatform(platform),
      env,
      logLines,
    });
    if (result.screenshot) {
      this.recordScreenshot(result.screenshot);
    }
    return result;
  }

  runSmoke(platform?: string, env?: Record<string, string>): SmokeRunResult {
    const config = this.cfg();
    if (!config.smokeFlows.length) {
      throw new AgentError(
        'smokeFlows is empty in mobile-agent.config.json',
        ErrorCode.NOT_CONFIGURED,
      );
    }
    const result = runMaestroFlows(config, config.smokeFlows, {
      platform: assertPlatform(platform),
      env,
    });
    for (const fail of result.failed) {
      if (fail.screenshot) {
        this.recordScreenshot(fail.screenshot);
      }
    }
    return result;
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

  metroStatus(): MetroStatusResult {
    return getMetroStatus(this.cfg());
  }

  reloadApp(): ReloadAppResult {
    return reloadApp(this.cfg());
  }

  bootSimulator(deviceName?: string): BootSimulatorResult {
    return bootSimulator(deviceName);
  }

  validateFlow(flow: string): ValidateFlowResult {
    return validateFlow(this.cfg(), flow);
  }

  writeFlow(
    flow: string,
    content?: string,
    template?: FlowTemplate,
    overwrite?: boolean,
  ): WriteFlowResult {
    return writeFlow(this.cfg(), flow, content, template, overwrite);
  }

  doctorStructured(): DoctorResult {
    this.lastDoctor = buildDoctorResult(runDoctor(this.cfg()));
    return this.lastDoctor;
  }

  doctor() {
    return formatDoctorReport(this.doctorStructured().checks);
  }

  doctorJson() {
    return JSON.stringify(this.doctorStructured(), null, 2);
  }

  doctorFailed() {
    const result = this.lastDoctor ?? this.doctorStructured();
    return doctorHasFailures(result.checks);
  }

  formatFlowRun(result: FlowRunResult): string {
    return formatFlowRunHuman(result);
  }

  formatFlowContext(result: FlowRunContextResult): string {
    return formatFlowContextHuman(result);
  }

  formatSmokeRun(result: SmokeRunResult): string {
    return formatSmokeRunHuman(result);
  }

  formatDoctor(result: DoctorResult): string {
    return formatDoctorSummary(result.checks);
  }
}

export function createRuntime(options?: LoadConfigOptions) {
  return new Runtime(options);
}
