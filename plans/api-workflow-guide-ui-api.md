# API Workflow Guide — Role-Based UI and API Completion Plan

## Plan status

- **Manual test guide:** Follow [the role-by-role test runbook](./api-workflow-manual-test-runbook.md) in a non-production environment.
- **Plan state:** Phases 3-6 and 8 remain partial where backend discovery, evidence, or role-scope contracts are missing. Phases 1-2 and 7-8 still need authenticated runtime/visual verification. Phase 9 review is complete for available local evidence, but the overall plan remains **unverified** because the broad legacy suite has unresolved failures, Playwright is not installed, and authenticated UI testing is deferred to the user.
- **Target:** Implement the user-facing UI and API integrations for the human-operated workflows in `API_WORKFLOW_GUIDE.md`.
- **Execution mode:** Standard, sequential phase reviews. On 2026-10-31 the user explicitly requested that all remaining phases be carried out without pausing for another instruction at each boundary; continue through independent work, retain each review and status record, and keep contract-blocked actions unavailable.
- **TDD:** Off. Each phase still requires post-implementation checks, verification, and review.
- **External side effects:** Do not perform live state-changing API calls while developing or verifying this plan.

## Goal

Give each applicable role a consistent, usable screen for the workflows in the supplied guide. Connect each human action to the correct authenticated API, validate request and response shapes, show current server state and the next permitted action, and preserve authorization and lifecycle rules across Owner, Technician, Moderator, and Admin routes.

## Scope

Implement the human-facing parts of all ten guide sections:

1. Create an Owner account through the existing Mein IDaaS user administration integration, then verify the synchronized profile and its contracts through Dolores.
2. Create locations and machines, assign machines to locations, and optionally grant/revoke machine-wide Technician access.
3. View invoices and line items, upload Owner payment proof, and let authorized operators review proof.
4. Confirm maintenance appointments, create and assign work tickets, record progress and parts, resolve work, and complete the separate repair-cost review and Owner acknowledgment/dispute lifecycle.
5. Open and complete Contract termination/recovery, including handover, inspection ticket, inspection, settlement/rejection, and completion.
6. Implement both temporary replacement assignment paths: direct Contract replacement and the full RepairCase replacement/custody workflow.
7. Open and complete buyback, inspection, valuation, payment proof/review, collection, refurbishment, and QA.
8. Manage global menus/recipes and Owner local recipe snapshots, then request and inspect recipe sync state.
9. Display authorized heartbeat/telemetry reads and provide Admin operations for documented replay/reconcile actions.
10. Show scoped dashboard action items, acknowledge alerts, and read/mark notifications.

## Explicit boundaries

- **Included:** Browser actions using a signed-in human role, including Admin user provisioning through the existing IDaaS client where its current contract supports it; Dolores JWT endpoints; role-specific pages; shared domain features, API wrappers, schemas, query state, messages, and focused tests/checks.
- **Excluded:** Mein IDaaS-to-Dolores profile sync (`X-Webhook-Secret`), scheduled invoice generation, device telemetry ingestion, device recipe polling/acknowledgment, and service-to-service/device credentials. These must remain outside the user browser.
- **Backend scope:** No backend repository changes are included. If a browser-facing endpoint is absent, insecure, or lacks a verified request/response contract, stop that affected action at its phase gate and report the dependency rather than inventing an endpoint or payload.
- **Legacy scope:** Do not use the retired `/payments` write path, dropship/PayOS/supplier paths, refund happy paths, or coffee-bean supply flows.

## Workspace and evidence baseline

- The app uses the Next.js Pages Router, role-specific page/shell folders, React Query, Zod schemas, and shared controls/components.
- `src/lib/http.ts` provides the user-authenticated IDaaS client (`axiosClient`, `/api/v1`) and Dolores client base (`/api/dolores/v1`). The corresponding Next API proxies are already present. Keep role pages as route/shell composition and put reusable business behavior in shared feature components and API/schema modules.
- `src/components/features/repair-workflow/` and its role routes already contain substantial RepairCase work. `plans/role-based-repair-workflow-ui-api.md` records its partial implementation and evidence blocker. Reuse and finish that work in the RepairCase phase; do not duplicate or revert it.
- The worktree already contains many uncommitted changes across role pages, APIs, schemas, messages, and tests. Treat all current changes as protected baseline and inspect diffs before editing overlapping files.
- The supplied `API_WORKFLOW_GUIDE.md` is the workflow source. `API_REFERENCE (role).md` is a supporting role/security reference. The older `API_REFERENCE.md` is incomplete for several newer workflow endpoints.
- The guide and references disagree or omit details for some endpoints, including maintenance requests/cost reviews, RepairCase, recipe menus, action items, list routes, payload schemas, and some role scopes. The guide says the deployed Swagger/OpenAPI is the contract authority. The supplied Swagger host could not be reached from the current browser/tool environment; `GET /v3/api-docs` also could not connect. Mark live deployment parity unverified and validate each endpoint from an available authoritative OpenAPI/backend source before wiring a mutation.

## User-confirmed decisions

### Code structure

- Keep screens and route configuration under the existing role-specific `src/pages/{role}/` structure.
- Use shared, domain-specific features under `src/components/features/` where behavior is shared across roles; keep API wrappers under `src/apis/` and validation/types under `src/schema/`.
- Preserve the existing Pages Router, route paths, role shells, and app navigation conventions. A shared feature must not import role pages or shells.

### UI/UX

