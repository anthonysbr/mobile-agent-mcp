# Agent loop

```bash
mobile-agent doctor --json
mobile-agent run-with-context smoke-login ios --json
```

On failure: read `data.diagnosis.suggestedTools`. MCP returns screenshot inline — don't read local PNG paths.

## MCP mapping

| Shell | MCP |
|-------|-----|
| `doctor --json` | `doctor` |
| `run-with-context foo ios` | `run_flow_with_context` `{ "flow": "foo", "platform": "ios" }` |
| `run-all ios` | `run_smoke_flows` |
| `logs ios --duration-ms 3000` | `collect_logs` |
| `screenshot ios` | `screenshot` |
| `metro-status` | `metro_status` |
| `boot-simulator` | `boot_simulator` |
| `adb-reverse 8081` | `adb_reverse` `{ "ports": [8081] }` |

## Errors

- `[MAESTRO_NOT_FOUND]` — install Maestro
- `[FLOW_NOT_FOUND]` — `list_flows`
- `[LOG_SOURCE_UNAVAILABLE]` — start Metro or fix `log.metroPort`
- iOS screenshot fail — `boot_simulator`
- Android Metro unreachable — `adb_reverse 8081`
