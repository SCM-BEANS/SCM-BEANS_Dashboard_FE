# Plan: Shared machine and Smart IoT experience

Mode: --hard
Risk: high-risk — cross-role UI with external API and authorization dependencies
Test: default
Tasks: default
**Status:** Complete; frontend Phase 04 acceptance is reviewed and approved. Live authenticated API and browser authorization checks remain unverified because the browser access host was unavailable.

**Spec:** `plans/owner-iot-status-telemetry/spec.md`

**Date:** 2026-11-01

**Directory:** `plans/owner-iot-status-telemetry/`

## Scope Challenge

- **Exists?** Partially. Machine lists and detail pages exist for all three roles. Admin and Moderator have separate IoT pages/detail logic; Owner currently has no heartbeat or telemetry-points UI. Generic shared pieces and API clients exist, but no common machine or IoT presentation component exists.
- **Minimum:** Share the machine list/detail/IoT presentation; add Owner heartbeat and telemetry history; link machine detail to an aggregate operational overview; preserve each role's authorized scope and actions.
- **Deferred:** 3D model delivery and per-machine cup/PAYG totals. Per-machine figures stay out until a documented authorized API exists.
- **Complexity:** Hard because this changes multiple role views and depends on authorization and external API contracts.

## Design Decisions

- Create a focused presentation layer under `src/components/machines`; keep role routes, scoped queries, mutations, and role-specific action bars in the existing role pages. Shared components own presentation only; each role page owns queries, authorization scope, and actions.
- Render the same machine/IoT structure for Owner, Admin, and Moderator. Capability props or data states determine whether a panel shows data, loading/error, or a permission message; shared UI does not imply shared API access.
- Use the existing `telemetryApi`, Zod schemas, `machinesApi`, and `dashboardApi`. Do not duplicate response parsing or invent endpoint contracts.
- Keep machine lifecycle status distinct from IoT liveness status.
- Display role-scoped aggregate cup and financial data from authorized `dashboard/overview` responses with a prominent disclosure that the selected machine is context only. Do not derive per-machine totals from aggregates or mistake a contract unit rate for an incurred charge.
- Keep maintenance schedule in a separate section. Do not add offline-review decisions, telemetry ingestion, backend authorization changes, or a 3D viewer.
- Heartbeat polling is per machine: refresh at the documented 5-second interval while visible; pause when hidden, query only visible Smart IoT rows, and stagger list requests.
- Moderator's telemetry-points section stays in the common position and shows a permission state because the current Swagger role list does not include Moderator for that endpoint.

## Phase Overview

| Phase | Objective | Stories / requirements |
| --- | --- | --- |
| [Phase 01 — Shared machine presentation](phase-01-shared-machine-presentation.md) | Extract and apply the common machine list/detail/IoT layout across Owner, Admin, and Moderator, including Admin's machine list, while preserving role routes and actions. | P1 story 2; FR-01, FR-03 |
| [Phase 02 — Heartbeat and telemetry](phase-02-heartbeat-and-telemetry.md) | Add authorized heartbeat badges to all three role lists/details, Owner/Admin telemetry history, and enforce the Moderator points permission boundary. | P1 stories 1, 3, 4; P2 story 1; FR-02, FR-06–FR-10, FR-13 |
| [Phase 03 — Operational overview](phase-03-operational-overview.md) | Link each role's machine detail to a shared operational overview using confirmed role-scoped aggregate dashboard data and accurate metric labels. | P1 story 5; FR-03–FR-05; success criteria 3–4 |
| [Phase 04 — Cross-role validation](phase-04-cross-role-validation.md) | Validate visual consistency, responsive behavior, accessibility, API request boundaries, and failure states across all roles. | All P1 stories; FR-07–FR-13; all success criteria |

Story references use priority plus order in the spec because the spec does not assign separate story IDs: **P1 story 1** = Owner machine-list connection state; **P1 story 2** = shared structure across roles; **P1 story 3** = machine-detail heartbeat; **P1 story 4** = telemetry history; **P1 story 5** = role-scoped operational overview; **P2 story 1** = telemetry date presets/custom range; **P2 story 2** = future 3D view.