- Use role-appropriate lists plus detail/timeline where the workflow has a multi-actor lifecycle; show the next valid action for the current role and state, or clearly state which actor/prerequisite is awaited.
- Use existing shared and role-shell components wherever they fit. Keep typography, spacing, tables, buttons, status styling, feedback messages, and navigation consistent with the overall product.
- Use existing Vietnamese message namespaces and existing loading/empty/error patterns. Add a new visual primitive only when no suitable component exists and record the gap.

### Phase sequencing

- Organize the plan by business workflow across roles, not by role. This should make each lifecycle coherent and expose cross-role dependencies at its phase gate.

## Alternatives considered

| Decision | Option | Trade-off | Result |
|---|---|---|---|
| Shared behavior | Shared feature/API/schema per domain with separate role routes | A small initial integration cost; one lifecycle implementation keeps role behavior and state gates consistent. | **Selected** |
| Shared behavior | Duplicate workflow screens per role | Easier local edits, but duplicates API and state logic and can drift across roles. | Not selected |
| Phase order | Business workflow vertical slices across roles | Each phase can close a real business lifecycle; cross-role handoffs are reviewed together. | **Selected** |
| Phase order | Finish all screens for one role, then move to the next | Gives one role broad coverage early but leaves shared workflows incomplete at handoffs. | Not selected |

## Role and screen responsibility matrix

| Role | Main UI responsibilities | Authorization constraints |
|---|---|---|
| ADMIN | Platform operator screens for Owner account provisioning/verification, asset/location assignment, billing review, maintenance and cost decisions, replacement/termination/buyback operations, global recipe management, telemetry operations, action items, alerts, and inbox. | Use the canonical role required by each API. Do not infer that Admin may act for another tenant when the operation still requires tenant scope. |
| MODERATOR | Contract-scoped customer/asset and operational work, including billing, maintenance, replacement, termination, buyback, global recipe, and alert/inbox surfaces supported by the API. | Enforce the guide's creator-Contract scope in the UI and rely on the server as authority. Never expose Admin-only operations as enabled Moderator actions. |
| TECHNICIAN | Assigned work lists and details for maintenance, RepairCase, termination inspection, buyback inspection/refurbishment, permitted telemetry reads, alerts, and inbox. | Derive scope from authenticated assignment. Do not add `technicianId`, `ownerId`, or tenant query parameters as authorization substitutes. Keep installation work orders and maintenance tickets visibly separate. |
| OWNER | Own profile/contracts, locations/machines, invoice/payment proof, maintenance schedule confirmation, RepairCase custody acknowledgments and cost decisions, replacement status, buyback where allowed, local recipes/sync status, scoped dashboard/telemetry, alerts, and inbox. | Derive Owner scope from JWT. Do not let a route/query/body value select another Owner's resources. Financial acknowledgment/dispute remains distinct from custody acknowledgment. |

## Shared implementation and safety rules

- Reuse the existing API clients and role query patterns. Validate external response data with Zod before displaying it or advancing UI state.
- Treat API response IDs as the source for later steps. Do not construct IDs, state transitions, or private evidence references in the browser.
- Keep server responses as the only source of truth for lifecycle status. Do not optimistically advance a workflow after a mutation.
- On a `409`, timeout, or ambiguous result, reload the resource/timeline before offering a retry. Reuse the same idempotency key only for the same supported operation and payload.
- Use `multipart/form-data` for private proof/evidence uploads. Do not serialize files as JSON, place secrets in browser code, log tokens/proof contents, or treat public URLs/free text as private storage references.
- Do not enable evidence-dependent actions until a confirmed, authorized upload/reference-selection flow exists. Existing installation evidence APIs may be reused only if their response produces a reference accepted by the target workflow.
- Preserve independent task-source loading and error states; one failed source must not hide another successful source.
- Distinguish loading, empty, forbidden, unauthenticated, not found, invalid input, conflict/stale state, network failure, and unexpected failure.
- Invalidate only related queries after mutations and remove protected cached data on logout/session identity change according to existing app behavior.
- UI role guards are presentation only. The backend remains the authorization authority.
- Do not run live mutation calls while implementing or verifying. Validate API work with local checks, mocks, or non-mutating reads only where an authorized test environment is available.

## Phase 1 — Owner profile and asset/location setup

**Outcome:** Admin can provision an Owner through the existing IDaaS integration and verify the resulting Dolores profile; authorized roles can create locations/machines, assign machines to locations, and optionally manage machine-wide Technician access.

**Scope:** Reconcile the role split between IDaaS user creation and Dolores profile reads; update the appropriate Admin user and role-specific customer/profile screens; implement profile/contracts verification; add the missing location-machine assignment and optional Technician machine assignment operations where supported; preserve existing machine creation, location creation, machine type selection, and role shells.

**Non-scope:** Browser calls to `POST /internal/profiles/sync`; service credentials; changing the backend's Owner/tenant policy; unrelated Contract onboarding or installation flows.

**Contract checks:** Confirm the Mein IDaaS create-user API, `GET /profiles?role=...`, profile detail/contracts, `POST /locations`, `POST /machines`, `POST /locations/{locationId}/machines/{machineId}/assign`, and optional `POST/DELETE /technician-assignments/{idaasUserId}/machines/{machineId}` paths, role rules, request fields, and response IDs. Resolve the guide/reference mismatch around location creation `tenantId` and Technician access before mutation wiring.

**Verification and acceptance:** Admin-created Owner uses the correct IDaaS role/API; profile verification uses the returned UUID; Owner/operator screens show only scoped resources; location assignment refreshes both affected resources; optional machine-wide Technician access is clearly distinct from work assignment. Check Zod parsing, empty/error states, route refresh, existing user creation, and machine flows.

