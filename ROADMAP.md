# Roadmap

Mobile control for AI agents on **iOS simulators, Android emulators, and USB devices**. Goal: let Cursor, Claude, Codex, or any MCP/shell agent **see the screen**, **read logs**, and **drive the app** so it can fix bugs and check features visually.

Not a CI platform, not a device farm, not visual diff at scale.

## Product loop

```text
doctor → list_devices → open_dev_url
→ tail_logs (Metro / logcat / sim)
→ screenshot + run_maestro_flow
→ agent edits code → repeat
```

## v0.1 · Done

- MCP stdio + CLI (`mobile-agent`, `mobile-agent-mcp`)
- Config per repo (`mobile-agent.config.json`)
- Tools: `doctor`, `list_devices`, `screenshot`, `run_maestro_flow`, `run_smoke_flows`, `adb_reverse`, `open_url`, `open_dev_url`
- Typed errors, config validation (Zod)
- Works with Zentrux as first consumer

## v0.2 · Next (planned)

**`tail_logs`** · so agents can read console output like you do in the terminal.

| Source | Platform | Implementation |
|--------|----------|----------------|
| Metro / React Native console | iOS + Android | tail Metro output or RN log stream |
| `adb logcat` | Android | filtered by app package when configured |
| Simulator system log | iOS | `log stream` / simctl where available |

Deliverables:

- MCP tool `tail_logs` (lines + optional follow)
- CLI `mobile-agent logs [platform]` with `--lines`, `--follow`, `--source`
- Config: optional `log` block (package id, Metro port, filters)
- Update [`docs/agent-skill.md`](docs/agent-skill.md) around the bugfix loop
- Tests with mocked subprocess output

## v0.3 · Polish (planned)

- npm publish + install docs for Cursor, Claude Desktop, Codex
- `doctor` checks log sources (Metro up, logcat reachable)
- Short “getting started” in README focused on agent bugfix, not infra jargon

## Out of scope (for now)

- Screenshot pixel diff / visual regression suite
- Multi-device parallel orchestration
- Replacing Maestro for taps (Maestro stays the interaction layer)
- Rust/Go rewrite (revisit only if install size or RAM becomes a blocker)

## Success criteria

An agent without prior context can:

1. Confirm the sim/device is ready (`doctor`)
2. See what the user would see (`screenshot`)
3. Read why something failed (`tail_logs`)
4. Re-run a short flow and verify the fix (`run_maestro_flow` + screenshot)

That is the whole product.
