export enum ErrorCode {
  CONFIG_INVALID = 'CONFIG_INVALID',
  FLOW_NOT_FOUND = 'FLOW_NOT_FOUND',
  MAESTRO_NOT_FOUND = 'MAESTRO_NOT_FOUND',
  PLATFORM_INVALID = 'PLATFORM_INVALID',
  COMMAND_FAILED = 'COMMAND_FAILED',
  TOOL_UNAVAILABLE = 'TOOL_UNAVAILABLE',
  VALIDATION = 'VALIDATION',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
}

const exitCodes: Partial<Record<ErrorCode, number>> = {
  [ErrorCode.CONFIG_INVALID]: 2,
  [ErrorCode.FLOW_NOT_FOUND]: 3,
  [ErrorCode.MAESTRO_NOT_FOUND]: 4,
  [ErrorCode.PLATFORM_INVALID]: 5,
  [ErrorCode.COMMAND_FAILED]: 6,
  [ErrorCode.TOOL_UNAVAILABLE]: 4,
  [ErrorCode.NOT_CONFIGURED]: 2,
};

export class AgentError extends Error {
  code: ErrorCode;

  constructor(message: string, code: ErrorCode, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AgentError';
    this.code = code;
  }

  exitCode(): number {
    return exitCodes[this.code] ?? 1;
  }
}

export const MobileAgentError = AgentError;

export function formatError(error: unknown): string {
  if (error instanceof AgentError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getExitCode(error: unknown): number {
  return error instanceof AgentError ? error.exitCode() : 1;
}
