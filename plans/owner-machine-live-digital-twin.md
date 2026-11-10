# Owner "Xem máy": live digital twin from real machine data

## Goal

The "Xem máy" tab on the Owner machine detail page (`/dashboard/machines/:id`) currently only runs a local test
cycle. Make it follow the real machine: the 3D model moves according to the machine's last reported `brewState`,
and a side panel shows connection, the current brew step and the machine's open alerts.
Owner first. Other roles come later in a separate plan; keep the new pieces role-neutral so they can be reused.

## Real data available (FE only, BE is read-only reference)

- Heartbeat: `telemetryApi.getLatestHeartbeat(machineId)` → `GET /telemetry-query/machines/:id/heartbeats/latest`
  (`MachineHeartbeatSchema` in `src/schema/telemetry.schema.ts`): `status` ONLINE/OFFLINE/UNKNOWN, `lastSeenAt`,
  `brewState` (string), `sequenceNumber`, `health`, `metricsJson` (unknown JSON). Owner is allowed
  (BE `SecurityConfig`: telemetry-query → ADMIN, MODERATOR, OWNER).
  Existing owner polling pattern: `src/pages/dashboard/machines/machine-operational-overview-screen.tsx:127`.
- `brewState` values come from BE proto `dolores_platform/src/main/proto/contract.proto` enum `BrewState`:
  `BREW_STATE_UNSPECIFIED` (BE stores it as `UNKNOWN`), `IDLE`, `CHECKING_TEMPERATURE`, `HEATING`, `CHECKING_ERRORS`,
  `STARTING_MILK`, `WAITING_FOR_MILK`, `RETURN_TO_NEUTRAL_1`, `EJECT_GROUNDS_1`, `RETURN_TO_NEUTRAL_2`, `GRINDING`,
  `CLOSE_CHAMBER_LID`, `TAMPING_ACCORDING_TO_RECIPE`, `PRE_INFUSION`, `MAIN_EXTRACTION`, `DRY_TAMP`,
  `OPEN_CHAMBER_LID`, `EJECT_GROUNDS_2`, `RETURN_TO_NEUTRAL_3`, `COMPLETE`, `ERROR` (all prefixed `BREW_STATE_`).
  Accept both the prefixed and unprefixed form; anything else → unknown.
- Alerts: `GET /alerts?machineId=<uuid>` (any authenticated user; BE filters by `machineId`). `AlertSchema` has
  `id, level, machineId, message, acknowledged, ts`. There is no alarm code, so do NOT try to highlight model parts.
  `notificationsApi.listAlerts` has no params today: add an optional `{ machineId }` param (keep current callers working).
- There is no push channel (no SSE/WebSocket) to the browser. Poll.

## What to build

### 1. Brew state mapping — `src/components/features/digital-twin/live/brew-state-mapping.ts`
Pure function `mapBrewState(raw: string | null | undefined)` →
`{ key, label (Vietnamese), phase: DigitalTwinCyclePhase | null, step: LiveBrewStep | null, fault: boolean }`.

| brewState | twin phase | step | label |
|---|---|---|---|
| IDLE, UNKNOWN/UNSPECIFIED/null | idle | – | "Đang chờ" / "Chưa rõ trạng thái" |
| CHECKING_TEMPERATURE, HEATING, CHECKING_ERRORS | idle (no motion) | heating | "Đang kiểm tra nhiệt độ" / "Đang làm nóng" / "Đang tự kiểm tra lỗi" |
| GRINDING | grinding | grinding | "Đang xay hạt" |
| CLOSE_CHAMBER_LID | closing | closing | "Đang đóng cụm nén" |
| TAMPING_ACCORDING_TO_RECIPE, DRY_TAMP | tamping | tamping | "Đang nén cà phê" / "Đang nén khô" |
| PRE_INFUSION, MAIN_EXTRACTION | extraction | extraction | "Đang ngâm sơ bộ" / "Đang chiết xuất" |
| OPEN_CHAMBER_LID | opening | opening | "Đang mở cụm nén" |
| EJECT_GROUNDS_1, EJECT_GROUNDS_2 | ejecting | ejecting | "Đang đẩy bã" |
| RETURN_TO_NEUTRAL_1/2/3 | scraping | returning | "Đang về vị trí chờ" |
| STARTING_MILK, WAITING_FOR_MILK | idle (no motion) | milk | "Đang chuẩn bị sữa" / "Đang chờ sữa" |
| COMPLETE | complete | done | "Đã pha xong" |
| ERROR | fault | – | "Máy báo lỗi" (fault = true) |

Steps shown in the stepper, in order: heating → grinding → closing → tamping → extraction → opening → ejecting →
returning → done (Vietnamese labels: Làm nóng, Xay hạt, Đóng cụm nén, Nén, Chiết xuất, Mở cụm nén, Đẩy bã, Về vị trí, Hoàn tất).
Milk is shown as a label only (no model part). Strings go in `src/text/digital-twin/digital-twin-messages.ts`
(add a new `as const` block, keep UTF-8 diacritics).

### 2. Live event hook — `src/components/features/digital-twin/live/use-live-brew-cycle.ts`
`useLiveBrewCycle({ machineId, enabled })`:
- `useQuery` heartbeat, `refetchInterval: 3_000` while enabled and page visible, `refetchIntervalInBackground: false`,
  `retry: false`, query key `["digital-twin-live-heartbeat", subject, machineId]` (follow how the owner overview builds `subject`).
