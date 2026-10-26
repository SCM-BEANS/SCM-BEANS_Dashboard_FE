# Owner and Technician Port from Ni

**Status:** Decision-complete plan; implementation has not started  
**Target workspace:** `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`  
**Target branch:** `ref`  
**Source branch:** `origin/Ni`  
**Scope:** Port the complete Customer/Owner and Technician route experiences from Ni, using the target repository architecture and only verified API contracts.

## 1. Approved objective and boundaries

Recreate the complete Ni Customer/Owner (`/dashboard`) and Technician (`/technician`) experiences in this repository. Preserve Ni's information hierarchy, visual direction, and interaction intent while rebuilding the screens for this project's Next.js Pages Router, role shell, API, schema, routing, text, and component conventions.

The Owner role in this application is represented by the `owner` IDaaS role. The Technician role is `technician`. The UI must not use Ni's sample records or `demoFlowStore` as application data. A route may use an API only when its response shape and authorization scope are established. An action without a supported API remains visible in the Ni-inspired layout but disabled with an explanatory state; it must not report a simulated success.

The plan includes `/dashboard/notifications` and `/technician/notifications` because they are part of the selected Ni route scope. It does not change the existing `/admin/notifications` or `/moderator/notifications` pages.

### Confirmed decisions

| Decision | Selected direction |
| --- | --- |
| Role mapping and route coverage | Customer/Owner maps to role `owner` at `/dashboard`; Tech maps to `technician` at `/technician`; include all Ni routes for both roles. |
| Code architecture | Follow the current repository: Next.js Pages Router under `src/pages`; APIs under `src/apis`; Zod contracts under `src/schema`; route constants/catalog under `src/routes`; text under `src/text`; React Query for server state. |
| UI/UX | Preserve Ni's layouts and workflows, reimplemented in the current repository structure and responsive conventions. |
| Data and unsupported actions | Use only verified API contracts. Disable an action or show an unavailable state when the API or authorization scope is missing. Do not persist demo state in `localStorage`. |
| Backend scope | This is a frontend plan. Do not add backend endpoints or infer API behavior. Missing contracts are stopping gates for enabling affected reads or writes. |

## 2. Workspace and source facts inspected

### Target repository

- `PROJECT-STRUCTURE.md` and `MIGRATION_WORKFLOW.md` describe the current source layout and require migration by responsibility rather than copying the source tree. They identify `rules.md` as older App Router guidance; the actual project uses Pages Router.
- `next.config.js` sets `pageExtensions` to `*.page.tsx`, `*.page.ts`, `*.page.jsx`, and `*.page.js`. Current moderator routing uses `src/pages/moderator/[[...sections]].page.tsx`, a route catalog, lazy-loaded screens, and a role shell.
- Runtime stack: Next.js 16, React 19, TypeScript 5, TanStack Query 5, Axios, and Zod. `tsconfig.json` is strict and maps `@/*` to `src/*`.
- `src/pages/_app.page.tsx` creates the application QueryClient. Query defaults include a 30-second stale time, no retry, and no refetch on window focus.
- `src/lib/http.ts` attaches the browser access token and refreshes the session. Dolores requests use `/api/dolores/v1`, rewritten by `next.config.js` to `DOLORES_API_URL`. IDaaS uses the Next API proxy under `src/pages/api/v1`. `vercel.json` uses the standard Next build output; no backend source or deployment service is part of this workspace.
- Shared target UI includes `Sidebar`, `ButtonBar`, `AdminActionBar`, and `DataTable`. Moderator shell patterns include role guarding, responsive navigation, route metadata, and page-level CSS Modules.
- The current IDaaS UI role schema includes `owner`, `technician`, and `moderator`. `src/lib/auth-role.ts` currently recognizes only `ADMIN` and `MODERATOR`; `getPostLoginPath` sends other roles to the home page.
- The working tree already contains local notification-dialog changes from the preceding task. Those files are outside this plan's implementation scope and must remain untouched during planning.

### API and identity evidence

Existing frontend API modules include tenants, contracts, machines, billing, recipes, notifications, buybacks, and installation work orders. Relevant current methods include:

