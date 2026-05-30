#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import { parseEnvPairs, parsePorts } from './config.js';
import { formatError, getExitCode } from './errors.js';
import { createRuntime } from './runtime.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

function printResult(text: string): void {
  process.stdout.write(`${text}\n`);
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
  .action((_args, command) => {
    try {
      const runtime = createCliRuntime(command);
      printResult(runtime.doctor());
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
  .command('screenshot')
  .argument('[platform]', 'ios or android', 'ios')
  .description('PNG to screenshotDir; prints path')
  .action((platform, _args, command) => {
    try {
      printResult(createCliRuntime(command).screenshot(platform));
    } catch (error) {
      printError(error);
    }
  });

program
  .command('run')
  .argument('<flow>', 'Maestro flow name or path relative to flowsDir')
  .argument('[platform]', 'ios or android', 'ios')
  .option('-e, --env <pair...>', 'Maestro env var KEY=VALUE')
  .description('Run one Maestro flow')
  .action((flow, platform, options, command) => {
    try {
      printResult(
        createCliRuntime(command).runFlow(flow, platform, parseEnvPairs(options.env)),
      );
    } catch (error) {
      printError(error);
    }
  });

program
  .command('run-all')
  .argument('[platform]', 'ios or android', 'ios')
  .option('-e, --env <pair...>', 'Maestro env var KEY=VALUE')
  .description('Run every flow in smokeFlows from config')
  .action((platform, options, command) => {
    try {
      printResult(createCliRuntime(command).runSmoke(platform, parseEnvPairs(options.env)));
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
