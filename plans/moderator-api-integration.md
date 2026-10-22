# Moderator API Integration Plan

## Status

- Plan status: active (Standard mode; TDD on).
- Current phase: Phase 5 is partial. The per-notification mark-as-read action is connected and automated checks pass; authenticated Moderator write verification remains pending. Phase 4 live invoice verification also remains pending backend access and a renewed browser session.
- Product code status: Phase 1 is complete. Phase 2 tenant and contract read integration is implemented but remains partial until a valid tenant and contract record can verify tenant-scoped contract and document metadata reads. Phase 3 read integration is implemented; populated machine, location, work-order, and telemetry scenarios remain unverified because the current environment has no records. Phase 4 is partial: invoice list/detail/proof GETs and global recipe reads are wired; buyback detail is wired by UUID while its list remains unavailable. The current backend denies Moderator invoice reads; the user plans to adjust that access. Phase 5 is partial: Moderator can mark individual unread operator notifications as read; remaining write candidates are gated by backend role policy, prerequisites, or missing live verification.
- Target repository: C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE
- Scope: integrate API-backed data and supported Moderator workflows into the existing Moderator area.
- User decisions recorded:
  - Reuse the existing Dolores API domain modules and data flow.
  - Deliver read-only screens first; implement mutations in later phases.
  - Preserve current routes and UI flows, showing clear loading, empty, error, and unavailable states.
- Explicit exclusion: token storage, login, refresh, and the current 401 issue. The user plans to fix authentication separately.

## Goal and completion criteria

Replace Moderator demo data with live Dolores data wherever the backend contract supports the existing screen and the canonical MODERATOR role. Keep the current navigation and presentation. Add write actions only after the corresponding read flows are verified and only when the documented endpoint semantics match the UI action.

The integration is complete when every in-scope Moderator screen has a recorded API mapping, supported reads use the shared Dolores client and typed query hooks, supported writes use typed mutations with appropriate user feedback and invalidation, and unsupported actions are explicitly unavailable instead of appearing to succeed against demo storage.

A Moderator-authorized session must be used for end-to-end verification. Phase 1 has been checked in the signed-in session available on 2026-10-22; each later phase must record its own role-appropriate browser evidence. Authentication implementation remains outside this plan.

## Decisions and alternatives

| Decision | Selected approach | Alternative considered | Reason |
|---|---|---|---|
| API architecture | Reuse the shared Dolores domain modules, schemas, client, and TanStack Query hooks; extend domain APIs additively | Create a separate Moderator client, adapter, or duplicate hooks | Keeps transport, errors, cache behavior, and DTOs consistent, while avoiding role-specific copies of shared API contracts |
| Rollout order | Integrate reads first, then mutations in later phases | Implement each page's reads and writes together | Makes it possible to check API data and identity mappings before any state-changing workflow is enabled |
| UI behavior | Preserve current routes and flow; expose loading, empty, error, and unsupported states in the existing UI | Redesign Moderator navigation or screens | The requested work is API integration, and the existing navigation is already established |
| Authorization | Use the backend's documented MODERATOR permission for each endpoint | Infer permission from route names, UI labels, ADMIN access, or the STAFF alias | The backend documents MODERATOR as the canonical global operator role; aliases and endpoint-specific restrictions must be checked rather than assumed |

## Repository and contract baseline

- The Moderator routes are under src/app/(moderator)/moderator.
- The primary screen implementation is src/app/(moderator)/moderator/_components/ModeratorDashboardScreens.tsx. It currently contains demo fixtures and demo-record read/write behavior.
- The app already has a Dolores transport in src/apis/dolores/client.ts, domain API modules in src/apis/dolores, schemas in src/schemas/dolores, and React Query hooks in src/hooks/dolores.
- The Next.js rewrite sends /api/dolores/v1 requests to the configured backend origin at port 8082. Keep this existing proxy and origin configuration. Do not point Moderator requests at the frontend server as an API or route them to port 4000.
- Existing domain modules likely relevant to this work include dashboard, notifications, alerts, tenants, contracts, billing, machines, locations, telemetry, and recipes. Extend these modules when needed rather than creating a parallel Moderator API stack.
- The current backend API reference identifies MODERATOR as a global operator role. STAFF is a compatibility alias only where explicitly included by the relevant endpoint's authorization rules.
- The report.md cross-service release-gate document is useful for route and scenario discovery, but it is not a per-screen Moderator authorization matrix.
- The backend API reference does not document a buyback collection/list endpoint. A live buyback list must not be fabricated from single-case endpoints.
- The current authentication failure is not evidence that a Moderator endpoint is absent or unauthorized. A 401 with a missing or invalid token is distinct from a 403 returned for a valid token whose role lacks permission.

Before implementation of each endpoint group, verify its current method, path, query parameters, request/response schema, required role, and side effects against the backend API reference and current OpenAPI or equivalent backend contract. Treat stale, missing, or contradictory contract data as a stop condition for that group.

## Shared implementation rules