**Entry condition:** User approves this plan; inspect overlapping worktree diffs and record current UI/API behavior before changing files.

**Exit condition:** Contracts are confirmed for the actions exposed, targeted checks pass, and existing Admin user/machine/location screens remain functional.

**Stop/review gate:** If IDaaS provisioning, request shapes, tenant ownership, or assignment role scope cannot be confirmed, leave the affected mutation unavailable and record the exact missing contract. Do not call internal profile sync from the browser.

### Phase 1 execution record — 2026-10-31

- **Implementation:** Added Owner account provisioning follow-through and Dolores profile/contract verification to Admin Users; paginated Owner contract review; Owner and Moderator location management and machine registration routes; machine-to-location assignment; Admin/Moderator machine-wide Technician access controls; JWT-derived Owner scoping; response identity checks; paginated location reads in Admin Stores. Shared panels use the existing `ButtonBar`, `DataTable`, `NotificationDialog`, ActionBar, role shells, and page style conventions.
- **API contract evidence:** Read the checked-out Dolores backend controller/service contracts for profile listing/detail/contracts, locations list/create/assignment, machine creation, and Technician machine assignment. Location reads use `ownerId`, `page`, `size` with `X-Page`, `X-Page-Size`, and `X-Has-Next`; machine-to-location assignment is a path-only POST; machine-wide Technician assignment is ADMIN/MODERATOR-only and uses the IDaaS UUID. No browser profile-sync call was added. Live Swagger/deployment parity remains unverified.
- **Focused verification:** `node --test tests/asset-management-api.test.cjs tests/asset-management-routing.test.cjs tests/dolores-locations.test.cjs tests/technician-assignments.test.cjs tests/dolores-api-signatures.test.cjs tests/admin-users.test.cjs` — passed, 20/20.
- **Admin verification:** `node --test --test-name-pattern="profile API lists|store fan-out|store creation owner options" tests/admin-operations.test.cjs` — passed, 4/4. Covers Owner profile contract pagination parameters, multi-page location loading, partial failures, cancellation, and Owner option paging.
- **UI environment gap:** No authenticated role session or browser E2E run was available. Owner route dispatch is rendered in the focused test and Moderator paths are checked against the route catalog; full interaction, responsive, and visual checks remain unverified.
- **Lint and diff:** `npm.cmd run lint` — passed with 0 errors and one existing warning in `src/components/contracts/contract-activation-panel.tsx:96`. `git diff --check` — passed.
- **Build/typecheck gate:** `npm.cmd run build` and `npx.cmd tsc --noEmit` are not green in this workspace. `@playwright/test` is declared in `package.json` but absent from the current `node_modules`; typecheck also reports existing `TS18048` errors in `src/pages/technician/tasks/work-order-detail-screen.tsx` and implicit-any fallout in E2E specs when Playwright types are missing. No Phase 1 file appears in the reported TypeScript errors. The full `tests/admin-operations.test.cjs` still has three stale harness failures for removed page paths or a missing schema mock; the Phase 1 store/profile tests pass when targeted.
- **Review:** Separate read-only review found and prompted a fix for the Admin Owner contract list initially loading only its first page. The list now has previous/next paging. No remaining material Phase 1 correctness finding was identified in the final focused review.
- **Gate result:** Implementation is in place, but the phase remains **unverified** until the declared build dependency is available and the project build/typecheck completes. User directed testing later and explicitly authorized continuing to Phase 2; Phase 1 verification remains pending while Phase 2 proceeds.

## Phase 2 — Invoices and payment proof review

**Outcome:** Owners can inspect their invoice and submit a payment proof; authorized Admin/Moderator operators can inspect and decide proof reviews.

**Scope:** Complete invoice list/detail/line-item views; multipart proof upload with a stable `Idempotency-Key`; list/download authorized proofs; operator review decisions with reason/decision validation; show server-confirmed review state and next available action.

**Non-scope:** Invoice generation scheduler, PayOS/provider callback, legacy `/payments`, refund processing, or changing billing policy.

**Contract checks:** Confirm period filters, invoice/detail/line-item shapes, multipart field names and size rules, idempotency header, proof response IDs, download content type/cache behavior, review request/response schema, role rules, and state transitions. The guide says the legacy `/payments` route always returns `409`; do not use it.

**Verification and acceptance:** Owner cannot select another Owner/invoice; file upload uses multipart and never JSON; duplicate retry does not create an extra proof; review action is shown only to permitted operators and refreshes proof/invoice state. Check request construction, response validation, file validation, pending/error/409 states, and existing invoice screens.

**Entry condition:** Phase 1 gate passed or its separate unrelated unresolved items are recorded without affecting invoice contracts.

**Exit condition:** Both Owner submission and operator decision paths work against validated contracts, and focused checks pass without any live financial write.

**Stop/review gate:** Stop proof upload/review if field names, decision states, tenant scope, or private content access cannot be confirmed. Do not claim payment was received from upload success alone.

### Phase 2 execution record — 2026-10-31

