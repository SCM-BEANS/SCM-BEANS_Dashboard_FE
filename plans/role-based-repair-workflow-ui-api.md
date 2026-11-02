# Role-Based Repair and Replacement Workflow UI/API Plan

## Status and target

- **Plan state:** Phase 1 and Phase 2 implementation records are complete with runtime verification outstanding. Phase 3 remains incomplete: Owner acknowledgment is implemented, while custody-event creation and replacement activation remain unavailable pending a confirmed private-evidence source. At the user's explicit direction, Phase 4 continued with the safe work-start subflow, and Phase 5 continued with return acknowledgments plus typed custody/release wrappers. Diagnosis, completion, custody creation and release await an approved private-evidence source; cost-review controls and client-side dispute gating await a latest-review read contract. Stop at the Phase 5 gate before cross-phase verification.
- **Target workspace:** C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE
- **Canonical artifact:** plans/role-based-repair-workflow-ui-api.md
- **Execution boundary:** The user authorized implementation of this plan with s-cook. Work proceeds one phase at a time and stops at each phase gate. TDD is off; post-implementation checks and reviews remain required. No live API writes are authorized by this plan.

## Goal

Complete the role-appropriate frontend for a repair case that needs a replacement machine, from operator triage and assignment through Owner-confirmed custody, Technician repair, return, release, and case closure. Use the existing API client and role routes. Preserve separate entry points for ADMIN, MODERATOR, TECHNICIAN, and OWNER.

The user-confirmed meaning of RepairCase status REPLACEMENT_PLANNED is that a replacement machine is already planned/available. When a case has this status, the assignment UI must treat the replacement as present and must not ask the operator to create a duplicate replacement assignment. Technician assignment to the maintenance ticket remains a separate operation.

The Technician task page must retain its existing assigned installation-work-order query and display the maintenance-ticket query as an additional, independently loaded task source.

## Scope

- ADMIN and MODERATOR technical-request lists, triage, replacement planning when needed, technician selection, ticket assignment, replacement activation, permitted custody-event recording, and permitted release.
- TECHNICIAN task list and RepairCase detail actions for diagnosis, optional repair-cost review, work start, work completion, and permitted custody events.
- OWNER repair-case status/timeline and custody-event acknowledgment, plus existing repair-intake and request history.
- Role/status-specific action visibility, timeline, loading/empty/error/conflict/success states, and API invalidation.
- Contract reconciliation for repair-case, maintenance-ticket, profile, replacement-assignment, and custody APIs.

## Out of scope

- Backend service changes, database migrations, new API operations, or changing role policy.
- Authentication redesign, token storage changes, or adding an ADMIN query parameter/API key convention.
- Replacing or merging the existing Technician installation work-order flow with maintenance tickets.
- Wiring unrelated disabled Technician workflows, unrelated Admin/Moderator pages, or general notification work.
- Claiming evidence upload support until the API private evidenceReference lifecycle and any upload operation are confirmed.

## Workspace and integration baseline

- The repository is a Next.js Pages Router application with role routes under src/pages/admin, src/pages/moderator, src/pages/technician, and src/pages/dashboard.
- The project rules place feature modules under src/components/features; retain the actual Pages Router and use that documented feature location for the shared workflow.
- API wrappers live in src/apis; Zod request/response schemas live in src/schema; screens use TanStack Query and the shared Axios client.
- Existing reusable UI includes DataTable with role variants, ButtonBar, ActionBarConfig, TextLinkButton, BackButtonHeading, SectionHeading, and role-shell CSS modules with established loading/error/success patterns. Reuse these where their behavior fits.
- Dolores browser requests use /api/dolores/v1, which the Next API proxy forwards to the configured Dolores service. OpenAPI routes such as /api/v1/repair-cases are backend paths; frontend code should continue using the existing Dolores base URL.
- The shared Axios client attaches the logged-in access token as Authorization: Bearer. Admin authorization is represented by the authenticated ADMIN token and checked by the backend. For technician selection, role=TECHNICIAN is a profiles query filter, not an Admin credential or authorization key.
- Admin and Moderator technical-request pages already share TechnicalOperationsScreen with role-specific route configuration. The current repair-cases API wrapper supports list, triage, and replacement-assignment creation; other lifecycle operations need typed wrappers and schemas.
- The Owner support screen reads maintenance requests and repair-case statuses. The Technician task screen loads assigned installation work orders and, as an additional source, maintenance tickets. Existing RepairCase schemas are colocated in machines.schema.ts, and the list schema currently needs reconciliation with the documented summary response that omits timeline.
- No repository AGENTS.md was found. The current worktree contains pre-existing uncommitted product changes; this plan does not modify them.
- The supplied Swagger host at http://100.75.202.72:8082 could not be reached from this environment. The clean backend workspace `C:\GitHub\BEANS\dolores_platform` at commit `e3316355b53b8839cfd61aa9664adf4f330fd3ed` was inspected read-only; `docs/API_REFERENCE.md`, controller/DTO/service source and backend role-security tests provide backend-owned contract evidence. This confirms the repository contract but does not prove that the currently deployed Swagger/runtime matches that commit. No role test accounts or live API responses are available in this session.

## User-confirmed design decisions

### Code boundaries

Selected: **one shared repair-workflow feature with separate role routes and shells**.

Proposed responsibility map:

- src/pages/admin/technical-requests/: Admin route and shell composition.
- src/pages/moderator/technical/: Moderator route and shell composition.
- src/pages/technician/tasks/: Technician task entry and route composition.
- src/pages/dashboard/support/: Owner support entry and route composition.
- src/components/features/repair-workflow/: shared repair-case list/detail/timeline and workflow action UI.
- src/apis/: Dolores request/response transport wrappers.
- src/schema/: runtime API schemas and DTO types.
- src/components/: generic shared UI primitives only.

Allowed dependency direction: role pages may compose the repair-workflow feature; the feature may import API wrappers, schemas, and generic UI; API wrappers may import the shared HTTP client and schemas. The shared feature must not import a role page, shell, or role-owned feature internals. Keep the existing Pages Router and route paths. The new feature directory has a current cross-role owner; do not add empty query, utility, or component layers. Route guards remain presentation guards; the backend remains the authorization authority.