- Keep the existing route paths, navigation, and visual patterns.
- Keep HTTP calls in src/apis/dolores domain modules, server-state orchestration in src/hooks/dolores, runtime validation in src/schemas/dolores where needed, and presentation in the existing Moderator screens or focused child components.
- Do not call Axios or fetch directly from a screen component.
- Use the existing Dolores request client and same-origin proxy; do not create a second base URL or client.
- Use TanStack Query keys that follow the existing Dolores hook conventions. Mutations must invalidate or update the smallest relevant query set.
- Preserve API errors and distinguish loading, empty, unauthenticated, forbidden, not found, validation, and server error states. Do not convert request failures into empty data or success notifications.
- Treat 401 as an authentication prerequisite/failure and 403 as a permission failure only when the response and session evidence support that distinction. Do not change login, token persistence, refresh, or auth interceptors in this plan.
- Map backend UUIDs and identifiers to UI routes explicitly. Never submit a display serial, tenant label, or fixture ID where the API expects a UUID.
- Do not assume that a MODERATOR may use an endpoint merely because the screen is visible to that role. Enforce the documented per-endpoint contract and keep unsupported actions unavailable with a clear explanation.
- Preserve the existing API response envelope and pagination conventions. Additive schema changes must remain compatible with existing ADMIN or other-role callers.
- Avoid broad changes to shared shells, authentication, role routing, or unrelated ADMIN pages.

## Screen-to-API discovery matrix

This matrix is a starting point from the current code and backend reference. Implementation must confirm exact endpoint paths, parameters, response shapes, and permission for each row before coding.

| Moderator surface | Read candidates | Initial treatment |
|---|---|---|
| Dashboard | GET /dashboard/overview | Reuse the existing shared dashboard API and hook; verify the MODERATOR/operator response variant and schema |
| Alerts and notifications | GET /alerts; GET /notifications; GET /notifications/unread-count | Read first. Alert acknowledgement and notification read actions are deferred to a mutation phase. The alerts endpoint's current documented role restriction is broad, so verify actual scoping and do not imply tenant or moderator filtering that the API does not provide |
| Customers and tenants | GET /tenants and any documented tenant detail/list endpoint | Use only the fields and scope returned by the backend. The current create-account UI is not evidence that Moderator can create an IDaaS or admin user |
| Contracts | GET /contracts/tenant/{tenantId}, GET /contracts/{id}, and documented contract document metadata reads; no GET /contracts collection | Build the list from the authorized tenant list and per-tenant contract reads. Preserve detail routes only for canonical UUIDs; owner-only expiry decisions are excluded |
| Machines and IoT | GET /machines, GET /locations, documented telemetry reads | Match current UI selection to backend IDs; verify query requirements and telemetry time ranges |
| Technical requests | Documented maintenance ticket, work-order, and schedule reads | Use the specific supported collection/detail endpoints. Do not treat a locally stored fixture as a server record |
| Invoices and reconciliation | GET /billing/invoices and documented invoice detail/proof reads | Display server status and amounts as returned; keep all payment, refund, deposit, and review writes deferred |
| Menu and recipes | Documented global recipe list/detail reads | Verify global scope and schema. Publish/delete/sync actions are deferred |
| Buyback | Documented single-case reads only if a case ID is available | The collection screen remains explicitly unavailable until a Moderator-authorized list endpoint is verified |

## Phased implementation

### Phase 1 — Moderator overview, alerts, and notifications reads

**Outcome:** The dashboard and notification/alert read surfaces use live server state while retaining current routes and layout.

**Scope:** Map the Moderator dashboard to the role-variant overview endpoint; connect alert and notification lists and unread count through existing Dolores APIs/hooks; add typed schema adjustments only when backend payloads require them; show loading, empty, error, and retry states.

**Out of scope:** Acknowledgements, mark-as-read, bulk read, alert filtering that the API does not support, auth changes, and dashboard redesign.

**Dependencies:** Existing Dolores dashboard, alert, and notification clients/hooks; verified backend contract and role matrix.

**Implementation boundary and affected components:** Extend src/apis/dolores/dashboard.api.ts and the existing alerts/notifications modules only where needed; reuse or extend their schemas and hooks. Update only the relevant sections of ModeratorDashboardScreens.tsx or focused components. Do not add a Moderator transport layer.

**Side effects:** Read-only GET requests; cache population only.

**Verification:** TypeScript and lint; schema tests or existing tests for changed response parsing; hook-level checks for query keys and error propagation; manual screen check with representative success, empty, and loading responses; automated checks cover representative API failure states. Record the authenticated Moderator browser check when a valid session is available.

**Acceptance:** No dashboard, alert, or notification list in this phase reports demo data as live; API errors remain visible; role-variant dashboard fields render without changing the ADMIN view; no mutation is sent.

**Entry gate:** Endpoint, operator payload, alert scoping, notification payload, and role behavior confirmed against current backend contract.

**Exit/review gate:** Read behavior and state handling reviewed; ADMIN shared dashboard behavior is unchanged; no unresolved identity or authorization assumption remains.

**Risks and stop conditions:** Alert GET may be authenticated without a Moderator-specific restriction and may not be scoped as users expect. Stop and revise the UI mapping if backend scope cannot safely support the current screen. Keep 401 verification pending until authentication is fixed; do not modify auth as a workaround.

### Phase 2 — Tenant and contract reads

**Outcome:** Customer/tenant and contract list/detail screens show server-backed records with reliable ID mapping.

**Scope:** Connect documented tenant and contract list/detail/history/document metadata reads that explicitly permit MODERATOR. Add pagination/query support and additive schemas as required. Keep existing routes when an API UUID can be associated with the route.

**Out of scope:** Create-user/account actions, contract activation, expiry decisions, termination, replacement, document upload, and other writes.

**Dependencies:** Phase 1 shared API conventions; backend contract confirms the collection filters, detail identifiers, and MODERATOR permissions.

**Implementation boundary and affected components:** Extend the existing tenants and contracts API modules, schemas, and hooks. Update current Moderator customer and contract views; do not change shared auth, global route guards, or the ADMIN account screen.

**Side effects:** Read-only GET requests and cache population.

**Verification:** TypeScript/lint; contract tests for DTO parsing and pagination; UI checks for loading, empty, error, detail-not-found, and stale/unknown route identifiers; verify that an ADMIN caller's existing contract behavior remains compatible.

