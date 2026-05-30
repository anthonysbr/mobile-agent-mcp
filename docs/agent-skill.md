# Mobile E2E loop for agents

Copy this when the agent should see and tap a simulator, emulator, or USB device.

## Before you start

Maestro installed. `mobile-agent.config.json` in the repo. Metro/backend up if the flow needs them. Simulator booted or Android on USB.

## Loop

```bash
mobile-agent doctor
```

Stop if anything is FAIL.

```bash
mobile-agent devices
mobile-agent open-dev-url ios          # skip if the flow launches the app
mobile-agent run smoke-login ios -e APP_ID=com.example.app
mobile-agent screenshot ios
```

`run-all` runs every flow in `smokeFlows` from config:

```bash
mobile-agent run-all ios
```

Android over USB, when the phone can't hit your Mac on Wi‑Fi:

```bash
mobile-agent adb-reverse 8081 4000
MAESTRO_DEVICE=<serial> mobile-agent run smoke-login android
```

## MCP names

| Shell | MCP |
|-------|-----|
| `mobile-agent doctor` | `doctor` |
| `mobile-agent devices` | `list_devices` |
| `mobile-agent screenshot ios` | `screenshot` `{ "platform": "ios" }` |
| `mobile-agent run foo ios` | `run_maestro_flow` `{ "flow": "foo", "platform": "ios" }` |
| `mobile-agent run-all ios` | `run_smoke_flows` `{ "platform": "ios" }` |
| `mobile-agent adb-reverse 8081` | `adb_reverse` `{ "ports": [8081] }` |
| `mobile-agent open-url URL ios` | `open_url` `{ "url": "…", "platform": "ios" }` |
| `mobile-agent open-dev-url ios` | `open_dev_url` `{ "platform": "ios" }` |

## When something breaks

`[CONFIG_INVALID]`: fix the JSON schema in config.

`[MAESTRO_NOT_FOUND]`: install Maestro.

`[FLOW_NOT_FOUND]`: wrong name or `flowsDir`.

`[NOT_CONFIGURED]`: add `smokeFlows` or `devServerUrl` if you need those commands.

Screenshot fails on iOS: boot the Simulator first.

Android can't reach API/Metro: `adb-reverse` on 8081 and whatever port your API uses.

Don't commit screenshots if the screen might show real user data.

## Coming in v0.2

`tail_logs`: Metro console, Android logcat, iOS sim logs. See [`ROADMAP.md`](../ROADMAP.md).
