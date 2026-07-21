import type { Platform } from '../config.js';
import type { DoctorCheck } from '../driver/doctor.js';
import type { LogSource } from '../driver/logs.js';

export const SCHEMA_VERSION = 1 as const;

export type DiagnosisCategory =
  | 'metro_unreachable'
  | 'js_error'
  | 'element_not_found'
  | 'app_not_running'
  | 'simulator_not_booted'
  | 'flow_not_found'
  | 'maestro_missing'
  | 'unknown';

export interface Diagnosis {
  category: DiagnosisCategory;
  message: string;
  suggestedTools: string[];
}

export interface AgentEnvelope<T> {
  schemaVersion: typeof SCHEMA_VERSION;
  ok: boolean;
  summary: string;
  data: T;
}

export interface ScreenshotResult {
  path: string;
  platform: Platform;
  capturedAt: string;
  imageOmitted?: 'too_large' | 'missing';
}

export interface FlowRunResult {
  flow: string;
  flowPath: string;
  platform: Platform;
  exitCode: number;
  stdout: string;
  stderr: string;
  env: Record<string, string>;
  screenshot: ScreenshotResult | null;
  ok: boolean;
}

export interface FlowRunContextResult extends FlowRunResult {
  logs: LogSnapshot;
  diagnosis: Diagnosis | null;
}

export interface SmokeFlowFailure {
  flow: string;
  exitCode: number;
  diagnosis: Diagnosis | null;
  screenshot: ScreenshotResult | null;
  stdout: string;
  stderr: string;
}

export interface SmokeRunResult {
  platform: Platform;
  passed: string[];
  failed: SmokeFlowFailure[];
  readyForCommit: boolean;
}

export interface DoctorResult {
  checks: DoctorCheck[];
  hasFailures: boolean;
  blockers: string[];
}

export interface LogSnapshot {
  platform: Platform;
  source: Exclude<LogSource, 'auto'>;
  text: string;
  lineCount: number;
  truncated: boolean;
  metroReachable?: boolean;
}

export interface MetroStatusResult {
  reachable: boolean;
  port: number;
  bundleUrl?: string;
}

export interface ReloadAppResult {
  reloaded: boolean;
  port: number;
  message: string;
}

export interface BootSimulatorResult {
  booted: boolean;
  deviceName: string;
  udid?: string;
  message: string;
}

export interface ValidateFlowResult {
  flow: string;
  flowPath: string;
  valid: boolean;
  method: 'maestro_dry_run' | 'syntax';
  issues: string[];
}

export interface WriteFlowResult {
  flow: string;
  flowPath: string;
  written: boolean;
  overwritten: boolean;
}

export function envelope<T>(ok: boolean, summary: string, data: T): AgentEnvelope<T> {
  return { schemaVersion: SCHEMA_VERSION, ok, summary, data };
}
