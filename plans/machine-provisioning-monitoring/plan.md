# Plan - Machine provisioning and monitoring

Mode: --hard (planning only)
Risk: high-risk - machine authorization, destructive identity/certificate operations and private-key downloads.
Test: targeted regression coverage; recommend --tdd for implementation.
Date: 2026-11-07 (Asia/Saigon)
Status: Phase01/02/03 FE verified. Phase04 validation executed; FE regression fixed, but full live acceptance remains pending history authentication correction, dedicated test fixtures and gateway G3.
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
- [x] Phase 02: FE identity/certificate lifecycle verified against a6b3da5; live verification separately deferred; human review pending.
- [x] Phase 03: readback-backed menu FE and ACK validation verified; deployed GET schemas verified. Live mutations/device ACK and expanded role checks pending.
- [ ] Phase 04: validation executed and readiness documented; full acceptance pending backend/history authentication, credential fixtures/deviceACK and G3.

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

**Last active:** 2026-11-08 (Asia/Saigon)
**Phase in progress:** phase-04-validation-and-live-gateway-readiness
**Status:** Admin/Moderator machine-scoped histories and production implemented and reviewed; FE checks pass. Full live acceptance remains pending backend history authentication and separate provisioning/gateway checks.

### Decisions made this session
- Phase04 added four regression scenarios in the existing provisioning E2E file. S02 test reproduced cached certificate public detail remaining after403; fixed in the shared panel for both Admin/Technician.
- Authenticated Admin/Moderator/Owner/Technician controls returned machineGET200, but machine brew-history/cleaning-history GET401 for both real and unknown UUIDs. Source ebafe2b SecurityConfig still discards Bearer JWT and requiresDEVICE on these GET paths. No FE authentication bypass or backend edit.
- Admin/Moderator now use the new machine-scoped brew and cleaning GETs through shared UI. Production shows total brew records plus daily/recipe distributions of explicitly loaded pages; partial coverage remains visible until complete, with a 10,000-record cap. Owner-only aggregate endpoints are not reused by operators.
- Date-only API inputs support inclusive UTC calendar dates; ISO inputs preserve exclusive end. Existing Vietnam calendar UI boundaries remain unchanged. Remote Owner cup-count returned200 with both formats; Admin/Moderator historyGET still401 while machineGET200.
- G1/G2 deployed read contracts and G4 verified FE behavior retained. G3 remains BLOCKED/readiness-only; no browser live gateway/hardware controls invented.
- New contract/date tests:30/30; telemetry/compliance18/18 and technician API2/2 (50 targeted total). Combined E2E58/58 including six new operator-history scenarios; focused six rerun after schema dependency cleanup. TypeScript, focused ESLint and production build pass. Full Node suite350 tests:259 pass/91 fail in historical suites; no full-suite success claimed. Independent review APPROVED for enabled FE scope, not full live acceptance.
- Dev3000 remains remote. Test server3101 and local generated output are separate; no business mutation, new source files, commit or push.

### Next immediate action
Backend must separate user GET history from device POST in route matchers/bearer resolution and device filters, then deploy and re-test four-role scope404. Use dedicated authorized fixtures for credential lifecycle/storage and live menu/ACK tests. Confirm the browser gateway contract before implementing Watch/Exchange. Phase04 remains active until required acceptance evidence is available.
