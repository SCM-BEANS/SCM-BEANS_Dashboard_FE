# App Router feature architecture for BEANS

**Status:** Plan only; no product-code changes authorized by this artifact.
**Target workspace:** C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE
**Plan path:** C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE\plans\app-router-feature-architecture.md
**Lifecycle/domain:** s-plan + frontend/fe-architecture.

## 1. Confirmed direction and acceptance contract

The user selected an App Router centered structure: route-specific screen code belongs near its route under src/app, and actual cross-role feature code belongs in private src/app/_features directories. The user selected migration into src/app **and** extraction of shared dashboard and machine code. The earlier constraint to keep the Next.js environment was reaffirmed in the choice. Existing URLs, layout, visible content, responsive behavior, and user actions are to remain the same. This is a structural and internal reuse change, so no new UI/UX design or states are requested.

There is no separate approved product specification. The conversation establishes these acceptance requirements:

| ID | Requirement |
| --- | --- |
| R1 | Keep Next.js App Router, package/runtime, deployment topology, public URLs, route groups, layouts, and route validation. Do not add React Router or src/pages. |
| R2 | Move page implementation now under src/screens into src/app: simple one-off pages may render directly in page.tsx; complex route-owned client screens go into private route-local _components. Remove obsolete wrappers and empty directories only after consumers migrate. |
| R3 | Put genuinely shared dashboard presentation under src/app/_features/dashboard. Keep role-specific data acquisition, metrics, charts, actions, and loading/error states distinct where their behavior differs. Technician root remains its assigned-task screen. |
| R4 | Put genuinely shared machine identity/status/detail presentation under src/app/_features/machines. Keep admin, moderator, customer, and technician permissions, columns, actions, and data sources role-owned. |
| R5 | Preserve existing in-progress Dolores API work, demo-flow behavior, route catalog, auth policy, query semantics, client/server boundaries, styles, assets, and API contracts. No live backend writes or external deployment. |
| R6 | Verify import and route parity, rendered UI and responsive styling, TypeScript, lint, production build, and relevant existing tests. Distinguish pre-existing failures from regressions. |

These are internal code changes; UI/UX reconfirmation is the user's prior explicit direction to change only structure and the selected choice to keep URL and interface. No new interaction, empty state, error state, visual treatment, or accessibility behavior is planned.

## 2. Inspected workspace and constraints

- Current source is a Next.js 16.2.9 / React 19 / TypeScript / Tailwind 3 application. package.json provides dev, build, start, and lint. Installed node_modules and a previous .next build are present. No new package is needed.
- vercel.json deploys as Next.js using npm run build and .next. next.config.js rewrites Dolores and IDaaS API paths and configures packages/images. src/app/api/proxy-model/route.ts is a Next route handler. Those boundaries remain in place.
- The root src/app/layout.tsx owns fonts, metadata and providers; src/app contains admin, customer, moderator and technician route groups, public pages, dynamic/catch-all pages, and the model proxy. src/routes owns path, navigation, query and supported-section rules. The route catalog's role labels are not authorization guards.
- The working tree is already dirty. It includes prior structural moves plus separate, unfinished admin API integration files and plans. This plan starts from the current working tree; it must not reset, overwrite, stage, commit, or rebase unrelated changes. plans/admin-api-integration.md is paused and remains independent. plans/centralized-routing.md already documents the current route contract.
- Current role implementations include src/screens/admin (11 files), customer (2), moderator (1 large file), technician (1 large file), public (6), tools (5), examples (2), and settings (1). Existing shared Dolores shell/UI is under src/layouts/dashboard and src/components/ui. src/features/dashboard currently combines admin and customer overview implementations; moderator overview remains inside its role screen. Demo-flow storage is shared between role screens.
- Admin overview uses a TanStack Query hook and Dolores API adapter; customer and moderator overview contain fixture values. The machine lists and details show different columns and actions. Admin machine/API work may use UUID identity while demo views use display serials; the two must not be silently merged.
- Current tailwind.config.ts scans src/app, src/features and src/components but does not scan src/screens or src/layouts. This is a styling risk from the prior move. Capture the current rendered baseline, include transitional scan paths while files move, then ensure every final source path that contains Tailwind classes is scanned.
- src/proxy.ts currently passes admin requests through and explicitly states that the frontend prototype has no login or role checks. The structural plan does not add authorization; backend permissions remain authoritative.
- Existing tests include tests/dolores-locations.test.cjs; package.json has no general test script. Earlier in this conversation, TypeScript, npm run build and lint completed after the prior move; lint reported five warnings in untouched files. Re-establish a baseline when implementation begins.
- No environment-file values, credentials, private backend calls, or host configuration changes are needed for planning. Private LAN API reachability is unverified and is not required for the structural phases.

