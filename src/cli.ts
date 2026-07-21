#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import { parseEnvPairs, parseLogSource, parsePorts } from './config.js';
import type { FlowTemplate } from './driver/flow-io.js';
import { formatError, getExitCode } from './errors.js';
import { flowContextEnvelope, flowRunEnvelope, smokeRunEnvelope } from './results/format.js';
import { envelope } from './results/types.js';
import { createRuntime } from './runtime.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

function printResult(text: string): void {
  process.stdout.write(`${text}\n`);
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printError(error: unknown): never {
  process.stderr.write(`[${PACKAGE_NAME}] ${formatError(error)}\n`);
  process.exit(getExitCode(error));
}

const program = new Command();

program
  .name('mobile-agent')
  .description('iOS/Android simulators, emulators, and USB devices via Maestro, adb, simctl')
  .version(PACKAGE_VERSION, '-V, --version', 'Print version')
  .option('--project-root <path>', 'Override MOBILE_AGENT_PROJECT_ROOT')
  .option('--flows-dir <path>', 'Override MOBILE_AGENT_FLOWS_DIR')
  .option('--screenshot-dir <path>', 'Override MOBILE_AGENT_SCREENSHOT_DIR');

function createCliRuntime(command: Command) {
  const opts = command.parent?.opts() ?? {};
  return createRuntime({
    env: {
      ...process.env,
      ...(opts.projectRoot ? { MOBILE_AGENT_PROJECT_ROOT: opts.projectRoot } : {}),
      ...(opts.flowsDir ? { MOBILE_AGENT_FLOWS_DIR: opts.flowsDir } : {}),
      ...(opts.screenshotDir ? { MOBILE_AGENT_SCREENSHOT_DIR: opts.screenshotDir } : {}),
    },
    overrides: {
      ...(opts.projectRoot ? { projectRoot: path.resolve(opts.projectRoot) } : {}),
      ...(opts.flowsDir ? { flowsDir: path.resolve(opts.flowsDir) } : {}),
      ...(opts.screenshotDir ? { screenshotDir: path.resolve(opts.screenshotDir) } : {}),
    },
  });
}

program
  .command('doctor')
  .description('Sanity check before running flows')
  .option('--json', 'Print JSON instead of text')
  .action((options, command) => {
    try {
      const runtime = createCliRuntime(command);
      printResult(options.json ? runtime.doctorJson() : runtime.doctor());
      if (runtime.doctorFailed()) {
        process.exit(4);
      }
    } catch (error) {
      printError(error);
    }
  });

program
  .command('devices')
  .description('Sims, USB devices, Maestro version')
  .action((_args, command) => {
    try {
      printResult(createCliRuntime(command).listDevices());
    } catch (error) {
      printError(error);
    }
  });

program
  .command('list-flows')
  .description('List Maestro flow names in flowsDir')
  .action((_args, command) => {
    try {
      printResult(createCliRuntime(command).listFlows());
    } catch (error) {
      printError(error);
    }
  });

program
  .command('logs')
  .argument('[platform]', 'ios or android', 'ios')
  .option('--lines <n>', 'Number of lines to return', '100')
  .option('--source <source>', 'metro, logcat, sim, or auto', 'auto')
  .option('--follow', 'Stream logs until Ctrl+C')
  .option('--json', 'Print JSON log snapshot')
  .option('--duration-ms <n>', 'Bounded collect duration (max 10000)')
  .description('Tail Metro, logcat, or iOS sim logs')
  .action(async (platform, options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const source = parseLogSource(options.source);
      const lines = Number(options.lines);

      if (options.follow) {
        const code = await runtime.tailLogsFollow(platform, source);
        process.exit(code === 0 ? 0 : 6);
        return;
      }

      const durationMs = Number(options.durationMs);
      const snapshot =
        Number.isFinite(durationMs) && durationMs > 0
          ? await runtime.collectLogs(
              platform,
              source,
              Number.isFinite(lines) ? lines : 100,
              durationMs,
            )
          : runtime.tailLogsSnapshot(platform, source, Number.isFinite(lines) ? lines : 100);

      if (options.json) {
        printJson(envelope(true, `Collected ${snapshot.lineCount} log line(s)`, snapshot));
        return;
      }

      printResult(runtime.tailLogs(platform, source, Number.isFinite(lines) ? lines : 100));
    } catch (error) {
      printError(error);
    }
  });

program
  .command('screenshot')
  .argument('[platform]', 'ios or android', 'ios')
  .option('--json', 'Print JSON result')
  .description('PNG to screenshotDir; prints path')
  .action((platform, options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const result = runtime.screenshot(platform);
      if (options.json) {
        printJson(envelope(true, `Screenshot saved: ${result.path}`, result));
        return;
      }
      printResult(result.path);
    } catch (error) {
      printError(error);
    }
  });

program
  .command('run')
  .argument('<flow>', 'Maestro flow name or path relative to flowsDir')
  .argument('[platform]', 'ios or android', 'ios')
  .option('-e, --env <pair...>', 'Maestro env var KEY=VALUE')
  .option('--json', 'Print JSON result')
  .description('Run one Maestro flow')
  .action((flow, platform, options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const result = runtime.runFlow(flow, platform, parseEnvPairs(options.env));
      if (options.json) {
        printJson(flowRunEnvelope(result));
        if (!result.ok) {
          process.exit(6);
        }
        return;
      }
      printResult(runtime.formatFlowRun(result));
      if (!result.ok) {
        process.exit(6);
      }
    } catch (error) {
      printError(error);
    }
  });