### UI/UX

Selected: **role-specific lists plus a shared case detail/timeline, with the next valid action shown for the current role and case state**.

Keep each role navigation and shell. In the case detail, show a readable timeline, current case/ticket/assignment status, and one focused next-action area. When the next transition belongs to another actor or is blocked by a prerequisite, explain who or what is awaited. Owner acknowledgments must be explicit actions. Mutation controls must have accessible labels, keyboard operation, visible focus, pending/success/error announcements, and confirmation for release. At 360 CSS pixels and 200% zoom, timeline and forms must remain usable without page-level horizontal overflow; wide tables may scroll inside their own region. Use existing Vietnamese message namespaces and style conventions. Before adding a UI building block, check whether an existing shared component or role-shell pattern covers it; add feature-specific components only when a suitable one does not exist, and document that gap. Preserve each role shell's typography, spacing, colors, button/table treatment, and feedback styling so the shared workflow looks native in every role. Hiding or disabling an action in the UI is not a substitute for backend authorization.

## Alternatives considered

| Decision | Viable path | Fit and compatibility | Effort and operations | Security, reliability, recovery, evidence | Outcome |
|---|---|---|---|---|---|
| Architecture | A. Shared repair-workflow feature; role routes stay separate | Fits the existing shared Admin/Moderator technical screen and role shells; keeps route ownership and API contracts shared | Moderate initial extraction; lower ongoing duplication | One status/action implementation is easier to review; backend role checks remain authoritative; current pages and wrappers provide verification points | **Selected by user** |
| Architecture | B. Separate UI implementation for each role, shared APIs/schemas | Compatible with current role folders but duplicates timeline/action state | Higher implementation and maintenance cost across four roles | Greater risk of inconsistent status gates and recovery behavior; harder to verify one lifecycle | Rejected for this scope |
| Architecture | C. Clone the entire screen and API integration per role | Shortest path for one copied page; poor fit for a shared lifecycle | Lower first-page effort, highest later repair cost | Duplicated permission and mutation logic can drift; inconsistent retry/closure behavior | Rejected |
| UI flow | 1. Role list, shared detail/timeline, next valid action | Matches separate workspaces while exposing one shared case history | Moderate detail view work; reduces repeated workflow instructions | Clear waiting actor, state and retry feedback; timeline supports cross-role verification | **Selected by user** |
| UI flow | 2. Separate guided wizard per role | Strong local guidance, but the workflow pauses and changes actor across steps | Higher navigation, draft and refresh-state work | More risk of losing context across actors or presenting stale steps | Rejected |
| UI flow | 3. Add actions independently to current pages | Lowest visual change | Lower first increment but repeated status logic | Case-wide progress and cross-role blocking are difficult to understand and verify | Rejected |

## Role and API contract matrix

The following paths are backend Dolores paths. The frontend continues using the existing proxy and shared Bearer client.

| Actor | Intended surface and operations | Required constraints |
|---|---|---|
| ADMIN | Technical request queue; repair intake triage; replacement assignment when not already planned; maintenance-ticket assignment; activate a planned replacement; record permitted custody events; release an eligible assignment | Use the signed-in ADMIN Bearer token. Do not send role=ADMIN as a query parameter. The backend contract confirms ticket assignment is ADMIN-only; technicianId is the selected active, email-verified profile's IDaaS UUID and assignedTo is an optional display label. |
| MODERATOR | Creator-contract-scoped technical request queue and repair case; intake triage; replacement assignment; activate a planned replacement; permitted custody events/release | Ticket assignment is not permitted to MODERATOR. The shared operator UI must communicate that ticket assignment awaits an ADMIN and must never send the assignment POST for a Moderator session. |
| TECHNICIAN | Keep GET /installation-work-orders/assigned. In parallel, load GET /maintenance-tickets using supported source/status/page/size filters; open assigned repair-case tasks; record permitted custody events; submit diagnosis, optional cost estimate, work start and work completion | GET scopes data to the authenticated Technician. RepairCase summary omits maintenanceTicketId; case detail includes it, and maintenance-ticket detail includes repairCaseId. Only the assigned Technician may perform technician-only transitions. |
| OWNER | Existing repair intake and request list; repair-case status/timeline and custody history; acknowledge custody events; participate in cost-review decisions only where the API contract permits | The backend scopes data to the authenticated Owner. Never accept ownerId from the UI as proof of access. Custody acknowledgment is separate from financial acknowledgment/dispute. |

Contract operations confirmed from the backend-owned API reference and source at the workspace/commit recorded above (deployment parity remains unverified):

- Reads: GET /maintenance-requests; GET /repair-cases?page=0&size=50 (array of summary DTOs, `X-Page`, `X-Page-Size`, `X-Has-Next`; filters status/ownerId/contractId/machineId); GET /repair-cases/{caseId} (detail with the first timeline slice and `maintenanceTicketId`); GET /repair-cases/{caseId}/timeline?page=0&size=50 (Spring Page response); GET /repair-cases/{caseId}/custody-events?page=0&size=50 (bounded array plus paging headers); GET /maintenance-tickets?page=0&size=50 (role-scoped summary); GET /maintenance-tickets/{ticketId} (includes `repairCaseId`); GET /replacement-assignments/{assignmentId}; GET /profiles?role=TECHNICIAN&status=ACTIVE&page=0&size={n} (page object; default 20, maximum 100).
- Triage and assignment: POST /repair-cases/intakes/{requestId}/triage (ADMIN or creator-contract MODERATOR); POST /repair-cases/{caseId}/replacement-assignments (ADMIN or creator-contract MODERATOR); POST /maintenance-tickets/{ticketId}/assign?technicianId={id}&assignedTo={label} (**ADMIN only**, despite the earlier UI/plan assumption).
- Custody and activation: POST /repair-cases/{caseId}/custody-events (assigned Technician, ADMIN, Moderator in its scope); POST /repair-cases/{caseId}/custody-events/{eventId}/acknowledge (Owner of case; requires `{acknowledgement}`); POST /replacement-assignments/{assignmentId}/activate (ADMIN or scoped Moderator; requires `{handoverEvidence,approvalReason,idempotencyKey,correlationId}`).
- Technician work: POST /repair-cases/{caseId}/diagnosis; POST /maintenance-tickets/{ticketId}/repair-cost-reviews; GET /repair-cost-reviews/{reviewId}; POST /repair-cost-reviews/{reviewId}/decision; POST /repair-cost-reviews/{reviewId}/acknowledgment; POST /repair-cost-reviews/{reviewId}/dispute; POST /repair-cost-reviews/{reviewId}/resolution; POST /repair-cases/{caseId}/work/start; POST /repair-cases/{caseId}/work/complete. Cost decisions/acknowledgments/disputes are a separate financial branch from custody.
- Closeout: POST /repair-cases/{caseId}/custody-events for REPLACEMENT_COLLECTED and PRIMARY_RETURNED, with Owner acknowledgment after each; POST /replacement-assignments/{assignmentId}/release.

