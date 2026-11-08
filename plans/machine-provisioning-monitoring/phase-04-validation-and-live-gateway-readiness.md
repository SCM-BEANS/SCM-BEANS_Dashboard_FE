# Phase 04 - Cross-role validation and live gateway readiness

Status: active - validation executed; full live acceptance pending backend authentication correction and dedicated test fixtures
Stories: MP-01..MP-08

## Objective

Verify enabled REST features across roles and record exactly what is required before live Watch/Exchange implementation.

## Validation tasks

1. Extend existing tests/e2e/machine-operational-overview.spec.ts and, if approved, tests/e2e/machine-provisioning.spec.ts. Desktop/mobile, keyboard, direct URL/refresh/Back, PageActions overflow, machine/account switching, 401/403/grant revocation, 409 and 503. Confirm unauthorized pages issue no provisioning/secret calls.
2. Reuse existing request/signature tests and add only meaningful contract/behavior tests. Run targeted Node and E2E; then lint, TypeScript and production build. Record baseline/delta and evidence separately for fixture FE and authenticated live API.
3. Verify server read permission with authorized accounts; verify mutations only on dedicated authorized disposable machines. No test may delete a real certificate or disturb another user's active menu. Pending runtime permission checks remain UNVERIFIED.
4. Check certificate path selected-environment invariant, error responses/filenames/no-store and lack of key persistence. Check SLA comes from compliance endpoint and heartbeat polling does not poll cleaning.
5. Record capability disposition for G1/G2/G3/G4 in existing approved plan/spec files. No phase claiming full completion if required story is blocked. Do not change old feature-list evidence/status.

## Live contract checklist - readiness only

- Browser-facing gateway URL, protocol (verified supported web transport), TLS and origin policy; approved auth/refresh/scope rules.
- Versioned proto and transport bindings; canonical machine UUID versus serial/deviceId mapping and server authorization of that mapping.
- Watch subscription/cancel semantics; hidden tab/unmount stop; reconnect/backoff; timestamps/sequence gaps/duplicates; supported telemetry fields and units.
- Exchange command allowlist and input schema; machine-safe states, authorization, command expiry, correlation_id matching and unknown-outcome handling. Never auto-replay a hardware action on reconnect.
- Tested staging Edge/gateway availability. No private certificate bundle used by the browser as a machine credential.

Do not add grpc dependencies, a fabricated Next SSE endpoint, fake live readings, or motor/valve controls in this phase. A subsequent source implementation requires verified contract and explicit scope.

## Acceptance

All enabled MP stories mapped to evidence. No new related failures versus baseline. Account/machine scope and secret handling covered. Live readiness is CONFIRMED with source evidence or BLOCKED with exact missing contracts, never implied by passing REST tests.

Dependencies: Phase 01..03 enabled capabilities and their gates. Scenario anchors S01..S20.

## Validation checkpoint - 2026-11-08

User approved Phase04 and requested checking Admin/Moderator machine production and individual brew history. No new source path or backend edit is part of this checkpoint. Existing unrelated working-tree changes are preserved.

### Existing REST feature coverage

- MP-01/02: operational E2E covers SLA zero versus unavailable, scoped machine validation, heartbeat visibility/polling and role-specific API calls.
- MP-03/04: provisioning E2E and contract/proxy tests cover identity readback, unknown issuance reconciliation, custom identity guard, explicit environment, certificate pagination/public detail, secret download validation and no private DOM/storage content. Real issuance/download/deletion and storage isolation remain deferred to a disposable machine.
- MP-05/06/07: menu E2E covers authoritative GET, machine-scoped candidates, PUT/DELETE, saved-but-unsent handling, no duplicate sync, version/hash ACK validation, URL reload and cross-role denial. Phase04 adds Owner404 stopping follow-up calls, pending old-machine response isolation, and Moderator library without provisioning/menu-assignment requests.
- Fixture evidence does not prove real backend machine grants. A complete allowed/denied/revoked Technician and two-Owner matrix is still UNVERIFIED.
- S02 regression reproduced a real FE issue: after Technician public certificate detail loaded, list refresh403 left the cached detail visible. The shared machine-certificates-panel now hides detail, pagination and delete confirmation on list error and disables issuance. A failing browser test demonstrated the old behavior; the same test passed after the four-line shared fix. No private key was involved.

### Issue1 - actual history API behavior

Remote server Swagger now declares GET /api/v1/machines/{machineId}/brew-records and /cleaning-records. Checked using valid JWTs from Admin, Moderator, OwnerPRIMARY and Technician, without printing/storing tokens or making business mutations.

| Role | Existing machine detail control | Brew history existing / unknown machine | Cleaning history existing / unknown machine |
|---|---|---|---|
| Admin | 200 | 401 / 401 | 401 / 401 |
| Moderator | 200 | 401 / 401 | 401 / 401 |
| OwnerPRIMARY | 200 on own listed machine | 401 / 401 | 401 / 401 |
| Technician | 200 | 401 / 401 | 401 / 401 |

Operator/Technician target was16cafe6e-9448-4578-a4c9-f00954bc9ed1; Owner used its own first listed machine. Unknown target was00000000-0000-4000-8000-000000000000. This is an authentication failure before controller scope evaluation, not evidence that a valid Moderator scope is denied by its contract rule.

Read-only source review of origin/main ebafe2b:

- DirectBrewRecordController and CleaningRecordController grant Admin globally, check Moderator via existsByMachineIdAndCreatedByUserId, check Technician machine access and Owner ownership; controller denials return404.
- SecurityConfig still classifies /machines/*/brew-records/** and /cleaning-records/** as ROLE_DEVICE paths, regardless of HTTP method. Its deviceRouteAwareBearerTokenResolver also ignores JWT on these paths, including GET. This explains the observed401 while the machine-detail control succeeds.
- Backend correction must distinguish human GET from device POST in authorization, bearer resolution and relevant device filters. Retain device ingestion protection and controller-scoped404. Re-test known allowed machine versus unknown and outside-scope machines for each role after deployment. Do not bypass this in FE or substitute another Owner identity.
- Actual brew response DTO in source is OwnerBrewRecordItemResponse with id/eventId/machineId/machineSerialNumber/recipeName/brewedAt/receivedAt, rather than the guide's createdAt example. Native Spring Page metadata differs from the Owner analytics page envelope. A future adapter must validate the real deployed body.

### FE history/production disposition (updated 2026-11-08)

- Admin and Moderator machine operations now share production, individual brew history and cleaning history views backed by the new machine-scoped GETs. Existing connection/offline views and Admin cleaning SLA remain available. No new source files were needed.
- Existing ownerAnalyticsApi remains Owner-only; do not reuse /owner endpoints for operators.
- The new brew GET supplies paginated individual records. It has no per-day/per-recipe aggregate response or recipeName query filter. totalElements is the number of records in the selected machine/time query, not proof of a billed/eligible-cup definition. Do not infer whole-period recipe totals or a daily chart from one page.
- Production uses the server totalElements as total brew occurrences for the selected machine/range. Daily/recipe distributions describe the loaded subset until all records are loaded; additional 100-record pages require explicit clicks, capped at 10,000 records. This is not a billed/eligible-cup total. Larger complete distributions need an aggregate endpoint or a shorter range.
- Shared record DTOs and native Spring page normalization live beside the existing analytics schemas; machines.api owns the machine-scoped calls. UUID, timestamp range, page and size are checked before rendering. Queries are scoped by actor/machine/range/page and mount only after a successful authenticated machine lookup.
- URL tab/fromDate/toDate/recordPage survive refresh and browser history. Changing tab/dates resets pagination. Errors hide cached records/charts; invalid filters and denied machine reads issue no history requests.
- Repeated authenticated remote reads in this implementation still returned machine detail200 and brew/cleaning401 for Admin/Moderator. This backend authentication blocker remains; fixture coverage is not live authorization acceptance.
- Owner cup-count now returned200 for both date-only and ISO inputs. Direct YYYY-MM-DD parameters normalize to UTC start and inclusive end date; existing Vietnam calendar filters retain their UTC+07 boundaries and exclusive ISO end. Do not shift Vietnam calendar days to UTC midnight merely to match Swagger examples.

### G1/G2/G3/G4 disposition

| Gate | Disposition | Evidence / remaining work |
|---|---|---|
| G1 identity readback | Available | Deployed AdminGET200/schema verified in Phase02; mutation fixture-tested; real credential mutation pending |
| G2 active menu readback/candidates | Available | Updated remoteGET200/schema in Phase03; PUT/DELETE/deviceACK live acceptance pending |
| G3 browser live gateway | BLOCKED, readiness-only | Source contract.proto defines native gRPC DoloresService.Exchange/Watch/Stream over NetBird port50051; telemetry_query.proto defines backend QueryPoints. No confirmed browser-facing transport URL/TLS/origin/auth, binding version, subscription/cancel/reconnect or safe command allowlist/expiry/unknown-outcome contract |
| G4 explicit environment | FE verified | Identity/certificate proxy has no cross-environment fallback; dev3000 uses remote and ignored .env.local selects remote |

No grpc dependency, fabricated SSE/WebSocket gateway, private machine key in browser, fake live data or hardware action was added. Phase04 cannot be signed off as full live acceptance while the above tests/contracts remain pending.

### Verification evidence and disposition

- Targeted Node:64/64 covering provisioning/proxy/recipe menus/Owner Analytics/offline review, plus18/18 telemetry/compliance tests (82 total).
- Combined operational/provisioning E2E51/51 passed on isolated dev3101 after a stale Next cache caused infrastructure404 failures in earlier runs. No product-route workaround was added. Fresh generated output is locally excluded from Git.
- After the S02 shared-panel fix, provisioning/menu E2E19/19 passed; the focused revocation test passed again with issuance-disabled assertion. TypeScript and focused ESLint passed. Production build evidence is recorded in plan Session Notes.
- Independent review APPROVED the FE fix, tests and source/live findings; it explicitly did not approve full live acceptance.
- Deferred: credential mutation/storage isolation on disposable machines, full live grant/Owner matrix, menu mutation/deviceACK, human acceptance and browser gateway G3. History API401 is an additional confirmed backend blocker. No backend working-tree changes, business mutation, commit or push.

### History implementation verification - 2026-11-08

- TDD: five new machine-history contract tests and one date-format test failed before implementation; all30 provisioning/analytics tests now pass. Telemetry/compliance18/18 and technician assignment API2/2 also pass after updating two old loader dependencies.
- Native Spring history schema exports are kept beside the existing analytics record DTOs, avoiding a new dependency from the core machine schema. Existing source files only; no duplicate Owner endpoint or invented operator aggregate route.
- Combined operational/provisioning Playwright58/58, including six new operator history/production tests (pagination, Vietnam boundaries, refresh/Back, partial100/101,404/503, denied machine and mobile). Focused six rerun after dependency cleanup. TypeScript, focused ESLint and production build pass.
- Full Node sweep:350 tests,259 pass/91 fail. Historical loader/obsolete assertion failures remain outside this task; full-suite green is not claimed. In-memory pre-task source comparison had97 failures versus91 now, a count difference of six matching the new TDD cases (failure names were not compared); no working-tree rollback was performed.
- Independent review approved the scoped FE implementation and schema placement. Remote Admin/Moderator history reads remain401. Phase04 remains active, not fully accepted.
