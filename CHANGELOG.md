# @robotrock/sdk

## 1.8.0

### Minor Changes

- Remove deprecated `toolDisplayResult` / `ToolDisplayResultOptions` exports from `robotrock/eve` (display envelopes unused by OpenUI).
- Point Eve tool `replyGuidance` and `generate_image` model output at OpenUI emission (`Image` / `ImageBlock` with `url` + `storageId`).
- `chats.uploadImage()` now mints a Convex upload URL, posts image bytes directly to storage, then finalizes via the API — avoids Vercel `FUNCTION_PAYLOAD_TOO_LARGE` on large base64 bodies. Public input (`mediaType` + `base64` + chat/task ids) is unchanged.

## 1.6.0

### Minor Changes

- Remove nested tool-result UI metadata (`ui.present`, `ui.entity`, `ui.layout`, `ui.rowsPath`, `uiHint`) from `formatTool*` helpers. Results are now plain data + `replyGuidance` only. Deleted `withToolUi` / `withUiHint` / `extractToolResultUiMeta` exports.

## 1.5.1

### Patch Changes

- Document dashboard chat GenUI as **OpenUI** (OpenUI Lang + shadcn library). Tools return data via `formatTool*`; Eve agents **must** emit ```openui fences for user-visible structured data (trail-only without it). TRL / layout-cache wording removed from README and AGENTS.

## 1.5.0

### Minor Changes

- Add `toolChartResultSchema` + `formatToolChartResult` / `formatToolChartResultFromLong` for wide-format chart tool outputs (`type`, `xKey`, `yKeys`, `series`) for OpenUI/shadcn charts.
- `generate_random_chart` now returns the canonical chart schema (`type`/`xKey`/`yKeys`/`series`) instead of `axis` + inferred series columns.

## 1.4.0

### Minor Changes

- Add Eve catalog tools: `generate_image` and `generate_random_chart` (`robotrock/eve/tools/catalog/*`).
- Add Eve admin tool `get_workspace_usage` for plan/limits/usage (`robotrock/eve/tools/admin/get-workspace-usage`).
- Add nested tool-result UI helpers (`withToolUi`, `extractToolResultUiMeta`) and entity schema exports from `robotrock/eve`.
- Extend `formatToolListResult` / `formatToolObjectResult` / `formatToolQueryResult` with nested `ui` metadata (`present`, `entity`, `rowsPath`, `layout`).

## 1.3.4

### Patch Changes

- Add `ToolUiHint`, `withUiHint`, `extractToolUiHint`, and `isToolUiHint` exports from `robotrock/eve` for TRL layout hints on tool results.
- Add `formatToolListResult` / `formatToolObjectResult` `uiHint` option and tool display envelope helpers for AI-generated chat UI.

## 1.3.3

### Patch Changes

- Export Eve deployment-access constants from `robotrock/eve/agent` (`ROBOTROCK_EVE_CONNECT_ROUTES`, `ROBOTROCK_EVE_CHAT_ROUTES`, `ROBOTROCK_EVE_BEARER_PROTECTED_PATHS`, `EVE_SELF_AUTH_TOKEN_ENV_VAR`).
- Document which `/eve/v1/*` routes must accept the dashboard Bearer token (`EVE_SELF_AUTH_TOKEN`).

## 1.2.0

### Minor Changes

- Add `robotrock/agent-admin` HTTP client for `/v1/agent-admin/*` (tenant-admin team, group, and task APIs).
- Add Eve admin tools: `manage_team_members`, `manage_groups`, `query_tasks` under `robotrock/eve/tools/admin/*`.
- Extend agent-service auth headers with optional `x-robotrock-acting-user-id`.
- Self-hosted and localhost agents can use `ROBOTROCK_API_KEY` for admin tools (no `ras_*` token required).

## 1.1.0

### Minor Changes

- Add `robotrock/eve/agent` for Eve channel auth, hooks, session client, and inbox task APIs.
- Add `robotrock/eve/tools` with categorized Eve tool factories (`inbox/create-task`, `identity/whoami`, `identity/my-access`).
- Export `buildTaskHandledResumeMessage` from `robotrock/eve`.

## 1.0.0

### Major Changes

- Namespace the client API and add first-class chat support.

  **Breaking**: task CRUD moved under `client.tasks`. Migrate:

  - `client.createTask(...)` → `client.tasks.create(...)`
  - `client.getTask(id)` → `client.tasks.get(id)`
  - `client.cancelTask(id)` → `client.tasks.cancel(id)`
  - `client.sendUpdate(...)` → `client.tasks.sendUpdate(...)`

  `client.sendToHuman(...)` (and the AI/Trigger/Workflow wrappers) are unchanged.

  Deprecated top-level aliases (`createTask`, `getTask`, `cancelTask`, `sendUpdate`) remain for one release and delegate to `client.tasks.*`.

  **New**: `client.chats` namespace for long-lived agent chats:

  - `client.chats.create({ agentIdentifier, title, messages?, assignTo?, app?, parentChatId? })`
  - `client.chats.close(chatId, { reason? })`

  Plus the `closeChat` AI SDK tool (via `createRobotRockAiTools({ chatId })` or
  `closeChatTool(...)`) so a chat agent can close its own chat, and the
  `createAgentChatBodySchema` / chat types are now exported from `robotrock`.

## 0.9.0

### Major Changes

- **Focus on human feedback:** removed send-time OTel snapshots (`agent.otel`, `agent.info`, `toolCalls`, `cost`) from the wire schema and feedback analysis.
- Removed `robotrock/otel` export, `agentTelemetryFromOtel()`, and `toolCallsFromOtelSpans()`.
- **`createClient({ version })` is now agent release** (`string`), not task context format (`2`). Use `advanced.contextVersion` for the wire format (default `2`).
- **`sendToHuman({ version? })`** maps to wire `agent.version` (replaces `sendToHuman({ agent })` on the SDK surface).
- Wire/API context format field renamed **`version` → `contextVersion`** (legacy `version: 2` still accepted on ingest).

### Minor Changes

- Kept handle-time OTel on Trigger.dev / Vercel Workflow (`recordOtel`, `robotrock.wait_for_human` span, `robotrock.task_handled` event).
- MCP `send_to_human` accepts top-level `version` (agent release).

## 0.8.5

### Minor Changes

- Export platform terminal action ids and helpers: `PLATFORM_MARK_DONE_ACTION_ID`, `PLATFORM_REJECT_REQUEST_ACTION_ID`, `isPlatformTerminalAction`, `parseHandledOutcome`, `assertNotPlatformRejectRequest`, `PlatformRejectRequestError`, and related types.
- Document that agents must stop when a handled task uses `robotrock:mark-done` or `robotrock:reject-request`.

## 0.8.5

### Minor Changes

- Trigger.dev and Vercel Workflow: optional OTel recording when humans handle tasks (`recordOtel` / `ROBOTROCK_OTEL_RECORD_HANDLED`).
- Adds `robotrock.wait_for_human` child span plus `robotrock.task_handled` event and attributes (`robotrock.action.id`, `robotrock.human_wait_ms`, etc.).
- Auto-fills `agent` telemetry at platform task create when OTel recording is enabled.
- New exports: `captureRobotRockOtelHandle`, `recordRobotRockHandledToOtel`, `beginRobotRockHumanWaitOtel`, `finishRobotRockHumanWaitOtel`.

## 0.8.4

### Minor Changes

- Add `agent.otel` structured OpenTelemetry snapshot on `sendToHuman` (traceId, rootDurationMs, span summaries).
- Add `agentTelemetryFromOtel()` and `toolCallsFromOtelSpans()` helpers (`robotrock` and `robotrock/otel` exports).
- Optional peer dependency `@opentelemetry/api`.

## 0.8.3

### Patch Changes

- Bundle `@robotrock/core` into the published package so npm install no longer requires the private workspace package.

## 0.8.2

### Patch Changes

- Add `agent.toolCalls` on `sendToHuman` — per-tool invocation counts keyed by tool name (e.g. `{ readFile: 3, grep: 2 }`). `toolCallCount` is derived from the sum when omitted.

## 0.8.1

### Patch Changes

- No API changes.

## 0.8.0

### Minor Changes

- Add optional `agent` telemetry on `sendToHuman` (version, cost, tool calls) via `agentTelemetrySchema` and `AgentTelemetry` types.

## 0.7.0

### Minor Changes

- Add Vercel AI SDK 7 compatibility: explicit `Tool` return types on AI tool factories, export `RobotRockAiTools`, and peer support for `ai@^7`.

## 0.2.0

### Minor Changes

- 3feffff: Explicit client-only SDK API
  - Remove `configureRobotRock`, standalone `createTask`, and module-level default client
  - Rename client `createTask` → `sendToHuman` and `CreateTask*` types → `SendToHuman*`
  - Add `app` to `createClient` / `RobotRockConfig` (client-level inbox routing only)
  - Document shared `lib/robotrock.ts` pattern with `robotrock.sendToHuman()`