**Acceptance:** Each displayed customer/contract record originates from an authorized API response; navigation uses the canonical API identifier; unsupported create or owner-only actions are clearly disabled/unavailable and cannot reach a mutation.

**Entry gate:** Exact endpoint authorization and ID semantics are verified. Any UI route that currently relies on a serial, customer name, or mock identifier has an explicit, safe mapping plan.

**Exit/review gate:** Read routes and query parameters are reviewed; shared schemas remain compatible; no write is enabled.

**Risks and stop conditions:** The UI may encode fixture IDs in nested routes. If a route cannot be mapped unambiguously to a backend record, preserve the page shell and show a not-found/unavailable state rather than guessing. Do not expose owner-only expiry decisions to Moderator.

### Phase 3 — Machines, locations, telemetry, and technical-request reads

**Implementation and verification record (2026-10-22):**

- Reused the shared machine, location, telemetry, tenant, and maintenance-ticket APIs/hooks. Added typed, tenant-scoped installation work-order list/detail reads and location detail reads; added response schemas for work-order summary, checklist, accessories, and evidence metadata. Machine timestamp schemas now accept the backend's `LocalDateTime` format as well as offset timestamps.
- Confirmed the read contract and Moderator scope in the current backend controllers/services for `GET /machines`, `GET /machines/{id}`, `GET /machines/{id}/maintenance-schedule`, `GET /locations?tenantId=...&activeOnly=false`, `GET /locations/{id}`, `GET /telemetry-query/machines/{machineId}/points?from=...&to=...&limit=...&offset=...`, `GET /maintenance-tickets`, `GET /installation-work-orders?tenantId=...`, and `GET /installation-work-orders/{workOrderId}`. The installation work-order list remains tenant-scoped; its detail returns evidence metadata only.
- Replaced Moderator machine, stock/customer, machine detail, IoT, technical-request, and machine-history fixtures with API-backed read states. Installation work orders link and load by canonical UUID. Machine location detail resolves by `locationId`; telemetry is queried only after selecting a machine whose detail says `SMART_IOT` and submitting a valid explicit date range. Queries are paginated at 100 points and do not poll.
- Kept machine-loan/substitute flows, legacy `S-018` and `YC-017` detail IDs, and request-creation routes unavailable because no matching Moderator read contract exists. Work-order evidence stays metadata-only. No operational write was added.
- Automated verification: `node --test` passed (49 tests), `npx tsc --noEmit` passed, and `npm run lint` passed with five warnings in unrelated digital-twin/MFA files. `git diff --check` passed with line-ending conversion warnings only.
- Authenticated browser verification: machine list, IoT, locations, and technical-request list returned empty arrays and showed their empty states. A valid-shaped but nonexistent machine UUID showed a 404 error state. Legacy `YC-017` showed the explicit unavailable state. The session redirected to login during verification and was restored with the user-provided Moderator account; the browser was returned to `/moderator/machines`.
- Data limitation: there are no machine, tenant, maintenance-ticket, or installation work-order records in the current environment, so populated list/detail responses and a successful telemetry-range request could not be verified in-browser. Automated tests cover UUID validation, tenant-scoped work-order reads, location detail mapping, range gating, pagination hooks, empty states, and API-error handling.

**Outcome:** Operational screens show live machines, locations, telemetry, maintenance, and work-order data where the backend exposes a compatible Moderator read endpoint.

**Scope:** Connect documented machine, location, telemetry, maintenance-ticket, schedule, and work-order list/detail reads. Add explicit filter/range inputs only where the current backend contract requires them. Preserve existing route structure.

**Out of scope:** Creating or assigning tickets, installation work orders, dispatch, status transitions, inventory updates, and any other operational writes.

**Dependencies:** Existing machine, location, telemetry clients/hooks; verified endpoint-specific role and tenant/query requirements; canonical ID mapping for current routes.

**Implementation boundary and affected components:** Extend src/apis/dolores/machines, locations, telemetry, and the relevant documented operations domain module, plus matching hooks/schemas. Update only Moderator operational screen sections and focused components.

**Side effects:** Read-only GET requests; telemetry polling only if an existing screen already requires freshness and an approved interval is defined. Do not introduce unbounded polling.

**Verification:** TypeScript/lint; focused tests for filters, time ranges, UUID mapping, and schema parsing; manual checks for stale/missing telemetry, empty lists, and server errors; check query cancellation/refresh behavior if existing hooks use it.

**Acceptance:** API requests use canonical IDs and documented filters; display-only identifiers never become request IDs; unsupported technical-request lists are marked unavailable; read failures do not look like a successful empty result.

**Entry gate:** Each operational collection and detail endpoint is confirmed in the backend contract, including required tenantId or date/range parameters and Moderator permission.

**Exit/review gate:** Machine and telemetry flows are reviewed for stale-data behavior and bounded request frequency; ADMIN/technician shared behavior remains unchanged; no write controls are active.

**Risks and stop conditions:** Current fixtures may use serial numbers while endpoints require UUIDs, or the backend may lack a compatible collection. Stop the affected screen mapping if there is no deterministic ID or documented list route. Do not invent a collection endpoint.

### Phase 4 — Invoice, recipe, and buyback reads

**Outcome:** Supported billing and recipe read screens use API data, and unsupported buyback list behavior is made explicit.

**Scope:** Connect documented invoice lists/details and proof reads available to MODERATOR; connect documented global recipe list/detail reads; assess buyback screen against the actual available contract and connect only case details with a real API case ID if documented and authorized.