## Dependency Order

Phase 01 establishes the shared presentation API and role adapters for Owner, Admin, and Moderator machine lists/details. Phase 02 fills the shared IoT slots with authorized heartbeat/telemetry data, including list badges for all three roles; Moderator points remain disabled under current Swagger permissions. Phase 03 adds a role-scoped operational-overview route from each role's machine detail and uses aggregate dashboard data. Phase 04 verifies all three list → detail → overview flows and catches route, styling, permission, and responsive regressions. Phase 03 may proceed alongside Phase 02 only after the shared machine identity/context contract from Phase 01 is stable.

## API Contract and Permission Matrix

| Data | Endpoint | Role scope / plan use |
| --- | --- | --- |
| Latest heartbeat | `GET /api/v1/telemetry-query/machines/{machineId}/heartbeats/latest` | Owner, Admin, and Moderator within permitted machine scope. `ONLINE` / `OFFLINE` / `UNKNOWN` is separate from lifecycle status. |
| Telemetry points | `GET /api/v1/telemetry-query/machines/{machineId}/points?from&to&limit&offset` | Admin and Owner within permitted machine scope. Moderator sees the same panel position but no points query unless Swagger later grants access. 100-point pages. |
| Maintenance schedule | `GET /api/v1/machines/{id}/maintenance-schedule` | Existing Owner/Admin/Moderator machine screens may use according to scope; retain as maintenance information. |
| Aggregate operation data | `GET /api/v1/dashboard/overview?fromDate&toDate` | JWT-derived role scope; Owner sees own aggregate. Max 90 days. Use returned cup/daily-cup/financial fields only. |

Do not call `POST /api/v1/telemetry/{machineId}` or the federated-weights endpoint from these screens. Do not use the FE helper `/dashboard/daily-cups/machines` as a confirmed contract; it was absent from the live Swagger paths. Per-machine totals/fees remain deferred.

## Risks and Mitigations

- **Heartbeat request fan-out:** Endpoint is per machine. Poll only visible Smart IoT rows, pause offscreen/background updates, stagger requests, and watch request count as inventory grows.
- **Permission/UI mismatch:** One shared panel can imply roles have identical access. Pass explicit capability states from role pages; distinguish forbidden from empty and API error from `OFFLINE`.
- **Metric ambiguity:** The screenshot includes per-machine usage/fees that current Swagger does not document. Show only confirmed role-scoped aggregate cup and financial data with explicit scope; defer unsupported per-machine claims.
- **Dashboard schema gap:** The current FE dashboard schema does not type Swagger's documented `periodFinancialMetrics`. Extend the strict schema from the published contract before rendering those fields; reject malformed shapes and do not add permissive fallback parsing.
- **Variable telemetry:** Field names and value types vary. Build the selector from received fields, chart numeric points, and list nonnumeric points without assuming units.
- **Shared-shell regressions:** Admin and Moderator machine pages contain management actions and mobile action bars. Share presentation only; preserve existing role controls, routes, and layout shell contracts.

## Verification Strategy

- Focused Node checks: `node --test tests/admin-machines-iot.test.cjs tests/dolores-telemetry.test.cjs tests/moderator-dashboard.test.cjs`.
- Static checks after each implementation phase: `npm.cmd run lint` and `npx.cmd tsc --noEmit --incremental false`.
- Browser acceptance in Phase 04: logged-in role matrix at 390px, 768px, 1023px, 1024px, and 1440px; machine list → detail → operational overview → return; verify visible data and action controls by role.
- Use GET-only API verification for this feature; no mutations or test data creation are required.
- Planning only: no tests or source changes are run or made in this plan task.

## Open Questions for Validation

- Confirm backend rate limits or future bulk-heartbeat availability before turning on list polling for large machine inventories.
- Verify telemetry fields/units against representative Smart IoT machines before choosing default chart fields.

## Plan Checklist