Known request details from the current code/screenshots that must be reconciled, not guessed:

- Replacement planning currently uses replacementMachineId, startAt, endAt, reason, idempotencyKey, and correlationId.
- Ticket assignment uses technicianId and assignedTo. Technician profiles use role=TECHNICIAN and status=ACTIVE with profile pagination. Preserve the API 0-based profile pagination unless OpenAPI confirms otherwise.
- A custody event uses eventType, machineId, conditionNotes, and evidenceReference. PRIMARY_COLLECTED must use the primary machine ID. REPLACEMENT_DELIVERED must use the replacement machine ID. Verify the required machine ID for later collection/return events.
- Diagnosis uses diagnosis and private evidenceReference.
- Work start uses workScope; emergencyAuthorizationId is allowed only for a disputed case with an active, unused authorization for the correct scope.
- Work completion uses diagnosis, resolutionResult, workScope, and at least one private evidenceReferences value; notes are optional in the supplied screenshot.
- Release uses releaseEvidence, idempotencyKey, and correlationId.
- The supplied workflow states that RepairCase must be REPLACEMENT_PLANNED, assignment PLANNED, and ticket ASSIGNED before primary collection; primary receipt must be Owner-acknowledged before replacement delivery/activation proceeds; replacement delivery must be acknowledged before diagnosis; work start requires ticket ASSIGNED; completion requires RepairCase REPAIR_IN_PROGRESS and ticket IN_PROGRESS; release requires the relevant return custody events to be Owner-acknowledged.
- Cost review uses a distinct set of endpoints above. A RepairCase proposal requires PARTS and LABOR cost components totaling estimatedAmount; the Owner financial acknowledgment body is `{acknowledgeApprovedAmount:true}`, and dispute requires reason, disputedAmount and private evidence references. Activation uses private handoverEvidence, approvalReason, idempotencyKey and correlationId. Custody acknowledgment requires a free-text `acknowledgement` (max 1000). Release uses releaseEvidence, idempotencyKey and correlationId.
- Evidence values must be private storage references, not `http(s)` URLs. The inspected backend code validates references but no RepairCase upload/reference-creation API was found. Keep evidence-dependent controls unavailable until a safe reference source is confirmed.

## Shared implementation rules

- Treat RepairCase, assignment, maintenance ticket, and custody-event server responses as the source of truth. Do not optimistically advance a workflow status.
- On route entry, load the role-authorized collection; detail routes load only for a valid UUID. Load timeline/detail after a valid case is selected. Abort obsolete reads.
- Give each server-data query a stable key containing resource identity, relevant filters, and current authenticated subject/role. Clear or invalidate protected data on logout/session change according to the existing app behavior.
- After mutations, invalidate the smallest related request, case, timeline, ticket, and assignment queries. Do not report success until the server response validates.
- Distinguish loading, empty, forbidden, unauthenticated, not found, validation, conflict/stale state, network failure, and unexpected failure. On 409 or an ambiguous timeout, reload the case/ticket before offering a retry. Reuse the same idempotency key for an unchanged supported operation; create a new key only after the payload changes.
- Do not allow a user-supplied ID to stand in for an authorization decision. The backend enforces role and ownership rules.
- Display private evidence references only to authorized roles. Confirm how users create/select a valid reference; never expose private evidence through public URLs or logs.
- Keep the installation-work-order and maintenance-ticket task sources visibly distinguishable. Each source has its own loading, error, empty, retry, and refresh state; one failure must not hide successful data from the other source.

## Phase 1 — Reconcile contracts and complete role-safe read surfaces

**Outcome:** Every role can open its appropriate case/task list and case detail/timeline from validated server data, with an agreed endpoint and authorization matrix.

**Scope:** Compare current OpenAPI with the matrix above. Confirm method/path, params, DTOs, role/ownership scope, state preconditions, error codes, pagination, evidence handling, and relationship IDs. Correct summary/detail/timeline Zod schemas. Implement or complete role-appropriate GETs for request/case/ticket/profile reads. Preserve the existing Owner intake flow and both Technician task sources. Add shared case detail/timeline composition and clear list navigation.

**Non-scope:** All new mutations, backend changes, changing existing role navigation, or merging installation work orders and maintenance tickets.

**Dependencies:** A backend-owned contract and code source are available and inspected at the recorded commit. Runtime OpenAPI deployment parity and role-account responses remain external verification dependencies; do not claim them as passed.

**Boundary and affected components:** Add src/components/features/repair-workflow as the shared role-neutral feature. Keep page files as route/shell composition. Extend src/apis/repair-cases.api.ts, src/apis/maintenance-requests.api.ts, src/apis/machines.api.ts, and src/apis/profiles.api.ts only for confirmed reads; update src/schema/machines.schema.ts or an existing domain schema file to validate summary/detail/timeline DTOs. Update Owner support, Moderator/Admin technical-request routes, and Technician task composition.

**Side effects:** GET requests and client cache population only. No state-changing API calls.