**Out of scope:** Payment, status changes, proof approval/rejection, refunds, deposits, recipe publish/delete/sync, buyback creation or lifecycle writes, and inventing a buyback list endpoint.

**Dependencies:** Phases 1-3 conventions; exact billing/recipe/buyback authorization, schema, pagination, and ID contracts.

**Implementation boundary and affected components:** Extend the shared billing and recipes modules/hooks/schemas. For buyback, use an existing domain module only if a matching contract exists; otherwise do not create a client call for the absent list operation. Update the respective Moderator screen sections.

**Side effects:** Read-only GET requests and cache population.

**Verification:** TypeScript/lint; API schema and pagination tests; UI checks that invoice amounts/statuses and recipe fields come from server responses; confirm buyback list cannot falsely display persisted demo records as live.

**Acceptance:** Invoice and recipe reads match documented Moderator access; financial fields are rendered from server values; buyback list is explicitly unavailable unless a verified collection endpoint exists; no financial or publication mutation is triggered.

**Entry gate:** Backend contract confirms read access and response shape. Buyback collection support is verified or recorded as unavailable.

**Exit/review gate:** Billing and recipe reads reviewed for data meaning and compatibility with ADMIN callers; unsupported buyback behavior approved in code review; all mutations remain disabled.

**Risks and stop conditions:** Financial schemas may omit server fields or differ from fixtures. Additive schema changes must preserve the existing ADMIN contract. Stop on ambiguous amount, currency, or status semantics.

### Phase 5 — Low-risk operational mutations

**Outcome:** Enable only verified operational actions that match existing Moderator UI intent and have clear, bounded effects.

**Scope:** Candidate writes include notification mark-read/read-all, alert acknowledgement, maintenance ticket creation/assignment, installation work-order creation, and document upload, but only where the current UI has the same semantics and the backend explicitly grants MODERATOR access. This phase starts with a reviewed action-to-endpoint matrix; unsupported candidates remain disabled.

**Out of scope:** Contract activation/termination/replacement, billing/payment/refund/deposit operations, buyback lifecycle, recipe publication/deletion, auth work, and any new UI workflow that changes product behavior.

**Dependencies:** All relevant read phases accepted; each action's request schema, permission, state transition, and side effects confirmed; authenticated Moderator token available for end-to-end tests.

**Implementation boundary and affected components:** Add typed methods to existing Dolores domain modules and TanStack Query mutations. Update only the corresponding existing action handlers; remove demo-record writes for actions that become live. Ensure mutation errors are shown inline or in the established notification pattern, and invalidate only affected list/detail/unread queries.

**Side effects:** Server state changes: marking notifications read, acknowledging alerts, creating or assigning work, creating installation work orders, and uploading documents. Each action must use explicit confirmation where the current action is consequential, plus duplicate-submit protection and success/failure feedback.

**Verification:** Unit/integration checks for request payloads, invalidation, and error mapping; test that failed requests never produce success feedback; authenticated Moderator browser checks for each enabled write; verify role denial handling with a valid non-authorized account if available.

**Acceptance:** Each enabled action maps one-to-one to a documented endpoint and correct API ID; success reflects a confirmed server response; errors preserve user input where appropriate; no local demo write is presented as server success.

**Entry gate:** Read phase for that entity is accepted; API permissions and state transition are documented; user-visible action has a clearly bounded server effect; test environment and Moderator credentials are available.

**Exit/review gate:** Security/behavior review approves the action matrix; every enabled write passes authenticated verification; remaining unverified actions stay disabled.

**Risks and stop conditions:** The current UI may combine several server transitions under one button. Do not reproduce a multi-step state change without an explicit backend sequence and confirmation UX. A 401 blocks end-to-end evidence but is not a reason to change auth in this scope.

### Phase 6 — Recipe publication and catalog lifecycle

**Outcome:** Enable recipe publication, deletion, or sync actions only if their current UI meaning exactly matches the documented global recipe lifecycle and the operational consequences are understood.

**Scope:** Candidate global recipe publish/delete operations documented for MODERATOR; explicit state display, confirmation for destructive or externally visible actions, and server-driven refresh.

**Out of scope:** Any action whose current UI semantics do not match the endpoint; hidden bulk operations; auth changes; unrelated recipe redesign.

**Dependencies:** Recipe reads accepted; exact endpoint authorization, publication visibility, deletion reversibility, and audit behavior verified.

**Implementation boundary and affected components:** Extend the shared recipes API/hooks and the existing Moderator recipe screen. No separate Moderator client or backend change is included.

**Side effects:** Publication can change catalog availability; deletion may be destructive. Require a clear confirmation that names the selected recipe and resulting action; prevent duplicate submissions.

**Verification:** Request/response and cache invalidation tests; authenticated Moderator tests against a safe test recipe; verify resulting list/detail state and failure behavior.

**Acceptance:** Only the exact reviewed actions are enabled; published/deleted state is sourced from the server; no action reports success before server confirmation.

**Entry gate:** Backend semantics and test data are available, and product owner confirms the UI action corresponds to the server transition.

**Exit/review gate:** Mutation and consequence review is complete; authenticated evidence is recorded; unverified actions remain disabled.

**Risks and stop conditions:** A publish or delete endpoint can affect global catalog data. Stop if scope, reversibility, audit trail, or confirmation behavior is unclear.

### Phase 7 — Billing mutations

**Outcome:** Implement only explicitly authorized Moderator invoice/proof/deposit/payment workflows that exactly correspond to the existing UI and backend lifecycle.

**Scope:** Candidate payment, invoice status, payment-proof review, refund, or deposit operations only after a per-action matrix confirms endpoint role, allowed transitions, required reason/evidence, idempotency, and financial side effects.

