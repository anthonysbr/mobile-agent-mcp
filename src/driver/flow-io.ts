import fs from 'node:fs';
import path from 'node:path';
import type { ResolvedConfig } from '../config.js';
import { AgentError, ErrorCode } from '../errors.js';
import type { ValidateFlowResult, WriteFlowResult } from '../results/types.js';
import { commandExists, runCommand } from './exec.js';
import { resolveFlowPath } from './maestro.js';

export type FlowTemplate = 'login' | 'deeplink' | 'smoke';

const TEMPLATES: Record<FlowTemplate, string> = {
  login: `appId: \${APP_ID}
---
- launchApp
- assertVisible: "Login"
- tapOn: "Login"
`,
  deeplink: `appId: \${APP_ID}
---
- openLink: \${DEEP_LINK}
- assertVisible: "Home"
`,
  smoke: `appId: \${APP_ID}
---
- launchApp
- assertVisible: "Welcome"
`,
};

function assertFlowName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    throw new AgentError(`Invalid flow name: ${name}`, ErrorCode.VALIDATION);
  }
  return trimmed.replace(/\.(yaml|yml)$/, '');
}

export function resolveFlowFilePath(config: ResolvedConfig, flow: string): string {
  const safeName = assertFlowName(flow);
  const candidate = path.resolve(config.flowsDir, `${safeName}.yaml`);
  const flowsRoot = path.resolve(config.flowsDir);

  if (!candidate.startsWith(`${flowsRoot}${path.sep}`) && candidate !== flowsRoot) {
    throw new AgentError(`Flow path escapes flowsDir: ${flow}`, ErrorCode.VALIDATION);
  }

  return candidate;
}

function basicSyntaxCheck(content: string): string[] {
  const issues: string[] = [];
  if (!content.trim()) {
    issues.push('Flow file is empty');
    return issues;
  }

  const parts = content.split(/^---\s*$/m);
  if (parts.length < 2) {
    issues.push('Missing YAML document separator (---)');
  }

  const steps = parts.slice(1).join('---').trim();
  if (!steps) {
    issues.push('No Maestro steps found after frontmatter');
  }

  return issues;
}

export function validateFlow(config: ResolvedConfig, flow: string): ValidateFlowResult {
  const flowPath = resolveFlowFilePath(config, flow);
  if (!fs.existsSync(flowPath)) {
    throw new AgentError(`Flow not found: ${flow}`, ErrorCode.FLOW_NOT_FOUND);
  }

  const content = fs.readFileSync(flowPath, 'utf-8');
  const syntaxIssues = basicSyntaxCheck(content);
  if (syntaxIssues.length > 0) {
    return {
      flow: assertFlowName(flow),
      flowPath,
      valid: false,
      method: 'syntax',
      issues: syntaxIssues,
    };
  }

  if (commandExists(config.maestroBin)) {
    const dryRun = runCommand(config.maestroBin, ['test', '--dry-run', flowPath], {
      cwd: config.projectRoot,
      allowFailure: true,
    });

    if (dryRun.status === 0) {
      return {
        flow: assertFlowName(flow),
        flowPath,
        valid: true,
        method: 'maestro_dry_run',
        issues: [],
      };
    }

    const issues = [dryRun.stderr, dryRun.stdout].filter(Boolean);
    if (issues.length > 0) {
      return {
        flow: assertFlowName(flow),
        flowPath,
        valid: false,
        method: 'maestro_dry_run',
        issues,
      };
    }
  }

  return {
    flow: assertFlowName(flow),
    flowPath,
    valid: syntaxIssues.length === 0,
    method: 'syntax',
    issues: syntaxIssues,
  };
}

export function writeFlow(
  config: ResolvedConfig,
  flow: string,
  content?: string,
  template?: FlowTemplate,
  overwrite = false,
): WriteFlowResult {
  const safeName = assertFlowName(flow);
  const flowPath = resolveFlowFilePath(config, safeName);
  const existed = fs.existsSync(flowPath);

  if (existed && !overwrite) {
    throw new AgentError(`Flow already exists: ${flowPath}`, ErrorCode.VALIDATION);
  }

  const body = content ?? (template ? TEMPLATES[template] : undefined);
  if (!body) {
    throw new AgentError('content or template is required', ErrorCode.VALIDATION);
  }

  fs.mkdirSync(config.flowsDir, { recursive: true });
  fs.writeFileSync(flowPath, body, 'utf-8');

  return {
    flow: safeName,
    flowPath,
    written: true,
    overwritten: existed,
  };
}

export function resolveExistingFlowPath(config: ResolvedConfig, flow: string): string {
  return resolveFlowPath(config, flow);
}