- `contractsApi.listByTenant(tenantId)` and contract detail methods;
- `machinesApi.list`, `getById`, maintenance schedule, and maintenance ticket listing;
- invoice listing/detail and payment-proof reads in `billingApi`;
- global recipe reads in `recipesApi`;
- notification and unread-count reads in `notificationsApi`;
- `installationWorkOrdersApi.listByTenant` and `getById`.

The inspected frontend does not expose an Owner “current profile/tenant” lookup, a Technician-assigned-task query, a Technician job-result/checklist submission API, or Customer payment/support/buyback request mutations. Existing list methods must not be assumed to filter results safely for the current role unless that scope is established. There is no backend source here to extend or inspect.

Current Zod schemas generally require UUID identifiers for tenants, machines, contracts, invoices, buybacks, and installation work orders. Ni's IDs such as `C-204`, `S-018`, `YC-017`, and `MB-017` are prototype fixtures and must not be hardcoded into production data flows or used to relax current schemas without an API contract.

### Ni source

- Ni uses Next.js App Router route groups under `src/app/(dashboard)` and `src/app/(technician)`, plus combined UI modules under `src/components/dolores`.
- Customer routes cover overview; contracts; machines and machine history/model; invoices; menu; support; buyback; and notifications.
- Technician routes cover the task list/detail; standard handover, Smart activation, repair, retrieval, substitute, substitute return, refurbishment, buyback assessment, and maintenance-history forms; machine history; and notifications.
- Ni's forms and cross-role workflow state use `localStorage` through `demoFlowStore`. These records are demonstrations, not confirmed production API contracts.

### Exact route coverage to port

The selected source surface is the Customer experience rooted at `/dashboard` and the Technician experience rooted at `/technician`. Preserve every destination in these route families, but replace Ni fixture identifiers with validated server identifiers or route parameters; the example IDs below describe source coverage only and must not be shipped as production records.

| Role | Route families from `origin/Ni` |
| --- | --- |
| Owner/Customer | `/dashboard` overview; `/dashboard/contracts`, `/dashboard/contracts/:contractId`, `/dashboard/contracts/new`, `/dashboard/contracts/expiry`, `/dashboard/contracts/end-early`, `/dashboard/contracts/end`, `/dashboard/contracts/deposit-complete`; `/dashboard/machines`, `/dashboard/machines/:machineId`, `/dashboard/machines/:machineId/model`, `/dashboard/machines/substitute`, `/dashboard/machines/history`; `/dashboard/invoices`, `/dashboard/invoices/:invoiceId`, `/dashboard/invoices/payment`, `/dashboard/invoices/shortfall`, `/dashboard/invoices/refund`, `/dashboard/invoices/reminder`, `/dashboard/invoices/standard`, `/dashboard/invoices/standard-payment`; `/dashboard/menu`, `/dashboard/menu/:recipeId`, `/dashboard/menu/add-dish`, `/dashboard/menu/sent`, `/dashboard/menu/applied`; `/dashboard/support`, `/dashboard/support/new`, `/dashboard/support/menu`, `/dashboard/support/:requestId`; `/dashboard/buyback`, `/dashboard/buyback/new`, `/dashboard/buyback/documents`, `/dashboard/buyback/documents/confirmed`, `/dashboard/buyback/issue`; `/dashboard/notifications`. |
| Technician | `/technician` and `/technician/tasks` task-list entry; `/technician/tasks/:taskId`; `/technician/tasks/standard-handover`, `/technician/tasks/smart-activation`, `/technician/tasks/repair`, `/technician/tasks/retrieval`, `/technician/tasks/substitute`, `/technician/tasks/substitute-return`, `/technician/tasks/refurbishment`, `/technician/tasks/buyback-assessment`, `/technician/tasks/maintenance-history`; `/technician/history`, `/technician/history/:machineId`; `/technician/notifications`. |

Ni currently represents examples such as `C-204`, `S-018`, `YC-017`, and `2026-08` as literal route entries. Implement those as the corresponding parameterized route family, with existing schema validation and authorization checks. Keep fixed workflow segments such as `new`, `history`, `model`, `payment`, and `notifications` explicitly recognized so they are not mistaken for record IDs. Ignore Ni query-string values that only select demo states; retain a query parameter only when it has a real filter or navigation meaning in the ported flow. Sibling paths such as `/assembly`, `/inventory`, `/model`, and `/thermodynamics` in Ni's `(dashboard)` route group are outside the confirmed Customer `/dashboard` and Technician `/technician` scope.

