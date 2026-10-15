# Phase 07 — Used-machine buyback and stock release

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Complete the distinct buyback path for existing Dolores rental customers: Technician assessment first, Moderator deal and external documents/payment evidence, collection under the agreement, refurbishment/testing, then explicit Moderator inventory release.

## Concrete tasks

- Provide Tenant and Moderator case creation/eligibility flow for a customer who rents from Dolores. Capture the offered asset separately from any current rental machine/contract until identity/provenance is confirmed.
- Create a Technician assessment task linked through typed `buybackCaseId`; retain the internal valuation criteria outside the product.
- Require a saved Technician assessment before Moderator can complete negotiation or attach the signed external purchase agreement.
- Record the external transfer and evidence/reference as an out-of-system company action. Show the Tenant the approved proof and track acknowledgement as a separate event.
- Let Moderator dispatch collection when the purchase agreement allows, even if acknowledgement is pending; show “Chờ khách xác nhận trước khi thu gom” and preserve the acknowledgement state independently.
- Technician records actual pickup and links the physical asset to buyback custody. Keep it unavailable during refurbishment/part replacement and testing.
- Record Technician test as satisfactory/not satisfactory; require Moderator's explicit release after a satisfactory test before available-for-rent counts/contract selection change.
- Preserve links among buyback case, offered machine, assessment, agreement, transfer evidence, collection, refurbishment, parts, test and release. Do not use a buyback case ID as a contract ID.

## Dependencies

- P01 role access/private storage, P02 machine identity/inventory, P05 task/history infrastructure.
- `[NEEDS CLARIFICATION]` OI-16 gates failed/disputed payment, canceled purchase and unsuccessful collection exceptions. The happy path remains implementable.
- `[NEEDS CLARIFICATION]` OI-15 gates the complete inventory-status vocabulary. Confirm asset identity/provenance with the business owner if it is not represented by the provided record before final inventory attribution.

## Affected files and modules

- Existing UI/state: `src/components/PrototypeApp.tsx`, `src/lib/demo-store.tsx`, `src/lib/prototype.ts`.
- Routes: `/customer/buyback`, `/moderator/buyback`, `/moderator/technical-requests/new`, `/technician/tasks/:taskId`, `/moderator/machines/:machineId` and machine history.
- Future buyback case, external purchase documents/evidence, custody, refurbishment, test and inventory release modules: TBD after P00 ADR.

## Verification / acceptance (planned only)

- MF-18/S01–S03 and MF-19/S01–S02 complete with correct actor order and typed IDs.
- Ineligible non-rental customer cannot start the supported buyback workflow.
- Moderator cannot finalize before Technician assessment; customer acknowledgement can remain pending while agreement-permitted collection proceeds with the exact waiting label.
- A collected machine remains unavailable while refurbishment is open and after a missing/failed test; only satisfactory Technician result plus Moderator release changes availability.
- Buyback expense/evidence is not counted as rental revenue or a rental receipt.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-16 means exceptional payment/cancel/recovery branches cannot be finalized. Do not invent rollback, forfeiture or reattempt rules.
- The platform must distinguish an offered asset from the current rented unit and its lifecycle; unknown asset ownership/provenance must be surfaced for business confirmation, not guessed.
- Technician criteria and company valuation are explicitly internal and must not become a hard-coded scoring engine.