- [x] Phase 01 reviewed and approved.
- [x] Phase 02 reviewed and approved.
- [x] Phase 03 reviewed and approved.
- [x] Phase 04 reviewed and approved (mocked frontend validation passed; live authenticated role/API acceptance remains unverified).

## Session Notes
<!-- Updated by cook automatically — do not edit manually -->

**Last active:** 2026-11-01 01:56 Asia/Saigon
**Phase in progress:** complete
**Status:** All four phases are reviewed and approved. Phase 04 frontend checks and code review passed; live authenticated API/browser acceptance remains unverified.

### Decisions made this session
- Keep role queries, authorization scope, and actions in their existing page modules; shared components own presentation only.
- Preserve the unrelated pre-existing worktree changes and implement only the approved machine/IoT plan.
- `MachineListView` owns a shared summary → controls → results structure; Owner/Admin/Moderator provide role-specific content in those regions. Owner's list uses `DataTable` with local type filters, while Admin/Moderator preserve their status filters and catalog controls.
- `MachineDetailView` renders the same four summary metric cards for all roles, then places role-specific profile, maintenance, history, management, and Smart IoT sections below.
- Admin Owner lookup and Moderator live IoT routes use `SmartIotPanel`; queries and permission state remain owned by the role pages.
- Added shared heartbeat detail presentation, visibility-aware list polling with staggered requests, and the Owner/Admin telemetry range/chart/history controls. Moderator remains points-denied and makes no points request.
- Phase 02 checks: 10 focused TDD tests passed; ESLint passed on all touched Phase 02 source files; code review approved after resolving two findings. Heartbeat keys are role-namespaced; polling pauses outside the viewport, while the fallback also tracks nested `main` scrolling. Full project TypeScript still reports unrelated existing errors in dashboard/menu, moderator/buyback, and moderator/technical; none point to Phase 02 files. Legacy admin-machine and moderator-dashboard tests also fail against stale route/query fixtures and are recorded in the Phase 02 notes.
- Added role-specific machine operational-overview path helpers in Phase 01; the visible action and route page are deferred to Phase 03 so no dead link is exposed.
- Phase 03 TDD was red before implementation: strict period-financial validation, the shared overview presentation, and the Owner operations route were missing. Focused tests now pass 5/5; touched-file ESLint passes; `git diff --check` passes. Code review approved after replacing a nested Moderator `<main>` landmark with a `<div>`.
- The live Swagger OpenAPI contract confirms `periodFinancialMetrics` field names and quality status enum. Role queries use distinct cache keys and request no client `ownerId`; Moderator financial cards are disabled.
- `npx tsc --noEmit` still reports only existing errors in dashboard/menu, moderator/buyback, and moderator/technical. Broader legacy test runs remain blocked by existing path/alias harness drift (`./overview/overview-content` and `@/schema/billing.schema`); the focused Phase 03 tests pass.
- User approved Phase 04 after reviewing its recorded limitation that live authenticated API/browser acceptance is unverified because the browser host was unavailable.
- Phase 04 mocked Playwright navigation passes 3/3 for all three role routes across all five planned widths. Focused heartbeat/telemetry and operational-overview checks pass 10/10 and 5/5. Full Playwright is 11/14 due three unrelated Admin overview/landing checks; the broader legacy Node suite has 20/31 pass with existing path/async harness drift. Repo-wide lint and TypeScript remain blocked by unrelated baseline errors; lint on changed production/test files and diff check pass.
- Phase 04 E2E uses mocked APIs and unsigned role claims, so it does not prove backend JWT permissions or real server scope. Browser host unavailability is recorded; no API mutations were sent. Code review is APPROVED after restoring the unrelated Phase 05 tracker entry and documenting the explicit Phase 04 E2E command.
- Finalization updated the five existing role/API inventory documents to describe the shared machine presentation, role-scoped operational overview, heartbeat/telemetry boundaries, and the Moderator points restriction. No API signature, configuration, deployment, or README/runbook claims changed.

### Next immediate action
None. Plan is complete with live authenticated role/API acceptance recorded as unverified.