### Repository verification conventions

- `package.json` provides `lint` and `build` scripts but no `test` script. The existing `tests/` files use Node's built-in `node:test` and CJS.
- The project migration notes list `npm.cmd run lint` and `npx.cmd tsc --noEmit --incremental false` as checks. Browser verification is needed for actual responsive and role navigation behavior.
- No tests, lint, TypeScript checks, browser sessions, or API calls were run for this planning task.

## 3. Candidate paths and trade-offs

| Path | Fit and effort | Security/reliability and recovery | Evidence and outcome |
| --- | --- | --- | --- |
| Copy Ni App Router screens and `demoFlowStore` directly | Lowest initial effort and high prototype similarity, but conflicts with the target's `pageExtensions`, Pages Router, and API/schema boundaries. | Demo state is not server-authoritative, may be shared on a browser, and can falsely imply that a real payment, work order, or request was recorded. Reverting is easy, but operational risk is high. | Rejected. The user explicitly requires the current repository structure and selected verified APIs only. |
| Build every flow as fully operational against assumed APIs | Highest apparent feature parity if all endpoints exist. | No verified Owner self-scope or Technician write API is present in this FE repository. Guessing paths or payloads risks cross-tenant exposure and false success; effort and backend dependency are unknown. | Rejected for this plan. Backend changes and unverified endpoint behavior are out of scope. |
| Port in phases, wire only verified APIs, disable unsupported actions | Moderate effort, compatible with current architecture, and preserves Ni's UI direction. Some routes may initially show unavailable/disabled states. | Avoids demo writes and data-scope assumptions. Each phase is reversible; enabling a blocked action requires a confirmed API contract and review. | Selected by the user. |

## 4. Proposed code structure and dependency rules

Use the established Pages Router and place role-specific code next to its route group. Do not add a new `src/features`, `src/layouts`, or generic `src/shared` layer for anticipated reuse.

```text
src/
├── pages/
│   ├── dashboard/
│   │   ├── [[...sections]].page.tsx       # Owner/Customer route and section allowlist
│   │   ├── customer-shell.tsx             # Owner role guard and Ni-inspired navigation
│   │   ├── customer-shell.module.css      # Responsive role shell
│   │   └── <customer-screen files>        # Route-specific screens/state, kept page-local
│   └── technician/
│       ├── [[...sections]].page.tsx       # Technician route and section allowlist
│       ├── technician-shell.tsx            # Technician role guard and navigation
│       ├── technician-shell.module.css     # Responsive role shell
│       └── <technician-screen files>       # Task/history/notification screens
├── apis/                                   # Existing API modules; add only confirmed calls
├── schema/                                 # Existing Zod contracts; no guessed API schemas
├── lib/auth-role.ts                        # Add Owner/Technician role predicates/routing
├── routes/path.ts                          # Customer `/dashboard` and `/technician` paths
├── routes/routes.ts                        # Role navigation and validated route catalogs
├── text/customer/                          # Customer/Owner copy, if not suitable in existing text files
└── text/technician/                        # Technician copy
```

The exact page-local screen filenames are finalized per phase before implementation; create no empty folders. Reuse existing shared components when their responsibility fits. A shared component may not import a role page or call an API directly.

Allowed dependency direction:

```text
Pages route → role shell/page screens → shared UI components
                         ↓
                    TanStack Query → src/apis → src/lib/http + src/schema
Pages/screens → src/routes and src/text
```

API modules own HTTP requests and parse responses with Zod; screens own presentation and interaction state. Query keys must include role and authoritative identity where needed. Local component state may hold transient form drafts only; server state remains in React Query. Do not use `localStorage` for workflow status, credentials, or success state.

## 5. Phase plan

All phases are sequential. They share role routes, authentication decisions, navigation, and screen ownership, so they are not marked parallel.

### Phase 1 — Owner and Technician role entry, route catalog, and shells

