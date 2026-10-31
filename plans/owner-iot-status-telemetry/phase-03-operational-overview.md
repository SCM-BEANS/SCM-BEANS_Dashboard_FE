# Phase 03 — Operational overview

## Objective

Implement the reference flow from machine detail to a broader operational overview using only confirmed aggregate dashboard data, with clear date scope and a route back to the originating machine.

## Spec Mapping

- **P1 story 5:** role-scoped operational overview from Owner, Admin, or Moderator machine detail.
- **FR-03–FR-05:** detail action, aggregate overview, and metric integrity.
- **Success criteria 3–4:** navigation to overview and dashboard-sourced cup totals/daily chart.
- **P2 story 1:** time-range controls where applicable.

## Tasks

1. Add one shared operational-overview presentation used by Owner, Admin, and Moderator. Wire the “Xem dữ liệu vận hành” action into each shared machine-detail action area using the Phase 01 path helpers. Each role opens its own route from the selected machine detail, retains that machine/contract as navigation context, and prominently states that dashboard numbers are role-scope aggregates, not selected-machine totals.
2. Add/recognize the role-specific operation routes through the existing route system: Owner under `/dashboard/machines/{machineId}/operations`, Admin under `/admin/machines/{machineId}/operations`, and Moderator under `/moderator/machines/{machineId}/operations`. Update path helpers, catch-all section validation/screen dispatch, or add only the minimal route wrappers the existing routing convention requires. Direct entry must validate the machine context and provide an internal fallback to the role's machine list/detail.
3. Wire `dashboardApi.getOverview(signal, fromDate, toDate)` to the confirmed `GET /api/v1/dashboard/overview` endpoint. Use `cupsInSelectedPeriod` and `dailyAcceptedCupUsage` when present; do not supply `ownerId` from the client to widen scope.
4. Preserve the endpoint's inclusive calendar-date semantics, seven-day default, and 90-day maximum. Provide aggregate shortcuts for Today, Yesterday, This week (Monday through today), Last week (Monday through Sunday), Last 30 calendar days, and This month (first day through today), plus custom dates. Do not allow a future end date or a range longer than 90 days. Keep this calendar control distinct from telemetry points' rolling 24h/7d/30d/custom date-time range.
5. Extend `src/schema/dashboard.schema.ts` with a strict Zod type for the Swagger-documented `periodFinancialMetrics` fields (`currency`, period issued/collected amounts, quality and basis fields), accounting only for documented optional/null values. Update `src/apis/dashboard.api.ts` only if needed to parse the expanded response. Present financial information only when returned by the authorized role response and label it accurately (period amount, monthly rental fee, or PAYG unit rate). Never render a PAYG unit rate as accumulated fee; Moderator must not show financial cards as zero when that role's response omits them.
6. Show aggregate loading, empty, partial, and error states without blocking the machine detail or heartbeat panel. Ensure chart empty/zero values are not conflated.
7. Keep per-machine cup/PAYG values out of this phase. The FE helper `/dashboard/daily-cups/machines` is not in live Swagger; do not call it until backend documentation confirms path, role, and response semantics.

## Files and Modules

- `src/pages/dashboard/read/customer-read-screen.tsx`
- `src/pages/dashboard/read/customer-read-descriptor.ts`
- `src/pages/dashboard/machines/machines-screen.tsx`
- `src/pages/dashboard/[[...sections]].page.tsx` and `src/routes/routes.ts` (Owner route recognition/dispatch)
- `src/pages/admin/machines/[machineId].page.tsx` and the existing Admin route composition (Admin operations route)
- `src/pages/moderator/moderator-read-screens.tsx` and `src/routes/routes.ts` (Moderator route recognition/dispatch)
- `src/pages/dashboard/machines/machine-operations-screen.tsx` (new if route composition needs a dedicated screen)
- `src/pages/admin/machines/machine-operations-screen.tsx` and/or `src/pages/moderator/machines/machine-operations-screen.tsx` (thin role adapters only if existing router requires them)
- `src/routes/path.ts`
- `src/components/machines/operational-overview.tsx` (shared visual section if reused across roles)
- `src/apis/dashboard.api.ts` (reuse existing overview helper)
- `src/schema/dashboard.schema.ts` (strictly type documented `periodFinancialMetrics` fields and existing aggregate response)
- `src/pages/admin/overview/overview-content.tsx` and `src/pages/moderator/overview/overview-screen.tsx` (reuse date-range behavior if it matches; do not replace existing role dashboards)

## Dependencies

- Phase 01 establishes machine identity/navigation context.
- Phase 02 establishes common IoT display states and controls.
- Requires the published dashboard endpoint contract; does not require a new per-machine API.

## Tests and Acceptance

- Focused checks: `node --test tests/admin-machines-iot.test.cjs tests/moderator-dashboard.test.cjs` and applicable customer route tests.
- Acceptance: Owner, Admin, and Moderator can open the same operational-overview layout from machine detail and return with the originating machine/contract context preserved.
- Acceptance: role-scoped aggregate data is selected by `fromDate`/`toDate`; the UI prominently discloses that the selected machine is navigation context only. Ranges are valid, inclusive, end no later than today, and no longer than 90 days. Admin uses system scope, Moderator uses operational scope with no financial cards, and Owner uses JWT-derived Owner scope.
- Acceptance: calendar shortcuts cover Today, Yesterday, This week, Last week, Last 30 calendar days, This month, and custom; the dashboard's seven-day default is distinct from telemetry's rolling 24h default and presets.
- Acceptance: aggregate daily cup chart uses only API-returned dates/values; zero is shown as zero and missing/error as a distinct state.
- Acceptance: financial labels do not confuse monthly rental fee, PAYG unit rate, and actual amount.
- Acceptance: dashboard response parsing remains strict and covers only the fields documented in live Swagger; malformed or missing data is shown as unavailable/partial, never fabricated or silently coerced.
- Acceptance: no per-machine metrics are derived from aggregate dashboard values or undocumented routes.

## Risks and Notes

- The reference image shows per-machine and contract-level values, but current confirmed Owner dashboard data is aggregate. Clearly label the scope to prevent misleading interpretation.
- The operational dashboard period is calendar-date based; telemetry ranges are date-time based. Give each data panel its own clearly labeled range controls.
- The FE dashboard schema currently does not type the documented `periodFinancialMetrics` array. Implement and verify that strict schema extension before using those values.
- The 3D model and per-machine breakdown remain future work and are not blockers for this aggregate overview.
