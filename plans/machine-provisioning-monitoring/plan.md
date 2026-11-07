# Plan - Machine provisioning and monitoring

Mode: --hard (planning only)
Risk: high-risk - machine authorization, destructive identity/certificate operations and private-key downloads.
Test: targeted regression coverage; recommend --tdd for implementation.
Date: 2026-11-07 (Asia/Saigon)
Status: Phase 01 FE verified and review APPROVED; awaiting human approval before Phase 02.
Spec: [spec.md](spec.md). Scenarios: [scenarios.md](scenarios.md).
Project root: Git root E:/Đồ án/SCM-BEANS_Dashboard_FE; no .skills.json marker. Tracking: root feature_list.json.

## Scope challenge

Existing machine/monitoring/menu workflows already supply routing, auth, presentation and sync. Minimum change: extend these owners, add missing HTTP adapters/schema and only genuinely shared presentation. No new routing architecture, global proxy redesign, device ingestion or unsupported live-control UI.

Spec quality: testable MP-01..MP-08 stories; G1/G2/G3/G4 are explicit capability gates, not assumptions that the APIs already exist. Implementation of independent phases can proceed without fabricating blocked capabilities.

## Research and decisions

Primary review: keep Admin/Technician queries scoped in role pages; share certificate presentation. Use machines.api.ts/machines.schema.ts for identity/compliance and recipes.api.ts for active-menu mutations next to sync methods. Separate certificate adapter/schema because it includes distinct paginated metadata, public PEM and secret binary transport.

Alternative review: a universal provisioning/monitoring container would mix Owner/operator scope and enlarge existing detail screens. Reject; use role orchestration and shared renderers. Existing shared recipe sync remains the single integration point for active menu.

Code evidence: telemetryApi already implements heartbeat/points and 23 targeted telemetry/Owner Analytics tests passed during prior audit. This does not verify authenticated live permissions. Current proxy can change remote GET to local on transport failure; certificate download needs an explicit-environment gate. Shared HTTP performs one 401 refresh/replay: retain auth handling, disable extra automatic mutation retry and reconcile uncertain issuance before another POST.

## Phase map

| Phase | Stories | Deliverable | Dependencies |
|---|---|---|---|
| [01](phase-01-cleaning-compliance-and-heartbeat.md) | MP-01, MP-02, MP-07 | SLA view and Moderator heartbeat | Published DTO and verified role declarations; live checks recorded separately |
| [02](phase-02-device-identity-and-certificates.md) | MP-03, MP-04, MP-07 | Machine setup and certificate lifecycle | G1 readback; G4 selected environment; source approval |
| [03](phase-03-machine-active-menu.md) | MP-05, MP-06, MP-07 | Eligible menu selection and sync | G2 readback/list; existing sync contracts |
| [04](phase-04-validation-and-live-gateway-readiness.md) | MP-01..MP-08 | Cross-role verification and live contract disposition | Previous enabled capabilities; G3 for live implementation readiness |

## Proposed source additions - NOT approved by this document approval

- src/apis/machine-certificates.api.ts - certificate metadata/mutations/bundle download.
- src/schema/machine-certificates.schema.ts - request/response, Spring Page and public detail contracts.
- src/components/machines/machine-certificates-panel.tsx - presentation used by Admin/Technician.
- src/components/machines/machine-cleaning-compliance-panel.tsx - shared server SLA rendering.
- tests/machine-provisioning.test.cjs - contract, scope and download regressions if existing harness cannot express them cleanly.
- tests/e2e/machine-provisioning.spec.ts - cross-role UI scenarios if existing monitoring tests are not appropriate.

These are candidate paths for implementation approval, not empty files to create now. Reuse existing machine CSS and existing test helpers. If new paths change, request approval only for changed paths. No new route required by this plan.

## Validation and tracking

- [x] Phase 01: API contract and UI acceptance (mocked/runtime FE verified; live permission checks pending).
- [ ] Phase 02: identity/certificate lifecycle and sensitive download acceptance.
- [ ] Phase 03: readback-backed menu and verified sync acceptance.
- [ ] Phase 04: cross-role validation and documented live readiness.

Use meaningful targeted tests, then lint/TypeScript/build; compare unrelated pre-existing failures against current baseline. Live read/write checks only with authorized fixtures and correct environment. Never delete or replace a real machine certificate merely to demonstrate a UI test. Record runtime denials as findings, not a reason to broaden FE scope.

## Review disposition

Accepted: fail-closed selected environment for certificates; independent SLA query; Spring Page shape; no fake readback; operator menu eligibility gate; update obsolete tests forbidding Moderator heartbeat while still forbidding Moderator points.
Noted: API prose/live drift, private storage availability, no verified browser live gateway. No source code, test file or API mutation is part of saving this plan.

## Handoff

Suggested implementation command after plan review: cook --hard --tdd plans/machine-provisioning-monitoring/plan.md
Start with Phase 01. Hard review gates apply phase by phase. A phase with an unresolved capability gate must report that capability as pending, not mark full coverage passing.

## Independent review and artifact verification

Read-only planning review: APPROVED, no CRITICAL/HIGH planning blockers. Reviewed gates G1/G2/G3/G4, source-file approval boundary, sensitive downloads and tracking preservation. Seven files and local links verified; four unique phases map one-to-one to feature_list.json; thirty previous entries unchanged. No source execution or authenticated live mutation in this documentation step.

## Session Notes

**Last active:** 2026-11-07 (Asia/Saigon)
**Phase in progress:** phase-03-machine-active-menu
**Status:** Phase02 enabled capabilities reviewed; live verification separately deferred by user. Phase03 contract assessment found G2 still pending.

### Decisions made this session
- User approved moving to Phase03. Phase02 live verification checklist and G1 dependency recorded separately in its phase file.
- Clean backend origin/main4adc8a1 inspected: certificate and active-menu Technician scope are backend blockers, not merely unchecked live tests. Certificate bundle key reuse requires disposable-machine-only testing and backend lifecycle review.
- Active-menu PUT source returns machineId/activeMenuId/menuName; DELETE source204 differs from OpenAPI200. Neither supplies GET readback after refresh.
- Re-read public live OpenAPI: active-menu PUT/DELETE exist, but current-menu GET/readback is not declared in MachineResponse or RecipeSyncStatusResponse.
- Owner local menus are caller-scoped; no verified operator candidate list for a selected machine Owner.
- Follow Phase03 G2 gate: no guessed current menu, no operator impersonation, no unsupported selector or unused mutation adapter added.
- Existing recipe-menu contract suite17/17 passed. No source changes in this contract assessment; no authenticated server mutation.

### Next immediate action
Obtain authoritative machine active-menu readback contract; obtain operator Owner-menu candidate source before enabling Admin/Technician. Owner flow can proceed first once its readback exists. Phase03 remains open; Phase02 live checks are tracked in its separate checklist.