- **Outcome:** Authenticated Owner and Technician users have the correct post-login destination, guarded route groups, and responsive Ni-inspired shells in the current Pages Router.
- **Scope:** Add `/dashboard` and `/technician` catch-all page routes; explicit allowed-section catalogs and unknown-route handling; route constants/navigation labels; Owner/Technician role predicates; post-login selection; shells modeled on the current Moderator shell and target shared UI. Preserve existing Admin and Moderator destinations.
- **Non-scope:** Feature API reads, mutations, and detailed page workflows.
- **Dependencies:** Confirmed role claim values `owner` and `technician`; selected route names; current shell and `Sidebar` conventions.
- **Implementation boundary:** `src/pages/dashboard`, `src/pages/technician`, `src/lib/auth-role.ts`, `src/routes/path.ts`, `src/routes/routes.ts`, role text modules, and page-local CSS Modules. Do not import `src/app` or `src/components/dolores` from Ni.
- **Side effects:** Adds two protected route groups and changes login redirects for Owner/Technician. No backend writes or API mutations.
- **Verification:** Inspect generated role routes; verify unauthenticated, Owner, Technician, Admin, Moderator, and unsupported-role destinations; verify direct cross-role access is denied in the shell; check keyboard navigation and desktop/mobile navigation. Use mocks or test tokens, not production mutations.
- **Acceptance criteria:** Owner resolves to `/dashboard`; Technician resolves to `/technician`; existing Admin/Moderator redirects are unchanged; unsupported paths return not-found; cross-role pages show the current access-denied behavior; Ni visual hierarchy is present without importing Ni's App Router shell.
- **Entry condition:** This plan is approved and the role claims in the IDaaS token match the inspected schema.
- **Exit condition:** Both shells and route catalogs work with mocked role claims and pass existing project static checks.
- **Risks:** Mixed-role tokens have no established priority; user and technician roles are assumed mutually exclusive. If tokens contain both, stop and request a precedence rule before implementing login routing.
- **Approval/stopping gate:** Stop if the actual token uses different role names or if the backend relies on another authorization boundary. Do not infer a role from a page URL.
- **Review gate:** Review role checks, redirect precedence, route allowlists, and Admin/Moderator regression evidence before Phase 2.

### Phase 2 — Owner dashboard and read-only business views

- **Outcome:** Ni's Owner overview and read-oriented contract, machine, invoice, and menu screens render using verified data or explicit unavailable states.
- **Scope:** `/dashboard`; contracts list/detail and expiry/end/deposit status views; machine list/detail/model/history/substitute views; invoice list/detail views; menu list and applied recipe details. Preserve Ni's layout and information hierarchy. Replace prototype IDs with identifiers returned by confirmed APIs.
- **Non-scope:** Submit/payment/termination/support/buyback mutations; Technician screens; any unverified global data query.
- **Dependencies:** Phase 1; confirmed Owner-to-tenant resolution and API authorization scope for each endpoint before querying it.
- **Implementation boundary:** Owner screen modules under `src/pages/dashboard`; existing API methods/schemas are reused only after confirming the response is suitable and server authorization scopes it to the authenticated Owner. Add a narrowly scoped API/schema method only when its endpoint contract is already confirmed.
- **Side effects:** Read-only API requests. No mutation or persistent local state.
- **Verification:** For each endpoint, inspect request identity, parsed response, cancellation, loading, empty, error, retry, and stale-refresh behavior. Test with a fixture that includes a second tenant and prove it is not rendered to the current Owner. Verify UUIDs and route parameters against existing Zod schemas.
- **Acceptance criteria:** Every read route in scope has a real API-backed state or a clear unavailable state; no Ni fixture rows/IDs are shown as live business data; data cannot cross Owner/tenant scope; failures and empty results remain distinguishable.
- **Entry condition:** Phase 1 exit criteria pass. API scope and Owner identity resolution are documented for each enabled query.
- **Exit condition:** All in-scope Owner read routes render and have evidence for scope, schemas, and UI states.
- **Risks:** Current APIs do not show a clear self-profile/tenant lookup. Existing `list` calls may be administrative or broad. A missing Owner-scoped contract means the route stays unavailable; do not pass an arbitrary tenant ID.
- **Approval/stopping gate:** Stop and leave affected reads unavailable if the Owner identity or endpoint scope cannot be verified. Backend endpoint work requires a separate scope/approval.
- **Review gate:** Review query keys, identifier validation, returned-data scope, and Ni-to-API field mapping before enabling the next Owner workflows.

