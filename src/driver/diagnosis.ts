import type { Diagnosis, DiagnosisCategory } from '../results/types.js';

export interface DiagnosisInput {
  maestroOutput: string;
  logs: string;
  errorCode?: string;
  metroReachable?: boolean;
}

interface Rule {
  category: DiagnosisCategory;
  test: (input: DiagnosisInput) => boolean;
  message: string;
  suggestedTools: string[];
}

const RULES: Rule[] = [
  {
    category: 'maestro_missing',
    test: (input) => input.errorCode === 'MAESTRO_NOT_FOUND',
    message: 'Maestro is not installed or not on PATH.',
    suggestedTools: ['doctor'],
  },
  {
    category: 'flow_not_found',
    test: (input) => input.errorCode === 'FLOW_NOT_FOUND',
    message: 'The requested Maestro flow was not found in flowsDir.',
    suggestedTools: ['list_flows'],
  },
  {
    category: 'simulator_not_booted',
    test: (input) =>
      /simctl|no booted|Unable to boot|booted device/i.test(input.maestroOutput) ||
      /simctl|no booted|screencap failed/i.test(input.logs),
    message: 'No booted iOS simulator detected.',
    suggestedTools: ['boot_simulator', 'list_devices'],
  },
  {
    category: 'metro_unreachable',
    test: (input) =>
      input.metroReachable === false ||
      /Unable to load script|Could not connect to development server|Metro not responding/i.test(
        `${input.maestroOutput}\n${input.logs}`,
      ),
    message: 'Metro bundler is unreachable from the device or emulator.',
    suggestedTools: ['metro_status', 'adb_reverse', 'reload_app'],
  },
  {
    category: 'element_not_found',
    test: (input) =>
      /Element not found|assertVisible|assertNotVisible|tapOn.*failed|No element/i.test(
        input.maestroOutput,
      ),
    message: 'Maestro could not find the expected UI element.',
    suggestedTools: ['screenshot', 'list_flows', 'validate_flow'],
  },
  {
    category: 'js_error',
    test: (input) =>
      /ReactNativeJS|RedBox|FATAL EXCEPTION|Invariant Violation|TypeError:|ReferenceError:/i.test(
        `${input.maestroOutput}\n${input.logs}`,
      ),
    message: 'A JavaScript or native crash was detected in the logs.',
    suggestedTools: ['collect_logs', 'screenshot'],
  },
  {
    category: 'app_not_running',
    test: (input) =>
      /logcat: no lines matched|pidof|App is not running|Process crashed|not installed/i.test(
        `${input.maestroOutput}\n${input.logs}`,
      ),
    message: 'The app does not appear to be running on the device.',
    suggestedTools: ['open_dev_url', 'open_url', 'doctor'],
  },
];

function relevantTail(text: string, maxLines = 5): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-maxLines)
    .join('\n');
}

export function diagnoseFailure(input: DiagnosisInput): Diagnosis {
  for (const rule of RULES) {
    if (rule.test(input)) {
      return {
        category: rule.category,
        message: rule.message,
        suggestedTools: rule.suggestedTools,
      };
    }
  }

  const tail = relevantTail(`${input.maestroOutput}\n${input.logs}`);
  return {
    category: 'unknown',
    message: tail ? `Unclassified failure. Recent output:\n${tail}` : 'Unclassified failure.',
    suggestedTools: ['collect_logs', 'screenshot', 'doctor'],
  };
}