**Out of scope:** Any workflow without exact API/UI semantic alignment; guessing a payment transition from a status label; backend changes; auth changes.

**Dependencies:** Phase 4 billing reads accepted; authoritative billing contract and a safe test environment; authenticated Moderator credentials; relevant finance/product approval for the user-facing transition.

**Implementation boundary and affected components:** Extend shared billing APIs, schemas, and hooks. Keep financial calculations server-sourced; do not compute authoritative balances or payment state in the screen.

**Side effects:** Financial records or payment state may change. Show amount, currency, target invoice/deposit, resulting transition, and any required reason before confirmation. Prevent duplicate submissions and surface reconciliation errors.

**Verification:** Payload/schema tests; idempotency and duplicate-submit checks where supported; authenticated tests against test records; verify before/after server state and audit fields.

**Acceptance:** Each enabled action has a documented Moderator permission and transition; server-confirmed results refresh affected records; no unsupported financial button remains active.

**Entry gate:** Endpoint and financial semantics are unambiguous; test environment and approval are available.

**Exit/review gate:** Finance/product and code review approve; all enabled writes have authenticated test evidence; unresolved actions stay disabled.

**Risks and stop conditions:** Wrong financial status, amount, or duplicate payment could create material impact. Stop immediately if endpoint semantics, idempotency, or authorization are ambiguous.

### Phase 8 — Contract and buyback lifecycle mutations

**Outcome:** Enable only Moderator contract or buyback lifecycle actions for which the backend contract, existing UI, and user confirmation are aligned.

**Scope:** Candidate contract activation, termination, replacement, or buyback create/payment/proof/collection/refurbishment/QA/cancel operations only where each transition is individually documented and permitted to MODERATOR. Connect buyback list only if a collection endpoint is subsequently verified.

**Out of scope:** Owner-only contract expiry decisions; unsupported buyback list calls; unverified transition sequences; any new legal/business workflow; auth changes.

**Dependencies:** Contract and buyback reads accepted where available; exact transition matrix and endpoint role verified; authenticated test data and explicit user-facing confirmation design.

**Implementation boundary and affected components:** Extend existing contracts or buyback domain modules/hooks; keep contract and buyback transitions explicit rather than deriving them from generic status strings; update only corresponding Moderator handlers.

**Side effects:** Contract actions may alter legal or operational state; buyback actions may trigger financial, collection, or inventory work. Require action-specific confirmation and preserve the server audit trail.

**Verification:** Per-transition request/response tests; authenticated Moderator end-to-end tests; verify resulting state and downstream list/detail refresh; prove owner-only actions cannot be sent by Moderator UI.

**Acceptance:** Each enabled transition has a contract entry, documented Moderator access, server state confirmation, and audit evidence; owner-only and unsupported actions remain unavailable; no fake status change is shown as success.

**Entry gate:** Exact transition and role matrix is signed off; API contract supports the sequence; test records and credentials are available.

**Exit/review gate:** Lifecycle/security review approves each action; end-to-end evidence is recorded; all uncertain transitions remain disabled.

**Risks and stop conditions:** Contract lifecycle has legal/operational consequences and buyback may span multiple services. Stop if the endpoint sequence, rollback behavior, or audit ownership is unclear.

## Cross-phase verification and release gates

1. **Contract gate:** Confirm method, path, role, parameters, response schema, error shape, and side effects for every endpoint before implementation.
2. **Architecture gate:** Keep transport in shared Dolores modules, query state in shared hooks, schema validation in shared schemas, and UI state in existing Moderator components.
3. **Identity gate:** Demonstrate deterministic mapping from UI record and route to canonical backend ID. No identifier guessing.
4. **Read gate:** Verify loading, empty, error, retry, pagination, filtering, and detail-not-found behavior before enabling writes for the same domain.
5. **Mutation gate:** Review action-to-endpoint mapping, authorization, confirmation, duplicate protection, server confirmation, and cache invalidation before enabling each write.
6. **Authentication gate:** Use a valid Moderator session for API verification. If one is unavailable for a phase, mark that phase's browser/API evidence pending; do not alter token handling here.
7. **Regression gate:** Run project lint/build and relevant tests for changed modules. Check shared ADMIN and other-role consumers for schema, cache, and routing regressions.
8. **Review gate:** Review every phase's diff before proceeding to the next phase. Stop on contract mismatch, role ambiguity, unsafe identity mapping, material UI scope expansion, or failed verification.
9. **Release gate:** Do not claim live Moderator integration for any screen/action without a successful request and response under the Moderator role. Document unsupported endpoints and pending authenticated verification.

## Assumptions and open risks

- The existing 8082 Dolores proxy is the intended backend for these Moderator APIs and remains the source of configuration.
- Moderator UI routes and visual flow should be preserved as they exist at implementation time.
- The backend API reference is a discovery baseline and may be stale; current OpenAPI or backend contract wins after verification.
- The canonical role name is MODERATOR. STAFF compatibility must be confirmed per endpoint and is not a frontend fallback.
- The API may not expose a Moderator-compatible endpoint for every demo surface. Unsupported routes/actions remain visibly unavailable until the contract exists.
- The current buyback list has no verified collection API in the inspected reference.
- Phase 1 was verified in an authenticated Moderator session on 2026-10-22; future read and mutation phases must record their own role-appropriate browser evidence.
- Financial, legal, global-catalog, work-order, and inventory effects require action-specific confirmation and verified backend semantics.

## Non-goals

