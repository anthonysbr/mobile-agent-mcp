# Roadmap

Mobile control for agents on iOS sims, Android emulators, and USB devices. See the screen, read logs, tap through Maestro. Fix bugs without staring at the phone yourself.

Not CI, not a device farm, not pixel-diff regression.

## v0.1 · shipped

MCP + CLI, `mobile-agent.config.json`, doctor/devices/screenshot/flows/adb/open-url.

## v0.2 · next

**`tail_logs`**: Metro console, `adb logcat`, iOS sim `log stream`.

- MCP tool + CLI `mobile-agent logs [platform]` (`--lines`, `--follow`, `--source`)
- Optional `log` block in config (package id, Metro port, filters)
- Docs update in `docs/agent-skill.md`

## v0.3

npm publish polish, doctor checks for log sources, tighter getting-started copy.

## Not planned (for now)

Visual diff suites, multi-device farms, replacing Maestro for taps, Rust/Go rewrite unless install size hurts.

## Done when

An agent can: `doctor` → `screenshot` → `tail_logs` → `run_maestro_flow` → repeat until green.