### Phase 3 — Owner invoices, menu, support, buyback, and notification workflows

- **Outcome:** All remaining Ni Customer routes exist and accurately distinguish supported data/actions from unavailable ones.
- **Scope:** Invoice reminder/payment/shortfall/refund routes; menu recipe edit/add/send/applied routes; support list/new/menu/progress routes; buyback overview/new/documents/issue/confirmation routes; Owner notifications and unread view. Use only APIs with confirmed payloads and current-user scope. Keep form validation and confirmation patterns from Ni where the backed action exists.
- **Non-scope:** Inventing payment, support, menu-send, or buyback endpoints; fake success transitions; the Admin/Moderator notification pages.
- **Dependencies:** Phase 1 route/shell; Phase 2 identity and data ownership decisions; confirmed API contracts for any enabled mutation.
- **Implementation boundary:** Owner page-local screens; extend `src/apis` and `src/schema` only for endpoints already specified and reachable through the existing Dolores proxy. No raw Axios calls from screens. Unsupported write controls stay disabled with a reason tied to the exact missing capability.
- **Side effects:** Read-only requests for confirmed lists. A backed mutation may be enabled only after its request, response, idempotency/retry behavior, authorization, and success state are confirmed. No live business mutation during development verification.
- **Verification:** Exercise every route and state path; check disabled-action explanation, validation, pending/error/success display for any verified mutation, duplicate-submit prevention, and query invalidation. Verify notifications belong to the logged-in Owner before showing them.
- **Acceptance criteria:** All Ni route destinations resolve; no route changes state through query-string demo flags or localStorage; unsupported actions cannot be submitted; supported mutations use typed APIs and never show success before a confirmed server response.
- **Entry condition:** Phase 1 is complete; each data/action endpoint in the phase has a recorded contract and scope.
- **Exit condition:** Every route is either API-backed with tested states or deliberately unavailable/disabled with a clear reason.
- **Risks:** Ni query parameters and `demoFlowStore` simulate missing, offline, sent, and confirmed cases. These scenarios are not proof of backend capability.
- **Approval/stopping gate:** Stop before enabling each mutation if its API contract, authorization, or safe retry behavior is not confirmed. Do not replace the gap with local persistence.
- **Review gate:** Review every enabled write against its API schema and verify no screen advertises a state the backend did not confirm.

### Phase 4 — Technician task, history, and notification routes

- **Outcome:** All Ni Technician routes render in the Technician shell, with real task/history data only when it is verifiably assigned and scoped.
- **Scope:** Task list/detail; standard handover; Smart activation; repair; retrieval; substitute and return; refurbishment; buyback assessment; maintenance-history form; machine history; Technician notifications.
- **Non-scope:** Client-side task assignment, simulated checklist/evidence submissions, and backend endpoint changes.
- **Dependencies:** Phase 1; confirmed Technician identity and read/write endpoint scope. Existing `installationWorkOrdersApi` and maintenance ticket reads may be used only if the backend contract proves they are scoped to the authenticated Technician.
- **Implementation boundary:** Technician screens under `src/pages/technician`, route constants/catalog, existing typed APIs where valid, and Zod schemas. Add API/schema methods only for confirmed contracts; no direct use of `localStorage` or static Ni records.
- **Side effects:** No writes while a technician-specific submit API is absent. If a supported mutation is later confirmed, it must use the API layer and server response as the authoritative state.
- **Verification:** Verify each task and history route with role-scoped fixtures, a second Technician's task, unassigned tasks, empty/error results, and invalid identifiers. Check every form's disabled state and explanation when no API is available. Ensure evidence metadata never implies a file was uploaded unless confirmed by the server.
- **Acceptance criteria:** All Ni Technician destinations resolve; the task list never displays another technician's or tenant's work; all nine workflow forms are non-submittable until each action has a confirmed API; no demo success or localStorage persistence remains.
- **Entry condition:** Phase 1 is complete and role identity/route catalog are available.
- **Exit condition:** Supported read screens are scoped; unsupported reads/actions clearly report unavailable; no data or action is simulated.
- **Risks:** Current `installationWorkOrdersApi` lists by tenant, not by technician assignment, and exposes detail reads only. Current schemas describe checklist/evidence data but no submit endpoint is present in the inspected frontend.
- **Approval/stopping gate:** Stop before calling a tenant-wide work-order list as a Technician or enabling any form write. Require a confirmed assigned-work endpoint and mutation contract first.
- **Review gate:** Review authorization scope and workflow state transitions before allowing any future Technician mutation phase.

