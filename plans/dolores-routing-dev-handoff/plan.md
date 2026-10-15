# Dolores developer implementation plan

**Mode: Hard**  
**Risk: high-risk — payment/deposit accounting, tenant isolation, device event integrity and inventory ownership can cause financial or operational records to be wrong if implemented from the visual prototype alone.**  
**Spec quality verdict: WARN — the confirmed flows are detailed enough to plan vertical slices, while open OI items still gate specific production behaviors.**  
**Status:** Planning document only. No application code or tests were created or run.

## Objective

Turn the confirmed Dolores rental and used-machine buyback flows into a developer-ready implementation sequence. Deliver a thin shared foundation, then complete role-based end-to-end slices so each increment has a usable path through the affected screens and records. Preserve the accepted business sequence and isolate unresolved decisions rather than making them silently.

## Scope and current repository

The repository at `E:/Đồ án/dolores-nextjs` is a **frontend demonstration only**. It is a Next.js app with four role workspaces, route-driven screens, CSS/Motion interactions and sample state held by the demo store. Its README explicitly says it has no connected backend, real accounts, server-side uploads, live telemetry, device menu synchronization or interactive machine model.

The following production components are **not specified and do not currently exist in this repository**: backend/API, database and migrations, authentication/session provider, private file storage and access policy, Smart IoT/Edge protocol, device registry/command transport, usage-event ingestion and reconciliation. Select or design these only through discovery and recorded Architecture Decision Records (ADRs). Do not assume a vendor, framework, API shape, database schema, protocol or hosting platform in advance.

The implementation boundary includes Admin, Moderator, Technician and Tenant/Customer experiences; conventional and Smart IoT rental lifecycles; Global/private Smart menus; usage/PAYG; billing and external-transfer reconciliation; maintenance/repair/replacement history with SLA commitment tracking; deposit settlement; buyback and stock release; reporting, reminders and responsive web.

Out of scope per baseline: coffee supply/inventory, online payment or bank APIs, automated contract enforcement, Technician shift/availability calendars and automatic scheduling/dispatch, internal Technician scoring criteria, internal company valuation criteria, and Smart capabilities/payloads not established by discovery. SLA tracking is newly requested; its unconfirmed targets and clocks stay behind OI-19.

## Source and rule handling

Use `spec.md` and its linked flow, state, route, acceptance and open-decision documents as the implementation baseline. The latest user-confirmed decisions take precedence over older SRS text. Prototype contents are visual examples, not behavioral authority. Preserve all 20 main flows and their 45 scenarios; do not add product behavior through implementation assumptions.

Use the business rules in `spec.md`, especially: one primary physical machine per rental contract; same-type temporary replacements only; external paper contracts and bank transfers; upload+Confirm and Moderator reconciliation as distinct payment events; late ordinary cups carried forward; final Smart bill waits for complete usage through the real use cutoff; deposits tracked separately; Technician recovery/assessment before Moderator deposit settlement; Admin-only staff/shop/Tenant-status/access management with Moderator Tenant creation; internal-only Global Menu; Tenant private recipes; and a new contract rather than renewal.

### Open-decision gates

`[NEEDS CLARIFICATION]` items stay open and block only dependent production behavior:

| OI | Still open | Behavior held behind the gate | Work that can continue |
|---|---|---|---|
| OI-01 residual | Tenant↔shop cardinality and exact setup/link sequence | Final shop/Tenant onboarding constraints that depend on the relationship | Auth foundation, account roles, shop records and non-ambiguous Admin/Moderator permissions |
| OI-02, OI-13 | Authentication/session lifecycle, status catalogue/actions, evidence file constraints and correction rights | Login lifecycle, account state transitions, final validation/retention limits | Screen flows, role matrix and provider evaluation |
| OI-03, OI-04 | Edge payload/capability model, online/stale/GPS semantics and contract offline-limit handling | Production telemetry mapping, device health/GPS semantics and unsupported capability handling | Device boundary/adapter design and mock contract tests planned for later |
| OI-09, OI-10 | Final-data completeness signal and event identity/deduplication/retry rules | Final Smart bill release and production usage de-duplication | Ordinary rental/billing path; interfaces can be documented without inventing implementation details |
| OI-12 | Menu versioning, offline queue/retry, simultaneous edit and removed-item conflicts | Production command retry/conflict policy and final capability conflict behavior | Global/private recipe ownership and non-overwrite UI states |
| OI-05, OI-06 | Proration denominator/date inclusivity/rounding, timezone/cutoff, due/overdue day counting | Production date calculation, final-month amount and compounding schedule | Agreement fields and calculations isolated behind explicit policy modules; no final production charging before answer |
| OI-07 | What happens to reminder/late-fee state after rejected proof or Moderator finds short payment; allocation/rounding | Post-submission short/rejected payment behavior and partial allocation | Preserve upload+Confirm cutoff, evidence, reconciliation and exact amount matching for straightforward cases |
| OI-14 | Refund clock if final bill still awaits complete Smart data; deduction priority | Deposit finalization/refund timing where the bill is pending and deduction order | Collection/assessment, settlement draft and independent external refund records where no conflict exists |
| OI-17 | Revenue period, refunds/net presentation and some fee categories | Final revenue report totals/netting and category labels | Reconciled receipt ledger and separate gross/actual/deposit data capture |
| OI-08 | Reminder channel, dispatch timing and one-month date interpretation | Delivery schedule and expiry date computation details | Exact in-app target records, readable reminders and event history |
| OI-15 | Full inventory states, service-return availability and stock-shortage handling | Final availability catalog and shortage procedure | Enforce confirmed same-type/overlap constraints; keep unavailable records out of allocation |
| OI-16 | Failed/disputed buyback transfer, canceled purchase and unsuccessful collection | Exceptional buyback settlement/rollback branches | Happy path, agreement-linked collection and acknowledgement tracking |
| OI-18 | Supported clients and non-functional/security/performance targets | Numeric service levels and final operational controls | Establish an ADR/NFR review without inventing numeric targets |
| OI-19 | Service SLA targets, clocks, milestone policy, alerts and customer visibility | SLA tracking capability is requested; no service target values or clock policy are confirmed | Capture approved SLA source/reference and task timestamps; keep derived SLA status/reminders gated until approved |

Do not change an open OI to a resolved requirement in code or documentation without a recorded business answer.

## Phase map and complete flow coverage

Scenario IDs below are the source scenario IDs. A flow split across phases retains its source ID and is counted once in the final 20-flow/45-scenario coverage report.

| Phase | Vertical outcome | Main flows/scenarios covered |
|---|---|---|
| 00 Discovery and architecture decisions | Approved technical boundaries and decision register | Cross-cutting; no business scenario is closed here |
| 01 Thin shared foundation and access | Role-scoped shell, identity boundary, accounts, shops and access | MF-20/S01; authorization prerequisites for all flows |
| 02 Rental contract, machine record and handover | Onboard, sign/upload, allocate, deliver and install conventional/Smart machines | MF-01/S01–S02, MF-02/S01–S02, MF-03/S01–S02, MF-15/S01, MF-17/S01 |
| 03 Smart IoT, PAYG, telemetry and menus | Device boundary, event ingestion, monitoring and Global/private menu | MF-06/S01–S02, MF-07/S01–S04, MF-17/S02; finish MF-03 activation integration |
| 04 Billing, evidence and reconciliation | First and monthly bills, payment proof, reconciliation, due/overdue, receipt ledger | MF-04/S01–S02, MF-05/S01–S02; MF-06 billing handoff |
| 05 Service requests, maintenance SLA, repair and replacement | Approved service deadlines, manual Moderator coordination, Technician outcomes, machine/service history | MF-08/S01–S02, MF-09/S01–S03, MF-16/S01–S02, MF-15/S02–S03; OI-19 gates calculations/alerts |
| 06 Expiry, termination, settlement and new contract | Expiry response, recovery, Technician assessment, deposit settlement and new independent lease | MF-10/S01–S02, MF-11/S01–S02, MF-12/S01–S02, MF-13/S01–S02, MF-14/S01–S02 |
| 07 Used-machine buyback and inventory release | Eligibility, assessment, agreement, evidence, collection, refurbishment and release | MF-18/S01–S03, MF-19/S01–S02; integrates the MF-15 inventory records without redefining its scenarios |
| 08 Reporting, reminders, responsive UX and hardening | Admin operational overview, actionable cross-role reminders, mobile UX, and integrated verification | MF-20/S02; reminder/read/navigation requirements across MF-04–MF-19; final verification of MF-01–MF-20 and all 45 scenarios |

## Dependencies

```text
P00 decisions / ADR boundaries
  └─ P01 thin foundation (auth, role/scope, account/shop, file-storage interface)
       └─ P02 rental + machine + handover
            ├─ P03 Smart IoT + menu
            │    ├─ P04 Smart PAYG billing (OI-03/09/10 gates)
            │    └─ P05 Smart replacement usage attribution
            ├─ P04 conventional/base billing
            ├─ P05 service + replacement
            └─ P07 buyback + refurbishment/release
P02 + P04 + P05 ──> P06 expiry/termination/deposit/new contract
P03 ──> P06 Smart final-use closeout (also gated by OI-03/09/10/14)
P05 ──> P07 Technician task/history reuse
P02/P03/P04/P05/P06/P07 ──> P08 reports, reminders, responsive UX and hardening
```

