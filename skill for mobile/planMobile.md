# Plan

Implement a faithful mobile-web experience for Dolores Admin, Moderator, Technician, and Customer in the existing Next.js application. The current user has authorized implementation under the confirmed mobile-only, simulated-flow scope. Source review includes all four role inventories, structural prototype audit, targeted conflicts, and design-context screenshots for the four entry screens; implementation and acceptance remain in progress.

## Scope

- In: mobile pages and component states represented in canvases `87:12`, `87:13`, `87:14`, `87:15`; common guide `0:1`; widths below 1024 CSS px; existing simulated interactions. Include overlays, filters, action menus, confirmations, validation, cancellation, and simulated success/pending/applied states, not just overview pages.
- Out: all PC behavior at 1024px and above; landing and other public pages at every width; unrelated dashboard/settings/auth pages; global redesign; backend/API integration; new hardware capabilities; free-rotation 3D; Figma edits; publishing, commit, push, or deployment.
- Authority: [decisions](decisions.md). The user's specific Figma/mobile instructions take precedence over generic styling suggestions and the local create-plan skill's default read-only/final-message format. The user explicitly requested these files; preserve `create-plan/SKILL.md` unchanged.

## Action items

- [x] Confirm mobile-only scope, Technician source, responsive boundary, and simulated-data scope.
- [x] Inventory all top-level mobile frames and audit structural reachability from declared prototype starts.
- [x] Inspect representative design context/screenshots, existing layouts, route adapters, and shared state risks.
- [x] Resolve Q05/Q06: correct the mobile C-205 preview during implementation; exclude the two replaced Customer action panels.
- [ ] Complete per-frame route/state/edge/token/asset specifications using the handoff contract below. This remains required before expanding beyond the current entry-screen slice.
- [ ] Capture PC/public baselines. The current environment exposed no browser surface, so visual regression baselines have not been captured.
- [x] Add a responsive mobile shell and entry-screen composition for the four role start screens; keep desktop navigation selection and layout behavior intact in code.
- [x] Apply the approved mobile-only C-205 preview correction (Q05); keep the previous desktop route result.
- [ ] Implement and verify complete role journeys in dependency order, preserving shared business rules and desktop behavior.
- [x] Run `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`; lint has one existing `<img>` warning in the MFA setup.
- [ ] Run visual, interaction, mobile-browser, authorization, and regression checks using [testuxuiMobile](testuxuiMobile.md). Browser verification is currently blocked because CUA exposes no browser.
- [x] Record the partial implementation, source defect, checks, and blockers in [reportMobile-run-2026-10-08.md](reportMobile-run-2026-10-08.md).

## Evidence and coverage

| Role | Canvas | Root frames | Inspected entry | Structural actions | Unreached frames |
| --- | --- | ---: | --- | ---: | ---: |
| Admin | [87:12](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=87-12) | 97 | `88:134` A01 | 509 | 0 |
| Moderator | [87:13](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=87-13) | 204 | `90:19060` M01 | 1,036 | 0 |
| Technician | [87:14](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=87-14) | 50 | `89:19705` T01 | 291 | 0 |
| Customer | [87:15](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=87-15) | 201 | `90:24427` C01 | 1,111 | 11 |

Total: 552 source frames and 2,947 observed reaction actions. Nine historical Customer draft alternatives are excluded by D-01; two old action panels are excluded by confirmed Q06. Current accepted baseline: 541 frames (Admin 97, Moderator 204, Technician 50, Customer 190), including the approved Q05 preview correction. Reconcile this baseline after a source change; 2,947 is a raw source-action count, not the approved interaction test denominator. Counting both deprecated frames and active replacements as mandatory delivery would inflate scope.

Inventories: [Admin](inventory/admin.md), [Moderator](inventory/moderator.md), [Technician](inventory/technician.md), [Customer](inventory/customer.md). Audit method/results: [structural-audit.json](evidence/structural-audit.json). No observed non-variant navigation destination left its role's root frame set. This does not prove semantic correctness, full component-variant behavior, or every user journey; reachability from multiple starts does not prove reachability from the main home screen. No full 552-screen visual QA has been performed.

## Existing application and impact boundaries

Observed package versions: Next `^16.2.9`, React `^19.2.7`, TypeScript, Tailwind `^3.4.1`; Zod, Zustand, TanStack Query, Axios, Recharts, Lucide and Heroicons already exist. These are package declarations, not a claim of exact resolved runtime versions. `README.md` describes a Go identity service and is not a reliable map of this frontend; use actual source and package scripts.