**Verification:** Record an operation-by-operation matrix against the backend-owned source and label runtime parity unverified. Check summary parsing without requiring timeline, detail/timeline UUID identity, profile pagination, custody history and Technician ticket scoping. With available local UI/mock evidence, check list, detail, empty, loading, forbidden, not-found, retry, and route-refresh behavior. Confirm the installation-work-order table still loads when maintenance-ticket reads fail and vice versa. Live four-role checks require authorized role sessions and are not available in this environment.

**Acceptance criteria:** All four role entry points use correctly scoped GETs; no summary parse failure is hidden as empty data; Owner and Technician see only the backend-authorized data; Admin/Moderator lists share implementation while preserving separate routes; both Technician task sources remain visible and independently recoverable.

**Entry condition:** The user approved the plan for s-cook execution, the four-role architecture/UI decisions are recorded, and the existing repository/API baseline is identified.

**Exit condition:** Backend-source contracts, response relationships, implemented read surfaces, DTO validation and available automated checks pass. Stop before Phase 2 mutations if runtime parity or a role scope is contradicted or unclear. Report live role-session checks as outstanding when no authorized role sessions are available.

**Risks and stopping gate:** Swagger was unreachable during planning and remains unverified at runtime. The backend source proves repository contract only. Stop any affected endpoint if runtime OpenAPI/role responses differ, especially if ticket-to-technician scoping, case-to-assignment IDs, or response shape is unclear.

**Review gate:** Review DTO schemas, cache identity, role scope, cross-route imports, separate task-source failure handling, and the new feature directory against the frontend project-structure gate.

**Visual consistency gate:** Inventory the available shared components before implementation. Use DataTable and its appropriate role variant for lists, ButtonBar/ActionBarConfig for page actions, TextLinkButton for row navigation, and BackButtonHeading/SectionHeading for headings when they match the screen. Reuse shell-owned feedback and CSS patterns. Any new feature control must have a recorded reason that no existing component fits. Review the same workflow list/detail states in all four role shells for matching typography, spacing, controls, and status feedback.

## Phase 1 execution and verification record

**Implementation completed in this phase:** API wrappers now support paged repair-case, maintenance-request, and maintenance-ticket reads plus identity-checked request/ticket/assignment detail reads. RepairCase summary validation does not require timeline fields. All four role entry points have a paged case list and shared detail/timeline/custody history; Owner repair requests are filtered by `requestType=REPAIR`; `/technician/tasks` keeps the installation-work-order query and shows maintenance tickets as a separate source with its own pagination and refresh/error state. The Admin and Moderator routes compose a shared workbench from `src/components/features/repair-workflow`, and protected queries include the role and current token subject. Existing shared controls and role-appropriate table variants are used.

**Verification evidence:**

- Backend repository contract inspection at `dolores_platform@e3316355b53b8839cfd61aa9664adf4f330fd3ed`: passed for endpoint methods, supported filters, paging headers, DTO relationships, and backend authorization rules. This is repository-source evidence only; deployed Swagger parity remains unverified.
- `node --test --test-name-pattern='repair workflow reads' tests/dolores-api-requests.test.cjs`: passed (bounded page traversal, requestType filter, direct detail routes, identity mismatch handling).
- `node --test --test-name-pattern='moderator detail screens do not keep duplicate parent-list links' tests/moderator-admin-back-navigation.test.cjs`: passed (shared technical screens use the shared heading control without a duplicate back link).
- `node --test tests/dolores-api-requests.test.cjs`: failed in the pre-existing `current domain APIs...` test with `TypeError: apis[apiName][methodName] is not a function`; the stale expectation is for `installationWorkOrdersApi.listByTenant`, which is not implemented in this worktree. The new repair-workflow API test in the same file passes.
- Full `node --test`: 108/184 passed; 76 failed. The failure set remains consistent with the earlier baseline run and includes stale test imports for absent screen modules, missing test-module aliases/dependencies, and assertions that conflict with existing uncommitted role/navigation changes in the worktree. It is not passing evidence for the full application.
- Targeted TypeScript check for the affected feature, route, API, schema, and role screens: passed.
- ESLint across `src` and the focused API test: passed with one existing unrelated warning in `src/components/contracts/contract-activation-panel.tsx` (missing `contract` hook dependency). ESLint for the two edited tests: passed.
- `git diff --check`: passed; Git reported existing LF-to-CRLF normalization warnings in other modified files.
- Live four-role browser/API checks, deployed Swagger parity, keyboard/zoom visual checks, and E2E checks: unavailable in this environment (no role sessions; Swagger host unreachable; Playwright package unavailable).

**Review finding reserved for Phase 2:** The current assignment screen still renders and can submit ticket assignment for MODERATOR even though the inspected backend contract makes `POST /maintenance-tickets/{ticketId}/assign` ADMIN-only. Before Phase 2 can exit, hide that form and ensure no Moderator code path invokes the POST; keep the Moderator flow waiting for ADMIN. The Technician profile selector also still needs the planned email-verified filter and full pagination/search behavior.

**Gate result:** Phase 1 implementation is ready, but the Standard verification gate remains **unverified** and the phase is not marked complete. Runtime role sessions and deployment parity must be checked when available; the unrelated stale API-suite failure must be resolved or established as baseline before using the broader suite as passing evidence. Stop here; Phase 2 remains pending.

## Phase 2 — Operator triage and assignment for ADMIN/MODERATOR

**Outcome:** Admin and Moderator can move a valid REPAIR request through triage and assignment without duplicate replacement planning.

**Scope:** In the shared technical-request workbench, expose triage and replacement planning when needed to ADMIN and scoped MODERATOR. Expose the maintenance-ticket assignment form only to ADMIN; for MODERATOR, show that assignment awaits ADMIN and do not submit the endpoint. Load active, email-verified technicians from /profiles using role=TECHNICIAN and status=ACTIVE, and preserve pagination/search. Display current case, ticket, replacement, and assignment statuses.

**Non-scope:** Custody confirmation, activation/delivery, Technician diagnosis/work, and any unsupported role-specific shortcut.

