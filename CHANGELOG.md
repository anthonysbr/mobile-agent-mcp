# Changelog

All notable changes are documented here. This project follows [Semantic Versioning](https://semver.org):
`MAJOR.MINOR.PATCH`: breaking, feature, or fix.

## [0.1.1] - 2026-05-30

### Added

- Driver unit tests (Maestro arg building, adb reverse, open-url) with a mocked `spawnSync`.
- Biome for lint + format; `pnpm lint`, `pnpm format`, and `pnpm check` now gate on it.
- `CONTRIBUTING.md` with SemVer policy and release steps.

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

[0.1.1]: https://github.com/anthonysbr/mobile-agent-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/anthonysbr/mobile-agent-mcp/releases/tag/v0.1.0