| Existing area | Planning implication |
| --- | --- |
| `src/components/dolores/DoloresShell.tsx` | Shared desktop shell has `min-w-[1024px]`, 240px sidebar, 72px header and 80px footer. Do not remove desktop geometry globally. Introduce mobile-only composition/variants below the confirmed breakpoint for allowlisted routes. |
| `DoloresUI.tsx`, `DoloresOverviewPages.tsx`, role `*Screens.tsx` | Reuse matching primitives and logic; add scoped mobile presentation only when existing components cannot express Figma. Audit every consumer before a shared change. |
| `src/app/(admin)/layout.tsx` and `/admin/*` pages | Explicit Admin page routes; do not invent a nonexistent Admin catch-all. |
| `src/app/(moderator)/moderator/[...sections]/page.tsx` | Existing allowed path set and dynamic IDs; map frames onto existing sections. Unknown destinations must not become a generic fallback. |
| `src/app/(technician)/technician/[...sections]/page.tsx` | Explicit allowed task/history routes; retain guards and not-found behavior. |
| `src/app/(dashboard)/dashboard/*`, `DoloresDashboardLayout.tsx` | Customer URL base is `/dashboard`. Inspect layout branching before any change: the route group also contains unrelated tools. Do not apply mobile styles indiscriminately to the whole route group. |
| `useRouteView.ts` | Existing query-driven view navigation retains owning form state. Map browser back/forward and overlay behavior explicitly; one Figma frame need not be one URL. |
| `demoFlowStore.ts`, `src/schemas/doloresDemo.ts` | Existing localStorage demo flow/records shared across screens. Preserve persistence contracts, role/tenant boundaries and simulation labels. Avoid mounting duplicate desktop/mobile forms that both mutate state. |
| `src/app/layout.tsx`, `globals.css`, `tailwind.config.ts`, providers | High blast radius: fonts, reset, global tokens and themes affect landing/PC. Prefer inherited existing fonts and dashboard/mobile-scoped tokens; avoid global selector overrides. |

Git was already dirty before this implementation turn, including package.json, role screens, and demo-state files. Preserve those existing changes. The current work also changes the scoped Dolores shell/UI and the mobile skill package. Recapture status before each slice; never reset or revert unrelated edits.

## Phase 0 — freeze the implementation specification

Entry: user requests implementation; current source and decisions loaded. Deliverable: an explicit allowlist of route + role + node + state combinations, exclusions, and a dependency-ordered backlog.

For every accepted frame, capture the following before its code changes:

| Field | Required content |
| --- | --- |
| Identity | Role, canvas/node URL, exact frame name, capture date, source dimensions, primary versus alternate status. |
| Entry | Actual route/query/entity, prior screen, role/tenant fixture, prototype flow start if any. |
| Visual | High-fidelity design context and screenshot; typography, spacing, colors, border/radius, scroll/sticky behavior, asset slots. |
| Interaction | Source node/control label, trigger, precondition, destination ID, navigate/overlay/change-variant/close/back type, animation/easing, cancel/back effect and state mutations. |
| Data | Existing demo record/fixture, display formatting, standard/Smart eligibility, editable/read-only fields, validation rule source. |
| Implementation | Existing component(s), planned mobile-only extension/new primitive, consumer impact, routing/state reuse. |
| Acceptance | Test case IDs, required viewport/fixture, expected text/state, reference screenshot and evidence path. |
| Status | NOT_STARTED / SPEC_READY / IMPLEMENTED / VERIFIED / BLOCKED / EXCLUDED with decision ID and reason. |

Do not manufacture missing values. A frame without known incoming path or with contradictory destination stays blocked while independent frames continue. Resolve inherited variant actions as well as explicit instance reactions. UI data entry should accept the agreed demo inputs; do not fake a successful form by navigating on every click.

## Phase 1 — baseline and mobile foundation