- **Implementation:** Owner invoice list/detail, line items, and proof history now use bounded server pagination. Owners can submit proof only for eligible `RENTAL` invoices, using a stable retry key, MIME/signature validation, and the documented 20 MiB file limit. Admin and Moderator share a paged invoice list/detail and authorized proof download/review feature, including `REPAIR` invoices; Admin and Moderator keep separate role routes and page shells. Review requires a nonblank reason and is available only for `SUBMITTED` proofs. Mutation success and uncertain/conflict results refresh the related server state. Billing query keys include the current role/subject so cached invoices and proofs do not cross user sessions. Invalid Admin invoice UUIDs now show the invalid-route state.
- **API contract evidence:** Checked the checked-out Dolores backend contracts for `GET /billing/invoices` filters/pagination, invoice detail and line-item reads, proof list/content access, multipart proof submission (`file`, `amount`, `Idempotency-Key`), and proof review (`approve`, `reason`). Owner access is JWT-scoped; the current billing controller grants both ADMIN and MODERATOR operator access to all invoices. Live Swagger/deployment parity remains unverified. The proof response does not include the submitted amount, so the operator UI instructs reviewers to compare the downloaded file with the invoice total. No live mutation was sent.
- **Proxy correction:** The Dolores Next API proxy body cap is now 21 MiB, enough for the backend's 20 MiB proof plus multipart overhead. A regression test exercises the proxy handler with a 20 MiB body.
- **Focused verification:** `node --test tests/billing-phase2.test.cjs tests/operator-invoices-screen.test.cjs tests/dolores-proxy-upload-limit.test.cjs tests/dolores-api-requests.test.cjs tests/dolores-api-signatures.test.cjs` — passed, 9/9. Covers filter/pagination construction, scope and DTO validation, upload idempotency/file validation and Axios FormData handling, proxy body size, operator list/detail/review UI, and API method signatures.
- **Lint and diff:** `npm.cmd run lint` — passed with 0 errors and one existing warning in `src/components/contracts/contract-activation-panel.tsx:96`. `git diff --check` — passed; Git emitted line-ending normalization warnings for existing CRLF files.
- **Build/typecheck and broader suite:** `npm.cmd run build` and `npx.cmd tsc --noEmit` remain blocked by the missing installed `@playwright/test`; typecheck also reports pre-existing `TS18048` errors in `src/pages/technician/tasks/work-order-detail-screen.tsx` and implicit-any fallout in E2E specs without Playwright types. Several older broad test files still reference removed page modules and fail with `ENOENT`; the focused Phase 2 suite passes. These environment/baseline issues were not changed as part of billing.
- **Runtime review:** No authenticated browser session was available. The user asked to perform UI testing later, so responsive/visual checks and live role-to-API behavior remain pending. The earlier live Swagger endpoint was unavailable, and no financial or other live API writes were performed.
- **Read-only review:** Final review found and fixed (1) the proxy's original 10 MiB request cap conflicting with 20 MiB proof uploads, (2) the shared Axios JSON content-type default risking FormData serialization, (3) billing query keys missing role/subject scoping, and (4) malformed Admin invoice IDs falling back to the list. Focused tests and lint were rerun after the fixes; no remaining material Phase 2 finding was identified.
- **Gate result:** Phase 2 implementation and focused review are complete. The phase is **at the user test gate**, not fully runtime-verified, because authenticated UI testing was explicitly deferred and build/typecheck remain unavailable in this workspace. The user explicitly authorized continuing to Phase 3 before browser testing, so implementation proceeded without claiming the pending UI test. Phase 1 remains **unverified**.

## Phase 3 — Maintenance tickets and repair-cost decisions

**Outcome:** The Owner-to-operator-to-Technician maintenance path is usable end to end, with financial review kept separate from physical handover.

**Scope:** Owner maintenance-request list/detail and schedule confirmation; Admin/Moderator work-order creation and assignment; Technician ticket progress/status, parts, and resolution; operator proposal/review decisions; Owner acknowledgment/dispute; operator dispute resolution. Preserve and extend the existing Technician task list's parallel installation-work-order and maintenance-ticket sources.

**Non-scope:** Device or billing scheduler jobs; emergency policy changes; merging distinct ticket/work-order resource types.

**Contract checks:** Confirm `GET /maintenance-requests`, `POST /maintenance-requests/{requestId}/confirm`, `POST /maintenance-requests/{requestId}/work-order`, maintenance ticket list/detail/assign/status/parts/resolve, repair-cost proposal/decision/acknowledgment/dispute/resolution, payload schemas, status preconditions, pagination, scope, and notification effects. Verify whether a work-order response yields the ticket ID used by subsequent actions.

**Verification and acceptance:** Only the request Owner can confirm; only authorized operator can create/assign; Technician can mutate only assigned work; ticket and installation work order remain separate with independent load/error/empty/retry; cost disagreement blocks normal work until server-confirmed resolution/authorization; physical custody acknowledgment never substitutes for financial acknowledgment. Check state gates, query invalidation, conflict reload, and targeted UI/API tests.

**Entry condition:** Required endpoint contracts and links among request, work order, ticket, and cost review are available.

**Exit condition:** Confirm, create, assign, work, resolve, and cost review paths validate their server responses; the existing Technician task list still renders each source independently.

**Stop/review gate:** Stop only the affected endpoint if the collection/detail contract, state machine, evidence requirements, or emergency authorization checks are unknown. Do not invent a client-side financial override.

### Phase 3 execution record — 2026-10-31

