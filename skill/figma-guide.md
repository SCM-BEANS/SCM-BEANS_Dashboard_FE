# Dolores: shared implementation contract

## Scope and authority

- Product and brand: **Dolores**, designed and owned by the user.
- Target repository: `D:/capstone prj/SCM-BEANS-FE/SCM-BEANS_Dashboard_FE`.
- Figma file key: `z34Av71ZjvqjF0AQ0hyQxK`.
- [Shared guide page 0:1](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=0-1).
- [Guide text and prototype entry points 3:68](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=3-68).
- [Original reference 51:244](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=51-244) is the **DL/TableRow component**, not the complete design guide.
- PC canvases: Admin `3:2`, Moderator `3:3`, Technician `3:4`, Customer `3:5`. The guide also mentions mobile; this assignment does not authorize implementing the separate mobile designs.
- The user's explicit decisions control scope and resolve ambiguities. Otherwise follow current Figma visual/interaction evidence. Existing code supplies implementation conventions and integration contracts; it does not authorize a Figma redesign.
- Where Figma, guide text, or repository behavior conflict, show the concrete conflict and ask. Do not silently pick whichever is easiest.

## Evidence snapshot and limits

Read on 2026-10-02 through Figma metadata: guide text, component identities, and direct top-level frame inventories for all four PC role canvases.

| Canvas | Top-level frames observed |
| --- | ---: |
| Admin | 63 |
| Moderator | 140 |
| Technician | 40 |
| Customer | 124 |
| Total role frames | 367 |

These are frame counts, **not counts of unique pages, implemented features, or verified prototype edges**. Dialogs, filters, alternate variants, and pending alternatives are included. The guide's older claim of 339 desktop frames differs from this live inventory; refresh the inventory rather than treating either count as a completion guarantee. The inventory files do not certify visual fidelity or functional behavior.

Before implementing a target, obtain its current screenshot, design properties, component instances/variants, and actual interaction destinations. Inspect both the source and destination of each transition. Frame names and visual order do not prove a flow connection. If a unique inspection requires `use_figma`, load the installed `figma:figma-use` skill first and keep inspection read-only.

## Shared design components

Read exact properties and assets from Figma; do not invent hex colors, font families, weights, spacing, corner radii, shadow values, animation timing, or substitute icons.

| Reference | Node | Required states |
| --- | --- | --- |
| DL/Button | `51:191` | Primary/Secondary; Default, Hover, Pressed, Disabled |
| DL/Input | `51:212` | Default, Focus, Filled, Error |
| DL/Upload | `51:223` | Empty, Uploaded, Error |
| DL/Checkbox | `51:230` | Unchecked, Checked |
| DL/NavItem | `51:239` | Default, Active, Hover |
| DL/TableRow | `51:244` | Default, Header |
| DL/Notice | `51:254` | Info, Warning, Success |
| DL/Machine model | `59:38` | Angle, Front |
| KPI card | `3:64` | Inspect properties on the target instance |
| Status components | `3:56`, `3:58`, `3:60`, `3:62` | Inspect labels and tones in context |

Use the source frame's actual viewport dimensions for visual comparisons. Preserve its layout, scrolling, fixed regions, text wrapping, density, action placement, and branding. Inspect logo/icon assets from the file rather than generating replacements.

For unspecified responsive behavior, loading/error states, labels, accessibility visuals, or navigation destinations, preserve existing compatible behavior where it does not alter the specified design; ask before introducing a new visible design or product flow.

## Confirmed business invariants from the guide

1. Moderator creates **Customer accounts only**. Admin creates/manages Customer, Moderator, and Technician accounts. Do not infer permission to create another Admin.
2. Late cups for paid/reconciled bills carry forward to the next period. A bill may be recalculated and resent only if it is unfinalized, within term, and still editable. Unpaid does not automatically mean editable.
3. Gross receipts include all collected amounts; actual revenue excludes deposits; deposits display separately.
4. Used-machine purchase collection may proceed according to the agreement. Customer acknowledgement is tracked separately and does not block dispatch. Moderator uploads purchase documents; Customer views and acknowledges them.
5. Fresh-milk coffee requires coffee and fresh milk. Preserve gram/ml units. Example quantities are demonstration values, not hardware bounds.
6. Technician retrieves and assesses a machine before Moderator settles/refunds the deposit. A substitute machine is the same type; Smart cups are allocated by usage period to the main contract.
7. Standard machines expose contract location and records. Monitoring, GPS, and remote menus belong to Smart IoT machines only.
8. Customer private-menu edits affect only that customer's menu and eligible machines. Preserve separate meanings for saved, sent, pending machine acknowledgement, and actually applied.

