# Roadmap

Mobile control for agents on iOS sims, Android emulators, and USB devices. See the screen, read logs, tap through Maestro. Fix bugs without staring at the phone yourself.

Not CI, not a device farm, not pixel-diff regression.

## v0.1 · shipped

MCP + CLI, `mobile-agent.config.json`, doctor/devices/screenshot/flows/adb/open-url. Published on npm.

## v0.2 · shipped

**`tail_logs`**: Metro check, Android logcat, iOS sim logs.

- MCP tool `tail_logs` + CLI `mobile-agent logs`
- Config `log` block (package id, Metro port, filters)
- Doctor checks log sources
- `list_flows`, `doctor --json`

## v0.3 · next

- MCP resource for latest screenshot (where clients support it)
- Trusted npm publish from CI
- More example configs (Expo, bare RN)

## Not planned (for now)

Visual diff suites, multi-device farms, replacing Maestro for taps, Rust/Go rewrite unless install size hurts.

## Done when

An agent can: `doctor` → `tail_logs` → `run_maestro_flow` → `screenshot` → repeat until green.
