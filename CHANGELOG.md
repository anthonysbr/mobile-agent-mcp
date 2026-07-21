# Changelog

All notable changes are documented here. This project follows [Semantic Versioning](https://semver.org):
`MAJOR.MINOR.PATCH`: breaking, feature, or fix.

## [1.0.2] - 2026-07-21

### Fixed

- Update package metadata and documentation.

## [1.0.1] - 2026-07-20

### Fixed

- Removed third party library references from docs.
- Replaced em dashes in documentation.

## [1.0.0] - 2026-07-20

### Added

- Structured MCP responses with `schemaVersion: 1` envelope for all tools.
- Inline PNG screenshots in MCP tool responses plus `mobile-agent://screenshot/latest` resource.
- `run_flow_with_context` MCP tool and `mobile-agent run-with-context` CLI.
- RN-specific failure diagnosis (`metro_unreachable`, `js_error`, `element_not_found`, etc.).
- Lifecycle tools: `metro_status`, `reload_app`, `boot_simulator`.
- Flow tools: `validate_flow`, `write_flow` (path traversal blocked).
- `collect_logs` MCP tool with bounded `durationMs` polling (max 10s).
- CLI `--json` for doctor, logs, screenshot, run, run-with-context, run-all, metro, reload, boot-simulator, validate-flow, write-flow.
- Example configs: `examples/expo.config.json`, `examples/bare-rn.config.json`.
- Docs: `docs/mcp-response-schema.md`.
- npm publish workflow with provenance on tag push.

### Changed

- MCP tools return JSON envelopes instead of plain text (CLI human output unchanged).
- `run_maestro_flow` and `run_smoke_flows` return structured results in MCP.
- `doctor` MCP returns `DoctorResult` with `blockers` array.
- `tail_logs` returns `LogSnapshot` objects in MCP envelope.
- Bumped to v1.0.0 as production-ready agent loop.

## [0.2.0] - 2026-05-30

### Added

- `tail_logs` MCP tool and `mobile-agent logs` CLI (Metro, logcat, iOS sim).
- Config `log` block: `androidPackage`, `metroPort`, `filters`.
- `list_flows` / `mobile-agent list-flows` to discover Maestro flows.
- `doctor --json` for scriptable checks.
- Doctor WARN checks for log sources when `log` is configured.

### Changed

- README: quick start section.
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

[1.0.2]: https://github.com/anthonysbr/mobile-agent-mcp/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/anthonysbr/mobile-agent-mcp/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/anthonysbr/mobile-agent-mcp/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/anthonysbr/mobile-agent-mcp/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/anthonysbr/mobile-agent-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/anthonysbr/mobile-agent-mcp/releases/tag/v0.1.0