- **Implementation:** Added the Owner preventive-maintenance list/detail and appointment-confirmation form under /dashboard/maintenance. Admin and Moderator can create a preventive ticket from its confirmed request; the create response must contain the linked request ID and ticket ID. Admin can search and page through eligible verified Technician profiles to assign that ticket; the checked controller permits assignment only to the global operator, so the Moderator assignment control remains disabled. Technician tasks still load installation work orders and maintenance tickets independently, display tickets assigned to the signed-in Technician, and link to ticket detail. The Technician detail allows starting an assigned ordinary ticket and recording parts/cost; RepairCase tickets stay on their existing workflow.
- **Cost review:** Added validated API methods and schemas for proposal, read, decision, Owner acknowledgment/dispute, and dispute resolution. Added role-scoped review detail routes and an Owner notification link using the documented Review ID in REPAIR_COST_REVIEW notifications. The review page does not expose raw private storage references. Completion, proposal, acknowledgment, dispute, operator decision, and dispute resolution controls remain disabled: the checked backend has no maintenance-ticket API to upload private evidence or retrieve/render its content, and evidence references cannot be safely invented or inspected in the UI. The generic ticket resolution method is implemented and contract-tested at API level, but not exposed in the Technician UI until the same evidence dependency is resolved.
- **Contract evidence:** Checked local Dolores controller/service/DTO code for request confirmation, preventive work-order creation and linked IDs, maintenance-ticket list/detail scope, Admin-only assignment, Technician status/parts/resolve, repair-cost payloads/statuses/scopes, and Owner notification format. Technician ticket listing is broader than exact assignment (machine-assignment scope), so the UI filters the page to the authenticated subject before linking to detail. Live Swagger/deployment parity remains unverified. No live API mutation was sent.
- **Focused verification:** node --test tests/maintenance-workflow-phase3.test.cjs tests/repair-workflow-assignment.test.cjs tests/dolores-api-requests.test.cjs — passed, 9/9. npm.cmd run lint — passed with 0 errors and one existing hook dependency warning in src/components/contracts/contract-activation-panel.tsx:96. git diff --check — passed; Git reported line-ending normalization warnings for existing changed files.
- **Unavailable checks:** npx.cmd tsc --noEmit and npm.cmd run build cannot pass in this workspace because @playwright/test is missing. Typecheck also reports existing optional-data errors in src/pages/technician/tasks/work-order-detail-screen.tsx and implicit-any errors in E2E files after Playwright types fail to load. The old tests/owner-technician-routing.test.cjs cannot load because it references the removed src/pages/technician/[[...sections]].page.tsx; the current Technician routes are physical Pages Router files. Authenticated browser testing remains pending at the user's request.
- **Read-only review:** Confirmed the maintenance-ticket actions do not run against RepairCase tickets, the role query keys include the authenticated subject, mutations invalidate request/ticket reads after success or error, and private references are never supplied by the UI. Review found the missing evidence lifecycle as the material Phase 3 dependency.
- **Gate result:** Phase 3 is **partially complete and at the Standard review gate**. Appointment confirmation, preventive work-order creation/assignment, Technician ticket start/parts, and read-only cost review are implemented and focused checks pass. Evidence-dependent ticket completion and every financial write remain gated pending a private evidence upload/read contract. Visual/runtime verification and live API parity are still pending. Phase 4 has not started.

## Phase 4 — Temporary replacement and RepairCase lifecycle

**Outcome:** Both temporary replacement paths and the complete repair-with-replacement lifecycle are represented with role-specific actions, clear handoffs, and server-backed progress.

**Scope:**

- Direct Contract replacement: create assignment, inspect assignment, activate, cancel while planned, release after return, and refresh Contract/machine state.
- RepairCase: Owner intake; Admin/Moderator triage; fallback replacement offer and Owner decision when required; create planned replacement assignment; assign Technician to the maintenance ticket; record and acknowledge custody events in order; activate and deliver replacement; diagnosis; optional repair-cost branch; start/complete work; replacement collection and primary-machine return; final Owner acknowledgments; release and close.
- Finish the incomplete pieces documented in `plans/role-based-repair-workflow-ui-api.md` and verify the already-present Admin/Moderator/Owner/Technician routes/components without duplicating them.

**Non-scope:** Creating a new backend evidence service, bypassing Owner acknowledgments, sending private evidence as a URL/text value, or changing the RepairCase state machine.

**Contract checks:** Confirm direct Contract replacement methods and payloads; fallback offer/decision routes; all RepairCase intake/triage/detail/timeline/custody/diagnosis/work/replacement routes; ticket assignment; evidence contract; idempotency behavior; permission boundaries; event order and allowed machine IDs. Confirm whether an existing private upload API can safely produce evidence references accepted by RepairCase and replacement endpoints.

**Verification and acceptance:** `REPLACEMENT_PLANNED` is displayed as already planned and does not create a duplicate assignment; only the next action for current actor/state is available; Owner acknowledgments gate later custody steps; evidence is private and validated; all mutations refresh case/ticket/assignment/timeline; Technician retains both existing work sources. Verify direct replacement and RepairCase paths separately and cross-role state transitions with mocks/non-mutating evidence.

**Entry condition:** Phase 3 ticket/cost contracts are stable enough to represent the repair branch, and the evidence lifecycle is identified or affected evidence-dependent actions remain gated.

**Exit condition:** Every contract-confirmed step is connected and verified; any missing private evidence source is clearly reported as an external dependency, with no fake successful end-to-end claim.

**Stop/review gate:** The previous plan already records that no approved RepairCase evidence-reference creation source was found. If still unavailable, do not send activation, custody-create, diagnosis, completion, or release requests that require such a reference. Keep those actions disabled with a clear prerequisite and report the specific dependency at this phase gate.

### Phase 4 execution record — 2026-10-31

