# Mobile loop for agents

Use when the agent should drive a simulator, emulator, or USB device.

## Prerequisites

Maestro installed. `mobile-agent.config.json` in the repo. Metro/API up if the flow needs them. Sim booted or Android on USB.

## Typical loop

```bash
mobile-agent doctor          # stop on FAIL
mobile-agent devices
mobile-agent open-dev-url ios   # skip if the flow launches the app
mobile-agent run smoke-login ios -e APP_ID=com.example.app
mobile-agent screenshot ios
```

All flows in config:

```bash
mobile-agent run-all ios
```

Android USB when the phone can't reach your Mac on Wi‑Fi:

```bash
mobile-agent adb-reverse 8081 4000
MAESTRO_DEVICE=<serial> mobile-agent run smoke-login android
```

## MCP equivalents

| Shell | MCP |
|-------|-----|
| `doctor` | `doctor` |
| `devices` | `list_devices` |
| `screenshot ios` | `screenshot` `{ "platform": "ios" }` |
| `run foo ios` | `run_maestro_flow` `{ "flow": "foo", "platform": "ios" }` |
| `run-all ios` | `run_smoke_flows` |
| `adb-reverse 8081` | `adb_reverse` `{ "ports": [8081] }` |
| `open-url URL ios` | `open_url` |
| `open-dev-url ios` | `open_dev_url` |

## Troubleshooting

- `[CONFIG_INVALID]`: fix JSON in config
- `[MAESTRO_NOT_FOUND]`: install Maestro
- `[FLOW_NOT_FOUND]`: wrong name or `flowsDir`
- iOS screenshot fails: boot the Simulator first
- Android can't reach Metro: `adb-reverse` on 8081 (and API port if needed)

Don't commit screenshots with real user data on screen.

## v0.2

`tail_logs` for Metro / logcat / sim logs. See [`ROADMAP.md`](../ROADMAP.md).