**Dependencies:** Phase 1 read/schema/authorization gate. Existing Owner intake remains the upstream source of a REPAIR request.

**Boundary and affected components:** Shared repair-workflow queue/detail and assignment panels; ADMIN and MODERATOR route composition; confirmed methods in repair-cases.api.ts and machines.api.ts; their request/response schemas and localized role messages.

**Side effects:** Triage may accept/reject the intake and change server state. Replacement assignment reserves/plans a machine. Ticket assignment changes the assigned Technician. These are separate POST operations and must not be presented as one atomic transaction.

**Verification:** Check triage/replacement permissions for ADMIN and creator-contract MODERATOR independently. Verify ticket assignment succeeds only for ADMIN and the Moderator UI does not send a POST. Verify request type/status gates, replacement-machine eligibility, active/email-verified TECHNICIAN profile identity, request payloads, pending/double-submit behavior, API 400/401/403/404/409 feedback, and refresh after a network-ambiguous outcome. Confirm failed ticket assignment does not falsely imply replacement planning failed, and vice versa.

**Acceptance criteria:** Admin route uses the authenticated ADMIN Bearer session; no admin key is sent in query/body. Technician dropdown contains only active, email-verified TECHNICIAN profiles and sends the selected profile UUID, with assignedTo as optional display text. A REPLACEMENT_PLANNED case is shown as replacement planned/available and bypasses duplicate replacement creation while allowing ADMIN-only ticket assignment when needed. Moderator can triage/plan within creator scope and sees that ticket assignment awaits ADMIN. Mutations refresh only related data and show server-confirmed states.

**Entry condition:** Phase 1 verifies each relevant endpoint, role, schema, and ID relationship.

**Exit condition:** Triage/replacement planning and ADMIN-only ticket assignment work with confirmed roles and recovery behavior; separate Admin and Moderator routes show consistent state.

**Risks and stopping gate:** If assignment creation and ticket assignment are not atomic, partial success is possible. Keep each result separate and recover by re-reading request/case/ticket state. Stop if the backend contract does not define a safe way to identify a completed or pending assignment after timeout.

**Review gate:** Review status predicates, role checks, partial-success UX, ID mapping, duplicate prevention, and whether the form avoids exposing unauthorized replacement inventory.

## Phase 2 execution and verification record

**Implementation completed in this phase:** The shared Admin/Moderator assignment screen reads the linked maintenance ticket before offering assignment and displays request, repair-case, replacement, ticket, and assignee states. `REPLACEMENT_PLANNED` continues to bypass replacement creation. Ticket assignment is rendered only for Admin, the submit handler checks the role, and the mutation function has a second Admin guard before it can call `POST /maintenance-tickets/{ticketId}/assign`. Moderator can still use the shared triage/replacement workflow and sees that ticket assignment awaits an Admin. The Admin selector requests `/profiles` with `role=TECHNICIAN`, `status=ACTIVE`, `q`, `page`, and `size`; client filtering also requires ACTIVE, `emailVerified`, and the TECHNICIAN role. It uses debounced search, the shared pagination control, and the `idaasUserId` UUID. Existing BackButtonHeading and feature styles are retained. Successful ticket assignment invalidates the request, ticket list, and role-scoped ticket detail; an already assigned ticket is read-only to prevent duplicate assignment.

**Contract review evidence:** Read-only backend source at `dolores_platform@e3316355b53b8839cfd61aa9664adf4f330fd3ed` confirms `/profiles` supports `role`, `status`, prefix-search `q`, and pagination (default page size 20, maximum 100); response profiles expose `emailVerified`, roles, status, and IDaaS UUID. `MaintenanceController.assignTicket` uses the global operator check, and `SecurityCheckService.isGlobalOperator()` confirms ADMIN is the only global operator. The assignment endpoint documentation identifies ADMIN as the authorized role. Deployed Swagger/runtime parity remains unverified because the configured Swagger host was unreachable during planning.

**Verification evidence:**

- `node --test tests/repair-workflow-assignment.test.cjs`: passed (Moderator has no assignment request path; Admin technician list is filtered, searchable, and paginated).
- `node --test --test-name-pattern='repair workflow reads|profile API lists' tests/dolores-api-requests.test.cjs tests/admin-operations.test.cjs`: passed (2 focused API tests).
- Targeted TypeScript check for `maintenance-request-assignment-screen.tsx` and `moderator-messages.ts` with their imported dependencies: passed.
- `eslint src --ext .ts,.tsx,.js,.jsx`: passed with one pre-existing warning in `src/components/contracts/contract-activation-panel.tsx` (missing `contract` hook dependency).
- `git diff --check`: passed; Git reported existing LF-to-CRLF normalization warnings in other modified files.
- Full project `tsc --noEmit`: not clean because `@playwright/test` is unavailable and pre-existing nullable-value errors remain in `src/pages/technician/tasks/work-order-detail-screen.tsx`; no diagnostics referenced the Phase 2 files.
- The earlier full `node --test` result remains the recorded baseline (108/184 passed, 76 failures across stale imports/dependencies and existing worktree expectations); the full suite was not rerun in this phase.
- Runtime Admin/Moderator role sessions, live API request/response checks, deployed Swagger parity, browser E2E, and visual/keyboard/zoom checks were unavailable. No live mutation was sent.

**Review result:** Source review confirms separate triage/replacement and ticket-assignment permissions, no Moderator POST path, server-confirmed ticket state before enabling assignment, verified active Technician identity, role/subject cache partitioning, and separate mutation feedback for partial success. The Admin assignment query uses the authenticated bearer session; no Admin key is sent as a query or body field.

**Gate result:** Implementation and repository checks are ready, but the Standard verification gate remains **unverified** until deployed API parity and Admin/Moderator role behavior can be checked in an authorized environment. Phase 2 is not marked complete; stop here and do not begin Phase 3.

## Phase 3 — Primary collection, activation, replacement delivery, and Owner acknowledgments

