# Phase 02 — Rental contract, machine record and handover

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Deliver the first complete rental path: negotiate and record externally signed terms, allocate exactly one primary machine, deliver/install it and show the resulting contract and machine history to the correct roles. Support conventional and Smart unit setup without pretending Smart telemetry is already integrated.

## Concrete tasks

- Implement contract onboarding from a scoped Tenant/shop; record machine type, term, contract/installation location, agreed amount fields, installation fee and deposit terms from the signed agreement.
- Attach the externally signed agreement as a private file record. Do not implement e-signature.
- Register machine identity, explicit type/capabilities, condition and inventory assignment independently of any rental contract. Do not derive type from a serial-number prefix.
- Enforce one physical primary machine per rental contract and at most one active primary rental assignment per machine. Make allocation atomic with contract creation.
- For conventional delivery, let Moderator create a delivery task with the exact contract, machine and location; Technician records handover and installation. Show contract location and history only.
- For Smart delivery, record assignment and Technician activation outcome; factory menu is expected to exist. Defer actual cloud/device proof to P03.
- Build the machine and contract detail pages so ended contracts and never-rented inventory machines still have history. Keep contract location as a contract fact.
- Map the currently disconnected route IDs (`customerId`, `contractId`, `machineId`, task ID) end-to-end through lists, forms, success states and browser refresh.
- Carry agreed deposit 10M VND per machine/contract and default installation 1M VND per machine as separately identified contract terms; allow the signed negotiated installation amount, without counting either as recognized revenue here.

## Dependencies

- P01 authenticated role/scope and private file reference.
- P00 system boundary ADRs.
- Residual OI-01 blocks shop-link edge cases only; Smart network prerequisite and internal assessment are business preconditions, not a platform scoring feature.

## Affected files and modules

- Existing frontend: `src/lib/prototype.ts`, `src/lib/demo-store.tsx`, `src/components/PrototypeApp.tsx`, `src/app/[role]/[[...segments]]/page.tsx`.
- Routes: `/moderator/customers`, `/moderator/contracts/new`, `/moderator/contracts/:contractId`, `/moderator/technical-requests/new`, `/technician/tasks/:taskId`, `/admin/machines/:machineId`, `/moderator/machines/:machineId`, `/customer/contracts/:contractId`, `/customer/machines/:machineId`.
- Future contract, machine registry, assignment, technical-task, document and persistence modules: TBD pending P00 ADR.

## Verification / acceptance (planned only)

- MF-01/S01–S02, MF-02/S01–S02 and MF-03/S01–S02 complete against persisted contract, machine, file and task IDs.
- MF-15/S01–S03: Admin/Moderator see inventory and physical machine history without requiring an active contract; Technician sees assigned work; Tenant sees only own rental.
- MF-17/S01: every rental machine shows contract/installation location independently from any monitored data.
- Conventional machine screens/API expose no GPS, cups, online state, Global Menu or Smart telemetry.
- Double allocation, missing external agreement and mismatched Tenant/shop relation are rejected with a record-specific error.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-01 residual affects which shops a Tenant can have and the link workflow; do not create implicit cardinality.
- `[NEEDS CLARIFICATION]` OI-13 affects document limits/retention; the storage provider is an ADR, not a baseline assumption.
- If the UI captures agreed terms not represented by source rules, store them as explicit contract values from the signed agreement; do not invent a rate, fee, penalty or default beyond confirmed values.