- Changing login, token storage, refresh, or the current 401 behavior.
- Changing the 8082 Dolores proxy or routing API calls to port 4000.
- Changing Moderator role routing, global authorization guards, or the ADMIN user-management implementation.
- Adding backend endpoints or changing backend role policy.
- Redesigning Moderator navigation or replacing unrelated UI.
- Claiming unsupported demo workflows as connected APIs.

## Execution record

### Phase 1 — Moderator overview, alerts, and notifications reads (initial verification attempt)

- **Status at the time:** unverified; superseded by the authenticated resumed verification below.
- **Implemented:** dashboard metrics and daily cup usage now use the shared Dolores dashboard query; alerts and notifications use their existing shared read APIs/hooks; unread count uses `GET /notifications/unread-count` with a typed schema and query hook; the three screens show loading, empty, retry, and API error states. No write action was added, and token/login/refresh code was not changed.
- **TDD:** added the unread-count/API/hook checks and Moderator dashboard render-state tests first; they failed before implementation for the missing behavior, then passed after implementation.
- **Automated evidence:**
  - `node --test tests/dolores-telemetry.test.cjs tests/dolores-phase6.test.cjs tests/dolores-notifications.test.cjs tests/dolores-locations.test.cjs tests/dolores-contracts.test.cjs tests/moderator-dashboard.test.cjs` — 22/22 passed.
  - `tsc --noEmit` — passed.
  - `npm run lint` — passed with 0 errors and 5 existing warnings in unrelated Digital Twin/MFA files; no warning in changed files.
  - `npm run build -- --experimental-build-mode compile` — passed and compiled the Moderator routes.
  - Full `npm run build` and `npm run build -- --webpack` — compilation/type checking completed, then prerender failed with `EPERM` while creating directories under `.next\server\app`; production build remains unverified.
  - `git diff --check` — passed; Git reported only working-copy LF-to-CRLF notices for changed files.
- **Browser evidence at the time:** opened `http://localhost:3000/moderator`; the application redirected to `/login`. No Moderator session was available, no credentials were entered, and no authenticated Dolores request or write was attempted. Authenticated browser verification was pending then and was later completed in the signed-in session recorded below. The component render tests covered representative API success, empty, loading, 401, and 403 states.
- **Review:** separate read-only review found no remaining material correctness or regression issue in the Phase 1 diff. The shared ADMIN dashboard component and API hook were not modified; the dashboard schema remains shared and unchanged.
- **Gate decision at the time:** Phase 1 remained unverified. This decision was superseded after the user signed in and the production build completed successfully.

### Phase 1 — resumed verification (2026-10-22)

- **Status:** complete. Focused tests, TypeScript, lint, full production build, authenticated browser checks, and a fresh read-only review pass.
- **Mode/TDD:** Standard; TDD on. Live browser inspection found the shared shell still labeled the three API-backed Phase 1 routes as demo data. Added a narrow route-specific shell label correction and regression tests; unrelated Moderator routes and the Admin account label retain their existing text.
- **Automated evidence:**
  - `node --test tests/dolores-telemetry.test.cjs tests/dolores-phase6.test.cjs tests/dolores-notifications.test.cjs tests/dolores-locations.test.cjs tests/dolores-contracts.test.cjs tests/moderator-dashboard.test.cjs tests/moderator-shell-data-label.test.cjs` — 24/24 passed. The shell-label test failed before the correction and passes afterward.
  - `node_modules/.bin/tsc.cmd --noEmit` — passed.
  - `npm run lint` — passed with 0 errors and 5 warnings in unrelated Digital Twin/MFA files.
  - `npm run build` — passed after allowing network access for the Google Fonts requested by Next.js; TypeScript completed and all 35 static pages were generated.
- **Browser evidence:** in the user's signed-in Moderator session, `/moderator` returned the operator dashboard (`scope: OPERATOR`, seven-day usage period, 0-valued live metrics); `/moderator/notifications` returned unread count `0` and an empty notifications state; `/moderator/notifications/alerts` returned the API's empty alerts state and disclosed that the API does not scope alerts by tenant. All three showed `Dolores • Dữ liệu API`. Loading states were observed during requests; tests cover successful records, empty state, loading, retryable errors, and the distinction between 401 and 403. No credentials were entered by the agent and no write action was attempted.
- **Review:** a fresh read-only review confirmed the label branch is gated by the Moderator role and the exact three API-backed paths. It does not change Admin or unintegrated Moderator labels, API behavior, authentication, or route authorization. No unresolved Phase 1 correctness or regression issue remains.
- **Environment:** the first build attempt could not fetch Google Fonts; after network permission was granted, the full build passed. The pre-existing `.env` modification was preserved.
- **Gate decision:** Phase 1 is accepted and complete. Stop at this phase boundary under Standard mode; Phase 2 remains not started and requires a resumed run.

### Phase 2 — tenant and contract reads (2026-10-22)