### Phase 5 — Cross-role quality, regression, and handoff

- **Outcome:** Both role areas behave consistently with existing Admin/Moderator functionality and have a complete route and state evidence record.
- **Scope:** Route matrix, login/logout and role guards, desktop/mobile layout, keyboard/focus semantics, API-loading/error states, type/lint checks, and final diff review.
- **Non-scope:** New product workflows, backend changes, deployment, or live production writes.
- **Dependencies:** Phases 1–4 exit criteria.
- **Implementation boundary:** Verification-only unless a defect is found; any fix returns to its owning phase and is reviewed there.
- **Side effects:** Local build/lint/test processes only. API mutations use mocks or an approved non-production environment; no production writes.
- **Verification:** `npm.cmd run lint`; `npx.cmd tsc --noEmit --incremental false`; relevant existing/new Node `node:test` files run directly because `package.json` has no `test` script; browser checks for route access, responsive breakpoints, keyboard navigation, and empty/loading/error states. Record any pre-existing failure separately.
- **Acceptance criteria:** Every selected Ni route maps to an implemented or explicitly unavailable screen; Owner and Technician cannot access each other's protected area; Admin/Moderator login redirects and screens remain intact; no Ni fixture data, mock success, or unverified endpoint is shipped.
- **Entry condition:** All feature phases have passed their review gates.
- **Exit condition:** Verification evidence is recorded and the final review finds no unresolved route, role-scope, or API-contract issue.
- **Risks:** The backend may be unavailable in the verification environment; unavailable endpoints must remain gated rather than inferred.
- **Approval/stopping gate:** Stop if verification would write to production data or if an API scope cannot be established. Request a safe environment or API contract before continuing.
- **Review gate:** Final read-only review of the full implementation diff and route-to-acceptance matrix before handoff.

## 6. Requirement-to-phase traceability

| Requirement | Plan phase |
| --- | --- |
| Pages Router routes at `/dashboard` and `/technician`; role-specific shells and authorization | Phase 1 |
| Login redirects for Owner/Technician while retaining Admin/Moderator | Phase 1 |
| Owner overview, contracts, machines/model/history/substitute, invoices, menu reads | Phase 2 |
| Owner invoice actions, menu operations, support, buyback, notifications | Phase 3 |
| Technician task list/detail, nine job forms, history, notifications | Phase 4 |
| No prototype localStorage/static state; API-only data and disabled unsupported writes | Phases 2–5 |
| Responsive, keyboard, error/loading states, role regression, final review | Phase 5 and each phase's verification |

## 7. Assumptions and unresolved external evidence

These do not block the selected plan because the approved fallback is an unavailable/disabled UI state. They block enabling the affected feature:

1. IDaaS tokens use the normalized `owner` and `technician` role names, and Owner/Technician roles are mutually exclusive. Verify with approved non-production token fixtures in Phase 1.
2. Dolores exposes Owner self-scope and Technician assignment contracts. Verify endpoint documentation or a non-production contract before each query is enabled. The current frontend does not establish these contracts.
3. Payment, customer support, menu synchronization, buyback, and Technician work-result APIs may or may not exist outside this repository. Do not infer their paths or payloads; keep affected controls disabled until verified.
4. Ni's business identifiers and state query parameters are prototype fixtures. Use server-returned identifiers accepted by current Zod schemas; preserve query state only when it represents real navigation/filter state.
5. The Vercel deployment and existing Next proxy remain unchanged. No new environment variable is required unless a future, separately approved API contract proves otherwise.

## 8. Stopping and approval gates

- This artifact authorizes planning only. It does not authorize source changes, backend changes, live API writes, deployment, or migration of Ni's App Router tree.
- Implementation starts only after the user approves this plan.
- Stop an individual read or write feature at its stated API gate if data ownership or request/response behavior cannot be verified.
- Any backend endpoint work, new role semantics, or route scope beyond the selected Ni route inventory requires a separate specification and approval.
