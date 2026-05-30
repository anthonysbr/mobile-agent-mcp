export enum ErrorCode {
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  FLOW_NOT_FOUND = 'FLOW_NOT_FOUND',
  MAESTRO_NOT_FOUND = 'MAESTRO_NOT_FOUND',
  PLATFORM_INVALID = 'PLATFORM_INVALID',
  COMMAND_FAILED = 'COMMAND_FAILED',
  TOOL_UNAVAILABLE = 'TOOL_UNAVAILABLE',
  VALIDATION = 'VALIDATION',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
}

const EXIT_CODES: Record<ErrorCode, number> = {
  [ErrorCode.CONFIG_INVALID]: 2,
  [ErrorCode.CONFIG_NOT_FOUND]: 2,
  [ErrorCode.FLOW_NOT_FOUND]: 3,
  [ErrorCode.MAESTRO_NOT_FOUND]: 4,
  [ErrorCode.PLATFORM_INVALID]: 5,
  [ErrorCode.COMMAND_FAILED]: 6,
  [ErrorCode.TOOL_UNAVAILABLE]: 4,
  [ErrorCode.VALIDATION]: 5,
  [ErrorCode.NOT_CONFIGURED]: 2,
};

export class MobileAgentError extends Error {
  readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MobileAgentError';
    this.code = code;
  }

  exitCode(): number {
    return EXIT_CODES[this.code] ?? 1;
  }
}

export function isMobileAgentError(error: unknown): error is MobileAgentError {
  return error instanceof MobileAgentError;
}

export function formatError(error: unknown): string {
  if (isMobileAgentError(error)) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getExitCode(error: unknown): number {
  if (isMobileAgentError(error)) {
    return error.exitCode();
  }
  return 1;
}