- **Status:** partial. Implementation and automated checks pass. In the authenticated Moderator session, tenant list and contract list returned their expected empty states, and nonexistent UUID routes returned 404. No valid tenant/contract is available, so contract-by-tenant reads for a real tenant and document metadata for a real contract remain unverified. Phase 2 is not complete; Phase 3 has not started.
- **Mode/TDD:** Standard; TDD on. Added `tests/moderator-phase2.test.cjs` first; all seven initial cases failed against the existing demo-only screens/missing UUID hook, then the implementation was added and the tests passed.
- **Contract gate:** the supplied `report.md` confirms read-route happy cases but its 401 cases do not prove Moderator authorization. Current OpenAPI and backend source were checked directly. Verified reads are `GET /api/v1/tenants`, `GET /api/v1/tenants/{id}`, `GET /api/v1/contracts/tenant/{tenantId}`, `GET /api/v1/contracts/{id}`, and `GET /api/v1/contracts/{contractId}/documents`. There is no `GET /api/v1/contracts` collection and no pagination on the tenant contract list; the UI aggregates per-tenant results with the existing bounded request concurrency. Tenant list requires a global operator; tenant/contract/document reads permit the operator scope. Backend `SecurityCheckService` treats `ROLE_MODERATOR` as the compatibility alias accepted by `ADMIN/STAFF` checks, and `isGlobalOperator()` explicitly includes MODERATOR. Owner-only expiry decisions, mutations, upload, and downloads remain unavailable.
- **Implemented:** Moderator tenant list/detail now use the shared tenant hooks and render only API tenant fields. Contract lists use `/tenants` followed by `/contracts/tenant/{tenantId}`; details use canonical contract UUIDs and `/contracts/{id}`; details show read-only document metadata. Legacy fixture IDs stay routable but show an unavailable state without sending them to the API. New account/contract, expiry, and other contract write routes show an unavailable state and cannot reach a mutation. The new by-ID query hook and route matcher are additive; the existing ADMIN detail hook, API methods, and screens were not changed. The shared shell now labels only the API-backed Moderator lists and UUID detail routes as API data; unavailable write routes, fixture routes, unrelated Moderator pages, and the Admin account label retain their existing labels.
- **Automated evidence:**
  - `node --test tests/*.test.cjs` — 37/37 passed after the shell-label correction (executed through PowerShell file enumeration). The new route-label assertions failed before the correction and passed afterward.
  - `node_modules/.bin/tsc.cmd --noEmit` — passed.
  - `npm run lint` — passed with 0 errors and 5 existing warnings in unrelated Digital Twin/MFA files.
  - `npm run build` before the shell-label correction — passed; all 35 static pages generated and `/moderator/[...sections]` compiled. After the shell-label correction, a fresh build compiled and completed TypeScript, then prerendering failed on `/admin` with `EPERM` creating `.next\server\app\admin.segments\!KGFkbWluKQ`. The build failure occurred after application compilation; the final full production build is not confirmed.
  - `git diff --check` — passed; Git emitted only LF-to-CRLF working-copy notices.
- **Browser evidence — initial attempt:** opening `http://localhost:3000/moderator/contracts` first redirected to `/login`; this was superseded by the user's later signed-in session.
- **Browser evidence — resumed authenticated check:** `/moderator` remained in the Moderator operator area (`scope: OPERATOR`). `/moderator/customers` showed `Dolores • Dữ liệu API` and “Dolores hiện không trả về tenant nào.” `/moderator/contracts` showed `Dolores • Dữ liệu API` and “Không có tenant để truy vấn hợp đồng.” Nonexistent UUIDs on tenant and contract detail routes returned API-backed 404 states. Legacy `C-204` displayed the stale-fixture unavailable state; `/moderator/customers/new`, `/moderator/contracts/new`, and `/moderator/contracts/expiry` displayed unavailable states with no write action. With zero tenants and contracts, a valid per-tenant contract list, valid contract detail, and document metadata response could not be exercised. No write request was attempted.
- **Regression/review:** the shell-label correction is gated to the API-backed Moderator lists and canonical UUID detail paths. Unsupported write routes, stale fixture IDs, unrelated Moderator routes, and the Admin account label retain their existing labels. ADMIN contract behavior is unchanged; the shared contract hook change remains additive. No mutation is enabled.
- **Gate decision at that checkpoint:** Phase 2 remained partial because no valid tenant/contract records were available. The user later directed work to continue with Phase 3 and Phase 4, so those phases proceeded while Phase 2 tenant-scoped contract and document checks remain pending.

### Phase 4 — read integration and verification (2026-10-22)