1. Capture current PC screenshots and critical flows at 1024, 1280 and 1440px; capture landing/public pages on both narrow and wide widths. Inventory consumers of shell, primitive, font and state changes.
2. Use one role/entity state owner. Add a mobile presentation boundary only for the allowlisted routes at `<1024px`; maintain stable SSR/hydration and avoid duplicate IDs, focusable hidden navigation, double event handlers or double requests. Reuse routes; do not add `/mobile` redirects merely to separate styling.
3. Extract scoped design tokens from current Figma. Entry-screen evidence: canvas `#F8F6F3`, surface white, primary `#B81724`, text `#302927`, secondary `#706561`, border `#E9E2DC`, sand `#F4EAE3`; Inter; 24px semibold page heading, 18px section heading, 14px body, 12px supporting copy, 1.45 line-height where shown. These samples are not authorization to flatten every component to the same values.
4. Build/reuse mobile header, scroll region, bottom action bar, bottom navigation and “Khác” overlay. Reference entry screens use 64px header, 16px horizontal content inset, 20px top inset, 16px content gap; their 640px scroll viewport is specific to 390×844. Derive actual heights per frame; do not hardcode 844px for all devices.
5. Compose DataCard (guide `87:16`), metric pairs, panels, one-column forms, labels/status notices, filter chips, document preview, dialogs and action menus from source. Use exact shown navigation labels and order per role. Preserve source NAVIGATE versus OVERLAY semantics, close behavior and focus return; never turn all overlays into new pages.
6. Account for browser toolbar changes, virtual keyboard and safe-area insets without hiding last content or stacking CTA over navigation. Test content scroll separately from fixed regions. At unshown widths preserve hierarchy; any meaningful alternative responsive design needs user decision.

Exit: representative overview/list/form/overlay composition matches references at 390×844, works at the breakpoint boundaries, and all protected baselines remain unchanged. No arbitrary palette, font, icon library or component-library migration.

## Phase 2 — role work packages

Each package includes its filters, action menus, confirmations, errors, previews, success states, and return paths in the inventory. Numeric frame prefixes are grouping aids; exact node IDs remain authoritative.

| Package | Figma groups / anchors | Existing route area | Deliverable and acceptance focus |
| --- | --- | --- | --- |
| A1 | A01/A05/A08/A09 | `/admin`, reports, notifications | KPI distinction: gross receipts, revenue excluding deposit, deposit separate; period filters, customer report drill-down, chart labels. |
| A2 | A02/A03/A03-MOD/A03-TECH/A07/A26/A26-TECH | users | Admin manages all three account roles; create/edit/confirm/error/success and permissions/status. |
| A3 | A04/A06/A10/A11/A12/A13/A13-STD/A24 | stores, businesses, contracts | Customer → contract → machine → history; selected IDs and C-204 versus C-205 stay consistent through preview/back. |
| A4 | A14/A14-STOCK/A15/A15-STD/A15-MB/A23/A25 | machines | Stock, standard/Smart/buyback records, loans and repair/parts histories. |
| A5 | A16/A17/A18/A19–A22/A27 | iot, menu | Customer-machine monitoring, recipe quantities/missing ingredients, menu dispatch and confirmation. |
| M1 | M01/M28/M29/M40/M02–M05 | `/moderator/contracts*` | Contract creation and standard/Smart handover; C-205 preview isolated by Q05. |
| M2 | M06/M07/M21–M24/M34/M39 | invoices | First/periodic invoice, reconciliation, shortfall/excess, late cups, overdue debt and invoice version history. |
| M3 | M11–M14/M26/M30/M31/M35/M36 | contracts, machines/substitute | Retrieval request → Technician assessment → settlement/refund; compensation and replacement-machine allocation. |
| M4 | M08/M10/M33/M42–M46; M19/M20/M38 | machines, machine-history, technical-requests | Stock/loans/history plus task type selection, assignment and returned result. |
| M5 | M15/M16/M32 | buyback | Assessment, agreed collection, purchase documents, refurbishment and inventory. Customer acknowledgement tracked separately; do not block dispatch on it. |
| M6 | M17/M18/M37; M09/M25/M50–M52; M47/M48 | iot, menu, customers | Smart telemetry/model illustration and recipe flow; Moderator creates only Customer accounts. |
| T1 | T01/T09/T12 and filters | `/technician/tasks*`, notifications | Assigned jobs, task detail/type and notifications; preserve role access and selected task. |
| T2 | T02/T03/T04/T14 | task forms | Standard handover, Smart activation, repair/parts and maintenance record with confirmations and results. |
| T3 | T05/T06/T13 | retrieval, substitute, substitute-return | Condition assessment before Moderator settlement; replacement handover/return and chronology. |
| T4 | T07/T10/T08/T11 | refurbishment, buyback-assessment, history | Assessment/collection-related work represented in source, refurbishment/tests and machine histories. Do not invent an extra collection form if none is mapped. |
| C1 | C01/C02/C19/C35 | `/dashboard`, contracts | Overview, contracts and previews, standard versus Smart distinctions. |
| C2 | C03–C06/C17/C18/C29/C32/C33 | machines | Owned machines, telemetry/offline last-known data, two-angle illustration, current menu and replacement/history. |
| C3 | C07–C09/C20/C22–C24/C30/C36/C37 | invoices | Invoice details, simulated proof upload, shortfall/excess and completed refund. Preserve source currency, units and debt examples. |
| C4 | C10/C13/C21/C34/C11/C14/C25/C26 | support, notifications, contracts | Incident/report progress, expiry/termination and contract communication; cancel/error/success remain complete. |
| C5 | C12/C15/C16/C27 | buyback | Offer and document view/acknowledgement; no real file upload or transaction in current scope. |
| C6 | C28/C38/C40–C44 plus quantity variants | menu | Private recipe editing: 40→60ml, 18→20g, milk 120→150ml, combined quantities, discard and missing ingredients. Combined save/send → pending → device acknowledgement; never mutate Global Menu or another customer. |
| C7 | C45–C48 and later applied/edit-again branches | menu | Add eligible private dish from Dolores, unsupported-device state, confirmation, waiting and applied. Include repeated editing after an applied state; do not stop at the older guide's C38–C44 scope. |

