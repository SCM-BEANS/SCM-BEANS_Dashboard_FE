# Centralized routing for BEANS

Status: implementation plan only; product code has not been changed.
Target workspace: C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE
Canonical artifact: C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE\plans\centralized-routing.md
Reference workspace: C:\GitHub\QLS\QLS_WEB
Lifecycle/domain: s-plan + frontend/fe-architecture.
Language: English, following GLOBAL_WORKING_CONTEXT.md.

## 1. Confirmed direction and acceptance contract

The user designated BEANS as the modification target, selected QLS as the frontend structure reference, requested a plan before implementation, selected option 2 (centralize paths, route catalog, navigation, and query rules), then requested a direct read of QLS/src/routes before proceeding. Both QLS route files were read in full again before this plan was written.

The selected option explicitly retains the existing Next.js URL entrypoints, public URLs, layouts, UI, selected-menu behavior, and navigation behavior. This is the UI/UX direction for this internal routing refactor; no visual redesign is needed. Architecture confirmation is the user's selection of option 2 in response to the proposed src/routes boundary. No further product architecture decision is outstanding.

Requirements / acceptance criteria:

- R1: src/routes/path.ts owns named URL constants grouped by role/area and detail URL builders, using the QLS PATH_* convention.
- R2: src/routes/routes.ts provides a centralized, typed route catalog and existing catch-all support predicates; app pages remain the actual Next.js route entrypoints.
- R3: src/routes/navigation.ts owns existing role/desktop/mobile/legacy/landing navigation definitions. Visible labels, icons, order, exact-match flags, and current selection exceptions stay identical.
- R4: src/routes/query.ts owns query construction and route-owned view types/resolution. Existing defaults, account/machine/state values, unrelated query parameters, and null-removal behavior are retained.
- R5: Internal application navigation uses PATH_* and query helpers throughout the existing source. No new router dependency or framework migration is introduced.
- R6: Existing valid/invalid path behavior, parameter precedence, direct loading, refresh, back/forward behavior, layout selection, and demo state retention remain equivalent.
- R7: Dependencies, auth policy, REST contracts, public assets, CAD/3D runtime, and deployment topology are outside this change.
- R8: Verification establishes a baseline, checks the new contract, runs appropriate static/build checks, and compares representative browser flows. Existing defects are recorded separately and not silently repaired.

## 2. Inspected evidence

### QLS reference

src/routes contains exactly:
- path.ts: root prefixes; PATH_AUTH, PATH_SYSTEM_ADMIN, PATH_BRAND_ADMIN, PATH_STORE_ADMIN, PATH_DASHBOARD, PATH_PAGE; functions such as brandDetail(id).
- routes.tsx: React Router useRoutes tree; page imports; layout composition; role guards; children/index redirects; fallback/404 entries.

QLS does not currently have navigation.ts or query.ts. Those two files are part of the selected BEANS option because BEANS already has concrete scattered responsibilities requiring them.

The transferable boundary is named paths plus centralized route organization. QLS's JSX useRoutes tree is specific to its React Router runtime; BEANS's Next.js app tree continues to own page rendering, layouts, server components, and code splitting. The proposed routes.ts is executable metadata and match logic, not a replacement router or an unused list of page components.

### BEANS source and infrastructure

Inspected:
- package.json, next.config.js, tsconfig.json, vercel.json, .eslintrc.json, .gitignore;
- GLOBAL_WORKING_CONTEXT.md and rules.md;
- src/app route inventory, root providers/layout, role layouts and catch-all page files;
- DoloresShell, DoloresDashboardLayout, Sidebar, Header, LandingNav, LoginForm;
- role screen dispatch and internal navigation sites;
- useRouteView, Axios client redirect handling, relevant stores/schemas;
- existing plans directory; no centralized-routing.md exists.

The inspected source inventory contained 44 files under app and 63 under components. These counts are observations, not acceptance thresholds.

