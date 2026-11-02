# Phase 04 — Cross-role validation and accessibility

## Objective

Validate the complete machine-list → detail → operational-overview flow across Owner, Admin, and Moderator—including the Admin inventory list—and verify shared presentation does not change role permissions, action availability, or existing maintenance behavior.

## Spec Mapping

- **All P1 stories:** list status, shared visual structure, detail heartbeat, telemetry history.
- **P2 story 1:** date controls.
- **FR-01–FR-13 and all success criteria.**
- **P2 story 2 (3D)** remains deferred and is not an acceptance item for this phase.

## Tasks

1. Walk the same machine list, detail, and operational overview states in logged-in Owner, Admin, and Moderator sessions. Verify identical information hierarchy (including `/admin/machines`) and distinct role actions/data scopes.
2. Verify Owner/Admin heartbeat and points calls; verify Moderator sees heartbeat but no points request under the current Swagger permissions.
3. Verify direct-entry and return navigation for list → detail → operational overview, including invalid/missing machine IDs and browser back behavior.
4. Check widths 390px, 768px, 1023px, 1024px, and 1440px; ensure shared cards/tables do not cause horizontal page overflow and mobile action bars do not cover content.
5. Check keyboard navigation, visible focus, non-color status labels, range validation, empty/zero/error/permission states, and `prefers-reduced-motion` compatibility if any transitions are added.
6. Verify the operational overview's calendar shortcuts and prominent role-scope disclosure; separately verify telemetry's rolling date-time presets and that the two controls do not alter each other.
7. Verify polling pausing while the tab is hidden and no request burst across offscreen machine rows.
8. Confirm maintenance schedule, contract history, machine edit/create actions, and technician assignment actions remain unchanged and visible only for the allowed roles.
9. Record any remaining unavailable API fields; keep per-machine counts/fees and 3D controls deferred until their prerequisites are met.

## Files and Modules

- All files from Phases 01–03.
- Existing verification suites: `tests/admin-machines-iot.test.cjs`, `tests/dolores-telemetry.test.cjs`, `tests/moderator-dashboard.test.cjs`, customer role tests, and Playwright config/specs if browser coverage is added.
- No additional production component is expected solely for this validation phase.

## Dependencies

- Phases 01–03 must be implemented and integrated.
- Requires logged-in sessions for each role to complete manual browser acceptance. If a role session is unavailable, report that role as unverified; do not substitute an unauthenticated check.
- No API mutation tests are needed; all API verification is GET-only.

## Tests and Acceptance

- Static checks: `npm.cmd run lint`; `npx.cmd tsc --noEmit --incremental false`.
- Focused checks: `node --test tests/admin-machines-iot.test.cjs tests/dolores-telemetry.test.cjs tests/moderator-dashboard.test.cjs`.
- Browser acceptance: role matrix at 390px, 768px, 1023px, 1024px, and 1440px; execute list → detail → operational overview → back in each available authenticated role.
- Acceptance: machine lifecycle and heartbeat statuses are not conflated; `UNKNOWN`, empty, API error, and permission denied are visibly distinct.
- Acceptance: moderator telemetry points are not queried; Owner/Admin points use valid selected machine/range and pagination.
- Acceptance: operational overview routes work for all three roles; Admin values are system-scoped, Moderator values are operational-only with financial fields omitted, and Owner values remain scoped by the authenticated JWT.
- Acceptance: operational overview shows calendar shortcuts and a prominent disclosure that its aggregates are role-wide and the selected machine is navigation context only; telemetry retains independent rolling date-time controls.
- Acceptance: no unsupported per-machine totals or 3D model are shown as available.

## Risks and Notes

- Any missing authenticated role session leaves that role's browser acceptance unverified; this must be disclosed in the phase evidence.
- Existing unrelated lint/TypeScript failures, if present, should be recorded separately from regressions in the changed modules.
- Full `npm run build` may have existing baseline blockers; capture them without changing unrelated routes as part of this feature.

## Verification Record — 2026-11-01

- Added `tests/e2e/machine-operational-overview.spec.ts`. It covers Owner, Admin, and Moderator at 390, 768, 1023, 1024, and 1440px; each run checks list → detail → operations → browser back, horizontal overflow, heartbeat requests, dashboard requests without a client-supplied `ownerId`, and role-specific telemetry/financial presentation. Result: **3/3 passed**.
- These E2E cases intercept all Dolores API requests and use role-claim cookies. They verify frontend routing, presentation, and request boundaries only; they do not verify backend JWT authorization or live API data.
- Manual authenticated browser acceptance remains **unverified** because the browser access host was unavailable. No API mutations were sent.
- Full Playwright suite: **11 passed, 3 failed**. Unrelated failures are the Admin overview date-range E2E (`tests/e2e/admin-overview-alignment.spec.ts`), plus landing-page keyboard-focus and touch-target checks (`tests/e2e/landing-page.spec.ts`). The new Phase 04 cases passed in the same run.
- Focused Node suites: **20 passed, 11 failed**. Failures come from existing test harness drift (`@/schema/profiles.schema`, removed `machines.page.tsx` path, and the Moderator dashboard async harness returning its pending state). Shared presentation, role boundary, heartbeat, visibility polling, and telemetry-history checks passed.
- Changed source-file ESLint and the new E2E spec ESLint pass. `git diff --check` passes (only existing LF/CRLF normalization warnings).
- Repo-wide `npm.cmd run lint` and `npx.cmd tsc --noEmit --incremental false` remain blocked by unrelated existing errors in `src/pages/dashboard/menu`, `src/pages/technician/tasks/work-order-detail-screen.tsx`, `src/pages/moderator/buyback`, and `src/pages/moderator/technical`; none point to Phase 04 files.
- Per-machine usage/fees and the 3D viewer remain deferred because the API contract does not provide the required per-machine aggregates/model asset.
