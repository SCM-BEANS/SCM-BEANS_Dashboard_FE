# Moderator API Integration Plan

## Status

- Plan status: paused at the user's request (Standard mode; TDD on).
- Current phase: Phase 1 — paused, implemented, and still unverified pending the required manual/authenticated browser check and a successful production build.
- Product code status: Phase 1 read integration is implemented; no later phase has started.
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

A Moderator-authorized session must be used for final end-to-end verification. Until the separate authentication work is complete, code-level verification can proceed, but authenticated browser verification remains blocked and must be reported as pending.

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
| Contracts | GET /contracts, documented contract detail/history/document reads | Preserve current detail routes only when the backend contract ID can be mapped safely. Owner-only expiry decisions are excluded from Moderator actions |
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

**Verification:** TypeScript and lint; schema tests or existing tests for changed response parsing; hook-level checks for query keys and error propagation; manual screen check with representative success, empty, loading, and failure responses. Authenticated browser check is pending the user's separate token fix.

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
6. **Authentication gate:** Use a valid Moderator session for final API verification. Until the user's separate authentication fix is complete, mark browser/API evidence pending; do not alter token handling here.
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
- Authenticated browser verification cannot be completed until the user's separately planned token fix is available.
- Financial, legal, global-catalog, work-order, and inventory effects require action-specific confirmation and verified backend semantics.

## Non-goals

- Changing login, token storage, refresh, or the current 401 behavior.
- Changing the 8082 Dolores proxy or routing API calls to port 4000.
- Changing Moderator role routing, global authorization guards, or the ADMIN user-management implementation.
- Adding backend endpoints or changing backend role policy.
- Redesigning Moderator navigation or replacing unrelated UI.
- Claiming unsupported demo workflows as connected APIs.

## Execution record

### Phase 1 — Moderator overview, alerts, and notifications reads

- **Status:** unverified. The code-level implementation, focused tests, type check, lint, and compile-mode build passed, but the phase cannot be marked complete because the planned manual screen check could not reach the Moderator UI without an authenticated session and the full production build failed during `.next` prerender output creation.
- **Implemented:** dashboard metrics and daily cup usage now use the shared Dolores dashboard query; alerts and notifications use their existing shared read APIs/hooks; unread count uses `GET /notifications/unread-count` with a typed schema and query hook; the three screens show loading, empty, retry, and API error states. No write action was added, and token/login/refresh code was not changed.
- **TDD:** added the unread-count/API/hook checks and Moderator dashboard render-state tests first; they failed before implementation for the missing behavior, then passed after implementation.
- **Automated evidence:**
  - `node --test tests/dolores-telemetry.test.cjs tests/dolores-phase6.test.cjs tests/dolores-notifications.test.cjs tests/dolores-locations.test.cjs tests/dolores-contracts.test.cjs tests/moderator-dashboard.test.cjs` — 22/22 passed.
  - `tsc --noEmit` — passed.
  - `npm run lint` — passed with 0 errors and 5 existing warnings in unrelated Digital Twin/MFA files; no warning in changed files.
  - `npm run build -- --experimental-build-mode compile` — passed and compiled the Moderator routes.
  - Full `npm run build` and `npm run build -- --webpack` — compilation/type checking completed, then prerender failed with `EPERM` while creating directories under `.next\server\app`; production build remains unverified.
  - `git diff --check` — passed; Git reported only working-copy LF-to-CRLF notices for changed files.
- **Browser evidence:** opened `http://localhost:3000/moderator`; the application redirected to `/login`. No Moderator session was available, no credentials were entered, and no authenticated Dolores request or write was attempted. The plan's authenticated browser verification remains pending the separate token fix. The component render tests cover representative API success, empty, loading, 401, and 403 states, but do not replace the planned manual browser check.
- **Review:** separate read-only review found no remaining material correctness or regression issue in the Phase 1 diff. The shared ADMIN dashboard component and API hook were not modified; the dashboard schema remains shared and unchanged.
- **Gate decision:** paused at the user's request. Phase 1 remains unverified; do not begin Phase 2 until resumed and the required browser check can run with a valid Moderator session and the production build failure is resolved or conclusively classified as an environment limitation.