## Confirmed decision D-01: save and send in one action

Status: **confirmed by the user on 2026-10-02**. Exact answer: “lưu và gửi cùng một lần”. This decision resolves the previous Customer private-menu ambiguity and takes precedence over older separate-draft wording in the Figma guide. Do not ask the user to choose this again.

- Use the combined “Lưu và gửi” action and its existing Figma confirmation. Confirming it saves the customer's private menu and initiates sending to the eligible selected machine in the same user operation. Do not add a second save-only or send-only step to this successful path.
- Reference combined confirmations `114:23416`, `114:23434`, `114:23452`, and `156:5777` for the corresponding quantity variants. Inspect their current live transitions before implementation; the decision does not certify prototype wiring.
- Preserve editing, validation and cancellation behavior from the selected Figma flow. Cancellation before submission must not save or send.
- After a successful submission, follow the relevant sent/pending-machine state, then show applied only after machine acknowledgement. One user action does not imply immediate device application or a single atomic backend request.
- Do not expose an independent draft-save feature. Exclude these six C39-ALT draft alternatives and their separate-send confirmations from implementation: `114:22269`, `114:22615`, `114:22961`, `114:23425`, `114:23443`, `114:23461`. Keep their original names in the source inventory for traceability; classify them as **excluded by D-01**, not blocked, missing, or passed.
- Guide text `119:12` and the original “Cần chốt lưu nháp riêng” labels remain historical source evidence; this package records the user's resolution without modifying Figma.
- Saving, dispatching, and machine acknowledgement remain distinct service outcomes. Use existing contracts to represent them truthfully. This decision does not define rollback, automatic retries, or new recovery UI if saving succeeds but dispatch fails. If those behaviors are absent or conflict with the selected Figma states, ask about that specific integration gap before implementing it; do not reopen D-01.

## Prototype and integration boundaries

All values shown in the Figma file are illustrative. The implementation review prioritizes whether the page flow matches Figma: entry points, user actions, guards, destinations, confirmation/success/error states, and back/cancel behavior. Do not block work or ask the user to resolve differences in sample names, IDs, amounts, dates, or other display data when those differences do not change the flow or a confirmed business invariant. Ask only when the discrepancy changes what the user can do or what state/outcome the system presents.

The guide also identifies sample input steps. Uploads, menu delivery, reconciliation, and transactions are not evidence of live integrations.

- Main sample journeys focus on `C-204/S-018` and `C-205/C-031`. Other table rows may only illustrate data. Error-form screens can have separate prototype starting points.
- Use fixtures only in an explicitly identified preview/test context. Do not replace current real data fetching with hardcoded prototype values.
- The machine illustration is a two-view vector with Smart Animate, not a freely rotating 3D viewer. Actual 3D assets, supported telemetry, and hardware quantity bounds require supplied evidence.
- A socket name, API method name, screenshot, or placeholder URL does not prove a service works. Record missing contracts and ask where needed.
- Example overdue balances 1,000,000 → 1,050,000 → 1,102,500 do not authorize hardcoding a universal fee policy.
- Keep existing authentication, tenant checks, error handling, and service contracts unless an explicitly approved change requires otherwise.

## Repository boundaries

Inspect current route groups, layout composition, shared components, state management, and package scripts before selecting files. Follow current repository instructions.

Protect `src/app/page.tsx`, `src/components/landing/`, and all other routes outside the confirmed frame mapping. Changes to root layout, providers, global CSS, font loading, shared theme, or shared UI can affect them indirectly; prefer dashboard-scoped wrappers/tokens and verify the impact of any shared change. Do not globally rename existing public branding as a side effect of Dolores dashboard work.

UI role restrictions must agree with existing authorization. Do not invent backend roles, token schemas, API endpoints, or financial calculations to fill design gaps.

## Required implementation and handoff record

Maintain this in the task's working notes or an existing project tracking artifact; do not add unrelated documentation.

| Field | Record |
| --- | --- |
| Scope | Role, Figma page, exact frame/state node ID, current evidence date |
| Mapping | Existing/proposed route, component, modal/filter/state; reason for any new route |
| Flow | Entry point, trigger, guard, destination/state, cancel/back behavior |
| Data | Existing query/service, ownership, units, sample versus real data |
| Status | Not started / implemented / checked / blocked / excluded by explicit decision |
| Evidence | Figma screenshot/properties, application screenshot, test/review result |
| Decisions | Question, affected nodes, user's explicit answer, remaining dependency |

Ask focused questions with the node/link, observed conflict or missing information, and the decision needed. Suggestions must be labeled as proposals until approved. Do not let an unresolved item block unrelated authorized work.
