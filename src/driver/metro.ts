import type { ResolvedConfig } from '../config.js';
import { AgentError, ErrorCode } from '../errors.js';
import type { MetroStatusResult, ReloadAppResult } from '../results/types.js';
import { runCommand } from './exec.js';
import { isMetroPortOpen, metroPort } from './logs.js';

export function getMetroStatus(config: ResolvedConfig): MetroStatusResult {
  const port = metroPort(config);
  const reachable = isMetroPortOpen(port);

  if (!reachable) {
    return { reachable: false, port };
  }

  const status = runCommand('curl', ['-sf', `http://127.0.0.1:${port}/status`], {
    allowFailure: true,
  });

  let bundleUrl: string | undefined;
  if (status.stdout) {
    try {
      const parsed = JSON.parse(status.stdout) as { bundleUrl?: string };
      bundleUrl = parsed.bundleUrl;
    } catch {
      bundleUrl = undefined;
    }
  }

  return { reachable: true, port, bundleUrl };
}

export function reloadApp(config: ResolvedConfig): ReloadAppResult {
  const port = metroPort(config);
  const reachable = isMetroPortOpen(port);

  if (!reachable) {
    return {
      reloaded: false,
      port,
      message: `Metro not reachable on port ${port}`,
    };
  }

  const reload = runCommand('curl', ['-sf', '-X', 'POST', `http://127.0.0.1:${port}/reload`], {
    allowFailure: true,
  });

  if (reload.status === 0) {
    return {
      reloaded: true,
      port,
      message: `Reload sent to Metro on port ${port}`,
    };
  }

  const fallback = runCommand('curl', ['-sf', `http://127.0.0.1:${port}/reload`], {
    allowFailure: true,
  });

  if (fallback.status === 0) {
    return {
      reloaded: true,
      port,
      message: `Reload sent to Metro on port ${port}`,
    };
  }

  throw new AgentError(
    fallback.stderr || reload.stderr || 'Metro reload failed',
    ErrorCode.COMMAND_FAILED,
  );
}
