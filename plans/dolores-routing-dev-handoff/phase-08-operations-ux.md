# Phase 08 — Reporting, reminders, responsive UX and hardening

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Assemble the Admin operational overview and actionable reminders from persisted domain records, then make the complete role journeys readable and practical on mobile web. UX improvements should land with each vertical slice; this phase finishes cross-slice reporting and review consistency.

## Concrete tasks

- Build Admin overview for customer counts, shops, contracts, rented machines by type, in-term/expired contracts, machine inventory, operating state, Global Menu and linked customer/contract/machine/service detail.
- Build valid Smart cup totals from deduplicated successful device events, and label conventional machine cup data as unavailable rather than zero. Filter by machine/period only after source semantics are approved.
- Build gross revenue including reconciled deposit and actual revenue excluding deposit using reconciliation/receipt records, not invoice statuses. Keep refunds visible as separately traceable records until OI-17 defines period/netting and fee categories.
- Connect reminder/alert rows to exact invoice, contract, task, support request or buyback case IDs. Clicking a reminder opens the role-authorized record. Mark-read must not mutate business state.
- Add Admin/Moderator service-commitment views for configured maintenance/repair SLAs: due and breached task counts, exact source task, approved target/source, elapsed/remaining time and actual completion. Do not invent SLA thresholds or employee scheduling features; keep unconfigured records distinct.
- Show Technician the committed deadline on assigned work and Tenant the confirmed status/commitment allowed by policy; exact alert thresholds, escalation and customer visibility remain gated by OI-19.
- Render reminder generation and dispatch separately. Implement the agreed in-app status; do not claim external delivery until OI-08 defines channel and schedule.
- Review every role's empty/loading/error/success/confirmation screen, including high-consequence upload, bank reconciliation, contract end, deposit refund, buyback transfer, device menu changes and stock release.
- Validate responsive mobile web at 360, 390, 760, 1050 and 1440 CSS pixels; preserve current context, readable amounts and labels, reachable controls, keyboard focus, and no bottom-nav overlap or horizontal overflow.
- Preserve the approved UBar Headline font across all four role workspaces and responsive layouts; verify Vietnamese glyphs, readable text hierarchy, and consistent rendering after route changes.
- Verify that Tenant sees its own machines, current menu/applied status, telemetry, invoices, support results and buyback evidence; Technician sees assigned work; Moderator sees scoped customer work; Admin sees aggregate and permitted detail.
- Keep 3D machine visualization clearly marked as illustrative until separately approved as a production requirement; don't claim it represents physical state.
- Build the final traceability matrix from MF-01–MF-20/S01…S45 to UI route, service/module, persisted record, authorization rule and verification evidence.
- Execute the approved verification plan after implementation: business/service rules, persistence/integration, route-level role checks, device/Edge contract checks with the actual protocol owner, and browser end-to-end flows.
- Run the planned negative/integrity cases NEG-01–NEG-19, including cross-Tenant IDs, Moderator permission boundaries, conventional-vs-Smart capability, duplicate proof/event, wrong task parent, overlapping assignment and buyback release gates.
- Validate money from contract terms through bill, Tenant submission, Moderator reconciliation, receipt allocation, gross/actual reporting and external refund record against approved examples and date boundaries.
- Validate Smart events across offline/sync, duplicate delivery, late ordinary events, replacement intervals, use cutoff and the approved final-completeness signal.
- Validate deep links, refresh/back, errors/success/confirmation states and reminder destinations in all four roles. Remove demo seed IDs and fallback behavior from any production path.
- Complete responsive, keyboard, assistive-technology, security and performance verification against targets approved under OI-18; record evidence and known limitations.
- Document release restrictions for unresolved OIs and operator recovery/rollback procedures.

## Dependencies

- P01 roles and scope; P02 machine/contract history; P03 Smart telemetry/menu; P04 reconciliation ledger; P05 task/history; P06 closeout; P07 inventory release.
- `[NEEDS CLARIFICATION]` OI-17 blocks definitive refund netting and some revenue categories. OI-08 blocks reminder delivery schedule/channel. OI-18 blocks numeric accessibility/performance targets. OI-19 blocks SLA compliance calculations, alert timing/escalation and customer-visible commitment details.

## Affected files and modules

- Existing UI/styles: `src/components/PrototypeApp.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/fonts/UBar-Headline.otf`, `src/lib/prototype.ts`, `src/app/[role]/[[...segments]]/page.tsx`.
- Routes: all in `screen-route-map.md`, especially `/admin`, `/admin/reports`, customer → machine → telemetry, invoice, support and buyback details; `/moderator/notifications`, `/technician/notifications`, `/customer/notifications`.
- Future operational read models, notification events/dispatch, analytics and verification modules: TBD after P00 architecture decisions.

## Verification / acceptance (planned only)

- MF-20/S02 returns current scoped counts and details; all figures trace to underlying records and date filter.
- Gross/actual revenue use Moderator-reconciled receipt allocations; deposits are included only in gross. Refunds are separately shown while OI-17 is open.
- Each actionable reminder opens the exact target ID and does not reveal records outside the role scope. Notification read state does not advance a business transition.
- SLA views calculate only from the saved approved SLA-source/task snapshot and required actual milestones. Unconfigured targets are not counted as on-time or overdue; no appointment, staff calendar or automated assignment is generated.
- Mobile task, invoice, proof upload, menu, telemetry and buyback workflows remain operable at the listed widths and with keyboard navigation; representative assistive-technology checks pass against the approved target.
- “No data”, offline/stale, unsupported, empty and numeric zero have distinct labels where appropriate.
- All 20/20 flows and 45/45 scenarios have pass evidence or are explicitly blocked by named OIs; blocked is never reported as passed.
- No unauthorized mutation or cross-Tenant access; no duplicate or mis-parented invoice, receipt, cup event, assignment, task, settlement, refund, recipe or buyback release.
- All routes resolve exact persisted records on direct load/refresh; no production route falls back to sample data.
- External bank, private file, Edge/hardware and release checks have evidence from their responsible owners; a frontend simulation alone does not pass them.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-17 can materially alter totals; don't publish final revenue figures based on assumed report period or refund netting.
- `[NEEDS CLARIFICATION]` OI-08 leaves external reminder delivery unsupported. In-app reminder target can be complete without promising email/SMS/push.
- Dashboard numbers are high visibility and can appear authoritative; show source period and reconcile basis, not demo totals.
- `[NEEDS CLARIFICATION]` Unresolved OI-dependent outcomes remain explicitly blocked at release; mock success must not be reported as production readiness.
- Live hardware/device, company-bank and external-refund checks require evidence from their owners. Security, privacy, financial and inventory recovery procedures need release review.
