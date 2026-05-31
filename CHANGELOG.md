# Changelog

All notable changes are documented here. This project follows [Semantic Versioning](https://semver.org):
`MAJOR.MINOR.PATCH`: breaking, feature, or fix.

## [0.2.0] - 2026-05-30

### Added

- `tail_logs` MCP tool and `mobile-agent logs` CLI (Metro, logcat, iOS sim).
- Config `log` block: `androidPackage`, `metroPort`, `filters`.
- `list_flows` / `mobile-agent list-flows` to discover Maestro flows.
- `doctor --json` for scriptable checks.
- Doctor WARN checks for log sources when `log` is configured.

### Changed

- README: when to use this vs `@mobilenext/mobile-mcp`, quick start section.
- Removed deprecated `MobileAgentRuntime` / `MobileAgentError` exports.

## [0.1.1] - 2026-05-30

### Added

- Driver unit tests (Maestro arg building, adb reverse, open-url) with a mocked `spawnSync`.
- Biome for lint + format; `pnpm lint`, `pnpm format`, and `pnpm check` now gate on it.
- `CONTRIBUTING.md` with SemVer policy and release steps.
- CODEOWNERS and GitHub Actions CI.

### Fixed

- `AgentError` no longer double-wraps the underlying `cause` when raised from config parsing.

### Changed

- Dropped the unused `fallback` parameter from `assertPlatform`.

## [0.1.0] - 2026-05-30

### Added

- MCP stdio server and `mobile-agent` CLI: `doctor`, `list_devices`, `screenshot`,
  `run_maestro_flow`, `run_smoke_flows`, `adb_reverse`, `open_url`, `open_dev_url`.
- Per-repo `mobile-agent.config.json` with upward discovery and env overrides.
- Typed errors with stable exit codes and Zod-validated config.

[0.2.0]: https://github.com/anthonysbr/mobile-agent-mcp/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/anthonysbr/mobile-agent-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/anthonysbr/mobile-agent-mcp/releases/tag/v0.1.0