**Outcome:** Operator/assigned Technician custody actions and Owner acknowledgments follow the required custody sequence before diagnosis.

**Scope:** Record PRIMARY_COLLECTED for the primaryMachineId with condition/evidence; let the authenticated Owner acknowledge that event. Permit Admin/Moderator activation only after the primary collection prerequisites; record REPLACEMENT_DELIVERED for the replacement machine; require Owner acknowledgment before enabling diagnosis. Show event IDs and timestamps in the shared timeline.

**Non-scope:** Technician diagnosis, repair-cost decisions, work execution, return collection, and assignment release.

**Dependencies:** Phase 1 confirmed event/assignment read IDs and Phase 2 creates or resolves an eligible assignment. Confirmed private evidence input/upload capability is required.

**Boundary and affected components:** Shared custody-event forms and timeline in src/components/features/repair-workflow; Owner acknowledgment composition in dashboard/support routes; Admin/Moderator and assigned Technician event/activation affordances as confirmed by the role matrix; typed repair-case/replacement-assignment API methods and Zod schemas.

**Side effects:** Custody events are durable operational records; activation changes assignment state and may allocate a replacement machine. Owner acknowledgment is a separate server mutation and must not be inferred from event creation.

**Verification:** Exercise primary collection -> Owner acknowledgment -> replacement activation -> replacement delivered -> Owner acknowledgment. Verify event machineId matches the primary/replacement ID, the same event is acknowledged, and diagnosis remains disabled until delivery acknowledgment. Check duplicate, stale, forbidden, and failed acknowledgment responses.

**Acceptance criteria:** Only documented actors see each operation; each stage becomes complete only from its validated server response; Owner sees an explicit acknowledgment and confirmation state; the next stage names the missing actor/prerequisite when blocked; private evidence values remain private and validated.

**Entry condition:** Phase 2 has a confirmed assignment or the case already has a valid REPLACEMENT_PLANNED assignment; API has confirmed activation and custody payloads, IDs, evidenceReference semantics, and role scope.

**Exit condition:** The full pre-diagnosis chain is visible and server-confirmed for each authorized role; no step can be skipped by direct route navigation or stale local state.

**Risks and stopping gate:** If evidenceReference cannot be safely created or selected, if activation prerequisites differ, or if event acknowledgment is not authorized for the Owner, stop the affected action and keep it unavailable pending contract clarification.

**Review gate:** Review custody ordering, machine identity matching, event acknowledgment ownership, privacy, and mutation retry behavior.

## Phase 3 execution and verification record

**Implemented subflow:** Added a strict Owner acknowledgment request schema and a case-scoped `POST /repair-cases/{caseId}/custody-events/{eventId}/acknowledge` wrapper. The wrapper validates the event and case UUIDs, parses the response, and rejects a response for a different event/case. The shared case timeline exposes an acknowledgment form only to the Owner for an unacknowledged `PRIMARY_COLLECTED` event; a `REPLACEMENT_DELIVERED` acknowledgment is shown only after the primary collection event has a server-recorded Owner acknowledgment. Submission requires nonblank text (maximum 1,000 characters), disables duplicate submission, shows server errors, and refreshes the role/subject-scoped workflow queries on settlement so an ambiguous result is reconciled from the server. Other roles see no acknowledgment form.

**Evidence boundary:** Read-only backend source at `dolores_platform@e3316355b53b8839cfd61aa9664adf4f330fd3ed` confirms custody event creation requires `eventType`, the matching `machineId`, nonblank condition notes, and a private `evidenceReference`; activation requires `handoverEvidence`, an approval reason, an idempotency key, and a correlation ID. The backend rejects public URLs but does not establish a RepairCase evidence upload or reference-selection operation. The frontend's existing evidence upload is scoped to installation work orders and cannot be treated as custody evidence. Therefore this phase does not accept arbitrary text as a private reference or reuse the Owner's original intake evidence. Custody-event creation and replacement activation remain unavailable, with a visible prerequisite notice at the affected stage.

**Verification evidence:**

- `node --test tests/repair-workflow-custody.test.cjs`: passed (case-scoped acknowledgment request/response identity, Owner-only action, ordering gate, and evidence-dependent actions remaining unavailable).
- `node --test tests/repair-workflow-assignment.test.cjs`: passed (Phase 2 role and eligible-Technician regression checks).
- Targeted TypeScript check for the RepairCase detail screen, API, schema, and messages with imported dependencies: passed.
- `eslint src --ext .ts,.tsx,.js,.jsx`: passed with one pre-existing warning in `src/components/contracts/contract-activation-panel.tsx` (missing `contract` hook dependency).
- `git diff --check`: passed; Git reported existing LF-to-CRLF normalization warnings in other modified files.
- Live Owner/Technician/Admin/Moderator sessions, deployed Swagger parity, browser E2E and visual checks were unavailable. No live mutation was sent.

**Review result:** Owner identity comes from the authenticated Bearer session; the request body contains only the Owner's acknowledgment text. Event/case identity is checked on the response, and the UI follows the backend's requirement that primary collection be Owner-acknowledged before replacement delivery can be acknowledged. No custody evidence is surfaced as a public link.

**Gate result:** The Owner acknowledgment subflow and repository checks are ready, but Phase 3 is **incomplete and unverified**: the required source for private custody/handover evidence has not been confirmed, so recording custody events and activation stay unavailable. Deployed role/API behavior also remains unverified. At the user's explicit direction, Phase 4 proceeded with the safe work-start subflow while preserving these evidence-dependent controls as unavailable.

## Phase 4 — Technician diagnosis, cost review, and repair execution

**Outcome:** The assigned Technician can diagnose, follow the optional cost-review branch, start work when permitted, and complete the repair with required evidence.

**Scope:** Add diagnosis form; optional estimate creation and review/dispute state when the documented policy requires it; work-start action with workScope; completion form with diagnosis, resolutionResult, workScope, and at least one private evidenceReferences value. Keep emergencyAuthorizationId absent unless the case is disputed and a valid, unused authorization for the correct scope can be selected and verified.

