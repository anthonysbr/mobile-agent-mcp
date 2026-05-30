# mobile-agent-mcp

Let an agent (or you) drive **iOS simulators, Android emulators, and physical devices** (iPhone/iPad over USB, Android over USB) via Maestro, `simctl`, and `adb`. Works over MCP stdio with Cursor, Claude Desktop, Codex, Copilot, or plain shell.

Maestro runs your flows. This package wires up the host: list devices, screenshots, deep links, `adb reverse`, config per repo. No Expo or Flutter assumptions. Your YAML and env vars stay in your project.

## Install

```bash
npm install -D mobile-agent-mcp
# or
pnpm add -D mobile-agent-mcp
```

You also need Node 20+, [Maestro](https://maestro.mobile.dev/) (`curl -Ls "https://get.maestro.mobile.dev" | bash`), a Mac with Xcode for iOS (simulator or USB device), and `adb` for Android (emulator or USB).

## Config

Drop `mobile-agent.config.json` in the repo root. Full example: [`mobile-agent.config.example.json`](mobile-agent.config.example.json).

```json
{
  "projectRoot": ".",
  "flowsDir": "e2e/maestro/flows",
  "screenshotDir": "artifacts/mobile-screenshots",
  "smokeFlows": ["smoke-login", "smoke-logout"],
  "maestro": {
    "bin": "maestro",
    "defaultEnv": { "APP_ID": "com.example.app" }
  }
}
```

`devServerUrl` builds something like `exp://192.168.x.x:8081` and feeds it to Maestro (also used by `open-dev-url`):

```json
"devServerUrl": {
  "scheme": "exp",
  "port": 8081,
  "hostEnv": "EXPO_DEV_HOST",
  "outputEnvKey": "EXPO_URL"
}
```

Env overrides: `MOBILE_AGENT_PROJECT_ROOT`, `MOBILE_AGENT_FLOWS_DIR`, `MOBILE_AGENT_SCREENSHOT_DIR`, `MAESTRO_BIN`, `MAESTRO_DEVICE`.

When the MCP server starts from a random cwd, set `MOBILE_AGENT_PROJECT_ROOT` to the repo path so config is found.

## How it fits together

```
Agent (MCP or shell)
        │
        ▼
 MobileAgentRuntime  ← config + Zod validation
        │
   ┌────┴────┬──────────┬─────────┐
   ▼         ▼          ▼         ▼
 Maestro   simctl      adb     doctor
```

One runtime backs both CLI and MCP. Config is validated on load. Errors carry stable codes for scripts. MCP keeps stdout clean (JSON only); logs go to stderr.

Run `mobile-agent doctor` before a long flow. Saves ten minutes of guessing.

## CLI

```bash
mobile-agent doctor
mobile-agent devices
mobile-agent screenshot ios
mobile-agent run my-flow ios -e APP_ID=com.example.app
mobile-agent run-all ios
mobile-agent adb-reverse 8081 4000
mobile-agent open-url "myapp://home" ios
mobile-agent open-dev-url ios
mobile-agent --version
```

Global flags: `--project-root`, `--flows-dir`, `--screenshot-dir`.

## MCP

```bash
mobile-agent-mcp
```

| Tool | When to use it |
|------|----------------|
| `doctor` | Before anything heavy |
| `list_devices` | See sims, USB devices, Maestro |
| `screenshot` | PNG path after capture |
| `run_maestro_flow` | Single flow from `flowsDir` |
| `run_smoke_flows` | All entries in `smokeFlows` |
| `adb_reverse` | USB Android can't reach localhost |
| `open_url` | Any deep link |
| `open_dev_url` | URL from `devServerUrl` in config |

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

Local dev from this repo: point `command`/`args` at `dist/mcp-server.js` instead of `npx`.

Claude Desktop uses the same block in `~/Library/Application Support/Claude/claude_desktop_config.json`. Other MCP clients: same idea, stdio + `MOBILE_AGENT_PROJECT_ROOT`.

No MCP? Shell is fine: `mobile-agent devices`, `mobile-agent run …`. See [`docs/agent-skill.md`](docs/agent-skill.md) for a copy-paste loop agents can follow.

## Notes

iOS needs macOS. Screenshots can contain sensitive UI; don't commit them or ship them to analytics.

## Roadmap

[`ROADMAP.md`](ROADMAP.md): next up **`tail_logs`** (Metro console, Android logcat, iOS sim logs) so agents can debug like you do in the terminal.

## API

```ts
import { MobileAgentRuntime } from 'mobile-agent-mcp';

const runtime = new MobileAgentRuntime();
console.log(runtime.doctor());
console.log(runtime.listDevices());
console.log(runtime.screenshot('ios'));
```
