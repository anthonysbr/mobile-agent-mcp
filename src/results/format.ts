import type { DoctorCheck } from '../driver/doctor.js';
import type {
  BootSimulatorResult,
  FlowRunContextResult,
  FlowRunResult,
  LogSnapshot,
  MetroStatusResult,
  ReloadAppResult,
  SmokeRunResult,
  ValidateFlowResult,
  WriteFlowResult,
} from './types.js';
import { envelope } from './types.js';

export function formatDoctorSummary(checks: DoctorCheck[]): string {
  const fails = checks.filter((c) => c.status === 'fail').length;
  const warns = checks.filter((c) => c.status === 'warn').length;
  if (fails > 0) {
    return `Doctor: ${fails} failure(s), ${warns} warning(s)`;
  }
  if (warns > 0) {
    return `Doctor: OK with ${warns} warning(s)`;
  }
  return 'Doctor: all checks passed';
}

export function formatFlowRunHuman(result: FlowRunResult): string {
  const header = `${result.flowPath} (${result.platform})`;
  const body = [result.stdout, result.stderr].filter(Boolean).join('\n');
  if (result.ok) {
    return [header, body].filter(Boolean).join('\n');
  }
  return [header, body || `Maestro exited with code ${result.exitCode}`].filter(Boolean).join('\n');
}

export function formatFlowContextHuman(result: FlowRunContextResult): string {
  const lines = [formatFlowRunHuman(result)];
  if (result.diagnosis) {
    lines.push(`Diagnosis [${result.diagnosis.category}]: ${result.diagnosis.message}`);
    if (result.diagnosis.suggestedTools.length) {
      lines.push(`Suggested: ${result.diagnosis.suggestedTools.join(', ')}`);
    }
  }
  if (result.logs.text) {
    lines.push('', '--- logs ---', result.logs.text);
  }
  return lines.join('\n');
}

export function formatSmokeRunHuman(result: SmokeRunResult): string {
  const lines = [
    `Smoke flows (${result.platform}): ${result.passed.length} passed, ${result.failed.length} failed`,
  ];
  for (const flow of result.passed) {
    lines.push(`  OK  ${flow}`);
  }
  for (const fail of result.failed) {
    lines.push(`  FAIL ${fail.flow}`);
    if (fail.diagnosis) {
      lines.push(`       ${fail.diagnosis.category}: ${fail.diagnosis.message}`);
    }
  }
  lines.push(result.readyForCommit ? 'Ready for commit.' : 'Not ready for commit.');
  return lines.join('\n');
}

export function formatLogSnapshotHuman(snapshot: LogSnapshot): string {
  const header =
    snapshot.metroReachable === undefined
      ? `Logs (${snapshot.source}, ${snapshot.lineCount} lines)`
      : snapshot.metroReachable
        ? `Metro reachable on port; logs (${snapshot.source})`
        : `Metro not responding; logs (${snapshot.source})`;
  return [header, '', snapshot.text].join('\n');
}

export function flowRunEnvelope(result: FlowRunResult) {
  return envelope(
    result.ok,
    result.ok ? `${result.flow} passed` : `${result.flow} failed (exit ${result.exitCode})`,
    result,
  );
}

export function flowContextEnvelope(result: FlowRunContextResult) {
  const summary = result.diagnosis
    ? `${result.flow} failed: ${result.diagnosis.message}`
    : result.ok
      ? `${result.flow} passed`
      : `${result.flow} failed (exit ${result.exitCode})`;
  return envelope(result.ok, summary, result);
}

export function smokeRunEnvelope(result: SmokeRunResult) {
  return envelope(
    result.readyForCommit,
    result.readyForCommit
      ? `All ${result.passed.length} smoke flow(s) passed`
      : `${result.failed.length} smoke flow(s) failed`,
    result,
  );
}

export function metroStatusEnvelope(result: MetroStatusResult) {
  return envelope(
    result.reachable,
    result.reachable
      ? `Metro reachable on port ${result.port}`
      : `Metro not reachable on port ${result.port}`,
    result,
  );
}

export function reloadAppEnvelope(result: ReloadAppResult) {
  return envelope(result.reloaded, result.message, result);
}

export function bootSimulatorEnvelope(result: BootSimulatorResult) {
  return envelope(result.booted, result.message, result);
}

export function validateFlowEnvelope(result: ValidateFlowResult) {
  return envelope(
    result.valid,
    result.valid
      ? `${result.flow} is valid`
      : `${result.flow} has ${result.issues.length} issue(s)`,
    result,
  );
}

export function writeFlowEnvelope(result: WriteFlowResult) {
  return envelope(
    result.written,
    result.written
      ? `Wrote ${result.flowPath}${result.overwritten ? ' (overwritten)' : ''}`
      : `Did not write ${result.flow}`,
    result,
  );
}