- **Implementation:** Added typed create, read, activate, cancel, and release methods for direct Contract replacement assignments. The Admin and Moderator Contract detail screens now let an operator select an available same-type machine, schedule the interval, submit a reason, and create the `PLANNED` assignment; they then re-read and display the server-created assignment and can explicitly cancel a planned assignment. The existing RepairCase detail retains its `REPLACEMENT_PLANNED` behavior and evidence gates. Candidate response validation now matches the checked backend DTO fields.
- **Contract evidence:** Checked the local Dolores `ReplacementAssignmentController`, request DTOs, `MachineAvailabilityController` and service, and the RepairCase controller/DTOs. Direct assignment creation requires `replacementMachineId`, `startAt`, `endAt`, `reason`, `idempotencyKey`, and `correlationId`; activation and release each require a private evidence reference. `REPLACEMENT_PLANNED` cases already have an assignment and do not receive a duplicate assignment. Live deployed Swagger parity remains unverified.
- **Focused verification:** `node --test tests/repair-workflow-phase4.test.cjs tests/repair-workflow-assignment.test.cjs tests/replacement-assignments-api.test.cjs tests/dolores-api-signatures.test.cjs` — passed, 8/8. Targeted ESLint for the changed source/tests — passed. Review verified role-specific Contract screens, same-type candidates, server-confirmed statuses, same-key create retry, and no user-entered evidence reference.
- **Unavailable checks:** Authenticated browser/visual testing was not available and remains deferred by the user. Full build/typecheck remains unverified due the existing missing `@playwright/test` dependency noted in Phase 1–3.
- **Review and gate result:** Evidence-dependent activation/delivery, custody creation, diagnosis, completion, return, and release remain disabled or unavailable because no approved private evidence upload/read source exists. The phase is **partial**. Under the user's latest instruction, continue sequentially into Phase 5 while preserving this dependency and status.

## Phase 5 — Contract termination and machine recovery

**Outcome:** Operators can open and progress a termination case through recovery, inspection, settlement/rejection, and completion; assigned Technicians can perform only their permitted handover/inspection actions.

**Scope:** Add case entry/detail and lifecycle timeline/actions using contract and termination case IDs from API responses; recovery start, handover evidence, inspection ticket creation, inspection result, settlement/reject, and completion; show the Contract/machine outcome returned by the server.

**Non-scope:** Changing Contract policy, directly revoking device credentials from the browser, or creating technician assignment APIs not listed in the guide.

**Contract checks:** Confirm case creation/detail response, any case list/lookup route, how an assigned Technician discovers their inspection case, payload fields for recovery/handover/inspection/settlement/reject/complete, evidence storage requirements, role scope, and irreversible completion behavior.

**Verification and acceptance:** No UI action marks a Contract terminated before server completion; inspection ticket is a required gate; settlement and recovery status are refreshed from the case; Technician sees only assigned actions; completion confirmation describes the machine/Contract result. Check invalid transition, stale state, retry, and error recovery.

**Entry condition:** The necessary case discovery/detail routes and mutation schemas are confirmed.

**Exit condition:** Every confirmed operator/Technician step is wired and validated; unresolved discovery or evidence gaps are recorded.

**Stop/review gate:** The guide lists `GET /termination-cases/{caseId}` but no list route. If there is no authorized collection or assigned-work discovery endpoint, do not create a screen that requires users to guess IDs; stop the affected list/Technician path and report the missing read contract.

## Phase 6 — Buyback and refurbishment

**Outcome:** Authorized Owner/operator/Technician views and actions cover opening a buyback case through valuation, payment proof, collection, refurbishment, and independent QA.

**Scope:** Case entry/detail, eligibility/status display, inspection start/result, operator valuation decision, payment obligation and multipart proof, operator proof review/content, collection request/confirmation, assigned refurbishment, QA, and permitted cancellation.

**Non-scope:** Executing real payment transfers, refund processing, changing buyback eligibility policy, or bypassing QA.

**Contract checks:** Confirm case list/discovery route, create/detail response, role-specific access, every request payload/status transition, multipart fields, private proof content authorization, Technician assignment requirements, collection outcome, and evidence handling.

**Verification and acceptance:** Valuation approval gates payment; proof and collection states come from the server; refurbishment starts only after collection; QA is an independent operator action; Owner/Technician case access is limited to the documented scope. Check retry/idempotency, file handling, state conflicts, and role UI consistency without live payment/collection writes.

**Entry condition:** Case discovery and complete mutation contracts are confirmed.

**Exit condition:** Confirmed lifecycle steps are integrated; required gaps are listed precisely.

**Stop/review gate:** The current frontend only has a buyback detail wrapper, and the guide/reference do not provide a clear case-list contract. If users cannot discover cases through an authorized API, do not ship a form that depends on manually entering unknown case IDs. Stop missing actions if their payload/evidence requirements are not available.

## Phase 7 — Global menus, Owner recipe snapshots, and sync status

**Outcome:** Operators can manage global menu/recipe membership; Owners can browse global recipes, copy and edit their own local snapshots, request sync, and inspect sync state/history.

**Scope:** Global menu create/list/detail and recipe membership; Owner global menu/recipe reads; local menu selection/create; copy snapshot; local patch; request sync and display authorized sync state/history. Keep existing recipe screens and wrappers only where their paths match the confirmed contract.

**Non-scope:** Device poll/ack endpoints and device tokens; direct global edits by Owners; replaying device commands unless a separate human operator flow is confirmed.

**Contract checks:** Confirm `/recipe-menus/**` methods and schemas, current `/recipes/global` and `/recipes/local` behavior, owner/tenant query scoping, copy semantics, local PATCH semantics, sync request/status/history, and role permissions. Resolve the guide/API_REFERENCE difference and the role reference's warning that existing local recipe list/delete may lack tenant checks.