- **Status:** partial. Read-only invoice, proof, global recipe, and UUID buyback detail integrations are implemented. Automated checks pass. The live Moderator invoice read remains pending because current backend code returns 403 for the global Moderator role, and the authenticated browser session expired during verification. The user plans to adjust backend access. No Phase 5 work was started in that Phase 4 run.
- **Mode/TDD:** Standard; TDD on. Added tests/moderator-phase4.test.cjs before implementation; the initial eight contract/UI cases failed because the new API/schema/screen behavior was absent. After adding the integrations and adapting the existing screen test loaders to mock the extracted modules, all Phase 4 tests pass.
- **Backend contract evidence:** BillingController.getAllInvoices() and getInvoice() allow ADMIN/STAFF to read globally; other roles require tenant context, so the current global Moderator receives 403. Payment proof list and content GETs are available to global operators including MODERATOR, but require invoice/proof IDs. RecipeController provides global list/detail GETs; publish/delete are writes and remain out of scope. BuybackController provides only GET /{caseId}, guarded by tenant access which permits global operators; it has no collection GET.
- **Implemented:** Moderator invoices now read the invoice list and UUID detail, render server amount/currency/status/period fields, and read proof metadata/content. Proof content is downloaded through a private GET; objectKey is omitted from the client schema. Global recipe list/detail screens use the existing shared recipes API/hooks. Buyback gets a UUID-validated detail API/schema/hook; the list is explicitly unavailable and old MB-* fixture IDs are never sent to Dolores. Unsupported write routes show unavailable states. No payment, proof-review, recipe, or buyback mutation was added.
- **Automated evidence:**
  - node --test tests/moderator-phase4.test.cjs — 9/9 passed.
  - node --test tests/*.test.cjs — 58/58 passed.
  - node_modules/.bin/tsc.cmd --noEmit — passed.
  - npm run lint — passed with 0 errors and 5 existing warnings in unrelated Digital Twin/MFA files.
  - git diff --check — passed; only working-copy LF-to-CRLF notices were reported.
  - Production build was not run for Phase 4; .next is shared with the running development server. The prior build record remains in Phase 1/2.
- **Browser evidence:** The signed-in Moderator session initially showed the machine list's API empty state. Navigating to /moderator/invoices redirected to /login, indicating the browser session had expired. No login automation or write request was performed. Live invoice/proof and recipe reads remain unverified in the browser; current backend source predicts invoice 403 until the user adjusts Moderator access.
- **Review:** Read-only review confirmed the new calls use the documented GET routes, canonical UUID validation, server-sourced display fields, and no fixture ID for API requests. Private proof object keys and buyback idempotency/correlation fields are not rendered. Dynamic routes were checked against the route catalog. No Phase 4 code-level blocker was found.
- **Gate decision at that Phase 4 checkpoint:** Phase 4 remained partial under Standard mode. The user later directed continuation to Phase 5; invoice/proof and recipe browser verification remains pending backend access and a renewed authenticated session. The buyback list stays unavailable until a collection endpoint exists.

### Phase 5 — low-risk operational mutations (2026-10-22)

- **Status:** partial. The Moderator notification list now supports marking one unread operator notification as read. Authenticated Moderator write verification remains pending because the browser session expired before this phase; no mutation was sent to Dolores.
- **Mode/TDD:** Standard; TDD on. Added a dashboard test for the unread-row action first. It failed because the notification screen did not use the existing mutation hook; after wiring the action, the focused test passed. A failure-state test confirms 403 does not produce success feedback and leaves the notification displayed as unread.
- **Action-to-endpoint review:**
  - **Enabled:** mark one notification read via POST /api/v1/notifications/{id}/read. NotificationController has a Moderator-specific path that only updates global operator notifications. The existing client method and mutation hook validate UUIDs and invalidate the notification list and unread count after a confirmed response.
  - **Deferred:** alert acknowledgement uses POST /api/v1/alerts/{id}/ack, but the controller describes admin/technician handling and has no explicit Moderator authorization; keep disabled pending a clear role contract.
  - **Deferred:** maintenance ticket create documentation mentions Moderator, but its controller operator check accepts ADMIN/STAFF only and its fallback requires tenant context; a global Moderator cannot pass this policy as currently implemented. Assignment explicitly accepts only ADMIN/STAFF.
  - **Deferred:** installation work-order creation requires the canonical Moderator role but also requires a DRAFT contract, an unarchived MAIN_CONTRACT reference copy, and matching machine/tenant IDs. Creation locks the contract, rejects duplicate open work orders, and has no idempotency replay. No valid records are available to verify this flow or its prerequisites.
  - **Deferred:** contract document upload creates a private legal reference artifact. There is no valid live contract in the current test session to verify the upload against; it remains unavailable pending contract records and authenticated verification.
  - No bulk read-all action was added; the screen has no corresponding existing action and a bulk change would affect all operator notifications.
- **Implemented:** each unread notification row has a Mark-as-read action. It calls the existing useMarkNotificationRead mutation, uses the API response plus query invalidation for the displayed read state, disables repeat submission while pending, and reports API errors inline. No optimistic success state or demo write was added.
- **Automated evidence:**
  - node --test tests/moderator-dashboard.test.cjs tests/dolores-notifications.test.cjs — 10/10 passed.
  - node --test tests/*.test.cjs — 60/60 passed.
  - node_modules/.bin/tsc.cmd --noEmit — passed.
  - npm run lint — passed with 0 errors and 5 existing warnings in unrelated Digital Twin/MFA files.
  - git diff --check — passed; only working-copy LF-to-CRLF notices were reported.
- **Browser evidence:** not run for a write. The earlier Moderator browser session had expired and no login or mutation was automated. The UI must be tested with an authenticated Moderator and a real unread notification before this action is accepted as live.
- **Resumed browser check (2026-10-22):** `/moderator/notifications` displayed an unread count of `0` and “Dolores hiện không trả về thông báo nào.” There was no unread notification row to exercise, so no POST was sent. Live write verification remains pending until a real unread notification is available.
- **Review:** Read-only review confirmed the action targets only an unread row's canonical notification UUID, uses the existing API method, invalidates only the notification query family, and preserves unread state when the mutation fails. Other candidate endpoints remain disabled where Moderator permission or safe preconditions are not established.
- **Gate decision:** Phase 5 remains partial under Standard mode. Verify one notification mark-as-read request and its updated server response in an authenticated Moderator session. Do not enable alert acknowledgement, maintenance writes, installation work-order creation, or document upload until their role and precondition gates are met. Stop at the Phase 5 boundary; do not start Phase 6 in this run.

### Phase 6 — entry-gate check only (2026-10-22)

- **Status:** not started. No recipe mutation was implemented or sent.
- **OpenAPI evidence:** `POST /api/v1/recipes/global` requires ADMIN or MODERATOR and publishes a recipe globally, automatically recompiling affected tenants' effective recipes. `DELETE /api/v1/recipes/global/{id}` requires ADMIN or MODERATOR and returns 204; the current contract does not describe deletion audit details or rollback/reversibility.
- **Browser evidence:** navigating to `/moderator/menu` redirected the current app tab to `/login`; no authenticated recipe read response or safe test recipe was available in this check.
- **Gate decision:** Phase 6 remains blocked at entry. Recipe reads have not been accepted with current authenticated evidence, there is no available safe test recipe, and deletion consequences need clarification before enabling it. Phase 5 live mark-as-read verification also remains pending because the notification list showed zero unread items.
