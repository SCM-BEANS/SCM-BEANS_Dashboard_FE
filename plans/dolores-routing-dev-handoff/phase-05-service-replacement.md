# Phase 05 — Support, maintenance, repair and replacement

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Connect Tenant-reported issues to the right Moderator coordination and assigned Technician result, then persist machine, part, cost, replacement and service-SLA history. Track agreed deadlines and actual milestones without creating employee calendars, booking appointments or automatically assigning a Technician; this remains a tracking workflow, not an automatic service-pricing engine.

## Concrete tasks

- Let Tenant submit a request for the currently used primary machine or active replacement, with details and optional private evidence, and link it to its contract and assignment interval.
- Let Moderator dispatch work against the exact source request/contract/machine/buyback case and selected job type; assign a Technician account ID, not a display-name constant.
- Snapshot applicable approved service SLA terms on the support request/task when they exist; capture required actual milestones and calculate within/breached only against a confirmed target. Whether terms are defined per contract, service type or both remains OI-19. If no target exists, show “Chưa cấu hình SLA” rather than inventing one.
- Keep SLA tracking separate from scheduling: show Moderator the committed response/completion deadlines and remaining time for manual coordination; do not model Technician shifts, availability, appointment slots or automatic assignment.
- For preventive maintenance, preserve the confirmed three-month cycle/ten-day window and record compliance only after the anchor/window interpretation is approved; recording a due window must not create a Technician booking or automatic schedule reminder.
- Keep alerts, “approaching breach” thresholds and escalation behavior behind OI-19; continue the worklist and manual dispatch flow without guessing notification policy.
- Keep distinct typed parents (`support request`, `rental contract`, `buyback case`) so a buyback ID can never be written into a rental `contractId` field.
- Let only the assigned Technician update task outcome. Completion updates its source request, sends/records a scoped notification and appends histories for all involved physical machines.
- Support actual maintenance/repair completion and part/cost notes. Do not schedule the every-three-month cycle or create an automatic maintenance reminder; do not automatically invoice a part unless the contract/approved rule calls for it.
- Allocate a replacement only when it is the same explicit machine type, free of overlapping primary/replacement allocation and eligible for the requested interval. Link it temporarily to the original contract, never create a new rental contract.
- Close the replacement interval on its recorded return. Smart cups from the replacement count to the primary contract only within that interval.
- Derive stock counts and machine histories from assignment/service records, with the confirmed minimum statuses. Do not allocate cross-type stock when the required type is unavailable.

## Dependencies

- P01 role/scope and Technician identity.
- P02 machines, rental contract and assignment foundation.
- P03 device assignment history for Smart replacement usage.
- `[NEEDS CLARIFICATION]` OI-15 full inventory state catalog and service-return availability; use only confirmed same-type/overlap guards until answered.
- `[NEEDS CLARIFICATION]` OI-19 service SLA target values, clock basis, milestone definitions, pause rules, due-window anchor, alert/escalation policy and customer visibility. SLA tracking must not be presented as technician scheduling.

## Affected files and modules

- Existing UI/state: `src/components/PrototypeApp.tsx`, `src/lib/demo-store.tsx`, `src/lib/prototype.ts`.
- Routes: `/customer/support`, `/moderator/technical-requests`, `/moderator/technical-requests/new`, `/moderator/technical-requests/:taskId`, `/technician/tasks/:taskId`, `/technician/history`, `/moderator/machines`, `/moderator/machines/:machineId`, `/moderator/machine-history`.
- Future support-request, technical-task, service history, part record, assignment and inventory modules: TBD after P00 ADR.

## Verification / acceptance (planned only)

- MF-08/S01–S02, MF-09/S01–S03 and MF-16/S01–S02 pass from the correct role entry to saved histories and return states.
- A Technician cannot open/update another Technician's task by changing a URL or ID.
- Active replacement request stays linked to the primary contract and exact replacement interval; Tenant can view its own completed outcome.
- Conflicting, cross-type or already allocated replacement is denied atomically.
- Service, part and cost history appears under correct physical machine and is not automatically added as a bill without contractual authority.
- Approved service targets are snapshotted to the exact task and compared with actual milestones; missing targets never produce a default deadline or false pass. No Technician appointment calendar, availability view or automatic dispatch appears.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-15 covers what makes a repaired machine available and how company handles shortages. Never widen availability by default.
- Support requests must not lose their source ID when converting to Technician work; otherwise Tenant status can remain stuck after the task completes.
- Showing an SLA countdown without agreement-sourced target/clock rules would create a false service promise; keep it explicitly unconfigured until OI-19 is answered.
- Technician inspection/valuation criteria remain internal; store only the operational outcome necessary to follow the confirmed flow.