Recommended dependency order: foundation → read-only A1/A3/A4/C1/C2 → account and contract entry A2/M1 → task M4/T1/T2 → retrieval T3/M3 → invoice M2/C3 → buyback T4/M5/C5 → menu A5/M6/C6/C7 → remaining support/history/notification branches. This is scheduling, not permission to skip a package. Complete each vertical journey before widening the batch.

## Phase 3 — shared simulated business behavior

- Account roles: Moderator creates customers only; Admin manages Customer/Moderator/Technician. Route availability and visible actions must agree; do not infer real security guarantees from client-only demo guards.
- Billing: paid/reconciled bills send late cups to next period; editable, unclosed, in-time bills recalculate and resend. No silent edits to locked history. Gross receipts include deposit; operational revenue excludes it; show deposit separately.
- Recovery/deposit: Technician retrieves and assesses before Moderator settlement. Compensation beyond deposit and completed refunds remain distinct states. Simulate existing records; do not send real refunds.
- Machines: standard models have contract location and records, not GPS/telemetry/remote menu. Replacement is same type; Smart cups allocated by use period into the main contract. Keep entity IDs consistent through route/query/store and presentation.
- Recipe: coffee + fresh milk are mandatory for the corresponding drink; preserve g/ml units. Retain current input before cancel/retry as specified. Customer menu belongs to that customer and eligible machines. Saved/dispatched/pending/applied are distinct even when saving and sending is one UI operation.
- Buyback: collection by agreement and customer document acknowledgement are separate. Moderator supplies documents; Customer views/confirms; Technician records relevant work. Vector two-angle model is the agreed illustration, not a promise of free 3D rotation.
- Fixtures: reuse source sample C-204/S-018 and C-205/C-031 plus existing demo records. Reset only test-owned fixtures between runs; test repeated submissions, refresh and stale localStorage. Any new recovery screen or product behavior absent from source requires a decision.

## Phase 4 — verification and acceptance

Run [testuxuiMobile](testuxuiMobile.md) per completed slice, then across combined journeys. Capture exact-reference screenshots at 390×844 and scroll positions including the bottom of long content; cover every approved state, not only entry screens. Suggested robustness widths are 320, 360, 375, 414, 768 and 1023px, plus actual browser keyboard/safe-area behavior. Protect PC at 1024/1280/1440 and landing/public pages at all tested widths.

Use existing `npm run lint`, `npx tsc --noEmit`, and `npm run build` after implementation; no test script is currently declared. Choose available browser testing tools and report unavailable coverage; do not claim Playwright, real iOS Safari or automated accessibility checks ran unless they did. No application build is necessary for this documentation-only task.

Acceptance requires all approved frame/edge mappings accounted for; no unresolved in-scope implementation mismatch; agreed fixture outcomes; no new PC/public regressions; validated assets and role-specific navigation; and a report with PASS/FAIL/BLOCKED/NOT_RUN/EXCLUDED counts. Exclusions cite a decision. Structural Figma audit is not UI test evidence. Known pre-existing defects are recorded separately rather than repaired outside scope.

## Phase 5 — review and handoff

Use [startDesign](startDesign.md) to resume the requested mode. Report every source defect with node, reproduction, user impact, proposed Figma correction and status. Faithful implementation fixes remain authorized once implementation is requested; source changes or deviations require explicit approval. Never edit Figma as part of reporting. Release/commit/deploy is outside this planning request.

## Open questions

- No unanswered question currently blocks this planning deliverable. Q05 and Q06 are approved and recorded.
- Broader-width layout/unspecified error cases: ask with concrete screen evidence when a material choice arises; do not treat all future technical details as a global blocker.