**Verification and acceptance:** Local copies are independent snapshots; Owners cannot edit global data or another Owner's local recipe; sync UI reports requested/pending/completed/failed based on server response; device credentials are never used in browser. Test query invalidation, scope in request construction, and no leakage between Owners.

**Entry condition:** Server-side Owner scoping for local recipe reads/writes and menu contract are verified.

**Exit condition:** Confirmed user-facing menu/recipe/sync controls are integrated and validated.

**Stop/review gate:** FE-only work cannot repair missing server tenant authorization. If local recipe reads/deletes are still unscoped as noted in the reference, keep the affected UI actions unavailable and report the backend security dependency rather than relying on hidden buttons.

## Phase 8 — Heartbeat, action items, alerts, and notifications

**Outcome:** Each role has the documented operational read surfaces; authorized roles can acknowledge alerts and manage their own inbox; Admin can use documented telemetry replay/reconcile operations.

**Scope:** Add `GET /dashboard/action-items`; heartbeat latest and telemetry points; scoped alerts and `POST /alerts/{id}/ack`; notification list/unread/read/read-all; Admin replay/reconcile controls only where the request schema, idempotency, and operator policy are confirmed. Preserve existing dashboard overview, alert, and notification screens.

**Non-scope:** Device telemetry ingestion, device authentication, service-side DLQ processing without an operator API, unrelated reporting/wastage metrics, or alert policy changes.

**Contract checks:** Confirm action-item filters/pagination and per-role scope; heartbeat/point shapes and time ranges; alert ACK status preconditions; notification recipient scoping; replay/reconcile bodies, required idempotency headers, role rules, and audit response.

**Verification and acceptance:** Owner/Technician reads do not accept caller-supplied IDs as authorization; alert ACK refreshes current incident state; inbox operations affect only the current recipient; telemetry status reflects the documented latest-stream threshold; replay/reconcile require explicit confirmation in the application and display server result. Check status/error recovery and page load performance with bounded/paged reads.

**Entry condition:** Read and mutation contracts are confirmed; existing role screens and API wrappers are inventoried.

**Exit condition:** Scoped reads and confirmed operator actions work with validated DTOs and focused checks.

**Stop/review gate:** Do not add Admin replay/reconcile controls if the operation cannot be bounded to an identified DLQ/outbox/machine or if idempotency/audit requirements are unknown. Device writes remain outside FE.

## Phase 9 — Cross-workflow verification and handoff

**Outcome:** The completed, contract-confirmed workflows meet the role, lifecycle, visual consistency, and error-handling requirements as one application.

**Scope:** Review the role/API matrix against all ten guide sections; trace IDs between create/list/detail/action responses; verify route navigation and back behavior; inspect each role shell for component consistency; run focused tests, TypeScript/lint/build checks available in the repo; review regressions in existing Owner invoices/intake, Admin/Moderator technical requests, machine/location screens, Technician tasks, recipe screens, alerts, and notifications; summarize verified, blocked, and runtime-only checks.

**Non-scope:** Production rollout, live financial/lifecycle mutations, backend changes, or claiming live role/API parity without usable credentials and deployed service access.

**Verification:** Use targeted automated tests and static/build checks; run browser/API checks only against a non-production environment and authorized role sessions. No API writes against real user/contract/payment/device data. Verify 360 CSS px layout and 200% zoom for workflow forms/timelines; wide tables may scroll within their own region.

**Acceptance criteria:** Every human-operated guide step is mapped to a role route, a confirmed API operation, a validated response, and a visible success/error/next-step state; external credential flows remain outside FE; missing API/security dependencies are itemized; existing UI conventions and role boundaries remain intact.

**Entry condition:** All preceding phases are complete or explicitly stopped at their documented dependency gates.

**Exit condition:** Findings, tests, known blockers, and files changed are summarized; no unverified action is presented as complete.

**Review gate:** Review access control, tenant scope, private evidence/proofs, idempotency, irreversible actions, visual consistency, component reuse, request duplication, cache invalidation, route refresh, and old-workflow regressions.

## Execution records for the remaining phases

### Phase 5 execution record — 2026-10-31

- **Implementation:** Added the operator Contract termination panel and a shared recall-work-order list/detail lifecycle for Operator, Owner, and assigned Technician. The Technician route uses assigned recall orders as its discovery surface; the case ID comes from the returned work order. Recovery state and custody status are re-read from Dolores.
- **Contract evidence:** Read the local Dolores termination and recall controllers/DTOs. The recall-work-order collection is paged and includes its termination-case ID; direct case lookup exists, but there is no independent termination-case collection. Inspection-ticket creation is supported. Maintenance inspection/settlement evidence still has no confirmed private upload/read route.
- **Focused verification:** The Phase 5 termination/recall test file passed, 4/4; targeted ESLint passed. The focused test confirms the retired direct handover route is not used, private recall evidence is validated, and inspection/settlement evidence remains a gate.
- **Review and gate result:** **Partial.** A termination case without a recall work order still has no collection-based discovery route. Inspection/settlement evidence-dependent actions remain unavailable, and the related case steps cannot be claimed end to end. No live mutations or authenticated UI checks were run.

### Phase 6 execution record — 2026-10-31