program
  .command('run-with-context')
  .argument('<flow>', 'Maestro flow name or path relative to flowsDir')
  .argument('[platform]', 'ios or android', 'ios')
  .option('-e, --env <pair...>', 'Maestro env var KEY=VALUE')
  .option('--log-lines <n>', 'Log lines to attach', '80')
  .option('--json', 'Print JSON result')
  .description('Run one flow with logs, screenshot, and diagnosis')
  .action((flow, platform, options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const logLines = Number(options.logLines);
      const result = runtime.runFlowWithContext(
        flow,
        platform,
        parseEnvPairs(options.env),
        Number.isFinite(logLines) ? logLines : 80,
      );
      if (options.json) {
        printJson(flowContextEnvelope(result));
        if (!result.ok) {
          process.exit(6);
        }
        return;
      }
      printResult(runtime.formatFlowContext(result));
      if (!result.ok) {
        process.exit(6);
      }
    } catch (error) {
      printError(error);
    }
  });

program
  .command('run-all')
  .argument('[platform]', 'ios or android', 'ios')
  .option('-e, --env <pair...>', 'Maestro env var KEY=VALUE')
  .option('--json', 'Print JSON result')
  .description('Run every flow in smokeFlows from config')
  .action((platform, options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const result = runtime.runSmoke(platform, parseEnvPairs(options.env));
      if (options.json) {
        printJson(smokeRunEnvelope(result));
        if (!result.readyForCommit) {
          process.exit(6);
        }
        return;
      }
      printResult(runtime.formatSmokeRun(result));
      if (!result.readyForCommit) {
        process.exit(6);
      }
    } catch (error) {
      printError(error);
    }
  });

program
  .command('metro-status')
  .option('--json', 'Print JSON result')
  .description('Check Metro reachability')
  .action((options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const result = runtime.metroStatus();
      if (options.json) {
        printJson(
          envelope(result.reachable, result.reachable ? 'Metro reachable' : 'Metro down', result),
        );
        process.exit(result.reachable ? 0 : 6);
      }
      printResult(
        result.reachable
          ? `Metro reachable on :${result.port}`
          : `Metro not reachable on :${result.port}`,
      );
      if (!result.reachable) {
        process.exit(6);
      }
    } catch (error) {
      printError(error);
    }
  });

program
  .command('reload-app')
  .option('--json', 'Print JSON result')
  .description('Reload app via Metro')
  .action((options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const result = runtime.reloadApp();
      if (options.json) {
        printJson(envelope(result.reloaded, result.message, result));
        process.exit(result.reloaded ? 0 : 6);
      }
      printResult(result.message);
      if (!result.reloaded) {
        process.exit(6);
      }
    } catch (error) {
      printError(error);
    }
  });

program
  .command('boot-simulator')
  .argument('[deviceName]', 'Simulator device name')
  .option('--json', 'Print JSON result')
  .description('Boot an iOS simulator')
  .action((deviceName, options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const result = runtime.bootSimulator(deviceName);
      if (options.json) {
        printJson(envelope(result.booted, result.message, result));
        return;
      }
      printResult(result.message);
    } catch (error) {
      printError(error);
    }
  });

program
  .command('validate-flow')
  .argument('<flow>', 'Flow name under flowsDir')
  .option('--json', 'Print JSON result')
  .description('Validate a Maestro flow file')
  .action((flow, options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const result = runtime.validateFlow(flow);
      if (options.json) {
        printJson(envelope(result.valid, result.valid ? 'Flow valid' : 'Flow invalid', result));
        if (!result.valid) {
          process.exit(6);
        }
        return;
      }
      printResult(
        result.valid
          ? `${result.flowPath} is valid (${result.method})`
          : `${result.flowPath} invalid:\n${result.issues.join('\n')}`,
      );
      if (!result.valid) {
        process.exit(6);
      }
    } catch (error) {
      printError(error);
    }
  });

program
  .command('write-flow')
  .argument('<flow>', 'Flow name under flowsDir')
  .option('--content <yaml>', 'YAML content')
  .option('--template <name>', 'login, deeplink, or smoke')
  .option('--overwrite', 'Overwrite existing flow')
  .option('--json', 'Print JSON result')
  .description('Write a Maestro flow under flowsDir')
  .action((flow, options, command) => {
    try {
      const runtime = createCliRuntime(command);
      const template =
        options.template === 'login' ||
        options.template === 'deeplink' ||
        options.template === 'smoke'
          ? (options.template as FlowTemplate)
          : undefined;
      const result = runtime.writeFlow(flow, options.content, template, options.overwrite === true);
      if (options.json) {
        printJson(envelope(result.written, `Wrote ${result.flowPath}`, result));
        return;
      }
      printResult(result.flowPath);
    } catch (error) {
      printError(error);
    }
  });

program
  .command('adb-reverse')
  .argument('[ports...]', 'TCP ports to reverse')
  .description('adb reverse for localhost ports (USB Android)')
  .action((ports: string[], _args, command) => {
    try {
      printResult(createCliRuntime(command).adbReverse(parsePorts(ports)));
    } catch (error) {
      printError(error);
    }
  });

program
  .command('open-dev-url')
  .argument('[platform]', 'ios or android', 'ios')
  .description('Open URL from devServerUrl in config')
  .action((platform, _args, command) => {
    try {
      printResult(createCliRuntime(command).openDevUrl(platform));
    } catch (error) {
      printError(error);
    }
  });

program
  .command('open-url')
  .argument('<url>', 'Deep link or URL to open on device')
  .argument('[platform]', 'ios or android', 'ios')
  .description('Open a deep link on sim or device')
  .action((url, platform, _args, command) => {
    try {
      printResult(createCliRuntime(command).openUrl(url, platform));
    } catch (error) {
      printError(error);
    }
  });

program.parse();
