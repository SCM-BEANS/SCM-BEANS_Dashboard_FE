# Phase 03 — Smart IoT, PAYG, telemetry and menus

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Build the Smart-only operational slice behind a documented device boundary: exact customer→machine monitoring, valid cup events, offline synchronization, internal Global Menu authoring, Tenant private recipes and applied-state visibility. Production rollout of Global Menu updates stays gated until device delivery semantics are approved. Conventional machines remain outside the device experience.

## Concrete tasks

- Use P00 ADR to select an Edge/device integration boundary. Document protocol, message ownership, event delivery guarantees and security before implementation; no protocol or payload is supplied by the existing app.
- Register a device to one stored Smart machine and show telemetry by exact machine ID and verified Tenant/contract relation. Remove prefix guessing and sample fallback.
- Preserve event occurrence and receipt/sync time, machine/event identity, success result and assignment interval. Count only a sold cup reported successful by the machine; never estimate cups for offline days.
- Design offline queue/sync behavior with device team. Carry late ordinary month events into the next bill, not the already-issued bill. Do not use the contract's negotiated offline allowance as proof that usage data is complete.
- Create tenant overview → that tenant's Smart machine list → exact telemetry detail. Keep contract/installation location and monitored GPS separate; display GPS timestamp/staleness only after its semantics are confirmed.
- Implement internal Global Menu authoring/version ownership for Admin and Moderator. The factory default is present on Smart machines; a Cloud send is not a prerequisite for proving factory default exists. Gate production update rollout on OI-03/OI-12 device capability, versioning, offline queue and retry decisions.
- Implement Tenant's machine-scoped private recipe from the received Global version; allow supported private drinks only when capability data says the machine supports them. Preserve private values when Global changes and let Tenant choose whether to adopt the new base.
- Display last device-confirmed applied menu. Track requested/sent/pending/failed/confirmed as technical delivery facts only where supported; a sent command is not an applied menu.
- Keep 3D/animated model explicitly illustrative until product/device requirements establish a real model and interactions. Do not call a CSS model a digital twin or hardware validation.

## Dependencies

- P01 scope and P02 machine/contract/assignment identity.
- Device/Edge ADR from P00.
- `[NEEDS CLARIFICATION]` OI-03/OI-04 define payload, capability, connectivity and GPS semantics; OI-09/OI-10 gate complete final usage and event identity; OI-12 gates queue/retry/version conflicts.
- This phase can deliver the API/UI boundary and mocked development path while OIs are open, but real ingestion, final usage-completeness proof and conflict behavior stay gated.

## Affected files and modules

- Existing UI: `src/lib/prototype.ts`, `src/lib/demo-store.tsx`, `src/components/PrototypeApp.tsx`, `src/app/globals.css`.
- Routes: `/admin/monitoring`, `/admin/monitoring/:customerId/:machineId`, `/moderator/monitoring`, `/moderator/monitoring/:customerId/:machineId`, `/admin/global-menu`, `/moderator/global-menu`, `/customer/menu`, `/customer/machines/:machineId`, `/customer/machines/:machineId/telemetry`.
- Future device registry, event ingestion, Edge adapter, menu version/capability/command and telemetry read modules: TBD by ADR; none exist today.

## Verification / acceptance (planned only)

- MF-06/S01–S02: success cups appear once; offline events keep their occurrence period; assignment interval maps Smart replacement cups to the primary rental contract exactly once.
- MF-07/S01–S04: Admin/Moderator author Global; Tenant cannot alter Global and only edits their own supported private recipes; Global updates preserve private state. Authoring and private-recipe preservation can pass while delivery decisions are open; production rollout remains blocked by OI-03/OI-12, and after the gate, applied view changes only after device acknowledgement.
- MF-17/S02: Smart GPS is separate from installation location; conventional telemetry route is denied/not found.
- Wrong machine/customer ID never returns a neighboring demo device; empty, stale, offline and no-data states are distinguished according to resolved device semantics.
- Final Smart bill cannot be marked complete from online-now state or negotiated offline cap alone.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-03, OI-04, OI-09, OI-10 and OI-12. Production Smart telemetry/PAYG finalization must remain gated until event identity and completeness evidence are approved. Global Menu production rollout remains gated by device capability and delivery decisions OI-03/OI-12.
- The cloud cannot invent GPS accuracy, recipe capability or online status. Display only fields the device actually reports under the approved payload.
- Global-menu edits may affect machines with older firmware or private recipes. Preserve the old applied state and do not silently overwrite local recipe values.