- Produces a `DigitalTwinCycleEvent` with `source: "server"`: phase from the mapping; `progress` animated locally
  from 0→1 over that stage's `durationMs` in `DIGITAL_TWIN_OPERATION_STAGES` and looped while the state does not change
  (the heartbeat has no progress). Reset progress when `brewState` changes. No motion when phase is null/idle.
- When status is OFFLINE/UNKNOWN: stop animating (keep last pose), expose `stale: true`.
- Returns `{ heartbeat, event, mapped, stale, isLoading, error, refetch }`.
- Clean up timers on unmount; never poll when `enabled` is false.

### 3. Viewer input — `BodyModelViewer.tsx` (minimal change)
Add optional props `operationEvent?: DigitalTwinCycleEvent | null` and `operationSource?: "test" | "external"`.
When `operationSource === "external"`, feed that event to `BodyModelCanvas` instead of `useDigitalTwinTestCycle`'s
event and hide the test-cycle run button and its status chip (the side panel shows status). Default behaviour unchanged.
Do not touch `BodyModelCanvas.tsx` / `DigitalTwinClusterCanvas.tsx` motion code.

### 4. Tab content — `machine-digital-twin-view.tsx`
`MachineDigitalTwinView({ machineId, machineType })`:
- Mode switch "Trực tiếp" / "Mô phỏng" (a small segmented button group with `aria-pressed`, ≥44px targets).
  SMART_IOT → default Trực tiếp. CONVENTIONAL → only Mô phỏng, no switch, note "Máy thông thường không gửi dữ liệu,
  chỉ xem mô phỏng."
- Note line under the switch (replace the current fixed note in `machines-screen.tsx`, move it inside the view):
  - Trực tiếp: "Mô hình chuyển động theo trạng thái máy gửi về, cập nhật mỗi 3 giây."
  - Mô phỏng: "Mô hình 3D minh họa, chuyển động mô phỏng — không phải dữ liệu thời gian thực của máy."
- Layout: viewer left, side panel right at ≥1024px (grid `minmax(0,1fr) 300px`); stacked below that. No horizontal
  scroll at 390px.
- Side panel (Trực tiếp only), sections with h3 headings:
  1. **Kết nối**: reuse `MachineConnectionBadge` (`src/components/machines/machine-connection-badge.tsx`) +
     "Tín hiệu gần nhất: <relative time, e.g. '5 giây trước'>" (vi-VN, Asia/Ho_Chi_Minh for absolute times).
  2. **Bước hiện tại**: ordered list of the steps; done ✓, current highlighted (`aria-current="step"`), pending muted;
     the current mapped label as text; ERROR shows the label in the accent colour with `role="alert"`.
  3. **Số liệu máy gửi**: only if `metricsJson` is a plain object (parse if it is a JSON string) — render primitive
     key/values in a `<dl>` (max 8 entries, raw keys). Otherwise omit the section.
  4. **Cảnh báo đang mở**: `useQuery` alerts for this machine (refetch every 15 s while live), unacknowledged only,
     newest first, max 5: level badge (reuse `StatusBadge` if it fits), message, time. Empty: "Không có cảnh báo."
     Read-only (no ack button for Owner). 403 → hide the section.
- States: heartbeat loading → panel shows "Đang kết nối với máy…"; heartbeat error → message
  "Không lấy được trạng thái máy." + "Thử lại" and the model stays still; OFFLINE/UNKNOWN → viewer gets a dim overlay
  label "Mất kết nối — trạng thái cuối lúc <time>" (do not block toolbar controls).
- Mô phỏng mode = today's behaviour (test cycle with its run button).
- CSS in `digital-twin-viewer.module.css` (or a new `machine-digital-twin-view.module.css`), Owner palette as before.

### 5. Wiring — `machines-screen.tsx`
Pass `machineId` and `machineType` to `MachineDigitalTwinView`; remove the now-duplicated note line there. The tab
still mounts only while active. Nothing else on the page changes.

## Tests
- Unit test for `mapBrewState` if the repo's unit runner covers `src/**` (check `package.json`/existing unit tests;
  follow their location and style). Cover prefixed + unprefixed, UNKNOWN, ERROR, every row in the table.
- `tests/e2e/owner-machines-ui.spec.ts`: extend the mock router with `heartbeats/latest` and `/alerts`:
  - SMART machine, heartbeat `{status:"ONLINE", brewState:"BREW_STATE_GRINDING", lastSeenAt: now}` → tab "Xem máy"
    shows "Trực tiếp" pressed, the step "Xay hạt" has `aria-current="step"`, label "Đang xay hạt" visible, one alert
    message from the mock visible.
  - OFFLINE heartbeat → "Mất kết nối" text visible.
  - Switch to "Mô phỏng" → the test-cycle run button "Chạy toàn bộ chu trình pha cafe thử nghiệm" exists.
  - CONVENTIONAL machine → no "Trực tiếp" button, conventional note visible.
  - Keep the existing tab test working (canvas or load error), and the 390px no-horizontal-scroll check.
  Make sure every other test in that file still gets a response for the new endpoints (default `[]`/404 is fine).

## Rules
- FE only, no install, no commit. UTF-8, keep Vietnamese diacritics. Do not edit motion code.
- Verify: `bash scripts/verify/verify.sh --e2e "owner-machines-ui.spec.ts lifecycle-actions.spec.ts machine-operational-overview.spec.ts"`
  then a full `bash scripts/verify/verify.sh` once. Never call Playwright or `next build` directly.
- Report (max 20 lines): files changed, what changed in `BodyModelViewer.tsx`, verify summary lines, anything left undone.
