# mobile-agent-mcp

Drive **iOS simulators, Android emulators, and USB devices** from Cursor, Claude, or a shell. Maestro runs your flows; this package handles the host side: list devices, screenshots, deep links, `adb reverse`, logs, per-repo config.

No Expo or Flutter lock-in. Your Maestro YAML and env vars live in your project.

## When to use this

- You already have Maestro YAML in the repo
- You want smoke flows and config per project, not a generic tap-by-coordinates MCP
- You want the same commands from CLI, MCP, or shell

Need native taps without Maestro? Look at [`@mobilenext/mobile-mcp`](https://www.npmjs.com/package/@mobilenext/mobile-mcp) instead.

## Quick start

```bash
npm install -D mobile-agent-mcp
mobile-agent doctor
mobile-agent devices
mobile-agent open-dev-url ios
mobile-agent logs ios --lines 50 --source sim
mobile-agent run smoke-login ios
mobile-agent screenshot ios
```

## Install

```bash
npm install -D mobile-agent-mcp
```

You need Node 20+, [Maestro](https://maestro.mobile.dev/), Xcode on macOS for iOS, and `adb` for Android.

## Config

Put `mobile-agent.config.json` in the repo root. Example: [`mobile-agent.config.example.json`](mobile-agent.config.example.json).

```json
{
  "projectRoot": ".",
  "flowsDir": "e2e/maestro/flows",
  "screenshotDir": "artifacts/mobile-screenshots",
  "smokeFlows": ["smoke-login", "smoke-logout"],
  "maestro": {
    "bin": "maestro",
    "defaultEnv": { "APP_ID": "com.example.app" }
  },
  "log": {
    "androidPackage": "com.example.app",
    "metroPort": 8081,
    "filters": ["ReactNativeJS", "ERROR"]
  }
}
```

Optional `devServerUrl` builds something like `exp://192.168.x.x:8081` for Maestro and `open-dev-url`:

```json
"devServerUrl": {
  "scheme": "exp",
  "port": 8081,
  "hostEnv": "EXPO_DEV_HOST",
  "outputEnvKey": "EXPO_URL"
}
```

Env overrides: `MOBILE_AGENT_PROJECT_ROOT`, `MOBILE_AGENT_FLOWS_DIR`, `MOBILE_AGENT_SCREENSHOT_DIR`, `MAESTRO_BIN`, `MAESTRO_DEVICE`.

If MCP starts from a random cwd, set `MOBILE_AGENT_PROJECT_ROOT` to your repo path.

Run `mobile-agent doctor` before a long session. Saves guessing why nothing boots.

## CLI

```bash
mobile-agent doctor
mobile-agent doctor --json
mobile-agent devices
mobile-agent list-flows
mobile-agent logs ios --lines 100 --source sim
mobile-agent logs android --source logcat --follow
mobile-agent screenshot ios
mobile-agent run my-flow ios -e APP_ID=com.example.app
mobile-agent run-all ios
mobile-agent adb-reverse 8081 4000
mobile-agent open-url "myapp://home" ios
mobile-agent open-dev-url ios
```

Flags: `--project-root`, `--flows-dir`, `--screenshot-dir`.

## MCP

```bash
mobile-agent-mcp
```

| Tool | What it does |
|------|----------------|
| `doctor` | Config, flows dir, Maestro, adb/simctl, log sources |
| `list_devices` | Sims, USB, Maestro version |
| `list_flows` | Flow names in `flowsDir` |
| `tail_logs` | Recent Metro/logcat/sim logs (snapshot) |
| `screenshot` | PNG path |
| `run_maestro_flow` | One flow from `flowsDir` |
| `run_smoke_flows` | All `smokeFlows` |
| `adb_reverse` | USB Android to localhost ports |
| `open_url` | Any deep link |
| `open_dev_url` | URL from config |

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mobile-agent": {
      "command": "npx",
      "args": ["-y", "mobile-agent-mcp"],
      "env": {
        "MOBILE_AGENT_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

Local checkout: point at `dist/mcp-server.js` instead of `npx`.

Claude Desktop: same block in `~/Library/Application Support/Claude/claude_desktop_config.json`.

No MCP? Shell works fine. See [`docs/agent-skill.md`](docs/agent-skill.md).

## Programmatic use

```ts
import { createRuntime } from 'mobile-agent-mcp';

const agent = createRuntime();
agent.doctor();
agent.tailLogs('ios', 'sim', 100);
agent.screenshot('ios');
```

## Roadmap

[`ROADMAP.md`](ROADMAP.md): shipped `tail_logs` in v0.2.
