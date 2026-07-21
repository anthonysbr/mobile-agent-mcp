# MCP response schema (v1)

```json
{ "schemaVersion": 1, "ok": true, "summary": "...", "data": {} }
```

`ok: false` sets MCP `isError: true`.

Screenshot tools add `{ "type": "image", "mimeType": "image/png", "data": "<base64>" }`. Resource: `mobile-agent://screenshot/latest`.

## Key `data` shapes

**doctor**: `{ checks, hasFailures, blockers }`

**screenshot**: `{ path, platform, capturedAt, imageOmitted? }`

**run_flow_with_context**: `FlowRunResult` + `{ logs: LogSnapshot, diagnosis: Diagnosis | null }`

**diagnosis**: `{ category, message, suggestedTools }`

Categories: `metro_unreachable`, `js_error`, `element_not_found`, `app_not_running`, `simulator_not_booted`, `flow_not_found`, `maestro_missing`, `unknown`

**run_smoke_flows**: `{ platform, passed, failed, readyForCommit }`

**collect_logs** / **tail_logs**: `{ platform, source, text, lineCount, truncated, metroReachable? }`

CLI: same envelope via `--json` (no inline image).
