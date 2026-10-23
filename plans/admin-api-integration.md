# Admin Dolores API Integration Plan

  **Status:** Phases 5 and 6 implemented but unverified; Phases 1–4 remain unverified  
**Target repository:** SCM-BEANS_Dashboard_FE  
**Planning boundary:** This file is the only planned artifact. Do not implement application code until this plan is approved.

## 1. Goal

Connect supported Dolores platform APIs to the existing /admin experience while preserving its routes, page hierarchy, and user flows. Replace fixture-backed values with validated API data where the backend provides a compatible contract. Add explicit loading, empty, error, forbidden, and retry behavior. Token refresh/storage and broader authentication redesign remain out of scope. Role-based landing redirects and frontend route guards were separately authorized on 2026-10-20.

## 2. Decisions and constraints

- Keep the current Next.js App Router pages and components. Follow the QLS domain API pattern within this repository: src/apis/dolores/*.api.ts, a dedicated Axios client, Zod response schemas/types, and TanStack Query hooks. UI components call hooks, not Axios.
- Keep /api/v1 and its IDaaS destination/client unchanged. Add the isolated same-origin prefix /api/dolores/v1, rewritten by Next.js to the Dolores origin plus backend /api/v1.
- Configure the origin with server-side DOLORES_API_URL (example for local LAN development: http://192.168.1.125:8082). Do not expose it as NEXT_PUBLIC_*. The Next runtime must be on a network that can reach this private address. This plan does not provide production/Vercel connectivity to a private IP.
- Reuse the existing access-token cookie/token extraction path when present and send the Dolores Bearer token. Do not change credential exchange, MFA, refresh, token-storage, or auth-bypass behavior. Missing/expired tokens remain 401 states; forbidden calls remain 403 states.
- The backend is the authority for role authorization. Do not use DEVICE, PROFILE_SYNC, TeleParser, or other machine/internal credentials in browser requests.
- Preserve the admin-wide locations/contracts view by querying each tenant with a maximum of five concurrent requests. Keep per-tenant query identity, cancellation, partial results, and retry for failed tenants.
- Keep current screen layout and flows. Remove fake fixture fallback when a live request fails. A control without a compatible documented operation is clearly unavailable/disabled rather than simulated.
- Defer /admin/users: the references contain no public user CRUD API; PROFILE_SYNC is internal.
- Treat live /v3/api-docs as route/DTO authority, cross-checked against API_REFERENCE.md and API_REFERENCE (role).md. Bind exact paths, parameters, role scope, pagination and response shape from that evidence before coding each API module.
- No backend changes, deployment, account migration, test framework, or unrelated admin redesign is in scope.

## 3. Current repository boundaries

- Existing Next.js rewrite /api/v1/:path* serves IDaaS. Leave it intact.
- Existing Axios clients under src/lib/axios and authentication services remain the current auth implementation. Add a Dolores-specific client; do not repoint the shared client.
- TanStack Query is already installed through the root QueryProvider. Preserve its global policy unless a specific Dolores query needs a documented local override.
- Zod and shared schema conventions already exist. Reuse installed dependencies; do not add a generated OpenAPI client or another state library.
- Current /admin screens under src/app/(admin)/admin and components under src/components/dolores contain fixtures and simulated mutations. Keep their route structure and extract API calls into domain modules/hooks.
- Role-based frontend routing is tracked as a separate user-authorized change. It does not add a security boundary to API calls; the backend must continue enforcing each operation.

## 4. Route-to-API coverage

Paths below are endpoint families, not a substitute for confirming exact runtime OpenAPI names and DTOs. All backend paths are under /api/v1.

| Current FE route | Dolores data source | Planned behavior and limit |
| --- | --- | --- |
| /admin | GET /dashboard/overview | Bind supported summary metrics. No monthly revenue series exists in the documented dashboard aggregate; do not fabricate chart points. |
| /admin/businesses | tenants list/detail and documented onboarding operation | Replace tenant fixtures. Only wire a write action if the existing UI meaning matches its full backend effect. Onboarding creates a tenant, owner and draft contract; present that effect before submission. |
| /admin/stores | locations, queried with required tenantId | Query locations by tenant with bounded fan-out, partial failure and retry. Do not treat a tenant identifier as extra authorization. |
| /admin/contracts | contracts queried by tenant, plus documented detail/history/expiry/document operations | No global contracts endpoint exists. Preserve the combined list through tenant fan-out. Keep current contract screen read-only unless an existing action has an exact documented operation and role scope. |
| /admin/machines, /admin/machines/[machineId] | machines, GET /inventory/summary, maintenance and per-machine telemetry families | Use UUID as API identity and keep serial as display data. Convert list/detail links to UUIDs. The API has no bulk heartbeat/realtime stream; detail telemetry is per-machine latest data with manual refresh. |
| /admin/iot | machine state/heartbeat/points families | Show supported latest device status/points only. Do not send device credentials or imply streaming freshness. |
| /admin/notifications | notifications and alerts | Map documented list/detail/acknowledgment operations only where current controls match. Preserve backend authorization; some decisions are owner-only. |
| /admin/menu | global recipes list/detail and documented publish/delete | Use global recipe endpoints only. Do not call local recipe endpoints that lack tenant scoping/owner checks. Do not assume a recipe update or global menu/version API. |
| /admin/reports | dashboard aggregates and billing invoices | Use available aggregate metrics. Use invoices only if documented filters and pagination can prove the requested total is complete. No monthly series or supply/wastage legacy APIs. |
| /admin/users | none documented for public FE use | Deferred; retain route but do not connect demo user records to internal PROFILE_SYNC. |

## 5. Proposed code organization

- src/apis/dolores/: client.ts, dashboard.api.ts, tenants.api.ts, locations.api.ts, contracts.api.ts, machines.api.ts, telemetry.api.ts, notifications.api.ts, recipes.api.ts, billing.api.ts
- src/schemas/dolores/: Zod DTO/response schemas and inferred API types
- src/hooks/dolores/: Query/mutation hooks, keys, invalidation and fan-out
- src/components/dolores/: existing screens consume hooks and render view models
- next.config.js: add isolated Dolores rewrite, preserve IDaaS rewrite
- .env.example: document server-only DOLORES_API_URL if appropriate

Import direction: components/pages -> Dolores hooks -> API modules -> Dolores Axios client. Schemas/types are shared inward from the API boundary. Components do not import Axios clients or backend DTOs for ad-hoc parsing. Map validated API DTOs to screen view models at a stable boundary.

Query keys include tenant ID and resource UUID. Mutations invalidate only the affected resource and its relevant aggregate. Tenant fan-out must cap concurrency at five without adding a package unless an existing utility supports it. Abort/cancel requests when the owning query is cancelled.

## 6. Options considered

| Choice | Benefits | Costs/risks | Decision |
| --- | --- | --- | --- |
| Reuse current shared Axios client | Less setup | Couples Dolores to IDaaS base URL, interceptors and refresh assumptions; risks changing login behavior | Reject |
| Dedicated Dolores client plus domain modules | Clear base path, isolated auth/error behavior and typed schemas/hooks; follows selected QLS organization | Adds small domain boundary and typed schemas | Choose |
| Browser calls directly to private backend | Simple URL path | Requires CORS and each browser to share LAN; leaks deployment assumptions into client; Vercel cannot route to private IP | Reject |
| Same-origin Next rewrite | Avoids browser CORS and isolates backend origin | Next server must reach backend; production private routing is not solved | Choose for LAN/local integration |
| Replace platform-wide lists with tenant picker | Avoids fan-out | Changes requested admin-wide UI workflow | Reject |
| Query tenants concurrently | Preserves current platform-wide UI | Load and partial-error management required | Choose with concurrency 5 |
| Keep fixture fallback on errors | UI appears populated | Misrepresents backend state and hides failures | Reject |
| Defer undocumented screen operations | Honest UI contract | Some current demo controls cannot be enabled | Choose |

## 7. Implementation phases

### Phase 1 — Dolores transport and API foundation

**Outcome:** A typed, isolated Dolores request path is available to admin hooks.  
**Scope:** Add server-only origin configuration/example; add the /api/dolores/v1/:path* rewrite to backend /api/v1/:path*; add dedicated Axios client, shared error mapping, Zod/schema conventions, API/query-key conventions and documented OpenAPI route matrix. Forward only the existing Bearer access token; preserve the IDaaS rewrite/client.  
**Non-scope:** Login, token refresh/storage changes, backend edits, deployment, or changing /api/v1.  
**Dependencies and boundary:** Uses existing Next config, Axios, Zod and QueryProvider. Pages/components must not call Axios.  
**Side effects:** Local requests traverse the Next server and then the LAN backend. No data mutation in this phase.  
**Verification:** Inspect rewrite expansion for a representative path; confirm the Next runtime can reach the configured origin; inspect request headers to ensure only the intended Bearer token is used; check 401/403/network errors map to explicit states. Run existing lint/build only during later implementation, not while planning.  
**Acceptance:** Dolores requests use only /api/dolores/v1; existing IDaaS requests still use /api/v1; no secret origin is exposed to browser configuration; exact endpoint matrix cites runtime contracts and role scope.  
**Entry/exit:** Entry requires approved plan and a usable access-token path. Exit requires a successful authenticated read smoke call and no regression to IDaaS path behavior.  
**Risk/stop:** Stop if the Next runtime cannot reach the LAN backend, the token cannot be safely forwarded, or deployed runtime is expected to access the private IP. Resolve network/auth ownership before proceeding.  
**Review gate:** Review rewrite path isolation, secret handling, error normalization, schema boundary and absence of auth-flow changes.

### Phase 2 — Admin overview, businesses and stores

**Outcome:** Overview and tenant/location pages display supported live data while preserving their present navigation and layout.  
**Scope:** Dashboard overview query; tenant list/detail and only matching documented tenant operations; per-tenant location query with concurrency limit five, partial errors and failed-tenant retry; replace fixture values and simulated mutations for supported operations; loading/empty/error/forbidden/retry states.  
**Non-scope:** Monthly revenue series, global locations endpoint assumptions, generic user creation, or onboarding without an explicit matching existing flow.  
**Dependencies and boundary:** Phase 1. Tenant and location API schemas/hooks own requests and DTO validation; screens consume view models.  
**Side effects:** Tenant onboarding is a compound write creating tenant, owner and draft contract. Show this full effect before confirmation; no automatic submission or fixture-backed success.  
**Verification:** Check empty, populated, partial-tenant failure, retry, 401 and 403 behavior; verify tenant IDs are present in location requests and tenant query keys; verify dashboard unsupported chart data is absent or clearly unavailable.  
**Acceptance:** No supported overview/business/store field depends on fixtures; no chart invents unsupported time series; locations remain platform-wide with no more than five concurrent tenant requests; retries target failed tenants only.  
**Entry/exit:** Entry requires Phase 1 exit and endpoint/role/DTO confirmation. Exit requires user-visible partial state and any onboarding action reviewed against its compound side effect.  
**Risk/stop:** Stop a write integration if the current form semantics differ from backend onboarding, role scope is insufficient, or pagination/filtering cannot cover the expected list.  
**Review gate:** Review tenant isolation in query keys, aggregate completeness, write confirmation, and fixture removal.

### Phase 3 — Machines and IoT

**Outcome:** Machine inventory, detail and IoT views use supported machine, inventory, maintenance and telemetry data.  
**Scope:** Machine list/detail, inventory summary, maintenance records and per-machine latest heartbeat/points; convert internal links/selection from demo serial identifiers to UUID API identifiers while retaining the dynamic route shape; add refresh and states.  
**Non-scope:** Device credentials, bulk heartbeat, WebSocket/realtime claims, machine wastage, legacy supply, serial-to-UUID lookup, or fake live readings.  
**Dependencies and boundary:** Phase 1. API schemas validate UUID identity and per-machine response shapes; telemetry queries are separately keyed by machine UUID.  
**Side effects:** Read-only data requests; do not introduce device-command mutations.  
**Verification:** Check UUID list/detail navigation, empty/unknown UUID, partial telemetry absence, stale/latest timestamp display, manual retry and API error states. Verify no fixture serial is sent as a UUID.  
**Acceptance:** List-to-detail navigation uses returned UUIDs; serial remains display-only; telemetry labels match backend freshness semantics and never imply streaming.  
**Entry/exit:** Entry requires Phase 1 exit and confirmed machine/telemetry role scopes. Exit requires representative list/detail/telemetry calls validated against OpenAPI.  
**Risk/stop:** Stop if existing routes are externally bookmarked with serial IDs and no migration/lookup strategy is agreed, or if freshness timestamps cannot support the UI label.  
**Review gate:** Review identity conversion, data freshness wording, polling/request volume and absence of internal credentials.

### Phase 4 — Contracts

**Outcome:** The contracts page shows a complete, authorized platform-wide view assembled from tenant-scoped APIs.  
**Scope:** Tenant-by-tenant contracts list, documented detail/history/expiry/document reads; concurrency capped at five; partial failures and per-tenant retry; preserve read-only current flow.  
**Non-scope:** Invented global contract endpoint, contract lifecycle mutation, owner-only expiry decisions from a platform admin screen, or undocumented upload role assumptions.  
**Dependencies and boundary:** Phase 1 and tenant list from Phase 2. Contract query identity includes tenant and contract ID.  
**Side effects:** Read requests only. Document access must continue through documented role checks; do not cache sensitive content longer than the existing query lifecycle.  
**Verification:** Check tenant scoping, pagination completeness, partial failure, forbidden tenant, detail/history and document error paths; confirm combined totals count only complete pages.  
**Acceptance:** Combined list is per-tenant and bounded; source tenant is retained on every row/action; no unsupported global write appears.  
**Entry/exit:** Entry requires tenant query capability and confirmed endpoint role scopes. Exit requires documented completeness behavior and review of sensitive document access.  
**Risk/stop:** Stop if pagination cannot produce a complete platform list or if ADMIN/MODERATOR scopes differ from the current UI assumptions.  
**Review gate:** Review tenant-scoped authorization, aggregation completeness, document handling and mutation absence.

### Phase 5 — Notifications and alerts

**Outcome:** Notification and alert pages show live, role-authorized data and supported actions.  
**Scope:** Documented notification/alert list and detail; wire acknowledgment or other existing controls only where a matching operation and role permission are documented; add request/error states and precise action feedback.  
**Non-scope:** Owner-only expiry decisions in generic admin controls, invented bulk actions, or local simulated acknowledgments.  
**Dependencies and boundary:** Phase 1. Domain hooks own keys, action mutations and precise invalidation.  
**Side effects:** Acknowledgment or action endpoints mutate backend records. Confirm action meaning, scope and success response against the current control before enabling it.  
**Verification:** Check list/detail, empty states, role-based 403, retry and action success/failure; verify cache invalidation updates only relevant notifications/alerts.  
**Acceptance:** Every enabled action maps to one documented endpoint and compatible role; a failed mutation never appears successful.  
**Entry/exit:** Entry requires verified routes/roles. Exit requires action mapping and state transitions reviewed.  
**Risk/stop:** Stop an action if API semantics, role, or irreversible effect is unclear.  
**Review gate:** Review mutation semantics, error feedback and role boundaries.

### Phase 6 — Menu and reports

**Outcome:** Menu and report views use supported global recipes, dashboard aggregates and complete invoice data where available.  
**Scope:** Global recipe list/detail and documented publish/delete only when current controls match; dashboard/billing summary; invoice-backed totals only if filters and pagination prove completeness; explicit unsupported state for unavailable metrics.  
**Non-scope:** Local recipe APIs without tenant scoping/owner checks, assumed recipe update/menu-version APIs, fabricated financial time series, and legacy supply/wastage endpoints.  
**Dependencies and boundary:** Phase 1. Recipe and billing schemas/hooks are separate; mutations invalidate recipe detail/list. Reports use only aggregate or complete invoice evidence.  
**Side effects:** Publish/delete changes catalog state. Keep each operation behind a review of role, confirmation and exact API effect; no fake mutation fallback.  
**Verification:** Check recipe role errors, publish/delete response and invalidation; validate invoice completeness across pages/filters; verify absent monthly metrics do not render invented values.  
**Acceptance:** Only documented recipe operations are exposed; all report numbers have a documented source and completeness rule; unsupported metrics are explicitly unavailable.  
**Entry/exit:** Entry requires confirmed runtime DTOs and role scopes. Exit requires catalog write actions reviewed and report calculation evidence recorded.  
**Risk/stop:** Stop publishing/deleting if current UI intent or response semantics differ; stop invoice aggregation if full-set completeness is unprovable.  
**Review gate:** Review recipe mutation confirmation, invoice aggregation and provenance of every report field.

## 8. Deferred scope

- /admin/users: no public user CRUD contract is documented; keep demo data clearly non-authoritative or disable its data actions pending an approved API contract. Do not use internal PROFILE_SYNC.
- Token refresh/storage and broader authentication redesign. Separately authorized role routing does not replace backend role checks.
- Production hosting/network configuration to reach the private Dolores host.
- Backend contract changes, realtime/WebSocket support, global contract/location endpoints, monthly revenue series, tenant-wide device telemetry, and legacy supply/wastage replacement.

## 9. Cross-phase acceptance and verification

- All Dolores network calls are under the isolated same-origin prefix and use typed API modules and Zod-validated response boundaries.
- The existing IDaaS /api/v1 behavior, credential exchange, MFA and refresh flow remain unchanged. Role-based routing is the separately authorized exception for post-login navigation.
- Admin components use hooks only; fixture fallback and simulated success are removed wherever a live contract replaces them.
- Loading, empty, error, 401, 403 and retry behavior is explicit; partial tenant fan-out identifies and retries failed tenant results.
- Every write is tied to a documented operation, role and visible effect. No unsupported write is exposed.
- Verify with existing npm run lint, npm run build and a manual browser smoke against a reachable LAN backend after implementation. Do not add or run a test suite as part of this planning task. Capture representative requests/responses with tokens redacted; never record secrets.
- Review each phase before moving to the next; stop on contract mismatch, network reachability failure, authorization mismatch, incomplete pagination or a material UI behavior change.

## 10. Approval gate

This plan is ready for review. Approval authorizes implementation in the listed FE scope, phase by phase. Any new backend endpoint, authentication change, production network route, or deferred user-management behavior requires a revised scope decision before implementation.

## 11. Implementation progress (updated 2026-10-21)

| Phase | Status | Evidence and remaining gate |
| --- | --- | --- |
| 1 — Transport and foundation | Unverified | Rewrite, client, schema and dashboard hook are implemented; lint, type check and build pass. Authenticated admin read through the browser remains unavailable because the browser origin permission for localhost:3000 was declined. |
| 2 — Overview, businesses and stores | Unverified | Live API modules/hooks and screens are implemented; three focused location tests, type check, lint and build pass. Authenticated 200/401/403 UI states and the actual location response envelope still need browser verification. OpenAPI currently describes the location 200 response only as `object`. Store creation and account onboarding controls stay disabled because the existing forms do not match documented write semantics. |
| 3 — Machines and IoT | Implemented, unverified | OpenAPI confirmed machine inventory/detail, inventory summary, maintenance tickets/schedule, and latest heartbeat DTOs. Added schemas, API methods and UUID-keyed React Query hooks; replaced admin machine/IoT fixtures with API-backed screens; detail links use machine UUIDs and heartbeat is queried only for a confirmed `SMART_IOT` machine. Internal contract-screen links that used demo serials now open the machine list. Backend source at `C:\GitHub\BEANS\dolores_platform` confirms `TelemetryPoint(timestamp, field, value, tenantId, machineId, subState)` and the points route returns a list; added a Zod schema, Dolores API module, machine/range-keyed infinite query, and manually requested date-range table. Verification: `node --test` passed 5 tests; `npx tsc --noEmit` passed after fixing a JSX fragment and missing `DoloresApiError` import; `npm run lint` passed with 0 errors and 5 pre-existing warnings. Browser acceptance for `http://localhost:3000` was blocked by the saved Edge origin permission. The user later asked to skip this browser test and report issues if encountered; authenticated UI/live API behavior remains unverified. Build was skipped while the dev server was active on port 3000 using the shared `.next` directory. The release report's `200`/`null` evidence still needs live comparison with the source contract. Keep Phase 3 unverified until those browser and live-response checks pass. |
| 4 — Contracts | Implemented, unverified | `ContractController` and DTO source confirm `GET /contracts/tenant/{tenantId}` returns an unpaged list for `ADMIN`/`STAFF`; detail/history are read-only; expiry status and document reads have separate role/scope checks. Added Zod schemas, read-only API methods for tenant list/detail/machine history/expiry/document metadata/download, React Query hooks keyed by tenant and resource UUID, and tenant fan-out through a shared concurrency limiter capped at five. Responses are rejected if tenant/contract/machine/document scope does not match the requested resource. Replaced contract fixtures with API-backed list/detail/history/expiry/document states, retaining tenant identity in rows and URL navigation. No contract lifecycle, expiry-decision, upload, or archive writes are exposed. Verification: `node --test` passed 7 tests, including API route/scope, contract schema, fan-out limit and cancellation; `npx tsc --noEmit` passed; `npm run lint` passed with 0 errors and 5 pre-existing warnings. Manual browser/live authorization and response checks were skipped at the user's request; build was skipped because dev server PID 22312 was listening on port 3000 and shares `.next`. Pagination is complete at source because this endpoint returns a full list, but live completeness, 403 behavior and document download remain unverified. |
| 5 — Notifications and alerts | Implemented, unverified | Live OpenAPI returned 200 and confirmed `GET /notifications`, `POST /notifications/{id}/read`, and `GET /alerts`, with DTO fields matching the FE schemas. Backend controller/source review confirms tenant-scoped notification reads and single-read writes; alerts remain platform-wide behind JWT with no additional backend role check. No dedicated notification detail route is documented, so the full message is shown in each list row. The UI has loading/empty/error/retry states and one documented single-read action; successful reads invalidate only the notifications query namespace and failed writes do not optimistically change the row. Alerts are read-only in the UI. On 2026-10-21, `node --test tests/*.test.cjs` passed 9/9, `npx tsc --noEmit --incremental false` passed, and lint passed with 0 errors and 5 existing warnings. `npm run build` passed on retry after one transient `.next` prerender `EPERM`; the earlier font-download failure was resolved after network access was granted. Unauthenticated live GET requests to backend `/api/v1/notifications` and `/api/v1/alerts` returned 401. A Next production smoke test on port 3100 confirmed both `/api/dolores/v1/*` rewrite paths return 401 without JWT and `/admin/notifications` redirects 307 to `/login`. Edge tab access is still denied by Browser Use, so authenticated 200/403 data, rendered browser states, and real mark-read success/failure remain unverified. |
| 6 — Menu and reports | Implemented, unverified | Runtime OpenAPI confirmed global recipe list/detail/publish and dashboard/invoice DTOs; invoice listing is an unpaged full collection. Added recipe and billing schemas/APIs/hooks, range-keyed dashboard requests, API-backed recipe list/detail/publish flow, rental invoice list, dashboard aggregate cards and explicit unavailable states for monthly revenue and supply/wastage. `node --test tests/*.test.cjs` passed 15/15, `npx tsc --noEmit --incremental false` passed, and lint passed with 0 errors and 5 existing warnings. A production build passed once; a later run after dialog updates compiled and type-checked but hit Windows `EPERM` while prerendering the unrelated `/assembly` route under `.next`. Authenticated role/error UI, rendered browser behavior, and live recipe publish remain unverified because Edge tab access is still denied; no system-wide recipe mutation was sent. |

Phases 1–4 remain unverified. The user explicitly requested Phase 3 implementation before running tests; this did not waive its verification or review gates. On 2026-10-20 the user asked to defer Phase 3's browser check and explicitly directed moving to Phase 4. On 2026-10-21 the user directed continuing with Phase 5 while those verification gates were still open. Proceeding did not change the acceptance criteria or status of earlier phases. Phases 5 and 6 also remain unverified until their browser/authenticated UI checks are run.

**Resume note (2026-10-20):** The server's OpenAPI endpoint is reachable. Before editing, the current App Router refactor was re-read and preserved; implementation was applied to the new route-local admin components and shared Dolores API structure. Do not treat Phase 3 as verified until the deferred tests and authenticated UI checks are run. Do not treat Phases 1 or 2 as verified.

**Phase 5 note (2026-10-21):** No authenticated endpoint or mutation was called during implementation. The live OpenAPI read verified the notification and alert routes/DTOs. Alerts are displayed only in the `/admin/notifications` page, but the backend alert API itself has no additional role check and is platform-wide; retain this as a backend access-control limitation. Do not mark Phase 5 verified until authenticated role/error and browser behavior are checked.

**Phase 6 note (2026-10-21):** The live OpenAPI read confirmed recipe DTO fields and publish validators, dashboard date parameters and metrics, and the full unpaged invoice collection; OpenAPI leaves invoice `currency` unconstrained beyond string. No authenticated endpoint or global recipe mutation was called. The menu screen exposes list/detail and publish only; legacy edit and per-machine send routes show unsupported states. Publish confirmation describes server-wide recipe recompilation and sync and uses a native keyboard-operable dialog. Reports use backend dashboard financial/operational aggregates and show the complete rental invoice collection without recalculating totals; monthly revenue and supply/wastage are explicitly unavailable. `node --test tests/*.test.cjs` passed 15/15, `npx tsc --noEmit --incremental false` passed, and lint passed with 0 errors and 5 pre-existing warnings. One production build completed; a later build compiled and type-checked but Windows returned `EPERM` while prerendering `/assembly` under `.next`. Keep Phase 6 unverified until authenticated role/error states and browser behavior are checked and report/calculation evidence is collected.

**Separate scope amendment (2026-10-20):** The user authorized role-based routing after login and frontend guards for `/admin`, `/moderator`, `/technician`, and `/dashboard`. The FE maps ADMIN → `/admin`, MODERATOR/STAFF → `/moderator`, TECHNICIAN → `/technician`, and OWNER → `/dashboard`. This does not change verification status of API integration phases and does not replace backend authorization.