Framework constraint: Next.js App Router treats page.tsx/layout.tsx/route.ts as route files. Private _folders can hold code without registering URL segments. See [Next App Router layouts and pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) and [Next project structure](https://nextjs.org/docs/app/getting-started/project-structure).

## 3. Candidate paths and decision record

| Path | Fit and compatibility | Cost and operational burden | Reliability, security, recovery, evidence | Decision |
| --- | --- | --- | --- | --- |
| A. App-centered colocation plus private app/_features | Matches the user's explicit App Router direction; preserves Next routes, server components, route handler and Vercel config | Moderate file/import migration plus focused dashboard/machine extraction; no dependency or service change | Private folders avoid accidental routes. Review diff and route list phase by phase; source moves are reversible. Auth and API boundaries stay unchanged. | **Selected by user** |
| B. Keep app as thin route adapters, screens/features outside app | Compatible with Next and is the current working-tree shape | Lowest migration cost | Easier rollback, but contradicts the selected code-boundary preference and retains extra wrappers. Current Tailwind scan misses screens/layouts. | Rejected by user selection of A |
| C. Put complete implementations in role route folders without shared feature modules | Compatible and initially simpler | Lower extraction effort, higher ongoing duplication and change cost | Easy to move, but fails the original reuse goal; shared machine/dashboard behavior can drift. | Rejected by selected dashboard/machine reuse scope |
| D. Adopt QLS src/pages with React Router/Vite or Next Pages Router | Does not fit the selected App Router structure | Framework/router, rendering and deployment migration | High compatibility and recovery risk; Next route handler and rewrites would need replacement. | Excluded by the user's no-environment-change constraint |

Within path A, shared **presentation composition plus role-owned adapters** is selected for dashboard and machines. A single all-role data-fetching page would couple different data sources and status/action policies; a purely role-specific implementation would preserve duplication. The selected boundary shares invariant UI and typed display inputs while leaving authorization and workflow decisions with each route. Do not introduce an abstraction for a visual pattern observed only once.

No dependency, backend schema, public API, persistence schema, deployment, or authentication change is planned. Reversibility is a source-level move/revert per phase, with the current uncommitted state preserved. Do not use a broad reset to recover.

## 4. Current and target structure

Relevant current tree:

    src/
      app/                         Next route, layout and handler files
      screens/                     role/public/tool page implementations
      features/dashboard/          admin + customer overview
      features/demo-flow/          shared demo persistence
      layouts/dashboard/           Dolores shell and CSS
      components/ui/               Dolores UI primitives and API states
      routes/                      path, query, navigation, route catalog
      apis/dolores/                backend adapters (in-progress work)
      hooks/dolores/               query hooks (in-progress work)
      schemas/dolores/             API schemas (in-progress work)
      providers/, styles/          application setup and global CSS

Target after the approved implementation:

    src/
      app/
        layout.tsx                 root fonts, metadata and providers
        globals.css                global styles
        _providers/                app-only provider composition
        _ui/dolores/               shared presentation primitives and API states
        _shell/dolores/            shared shell, navigation presentation and CSS module
        _features/
          dashboard/              shared overview frame and metric composition
          machines/               shared typed machine display model and identity/status/detail UI
          demo-flow/              existing cross-role demo persistence
        (admin)/admin/
          page.tsx, machines/..., ...
          _components/            admin-only screens and actions
        (dashboard)/dashboard/
          page.tsx, [...sections]/..., machines/..., ...
          _components/            customer-only screens and actions
        (moderator)/moderator/
          page.tsx, [...sections]/...
          _components/            moderator-only screens and actions
        (technician)/technician/
          page.tsx, [...sections]/...
          _components/            technician-only screens and actions
        about/, pricing/, ...      one-off public pages render directly in page.tsx
        model/, inventory/, ...    route-local tool UI or private _components when complex
        api/proxy-model/route.ts    unchanged route handler
      components/                  existing non-migrated reusable 3D, landing, legacy and feature UI
      routes/                      unchanged URL/query/navigation contract
      apis/, hooks/, schemas/      external data adapters and validation
      lib/, services/, store/, types/, data/, constants/  unchanged owners
    tests/                          existing and focused cross-role behavior tests
    public/                         unchanged static assets

The shown private directories are ownership targets, not permission boundaries. Do not create an empty target directory in advance; create it only when its first concrete file moves. src/screens, src/layouts and top-level src/features disappear only if all their current consumers have migrated. QueryProvider may remain under src/providers because it is a reusable data provider; the app-only theme wrapper moves under app/_providers. Existing landing/3D component libraries outside app stay in place unless a file is proven route-owned by the inventory.

Import direction:

1. app route files own URL params, searchParams, notFound/redirect and server/client entry boundaries; they compose route-local _components and app/_features.
2. Route-local _components own role-specific workflow, actions and data adapter selection. They may import app/_features, app/_ui, app/_shell, routes and approved hooks, but may not import another role's private components.
3. app/_features/dashboard and app/_features/machines accept role-neutral display props/view models and import app/_ui. They do not import role route files or Axios clients. Dashboard and machine data adapters remain role-owned until contracts genuinely align.
4. app/_ui contains product-independent Dolores primitives and does not import features or routes. app/_shell composes UI plus centralized navigation; it does not own feature data.
5. Existing src/hooks/dolores -> src/apis/dolores -> src/schemas/dolores direction remains; presentation does not call Axios directly. src/routes remains the sole named route/query contract.

Rendering and code splitting: retain Server Components for route wrappers and param parsing, retain use client at the top of moved hook/browser-state modules, pass serializable props across boundaries, and import role-local screens directly so Next retains route-level bundling. Keep existing dynamic 3D loading and CSS module adjacency. Preserve current 404 handling, API loading/empty/error states and mobile navigation behavior; do not add new error boundaries merely for this migration.

## 5. Phase sequence and requirement trace

The phases are sequential: each one supplies file ownership and imports required by the next. No phase is marked Parallel because route files, shared UI and feature modules have overlapping consumers. There is no formal specification phase list to map; the conversation requirements above are mapped exactly below.

| Requirement | Owning phase | Acceptance evidence |
| --- | --- | --- |
| R1 | 1, 2, 3 | Baseline/target route list, unchanged Next config/runtime and URLs |
| R2 | 2, 3 | Route-local ownership map, no imports from src/screens, no orphan files |
| R3 | 4 | Cross-role dashboard rendering and data/state parity |
| R4 | 5 | Cross-role machine display/action/identity parity |
| R5 | 1 through 6 | Diff review, preserved API/data/auth contracts and working changes |
| R6 | 6 | Static, build, focused test and browser evidence |

### Phase 1 — Baseline and migration inventory

- **Outcome:** A reproducible baseline and exact move map from the current dirty working tree.
- **Entry/dependencies:** User approval to implement this plan; current checkout and unrelated work still present. No prior phase.
- **Scope:** Record current git status, route/build inventory, relevant URLs, imports, client directives, Tailwind source coverage, role-specific dashboard and machine states. Inspect the paused API plan and files without changing their contracts. Identify each src/screens file's route owner or genuine shared owner.
- **Non-scope/boundary:** No file moves or feature behavior changes. No live backend writes or setup/install.
- **Affected components/side effects:** Read-only inspection of app, screens, features, styles, routes, tests and build config; local diagnostic outputs only.
- **Verification/acceptance:** Capture baseline TypeScript, lint, build and representative desktop/mobile views where available; classify pre-existing warnings, the Tailwind scan gap, fixture/live states and any unavailable checks. Every moved file has one named destination and owner; every current URL has a target route file.
- **Exit/risk/stop/review:** Exit when inventory and baseline are reviewable. Stop if the working tree changed unexpectedly or a file cannot be assigned without changing product behavior. Review route/owner map and pre-existing changes before Phase 2.

### Phase 2 — App shared shell and foundational ownership

- **Outcome:** Shared app-only setup, Dolores UI, shell and demo-flow state live in private app directories without changing behavior.
- **Entry/dependencies:** Phase 1 baseline and move map accepted.
- **Scope:** Move DoloresUI/ApiState to app/_ui/dolores; DoloresShell, DashboardLayout and CSS module to app/_shell/dolores; demoFlowStore to app/_features/demo-flow; app-only ThemeProvider and global CSS into app-owned locations. Update consumers, CSS imports and transitional Tailwind content globs. Keep src/routes, QueryProvider and Dolores API/hooks/schemas in their established owners.
- **Non-scope/boundary:** No dashboard/machine data merge, styling redesign, auth changes, endpoint changes or role dispatch rewrite.
- **Affected components/side effects:** Import paths and generated client chunks can change; no external state or network write. Existing localStorage demo keys/values remain identical.
- **Verification/acceptance:** TypeScript and build pass against baseline; shell/navigation and mobile menu render the same for all four roles; API loading/error components still render; no duplicate shell/UI implementations or accidental route files under private folders.
- **Exit/risk/stop/review:** Exit when all shell/UI consumers import the new owner. Stop on hydration/CSS differences or demo-state loss. Review client directives, CSS module placement, dependency direction and Tailwind scan coverage.

### Phase 3 — Route-local page colocation

- **Outcome:** src/screens implementations are owned by their Next route areas; redundant forwarding layers are removed.
- **Entry/dependencies:** Phase 2 exit and unchanged URL baseline.
- **Scope:** Move admin/customer/moderator/technician complex screens into the nearest role route's _components. Split only enough to give dashboard and machine sections stable imports for Phases 4 and 5. Inline one-off public/settings/tool page implementations into their page.tsx or colocate complex client-only views under that route's _components. Preserve catch-all dispatch, explicit machine detail route, query parsing, route group layouts and 404 decisions.
- **Non-scope/boundary:** No visual, workflow, API or authorization change; do not normalize role-specific actions yet.
- **Affected components/side effects:** Imports and route bundle composition change; URLs and persistent demo state do not. Do not move shared landing/3D libraries merely to make src/screens empty.
- **Verification/acceptance:** No production import from src/screens; all prior URLs and direct refreshes resolve with the same layout; dynamic IDs and invalid sections retain their behavior; no duplicate page.tsx URLs; public/tool pages still render. Remove src/screens only after its final consumer is gone.
- **Exit/risk/stop/review:** Exit on route parity and clean ownership audit. Stop on route collision, lost client boundary or changed query precedence. Review public URLs, catch-all matching, layout selection and screen-to-route ownership.

### Phase 4 — Shared dashboard composition

- **Outcome:** Admin, customer and moderator overviews reuse one role-neutral dashboard composition while retaining distinct content.
- **Entry/dependencies:** Phase 3 role-local overviews and Phase 2 UI foundation.
- **Scope:** Add app/_features/dashboard/DashboardOverview for shared DoloresPage/metric-grid composition. Its inputs are title, description, actions, metric display items, optional content and mobile action behavior. Keep admin useDashboardOverview query, loading/empty/error/retry and financial/daily data in the admin adapter. Keep customer fixtures/chart/links and moderator fixtures/chart/work queue in their route-local adapters. Technician's task list is not an overview and remains separate.
- **Non-scope/boundary:** No shared fetcher, synthetic data, new chart abstraction, metric renaming, API request change or role authorization assumption. Extract only existing repeated composition; do not invent shared business metrics.
- **Affected components/side effects:** React component boundaries and client chunks change; visible metrics, copy, actions and source data do not.
- **Verification/acceptance:** Compare each role's title, four metrics, chart/table, action URLs, loading/empty/error/retry state, desktop/mobile layout and refresh behavior to Phase 1. Shared component has no role or Axios import; role adapters supply their own values. Existing admin API work remains intact.
- **Exit/risk/stop/review:** Exit when the three overview routes consume the shared composition with equivalent output. Stop if a shared prop API forces role-specific data/permission semantics into the feature or changes admin error behavior. Review reuse value, accessible heading order, responsiveness and data ownership.

### Phase 5 — Shared machine presentation

- **Outcome:** Common machine identity/status/detail UI is reused without merging role permissions or data contracts.
- **Entry/dependencies:** Phase 3 role-local machine screens; Phase 2 shared UI; Phase 4 completed so shared presentation conventions are stable.
- **Scope:** Add app/_features/machines typed display model and small components for repeated machine identity/type/status and detail fields. Role adapters map their own API or fixture data to that display model. Admin, moderator and customer lists retain their own columns, filters and actions; technician history remains a separate workflow but may use the same machine identity presentation where it actually repeats.
- **Non-scope/boundary:** No universal role-configured machine page, no new fetcher, no shared fixture fallback, no permission enforcement, no UUID/serial conversion, no IoT command or backend schema change.
- **Affected components/side effects:** Presentation imports and view-model mapping change. Preserve ID URLs, selected filters, smart/standard distinctions and demo storage keys.
- **Verification/acceptance:** Check admin inventory/detail, customer list/detail, moderator inventory/detail and technician history for the same identity, type, status, contract/location text, links, role actions and smart/standard conditional content as Phase 1. Compare both API-backed and fixture-backed states. No role route imports another role's private component.
- **Exit/risk/stop/review:** Exit when repeated machine UI is centralized and all role behaviors match. Stop if admin API identity or incomplete API DTOs make a common display model ambiguous; resolve with the paused API integration owner before changing URL semantics. Review role isolation, data mapping and actual reuse.

### Phase 6 — Integrated verification and handoff

- **Outcome:** The app-centered tree is complete, regression evidence is recorded, and no unrelated changes are included.
- **Entry/dependencies:** Phases 2 through 5 exited; no open material stop.
- **Scope:** Audit import direction, private folder route safety, Tailwind coverage, route list, orphan/empty directories, diff against Phase 1, browser flows and tests. Run TypeScript with incremental output disabled, npm run lint, npm run build and focused existing/future behavior tests. Check representative direct URL, refresh, back/forward, 404 and mobile views.
- **Non-scope/boundary:** No deployment, commit, push, backend write, dependency upgrade or speculative cleanup outside this plan.
- **Affected components/side effects:** Local build/test outputs only; no external side effect.
- **Verification/acceptance:** All R1-R6 evidence is complete: no new TypeScript/lint/build failures; unchanged route and API paths; dashboard/machine visual/state parity across roles; no missing Tailwind styles; no src/screens/src/layouts/top-level src/features imports if those directories were fully migrated; only planned code and pre-existing working changes remain.
- **Exit/risk/stop/review:** Exit when a final correctness and maintainability review accepts the integrated change. Stop and report any route, hydration, style, access-control claim, live-data or behavior regression rather than masking it. Review the complete diff and residual risks with the user before any later commit/deployment request.

## 6. Implementation gates and assumptions

- The plan is based on the current working tree, not HEAD. Recheck git status at implementation start and preserve all pre-existing user changes. Do not run a broad formatter or Git reset.
- Visual and behavior parity is required; the shared components may use role-specific props, but must not hide differences in permission, data freshness, metric meaning or action side effects.
- Current prototype route protection is unchanged. A role label or route folder is not a security control.
- The unfinished admin API integration may alter machine ID/data shapes while this architecture work is pending. If it does, stop Phase 5 at the affected mapping and update this plan with the actual API contract before implementing that mapping.
- Preserve existing demo fixtures and localStorage keys until the relevant product/API plan replaces them; do not use live backend mutation to verify a folder refactor.
- The plan's file tree is the selected boundary. Exact component filenames may follow the existing PascalCase convention, but responsibilities and import direction are fixed; no new generic layer is authorized without a demonstrated duplicate.
- Planning produces only this file. Implementation requires a later explicit request, and each phase has its own stopping and review gate.