- **Implementation:** Added a shared Owner/operator buyback screen, Admin and Moderator routes, typed buyback schemas/API methods, private multipart proof handling, and server-state refresh after mutations. Retries now reuse an operation key until Dolores confirms success. Operator query identities are separated between Admin and Moderator.
- **Contract evidence:** Checked the local Buyback controller, DTOs, and service. Owner/operator have the case collection; the Owner creates the request, operators decide valuation/review proof/QA, and the service owns the reported status. The controller has no Technician case-list route; its case detail path is not an assigned-work discovery API. Payment and proof collection reads are absent. Collection confirmation requires an evidence reference, but the controller has no private upload/read source for it.
- **Focused verification:** The Phase 6 Buyback workflow test file passed, 4/4; targeted ESLint passed. The final cross-workflow run also passed the Buyback API and workflow checks.
- **Review and gate result:** **Partial.** Owner/operator confirmed steps are connected; proof IDs/payment IDs require a manual handoff because list endpoints are missing. Collection confirmation remains gated without private evidence. Technician inspection/refurbishment cannot be surfaced safely without an assigned-case discovery/read route, and this UI does not invent one. Live payment/collection writes were not sent.

### Phase 7 execution record — 2026-10-31

- **Implementation:** Added shared global/Owner menu and snapshot screens, typed menu API/schema wrappers, global recipe summary support, Owner sync request/status/history, and Admin/Moderator/Owner route integrations. API query caches are separated by authenticated subject and Admin/Moderator role.
- **Contract evidence:** Read the local recipe menu and recipe controllers/services. Owner menu/local recipe endpoints derive Owner scope server-side; global recipe list is a summary response, with detail lookup separate. Sync uses the human API and machine UUID; device command polling/acknowledgment remains outside the browser.
- **Focused verification:** The Phase 7 recipe-menu test file passed, 4/4; targeted ESLint passed. Final TypeScript compilation outside the unavailable Playwright config/E2E scope reported zero diagnostics.
- **Review and gate result:** Implementation is present, but the phase remains **unverified at the authenticated UI/runtime gate**. No live two-Owner isolation, device sync, visual/mobile, or browser test was performed. Global menu management was not exercised against a deployed Dolores instance.

### Phase 8 execution record — 2026-10-31

- **Implementation:** Added validated dashboard action-item filters and a shared role-aware panel on Owner/Admin/Moderator overview and Technician tasks pages. Workflow links map only to known same-role frontend destinations; backend API paths are never rendered as browser links. Owner and assigned-Technician machine screens show heartbeat and user-triggered paged telemetry. Admin heartbeat reads poll every five seconds. Moderator machine inventory remains available, but heartbeat and telemetry calls are suppressed until backend role authorization is aligned. Added CRITICAL/HIGH alert acknowledgment and subject-scoped notification queries.
- **Contract evidence:** Checked the local Dashboard, Alert, Heartbeat, and Telemetry Query controllers and services. Action-item filters and role scope match the API. The heartbeat controller description lists Moderator access, but the enforced heartbeat security service and telemetry service allow ADMIN, OWNER, and assigned TECHNICIAN only. The frontend follows the enforced service scope and does not issue Moderator heartbeat/telemetry requests; backend documentation and enforcement need alignment. Alert acknowledgment is a no-body POST for CRITICAL/HIGH incidents. No documented human Admin telemetry replay/reconcile endpoint or request contract exists.
- **Focused verification:** Phase 8 operations/API-signature tests passed, 5/5. Targeted ESLint passed. The combined focused workflow/API suite passed, 43/43.
- **Review and gate result:** **Partial.** Scoped reads, alert acknowledgment, and inbox operations are implemented with bounded reads. Moderator telemetry remains unavailable pending backend role-scope alignment. Replay/reconcile controls remain unavailable because no human endpoint contract was found. Authenticated role sessions, incident refresh against a live service, visual/mobile checks, and deployed API parity are still unverified.

### Phase 9 execution record — 2026-10-31

- **Cross-workflow review:** Reviewed role route wiring, role-separated query identities, API/schema signatures, workflow ID handoffs, evidence gates, mapped action-item navigation, alert/inbox invalidation, telemetry read scope, and shared-shell/component use. Fixed two stale test mock gaps, Owner/Technician detail nullability checks, and buyback operation-key reuse. No live service mutations were made.
- **Automated verification:** The focused workflow/API suite passed, 43/43. App-wide lint passed with zero errors and one existing exhaustive-deps warning in the Contract activation panel. Filtered application TypeScript passed with zero diagnostics across 234 source files. The 51-file broad CJS suite reported 149 passing and 77 failing tests, including tests that reference source paths no longer present and older UI/API expectations; those failures remain unresolved. Full TypeScript and production build remain blocked by missing installed Playwright types. `git diff --check` passed after removing a trailing blank line.
- **Unavailable checks:** Playwright E2E tests and production build cannot run until the declared `@playwright/test` package is installed. Authenticated browser/API flows and 360 CSS px / 200% zoom verification remain deferred by the user. Live Swagger/service parity remains unverified.
- **Final gate result:** **Unverified handoff.** Phases 3-6 and 8 have documented backend contract blockers. Phases 1-2, 7, and 8 still need authenticated runtime/visual checks, and the broad test suite has unresolved failures. Keep the overall workflow open until those dependencies, failures, and checks are addressed.

## Plan approval and execution gate

The user approved implementation with `s-cook` Standard mode and later explicitly instructed continuing through all remaining phases. Execute phases sequentially, complete implementation/checks/verification/review and record each gate result, then continue without pausing for another user instruction. If a contract or safety dependency blocks a step, leave it unavailable, record the precise missing evidence, and continue only with independent work the plan permits. Do not claim a phase or the full plan complete while any acceptance criterion is missing, untested, failed, or unavailable.
