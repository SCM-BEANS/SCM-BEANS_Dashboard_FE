# Phase 02 — Heartbeat and telemetry

## Objective

Connect the common IoT panel to the documented read APIs and show consistent liveness, health, and history states with role-aware access behavior.

## Spec Mapping

- **P1 story 1:** connection state in Owner machine list.
- **P1 story 3:** latest heartbeat and health information on Owner machine detail.
- **P1 story 4:** telemetry history over a selected range.
- **P2 story 1:** quick ranges and custom telemetry range.
- **FR-02, FR-06–FR-10, FR-13.**

## Tasks

1. Use `telemetryApi.getLatestHeartbeat` in the Owner machine detail and list for Smart IoT machines that are visible and in Owner scope. Display `ONLINE`, `OFFLINE`, or `UNKNOWN` as a connection badge separate from the machine lifecycle status.
2. Show heartbeat timestamps and only health metrics returned by the API (Wi-Fi RSSI, RAM, latency, firmware/app version, and other supported fields). Do not render internal stream IDs.
3. Refresh heartbeat every 5 seconds while the detail/list is visible; pause while the page is hidden. On lists, query only visible Smart IoT rows and stagger requests. Keep failures, `UNKNOWN`, and `OFFLINE` visually distinct.
4. Add heartbeat badges to visible Smart IoT rows in the Owner, Admin, and Moderator machine lists, and reuse the heartbeat detail display in all three roles. Keep each role's `useQuery` and machine-scope checks in its page. This explicitly covers `src/pages/admin/machines/index.page.tsx` and the Moderator inventory list.
5. Use `telemetryApi.listMachinePoints` in Owner and Admin detail panels. Provide rolling 24h, 7d, 30d, and custom date-time ranges, validate `from < to`, request 100 points per page, and advance `offset` only when the user loads more.
6. Build the field selector from returned point `field` values. Chart numeric values by `timestamp`; show nonnumeric values as timestamped records. Do not invent units when the API provides none.
7. Render the same history panel location for Moderator but set its capability to unavailable/permission denied. Do not issue a points request for Moderator under the current Swagger contract. Reconcile the separate Moderator IoT page so a 403 is not represented as an empty successful result.
8. Keep maintenance schedule data in its separate existing section; heartbeat and telemetry failures must not block machine profile/maintenance content.

## Files and Modules

- `src/components/machines/smart-iot-panel.tsx`
- `src/components/machines/machine-connection-badge.tsx`
- `src/components/machines/machine-heartbeat-panel.tsx`
- `src/components/machines/machine-heartbeat-visibility.ts`
- `src/components/machines/telemetry-history-panel.tsx`
- `src/components/machines/machines.module.css`
- `src/components/table/data-table.tsx` (optional row attributes for visible-row tracking)
- `src/pages/dashboard/machines/machines-screen.tsx`
- `src/pages/admin/machines/index.page.tsx` (visible Smart IoT list badges)
- `src/pages/admin/machines/machine-detail-screen.tsx`
- `src/pages/moderator/machines/machines-screen.tsx` (visible Smart IoT list badges)
- `src/pages/moderator/machines/machine-detail-screen.tsx`
- `src/pages/moderator/iot/iot-screen.tsx`
- `src/apis/telemetry.api.ts` (reuse existing functions; change only if request parameters must align with current Swagger)
- `src/schema/telemetry.schema.ts` (reuse strict time range and flexible field/value types)
- `tests/dolores-telemetry.test.cjs`
- `tests/admin-machines-iot.test.cjs`

## Dependencies

- Requires Phase 01 common IoT panel/capability contract.
- Uses existing API clients/schemas. No backend mutation or permission change is included.
- Phase 04 validates responsive and role-specific behavior.

## Tests and Acceptance

- Focused phase verification: run the Phase 02 named tests in `tests/dolores-telemetry.test.cjs` and `tests/admin-machines-iot.test.cjs`; run ESLint on the touched source files.
- Acceptance: Owner, Admin, and Moderator machine lists show an authorized heartbeat state for visible Smart IoT rows, separately from lifecycle status; role scope is preserved.
- Acceptance: Owner/Admin detail requests target the current machine UUID, valid time range, `limit=100`, and correct offset; the next page is not requested until requested by the user.
- Acceptance: Moderator receives heartbeat when permitted but no points request; its panel explains the current permission boundary.
- Acceptance: request failures show “Không tải được trạng thái/dữ liệu” and retry; a request failure is never displayed as `OFFLINE`.
- Acceptance: `UNKNOWN` is distinct from network failure, and health values are omitted when absent.
- Acceptance: polling stops when the page is not visible; list request fan-out is limited to visible machines and staggered.
- Verification note: older tests in `tests/admin-machines-iot.test.cjs` and `tests/moderator-dashboard.test.cjs` still reference stale page paths/query fixtures and fail independently of the Phase 02 checks. Full TypeScript checking also reports existing errors in `src/pages/dashboard/menu`, `src/pages/moderator/buyback`, and `src/pages/moderator/technical`; it reports no errors in the Phase 02 files.

## Risks and Notes

- Swagger's role declaration excludes Moderator from points. If backend authorization changes, update this plan and permission tests before enabling the points query.
- Field distributions and sample sizes vary; default chart selection should not assume a field exists.
- The heartbeat endpoint is per-machine; request volume must be reviewed for large Owner inventories.