**Non-scope:** Creating or granting emergency authorization, automatically converting an estimate into debt, changing cost policy, or allowing unassigned Technicians to act.

**Dependencies:** Phase 3 Owner acknowledgment of replacement delivery; ticket is ASSIGNED; Phase 1 confirms Technician assignment scope, evidence contract, cost-review request/decision shape and roles, and work status transitions.

**Boundary and affected components:** Shared repair-workflow Technician action panels; Technician task/detail route composition; typed repair-case and maintenance-ticket API wrappers; schemas and status labels. Keep the maintenance-ticket list as its own additional data source next to installation work orders.

**Side effects:** Diagnosis and evidence are persisted. Cost review creates a financial review record, while a review decision can pause or release the work branch. Work start/complete changes case and ticket statuses.

**Verification:** Confirm only the assigned Technician can write diagnosis/start/complete; validate required fields/private evidence; verify cost estimate is not rendered as debt; test disputed and undisputed paths; confirm work start is unavailable before Owner acknowledgment and work completion is unavailable before REPAIR_IN_PROGRESS/IN_PROGRESS. After each successful mutation, reload the page and confirm server state and timeline.

**Acceptance criteria:** Diagnosis requires the API-required evidence; work start requires ticket ASSIGNED and Owner acknowledgment; completion requires case REPAIR_IN_PROGRESS, ticket IN_PROGRESS, all required text fields, and at least one private evidence reference. Cost review is optional and status-driven; disputed work stays paused unless a valid emergency authorization satisfies the confirmed contract. Failed writes never show a success state.

**Entry condition:** Phase 3 exits with acknowledged REPLACEMENT_DELIVERED and the ticket remains ASSIGNED; endpoint policy and evidence handling are confirmed.

**Exit condition:** An authorized Technician can reach server-confirmed REPAIR_COMPLETED and ticket RESOLVED, with errors and financial branch state correctly reflected.

**Risks and stopping gate:** Cost review roles/body and evidence-reference creation are not fully shown in the screenshots. Stop those controls until verified. Do not accept a free-form emergencyAuthorizationId unless an authorized source verifies scope, active status, and unused status.

**Review gate:** Review privacy, financial semantics, technician-to-ticket ownership, status predicates, and recovery after ambiguous POST outcomes.

## Phase 4 execution and verification record

**Implemented subflow:** Added a strict `workScope` request schema and typed `POST /repair-cases/{caseId}/work/start` wrapper. The wrapper validates the case and ticket identifiers and confirms that the response is the expected ticket, belongs to the case, and has status `IN_PROGRESS`. The shared RepairCase detail screen shows Technician actions only on relevant case stages and offers the work-start form only when the authenticated subject matches the ticket's `assignedTechnicianId`, RepairCase is `DIAGNOSIS`, the ticket is `ASSIGNED`, and the Owner has acknowledged the `REPLACEMENT_DELIVERED` custody event. The form sends only `workScope`, uses the shared workflow panel/form/button styling, displays the API error on failure, and invalidates workflow queries after the result to reconcile ambiguous writes.

**Blocked actions and reasons:** Diagnosis and repair completion remain unavailable because each API requires private evidence references, and no RepairCase evidence upload or reference-selection contract is present in the frontend/backend evidence reviewed. The page explains this requirement rather than accepting arbitrary reference text or reusing unrelated installation evidence. Cost-review create/decision controls remain unavailable because they require private evidence and financially meaningful payloads. The API also has no latest-review-by-ticket read operation or review ID/status on the ticket detail response, so the frontend cannot determine whether a dispute is open before work start. The backend remains authoritative and can reject work start; the UI sends no `emergencyAuthorizationId` because it has no safe source to verify a valid, unused authorization for the exact scope.

**Verification evidence:**

- `node --test tests/repair-workflow-phase4.test.cjs tests/repair-workflow-custody.test.cjs tests/repair-workflow-assignment.test.cjs`: passed (7 focused API/UI regression checks).
- Targeted TypeScript check for the RepairCase detail screen, API, schema and messages with imported dependencies: passed.
- Targeted ESLint check for those four source files: passed.
- `git diff --check`: passed; Git reported line-ending normalization warnings in pre-existing modified files.
- No live mutation is sent. Deployed API parity, role sessions and browser-level rendering remain unverified.

**Gate result:** Phase 4 is **incomplete and unverified**. Only work start is implemented. Required diagnosis, optional cost-review state, repair completion and end-to-end stage verification remain outstanding until the private evidence lifecycle and latest cost-review status contract are confirmed. At the user's explicit direction, Phase 5 proceeded with the safe return acknowledgment subflow and typed API wrappers; evidence-dependent custody and release mutations remain unavailable.

## Phase 5 — Replacement collection, primary return, and release

**Outcome:** The repaired case closes only after the replacement has been collected, the primary machine returned, Owner acknowledgments recorded, and the replacement assignment released.

**Scope:** Record REPLACEMENT_COLLECTED and require Owner acknowledgment; then record PRIMARY_RETURNED and require Owner acknowledgment. Release the assignment with releaseEvidence, idempotencyKey, and correlationId. Refresh the timeline and related task/request data until the server reports the final state.

**Non-scope:** Reopening closed cases, editing historical custody records, bypassing acknowledgment, or inventing a manual close operation.

**Dependencies:** Phase 4 has server-confirmed REPAIR_COMPLETED; the Owner has acknowledged replacement delivery; a valid assignmentId and release contract are available.

**Boundary and affected components:** Shared closeout timeline/action panel in src/components/features/repair-workflow; Owner acknowledgment surface; Admin/Moderator and assigned Technician release action only for confirmed permitted actors; typed custody/release wrappers and schemas.

**Side effects:** Two durable custody events and acknowledgments are recorded. Release returns the replacement machine to the applicable pool and closes the RepairCase according to backend behavior.

**Verification:** Exercise replacement collection -> Owner acknowledgment -> primary return -> Owner acknowledgment -> release. Verify release is disabled before both acknowledgments and that the release response is idempotent or safely recoverable using the confirmed key. Reload Owner, operator, and Technician views and confirm final case and ticket statuses.