Conventional/base billing and non-Smart service work can progress from P02 without waiting for P03. Smart PAYG billing and Smart replacement-use attribution depend on P03's device data contract and the named telemetry gates. P07 also consumes the Technician task/history foundation from P05. P06 must consume the real machine/task, payment and deposit records from earlier slices; it must not re-create them. P08 is the final integration/verification slice and consumes persisted records from the other slices.

## Task checklist

Native host task list is unavailable here; use this checklist as the tracked plan.

- [ ] P00: approve architecture/ownership ADRs; maintain OI register and record gates.
- [ ] P01: create the selected identity, account, role/scope, shop/access and private-file foundation.
- [ ] P02: complete contract onboarding, machine identity/inventory, external agreement upload and conventional/Smart handover journeys.
- [ ] P03: integrate Smart event/menu/device boundaries and precise machine monitoring without estimated telemetry.
- [ ] P04: implement bill and bank-evidence workflows with distinct submission, reconciliation, receipt and refund records.
- [ ] P05: complete support, approved service SLA tracking, Technician tasks, maintenance/repair history and same-type temporary replacement journeys; do not build a Technician calendar or automatic dispatch.
- [ ] P06: complete expiry, normal/early/violation closure, assessment-before-settlement, external deposit refund tracking and new-contract continuation.
- [ ] P07: complete eligible-customer buyback from Technician assessment through Moderator release after satisfactory test.
- [ ] P08: complete Admin operational views, event-backed reminders, responsive mobile web, SLA compliance views gated by approved OI-19, integrated acceptance matrix, security/integrity checks and release review; do not claim pass until evidence exists.
- [ ] Update source traceability and OI statuses only when confirmed answers or implementation evidence justify a change.

## Verification approach (planned only)

No tests are authored or run as part of this plan. In each implementation phase, first create the phase's test design against `acceptance-checklist.md`, then execute the agreed unit/service, integration, role/access and UI/E2E checks in the corresponding project modules. The verification targets include:

- 20/20 main flows and 45/45 source scenarios mapped to executed outcomes; blocked OI-dependent outcomes marked blocked rather than passed.
- Server-side role and record-scope enforcement for every mutation and read, including direct links and altered IDs.
- Correct parent links, idempotency and audit history for invoices, payments, deposits, tasks, assignments, menu versions, telemetry events and buyback cases.
- Financial reconciliation from external evidence; no revenue recognition at bill issue or Tenant submission; deposit separated from actual revenue.
- Machine allocation and same-type replacement integrity across overlapping intervals; buyback release only after satisfactory test and explicit Moderator release.
- Route/deep-link/refresh behavior for role-specific detail and source context; no sample fallback.
- Responsive, keyboard and assistive-technology review of payment, upload, confirmation, task, telemetry/menu, buyback and reporting journeys. Use the project's agreed accessibility/NFR targets once OI-18 is resolved.

## Handoff rule

Begin implementation only after P00 establishes module ownership and ADR decision paths. The UI may be connected to new service contracts slice by slice, but the service contracts and persistence are TBD until selected. For any `[NEEDS CLARIFICATION]` dependency, ship no guessed business result: keep the affected action gated or explicitly draft while completing unrelated flows. The plan is not an effort estimate, delivery date, backend design, or claim that the prototype passes acceptance.

## Phase documents

- [Phase 00 — Discovery and architecture decision gates](phase-00-discovery.md)
- [Phase 01 — Thin shared foundation and access](phase-01-foundation.md)
- [Phase 02 — Rental, machine record and handover](phase-02-rental-handover.md)
- [Phase 03 — Smart IoT, PAYG and menu](phase-03-smart-iot-menu.md)
- [Phase 04 — Billing, payment evidence and reconciliation](phase-04-billing.md)
- [Phase 05 — Support, service and replacement](phase-05-service-replacement.md)
- [Phase 06 — Expiry, termination and deposit](phase-06-contract-closeout.md)
- [Phase 07 — Used-machine buyback and release](phase-07-buyback.md)
- [Phase 08 — Reporting, reminders, responsive UX and hardening](phase-08-operations-ux.md)
- [Service SLA management without Technician scheduling](service-sla-management.md)
