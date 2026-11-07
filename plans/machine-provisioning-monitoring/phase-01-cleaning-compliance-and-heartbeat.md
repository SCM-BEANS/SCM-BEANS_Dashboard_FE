# Phase 01 - Cleaning compliance and Moderator heartbeat

Status: passing (FE implementation verified; human phase approval pending)
Stories: MP-01, MP-02, MP-07

## Objective and scope

Read server-calculated SLA next to machine cleaning history and enable Moderator heartbeat using the existing shared presentation. Preserve REST history and old review deep links.

## Tasks and file ownership

1. Extend src/apis/machines.api.ts and src/schema/machines.schema.ts with cleaning-compliance request/response. Validate machine_id matches selection; days follows verified server constraints. Do not invent a maximum days or substitute client aggregates.
2. Propose shared SLA renderer src/components/machines/machine-cleaning-compliance-panel.tsx (approval pending); reuse machines.module.css. Show percentage, evaluated/compliant days, startup/closing missing counts and flagged dates. Accessible labels/percent values; no inferred reason per flagged date.
3. Owner query stays in src/pages/dashboard/machines/machine-operational-overview-screen.tsx; history stays in machine-cleaning-history-panel.tsx. Add Admin query/view in src/pages/admin/machines/machine-operational-overview-screen.tsx. Technician integrates in src/pages/technician/machine-check/machine-detail-screen.tsx after verifying machine access.
4. Add connection tab in src/pages/moderator/machines/machine-operational-overview-screen.tsx, preserving reviews/filter URLs; reuse MachineHeartbeatPanel/usePageVisibility. Query key includes subject+machine, five-second foreground-only polling, retry policy consistent with existing telemetry.
5. Update tests/e2e/machine-operational-overview.spec.ts: allow Moderator heartbeat, continue asserting zero Moderator points and compliance calls without confirmed rights. Audit tests/dolores-telemetry.test.cjs, tests/admin-machines-iot.test.cjs and existing request harnesses for old assertions.

## Dependencies and acceptance

G1/G2/G3 are not needed. New source path approval required. Use days=30 default; accept server-evaluated_days as returned. No inferred all-good result when read fails, zero machine IDs borrowed across roles, no Owner Analytics endpoint reused for Admin SLA.

Tests: explicit request path/days/JWT, seven-field DTO with snake_case mapping, actual zero, malformed/mismatched machine, 401/403/503, old deep links and browser Back, cancel on machine/account change, hidden-page polling stop, no cleaning poll on heartbeat ticks. Check loading/empty/error on mobile and keyboard. Scenario anchors S01/S02/S06/S07/S08/S12/S13/S14/S15.

Commands: relevant existing node --test files; npx playwright test tests/e2e/machine-operational-overview.spec.ts; npm.cmd run lint; npx.cmd tsc --noEmit --incremental false. Record baseline/delta. Live scoped GET evidence remains separate from fixtures.

## Risk

SLA and cleaning history use different periods/contracts; label the SLA evaluation period. Moderator heartbeat permission does not imply telemetry or compliance permission.

## Evidence - 2026-11-07

- User approved exactly src/components/machines/machine-cleaning-compliance-panel.tsx; that is the only new source file. Existing schema/API/pages/tests edited in place.
- Owner cleaning tab and Admin new cleaning tab share server SLA presentation with 7/30/90-day choices. Query keys include subject/machine/days; no history-filter dependency or heartbeat-driven SLA polling. Days persist in URL; malformed periods stop requests.
- Backend source CleaningRecordService computes UTC dates and clamps evaluation to 1..90 days. FE displays returned evaluated_days and preserves request int32 contract; no percent recomputation.
- Inspected SecurityConfig allows ADMIN/OWNER/MODERATOR for compliance, contradicting supplied Technician claim. Per plan do not open additional role access based on inference: Technician SLA remains deferred, Moderator receives heartbeat only. Runtime role checks remain UNVERIFIED.
- Moderator keeps default review URLs, adds connection tab with foreground heartbeat and stops periodic reads after errors. New permission-denial regression failed with three calls before fix, passes with one call after eleven simulated seconds.
- Contract tests RED: five missing capability tests failed initially; GREEN: six SLA tests pass, including request365/server90 evaluation. Combined telemetry/Owner Analytics 29/29.
- Full machine-operational-overview Playwright suite 31/31, including six Phase01 tests, role scope, stale account/history reads, desktop/mobile widths, deep links/Back, 503 and hidden polling.
- TypeScript passes; lint has zero errors and three pre-existing hook warnings. Production build passes in ignored .next-cleaning-review; no running port3000 config was changed.
- Historical tests/admin-machines-iot.test.cjs has identical ten failures (9/19 pass) against HEAD source and working source using read-only in-memory source substitution. No unrelated baseline fixes included.
- Independent review APPROVED, no remaining findings in phase scope; git diff --check clean. No authenticated live API mutation, certificate issuance or Edge connection performed.