**Acceptance criteria:** No release can be submitted until all required custody return events are acknowledged; release sends the server-required evidence and correlation/idempotency values; only permitted actors see release; final state comes from the API and the timeline shows every event.

**Entry condition:** Phase 4 has completed and the latest server reads satisfy all return/release prerequisites.

**Exit condition:** Case and assignment show the contract-defined closed/released statuses across authorized role surfaces; no unresolved timeline or cache discrepancy remains.

**Risks and stopping gate:** If release is restricted to the contract creator or assigned Technician, derive eligibility from backend-confirmed identity/relationship data. Stop if the caller cannot prove the permitted relationship or if release evidence/idempotency requirements are unclear.

**Review gate:** Review irreversible release effects, actor eligibility, evidence privacy, idempotency, and final status consistency.

## Phase 5 execution and verification record

**Implemented subflow:** At the user's explicit direction, Phase 5 continued while Phase 4 remained incomplete. Extended the shared custody timeline so Owner can acknowledge `REPLACEMENT_COLLECTED` only after the Owner-acknowledged `REPLACEMENT_DELIVERED` event, and acknowledge `PRIMARY_RETURNED` only after the Owner-acknowledged `REPLACEMENT_COLLECTED` event. Added status-specific waiting states for operators and Owner, plus a release-evidence prerequisite notice after both return events are acknowledged. Added strict request schemas and typed wrappers for case-scoped custody creation and replacement-assignment release. The wrappers validate private-evidence shape, request fields, event identity/type/machine, and `RELEASED` response status. They are not connected to the screen while no approved private-evidence source exists.

**Evidence boundary:** Read-only backend source confirms return events require the exact machine ID, condition notes, private `evidenceReference`, and ordered Owner acknowledgment. Release requires `releaseEvidence`, `idempotencyKey`, `correlationId`, an active assignment, `OWNER_ACKNOWLEDGED` RepairCase state, and Owner acknowledgments on both return events; it releases the replacement and closes the case. The current frontend has no approved evidence upload/reference-selection flow. Therefore the UI does not send custody-creation or release requests and does not accept arbitrary evidence text.

**Verification evidence:**

- `node --test tests/repair-workflow-closeout.test.cjs tests/repair-workflow-phase4.test.cjs tests/repair-workflow-custody.test.cjs tests/repair-workflow-assignment.test.cjs`: passed (12 focused API/UI regression checks).
- Targeted TypeScript check for the RepairCase detail screen, repair-case/replacement-assignment APIs, schema and messages with imported dependencies: passed.
- Targeted ESLint check for those five source files: passed.
- `git diff --check`: passed; Git reported line-ending normalization warnings in pre-existing modified files.
- No live mutation is sent; deployed role/API parity and browser rendering remain unverified.

**Gate result:** Phase 5 is **incomplete and unverified**. Owner acknowledgments can be submitted for return events already recorded by an authorized external workflow, but the UI cannot create the required return events or release the assignment without the approved evidence lifecycle. End-to-end closure and post-release role checks remain outstanding. Stop here before cross-phase verification.

## Cross-phase acceptance scenario

Using valid role sessions and a representative REPAIR case:

1. Owner submits/has a repair request; Admin or Moderator triages it and plans a replacement if one is not already planned.
2. Admin separately assigns the maintenance ticket to an active, email-verified Technician profile. A Moderator can triage and plan within creator scope, then sees the case awaiting Admin for ticket assignment. If the case already reports REPLACEMENT_PLANNED, the UI shows the replacement as already planned and does not create another replacement assignment.
3. An authorized actor records PRIMARY_COLLECTED; Owner acknowledges it; Admin/Moderator activates the assignment; an authorized actor records REPLACEMENT_DELIVERED; Owner acknowledges delivery.
4. The assigned Technician records diagnosis, completes any required cost review, starts work, and completes the repair with private evidence.
5. An authorized actor records REPLACEMENT_COLLECTED; Owner acknowledges it; an authorized actor records PRIMARY_RETURNED; Owner acknowledges it; a permitted actor releases the assignment.
6. Admin, Moderator, Owner, and Technician views show consistent API-backed timeline/statuses. The Technician view continues to show installation work orders independently from maintenance tickets, including partial loading/error states.

## Unverified assumptions and resolution

- **Live OpenAPI parity:** The private Swagger URL was unreachable. Repository contract evidence at `dolores_platform@e3316355b53b8839cfd61aa9664adf4f330fd3ed` was read locally. Runtime/deployed parity remains unverified; any newly observed difference blocks the affected later mutation.
- **Per-role permissions:** Screenshots name actors for several steps, but exact endpoint security and ownership rules still require current-contract confirmation, especially for cost review, release, and custody events.
- **Relationship identifiers:** Confirm where assignmentId, replacementMachineId, eventId, and ticketId are returned and how they map to a RepairCase before building action routes.
- **Evidence:** Confirm whether evidenceReference/evidenceReferences are pre-created references, uploaded through another endpoint, or supplied by an existing evidence service, and confirm which roles can read them.
- **Cost review:** Confirm required fields, statuses, review actor, dispute behavior, and emergency authorization source. Do not show cost approval as debt collection.
- **Maintenance-ticket scope:** The backend contract documents that GET /maintenance-tickets returns records only within the authenticated role's scope, including assigned Technician records; no client-side technicianId filter is used for authorization. Runtime behavior still needs a valid Technician session check.
- **Status vocabulary:** Confirm all current RepairCase, assignment, custody-event, and MaintenanceTicket status transitions from the service rather than treating frontend enums as authority.
- **Current task list:** Keep GET /installation-work-orders/assigned and GET /maintenance-tickets as separate concurrent queries; the latter is additive per the user prior instruction.

## Plan completion criteria

This plan is complete when each known user requirement maps to exactly one phase or the cross-phase acceptance scenario, architecture and UI/UX decisions are recorded, unresolved contract assumptions have explicit verification gates, every phase has entry/exit and stopping/review gates, and this artifact has been read back from its canonical workspace path.
