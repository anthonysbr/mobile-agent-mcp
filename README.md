# mobile-agent-mcp

MCP + CLI for iOS sims, Android emulators, and USB devices. Maestro runs flows; this handles config, doctor, logs, screenshots, RN diagnosis, and Expo/Android host plumbing.

Not for tap-by-coordinates — use [`@mobilenext/mobile-mcp`](https://www.npmjs.com/package/@mobilenext/mobile-mcp). For inline YAML/UI inspection, pair with [Maestro MCP](https://maestro.mobile.dev/).

## Quick start

```bash
npm install -D mobile-agent-mcp
mobile-agent doctor
mobile-agent run-with-context smoke-login ios --json
```

Requires Node 20+, [Maestro](https://maestro.mobile.dev/), Xcode (iOS), `adb` (Android).

## Config

`mobile-agent.config.json` in repo root — see [`mobile-agent.config.example.json`](mobile-agent.config.example.json), [`examples/expo.config.json`](examples/expo.config.json), [`examples/bare-rn.config.json`](examples/bare-rn.config.json).

Set `MOBILE_AGENT_PROJECT_ROOT` if MCP starts from the wrong cwd.

## MCP tools

| Tool | Purpose |
|------|---------|
| `doctor` | Pre-flight |
| `run_flow_with_context` | Flow + logs + screenshot + diagnosis |
| `run_maestro_flow` / `run_smoke_flows` | Flow execution |
| `screenshot` | PNG + inline image |
| `collect_logs` / `tail_logs` | Metro, logcat, sim logs |
| `metro_status` / `reload_app` / `boot_simulator` | Dev lifecycle |
| `validate_flow` / `write_flow` | Flow authoring |
| `adb_reverse` / `open_url` / `open_dev_url` | RN/Expo plumbing |

Resource: `mobile-agent://screenshot/latest`

Responses: [`docs/mcp-response-schema.md`](docs/mcp-response-schema.md). Agent loop: [`docs/agent-skill.md`](docs/agent-skill.md).

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mobile-agent": {
      "command": "npx",
      "args": ["-y", "mobile-agent-mcp"],
      "env": { "MOBILE_AGENT_PROJECT_ROOT": "/absolute/path/to/your/project" }
    }
  }
}
```

## CLI

```bash
mobile-agent doctor [--json]
mobile-agent run-with-context <flow> [ios|android] [--json]
mobile-agent run-all [ios|android] [--json]
mobile-agent logs [ios|android] [--json] [--duration-ms 3000]
mobile-agent screenshot [ios|android] [--json]
mobile-agent metro-status | reload-app | boot-simulator [--json]
mobile-agent validate-flow <flow> | write-flow <flow> [--template smoke] [--json]
mobile-agent adb-reverse 8081
mobile-agent open-dev-url [ios|android]
```

Flags: `--project-root`, `--flows-dir`, `--screenshot-dir`.