Environment:
- package manifest declares Next ^16.2.9, React ^19.2.7, TypeScript ^5, Tailwind ^3.4.1.
- Installed node_modules and .next are present; their presence does not prove a passing build.
- Scripts: dev, build, start, lint; no test runner is declared.
- React typings are ^18 and eslint-config-next is 14.2.3 despite newer runtime declarations. Establish the baseline before attributing diagnostics to routing.
- @/* resolves to src/*.
- next.config.js rewrites /api/v1/:path* to the configured backend; vercel.json uses the Next.js build and .next.
- Root layout uses Next font loading. Build verification may require access to font resources; record environment failures accurately.
- proxy.ts deliberately passes requests through and only matches /admin/:path*. Route role metadata must not be represented as authorization enforcement.
- No AGENTS.md was found in the checked target tree or C:/, C:/GitHub, C:/GitHub/BEANS ancestor locations.
- No environment file contents were needed.

Current routing details requiring compatibility:
- Customer and technician catch-all entrypoints use explicit relative-path sets.
- Moderator also accepts anchored dynamic patterns for contract, customer, machine, request, machine-history, and buyback identifiers.
- Explicit dashboard/machines and dashboard/businesses routes take precedence over the customer catch-all.
- Admin machine details have a dedicated [machineId] entrypoint and existing decoding behavior.
- Admin views have different defaults: inventory for machines; list for accounts/contracts/stores/businesses; overview for reports. IoT and menu parsing must be inventoried from their actual implementations.
- Menu defaults to items when machine=S-018 and no valid view exists; otherwise list.
- useRouteView clones current search params, sets view, deletes keys passed as null, and uses router.push with scroll:false to retain caller-owned form state.
- Technician /technician renders the tasks view without introducing a redirect.
- /settings redirects to /settings/security.
- Customer /dashboard/support/menu selects the menu navigation entry.
- Desktop admin /admin/notifications currently maps its selected navigation context to /admin; mobile behavior differs. Preserve these rules explicitly.
- The existing dashboard shell selector includes customer screens but leaves /dashboard/businesses in the legacy shell.
- Header references /users even though there is no corresponding app route. Preserve this existing unresolved target as an explicitly named legacy path; catalog it as unresolved rather than treating it as valid or changing its destination.

## 3. Decisions and alternatives

| Candidate | Workspace fit / compatibility | Effort / operational cost | Reliability, recovery, evidence | Outcome |
| --- | --- | --- | --- | --- |
| path.ts only | Fits Next.js; leaves route validation and navigation ownership scattered | Lowest effort; no deployment change | Easy rollback; fails the selected central-management scope | Rejected by user selection of option 2 |
| path.ts + routes.ts + navigation.ts + query.ts | Preserves Next.js app tree; follows QLS naming and role grouping | Moderate source refactor; no new runtime or service | Can migrate in bounded increments; compare old/new URLs, support sets, query outputs, menu snapshots | Selected explicitly by user |
| Replace Next routing with React Router / switch to Vite | Would require changing entrypoints, server rendering, API route handling, and deployment | High cost and maintenance burden; new runtime architecture | Broader compatibility and recovery risk; not needed for the stated goal | Outside approved scope |
| Put all URLs, matching, menu presentation, and queries into one file | Technically possible but mixes existing distinct responsibilities | Smaller file count, harder ownership and change review | Higher accidental coupling; no compatibility benefit | Rejected by selected four-file responsibility boundary |

No auth, network, data schema, or infrastructure migration is required. Rollback is a scoped source revert per completed increment. Preserve pre-existing working changes and local demo storage.

## 4. Current and proposed structure

Current relevant structure:

    src/
      app/                         Next routes, query parsing, catch-all allowlists, layouts
      components/dolores/           role screens, ROLE_NAV/MOBILE_NAV, view hook
      components/layout/           legacy Sidebar/Header
      components/landing/          landing navigation
      components/auth/             login navigation
      lib/axios/                   API clients and login redirect

Proposed:

    src/
      routes/                      NEW: application navigation contracts
        path.ts                    URL roots, PATH_* values and detail builders
        routes.ts                  route groups/catalog, supported-path predicates
        navigation.ts              desktop/mobile/legacy/landing menu metadata
        query.ts                   query builders, view types, resolution helpers
      app/                         RETAIN: Next route/layout files, thin consumers
      components/dolores/           CHANGE: route imports and metadata consumers
      components/layout/           CHANGE: use centralized navigation/paths
      components/landing/          CHANGE: use centralized navigation/paths
      components/auth/             CHANGE: use centralized paths
      lib/axios/                   CHANGE: redirect URL constant only

Existing store, hooks, services, schemas, providers, styles, assets, scripts, and data stay at their current locations. The client useRouteView hook stays in components/dolores; only its pure query construction delegates to routes/query.ts. No speculative shared layers or empty directories are created.

### Public interfaces and dependency direction

- path.ts exports PATH_PUBLIC, PATH_AUTH, PATH_ADMIN, PATH_MODERATOR, PATH_TECHNICIAN, PATH_DASHBOARD, PATH_TOOLS, PATH_SETTINGS, PATH_EXAMPLES, and PATH_LEGACY as required by the actual inventory.
- Public routes include home, solutions, products, technology, pricing, about. Tools include inventory, thermodynamics, model, model/viewer, assembly, and digital. Examples retain their present URLs but do not become menu items.
- Every current concrete app destination has a named constant or a named parameterized builder. Parameterized destinations that are only accepted for specific demo IDs must not become generically accepted by changing the builder.
- Detail builders accept raw segment values and encode each segment once. Verify existing machine decoding and round trips; do not change the receiver or double-encode already serialized values.
- routes.ts imports only path.ts and pure local route/query types as necessary. It exports typed role groups with child entries, support predicates, and pure path classification helpers used by the existing adapters.
- Exact supported paths are derived from PATH_* values rather than duplicated free-form strings. Moderator regexes are fully anchored and retain their current character/identifier constraints. Use segment-aware root matching.
- Static route files remain authoritative for registration; catalog entries describe existing routes and enforce catch-all constraints. Do not add a generic root catch-all or second routing runtime.
- query.ts is pure and browser/server safe. Expose buildRouteUrl(pathname, updates, currentSearch?) and route-specific view resolvers. Updates accept string or null; undefined means leave the current key unchanged, null deletes, and string sets. Preserve unrelated and repeated query values when not updated. Do not normalize pathname or strip hashes accidentally.
- Move route-owned view unions into query.ts when both page adapters and screens consume them. Retain compatibility type re-exports where required until all imports are migrated. Server route configuration never imports a client screen merely to obtain a view type.
- navigation.ts imports path.ts and route types, using serializable icon keys, label keys or labels, exact flags, and role/shell metadata. Icon rendering stays in components; keep it compatible with the current Dolores and lucide icon systems.
- Expose navigation factories for translated legacy menus; obtain translations from callers, without importing Zustand or hooks into routes/.
- App pages, layouts, UI components, hooks, and redirect sites may import pure routes modules. routes/ must never import app/, services, stores, React hooks, client UI, server headers, or model/Three.js code.
- The routes/ folder does not need use client. Current Next server/client boundaries, async params/searchParams signatures, loading/error/404 behavior, page bundles, and hydration ownership are retained.
- Role catalog fields organize routes only; auth continues to have its current behavior.
- REST endpoint constants, /api paths, model/image/video paths, external links, mailto/tel links, and fragment-only links are not application page URLs and are not migrated.

## 5. Verification strategy and requirement mapping

Implementation is sequential. No phase is marked Parallel because the route contracts and their consumers share files and dependencies.

Use the existing scripts and focused browser checks. No new test framework, dependency, or permanent generic audit subsystem is required.

Before editing, capture an in-memory comparison inventory of:
- app page URL patterns, including route groups omitted from URLs;
- each exact catch-all set and each moderator dynamic pattern;
- internal href/redirect destinations, base-path compositions, and links with query/hash values;
- menu definitions and shell/selection rules;
- query view/default rules and current representative browser behavior.

During implementation use a focused temporary assertion harness under a temporary directory, compiled with the existing TypeScript toolchain if needed. It must compare expected URLs/matches/query outputs rather than mirror the new implementation. Remove only task-created temporary artifacts after checks; no deliverable test framework is introduced. Do not run tests during this planning-only task.

Required cases:
- Static/detail helpers: existing IDs S-018, S-022, C-031, C-204, C-205, YC-017 and raw segment escaping; no double decoding.
- Catch-all parity: all original exact paths accepted; invalid siblings, unknown customer/technician IDs, malformed moderator IDs and extra trailing segments rejected as before. Exact entries precede dynamic patterns.
- Query parity: every declared admin view; absent and invalid view; machine=S-018 fallback; customer view/state passthrough; account preservation; null deletion; unrelated and repeated params; encoding; URLs without query.
- Browser: representative entry/detail/form transitions for admin, moderator, technician, customer, landing/login, settings/security, legacy tools/3D entrypoints. Check direct URL, refresh, back/forward, 404, menu state on desktop/mobile, and form state through view changes.
- Search audit: internal page path literals removed from hrefs, redirects, router calls, base-path assembly and matching outside routes/; remaining exceptions must be classified and justified.
- Baseline/final TypeScript check with incremental output disabled, existing lint command, existing build command. One full final run is sufficient unless subsequent edits warrant repeating it.
- If baseline checks fail, compare changed-file diagnostics and final failures to the baseline. New regressions block completion. Environment-only failures leave the corresponding criterion unverified and are reported; no claim of passing is made.
- Do not trigger auth/money actions against a live backend. Use local existing demo flows for navigation evidence.

| Requirement | Owner phase | Verification |
| --- | --- | --- |
| R1 | 1 | Path inventory and URL builder assertions |
| R2 | 2 | app/catalog mapping, catch-all parity, direct path/404 checks |
| R3 | 3 | Menu metadata equivalence, desktop/mobile/shell checks |
| R4 | 2 | Query/default/retention assertions and form navigation |
| R5 | 4 | Source navigation audit and representative link traversal |
| R6 | 5 | Cross-role browser comparison and baseline parity |
| R7 | 5 | Diff/dependency/deployment/auth scope review |
| R8 | 5 | Static/build results plus evidence of any limitations |

The request defines no pre-existing specification phases; these five phases separate the actual dependency boundaries. Their acceptance contract is section 1.

## 6. Phase 1 — Establish the path contract

- Outcome: named QLS-style URL constants cover all current application navigation.
- Entry: user has authorized implementation of this plan; target workspace and existing changes have been rechecked.
- Dependencies: accepted architecture and completed pre-edit baseline inventory.
- Scope: create src/routes/path.ts; define prefixes, static destinations, segment builders, and explicitly unresolved legacy targets.
- Non-scope: wiring menus/pages, changing URLs, broad frontend restructuring.
- Boundary / affected components: path.ts only; baseline inspection of existing route consumers.
- Interfaces: PATH_* groups and parameter builder signatures described in section 4.
- Side effects: one source file added; local baseline/build inspection may produce ignored cache files.
- Verification: compare every named path to the baseline; assert detail encoding; check module has no runtime UI/server dependencies.
- Acceptance: R1 covered, paths typecheck, no invented accepted route or destination.
- Exit: downstream consumers can import a stable, typed path contract.
- Risks: omitting legacy/example/tool links; confused input encoding; accidentally blessing /users as registered.
- Approval / stopping gate: stop for changed requirements or unpreservable parameter behavior; no separate per-file approval is needed within approved implementation.
- Review gate: review all URL values against actual app routes and baseline, and ensure scope-limited diff.

## 7. Phase 2 — Centralize catalog, catch-all rules, and queries

- Outcome: route support and view/query behavior have a clear owner used by Next page adapters.
- Entry: phase 1 accepted.
- Dependencies: path.ts stable and exact allowlists/defaults inventoried.
- Scope: create routes.ts and query.ts; replace catch-all sets/predicates; migrate route-owned view types/default parsing and useRouteView query assembly; update affected admin pages and screen type imports.
- Non-scope: moving page files, extracting all screen components, changing form workflows or API requests.
- Boundary / affected components: the three role catch-all pages; admin query-driven page adapters; relevant Admin*Screens types; useRouteView; explicit static dashboard adapters as needed.
- Interfaces: typed route records, role-scoped support predicates, buildRouteUrl, view union/resolver functions. No service/data schema change.
- Side effects: existing entrypoints call shared helpers; public routing behavior is required to remain equivalent.
- Verification: complete allowlist/pattern positive and negative comparison; query assertions from section 5; verify /dashboard/machines and /dashboard/businesses retain explicit-route precedence and shell handling.
- Acceptance: R2/R4 satisfied; no client code imported into pure configuration; form view transitions retain input, params and scroll behavior.
- Exit: catalog and query consumers compile and focused compatibility assertions pass.
- Risks: widening permissive regexes, unknown-view default differences, changing menu fallback for machine=S-018, double decoding details, client/server import cycles.
- Approval / stopping gate: stop if runtime behavior requires a URL or workflow change; preserve original predicates/defaults rather than choosing new behavior.
- Review gate: inspect catalog against each Next entrypoint; confirm no component registry eager-loads screen or 3D bundles.

## 8. Phase 3 — Centralize navigation and selection rules

- Outcome: menu additions/edits are maintained in routes/navigation.ts using named paths.
- Entry: phases 1 and 2 accepted.
- Dependencies: stable role/path classification.
- Scope: move ROLE_NAV, MOBILE_NAV, role labels, existing landing/legacy menu definitions and pure shell/selection helpers; wire DoloresShell, DoloresDashboardLayout, Sidebar and LandingNav.
- Non-scope: redesigning menus, adding entries, changing icon sets, fixing existing selection quirks.
- Boundary / affected components: navigation.ts plus existing shell/sidebar/landing consumers; UI icon maps remain in their current components.
- Interfaces: typed navigation items and role menu groups/factories; exact flags and selection exceptions preserved.
- Side effects: menus read configuration from one module; rendered order, labels, icons, destinations and shell ownership remain equivalent.
- Verification: compare all old/new metadata; check admin notifications, customer support/menu, technician root/tasks, customer businesses legacy shell, nested active paths, mobile menu open/close and notifications targets.
- Acceptance: R3 satisfied without routes importing UI, translation stores, browser hooks or heavy icons.
- Exit: every existing navigation definition has one owner and shell selection checks pass.
- Risks: circular imports via DoloresRole/icon types; translated labels frozen outside render; incorrect prefix matching; discrepancy between desktop/mobile selection.
- Approval / stopping gate: stop for any proposed UX behavior change; existing exceptions are explicit compatibility rules.
- Review gate: review both desktop and mobile menu equivalence and dependency direction.

## 9. Phase 4 — Migrate remaining internal navigation consumers

- Outcome: screens and infrastructure redirects consume centralized paths and queries.
- Entry: phases 1–3 accepted.
- Dependencies: all route APIs available.
- Scope: replace internal URL literals, BASE path compositions, path classification strings and query concatenations in existing role screens, overview/detail screens, landing sections, header, login, settings redirect, model entry pages, and Axios login redirect.
- Non-scope: changing Axios refresh logic, MFA/auth policy, demo payloads/storage keys, underlying screen dispatch business logic, API/asset/external URLs.
- Boundary / affected components: actual navigation sites discovered by search (initial search identified 32 source files); migrate matches based on purpose, not blind string replacement.
- Interfaces: consumers use PATH_* and buildRouteUrl; screen dispatch comparisons use shared constants/predicates while retaining branch order and fallback content.
- Side effects: navigation expressions change; no service calls are added and no data storage is cleared.
- Verification: audit all internal href/router/redirect/base-path sites; check demo identifiers that resemble route parts are left as data; traverse representative cross-role links, query-bearing links, detail links and return links.
- Acceptance: R5 satisfied; residual literals are limited to actual centralized declarations and intentional non-page targets; /users remains explicitly known legacy unresolved behavior.
- Exit: no unclassified application navigation literal remains outside routes/.
- Risks: accidentally replacing data IDs, malformed dynamic segments, BASE composition omissions, fragment or external-link changes, helper use causing UI remount.
- Approval / stopping gate: stop when a link repair requires choosing a new destination; record existing broken targets instead of expanding scope.
- Review gate: review the diff by navigation purpose and confirm business actions and demo stores are unchanged.

## 10. Phase 5 — Verify compatibility and hand off

- Outcome: a reviewable routing refactor with evidence for its contract and limitations.
- Entry: phases 1–4 accepted.
- Dependencies: focused assertions and source audit complete.
- Scope: run final TypeScript/lint/build checks and navigation smoke scenarios; inspect final diff for boundary/scope violations; fix only routing regressions introduced by this change.
- Non-scope: unrelated lint/type dependency repairs, redesign, auth hardening, deployment, commits or pushes unless separately requested.
- Boundary / affected components: verification across existing pages/shells and new routes modules; no new permanent test infrastructure.
- Interfaces: verify existing URL and query contract; no external API/schema changes.
- Side effects: local build/dev processes and ignored generated caches only; close task-created services after checks.
- Verification: execute the section 5 matrix; compare baseline results; ensure server/client separation, unchanged assets/API rewrites, no dependency additions, no new eager 3D imports.
- Acceptance: R6/R7/R8 satisfied; no new routing regression; every requirement has explicit pass/fail/unverified evidence. Any environment limitation is named and does not become an asserted pass.
- Exit: code/diff review complete, meaningful checks reported accurately, temporary task artifacts cleaned up, user receives changed-file and behavior summary.
- Risks: font/network availability, baseline tooling mismatches, incomplete browser access, existing unresolved links.
- Approval / stopping gate: stop and report concrete blockers when a required result cannot be established; do not deploy, push, clear user data, or broaden architecture during verification.
- Review gate: final compatibility review checks URL parity, navigation parity, query semantics, route support/404 parity, import boundaries, and no auth/deployment changes.

## 11. Recovery and implementation handoff

Before implementation, inspect and preserve the user's current working changes; do not infer a clean repository from the present source inspection. If Git operations are unavailable, use scoped before/after content comparison rather than destructive reset commands.

Each phase is a separately reviewable source increment. Roll back only files or hunks introduced by that increment; never discard pre-existing work, environment files, demo localStorage, models, CAD scripts, or existing plans.

The planning request authorizes this plan artifact only. Start product-code changes after the user instructs execution of this plan. No tests, installs, code modifications, commits, pushes or deployments were performed while preparing the plan.
