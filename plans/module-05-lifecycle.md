# Module 5: Contract history by machine, coffee order receipt confirmation, recall legacy review (3 APIs)

Same hard constraints as `plans/module-01-maintenance.md` (FE only, BE read-only, no commit/push/install, follow existing structure, shared UI across roles, Vietnamese text, tests required).

## APIs
1. `GET /contracts/machine/{machineId}?status&page&size`: contract history of a machine (`ContractController#getContractsByMachine`).
   - Returns an array of `ContractSummaryResponse` with `X-Page`/`X-Page-Size`/`X-Has-Next` headers. Optional `status` filter: ACTIVE/TERMINATED/DRAFT (check the `ContractStatus` enum for all values).
   - Scope: ADMIN sees everything; MODERATOR only contracts they created; OWNER only their own; TECHNICIAN only machines with assigned work. A 404 means "no history visible": show it as an empty state, not an error.
   - UI: a shared `MachineContractHistory` panel in `src/components/machines/` (next to `machine-detail-view.tsx`). Put it into the shared machine detail used by admin, moderator, owner and technician (if the technician has a machine screen). Show a table (contract code/ID, status badge via `StatusBadge`, start/end, owner name) with a status filter and pagination; each row links to the role's contract detail route if one exists.
2. `POST /coffee-package-orders/{orderId}/confirm-received`: OWNER only; the order must be `DELIVERED`. Idempotent. The order status stays DELIVERED and the confirmation time is recorded (check `FulfillmentResponse` for the field, e.g. `receivedConfirmedAt`, and add it to the schema).
   - Note: `src/apis/coffee-packages.api.ts:316` already calls a different endpoint, `/coffee-package-refunds/{id}/confirm-received`. Do not confuse the two; add a new `confirmOrderReceived(orderId)` next to `acknowledgeWaitingStock`/`handover`.
   - UI: in the owner order detail (`components/features/coffee-packages/coffee-package-owner-order-detail-screen.tsx`), a primary "Xác nhận đã nhận hàng" button shown when status is DELIVERED and not confirmed yet, with a confirm dialog. Afterwards show "Đã xác nhận nhận hàng lúc …". The operator order detail shows the confirmation time read-only.
3. `POST /recall-work-orders/{id}/legacy-review`: ADMIN/MODERATOR (`authorizeOperator`); status must be `LEGACY_REVIEW_REQUIRED`.
   - Body `{ decision: "PICKUP_REQUIRED" | "VERIFY_ALREADY_AT_DEPOT", technicianId?: uuid (required for VERIFY_ALREADY_AT_DEPOT, must be an assignable technician), reason: string (required), correlationId: string (required; generate with `crypto.randomUUID()` once per dialog open, the same way other FE calls do: grep `correlationId`) }`.
   - Outcome: PICKUP_REQUIRED → UNASSIGNED; VERIFY_ALREADY_AT_DEPOT → OWNER_ACK_PENDING with that technician assigned.
   - UI: in `components/features/contract-termination/recall-work-orders-screen.tsx` (operator view), a "Rà soát lệnh thu hồi" action only for LEGACY_REVIEW_REQUIRED, opening a dialog with radio options for the two decisions (with a plain explanation of each), a technician picker that appears only for VERIFY_ALREADY_AT_DEPOT (reuse the existing technician picker used for assigning recall/maintenance work; grep `technicianId` pickers), and a required reason.

## Skipped (BE retired)
`POST /termination-cases/{caseId}/handover` always throws "Direct handover is retired; use the Owner acknowledgement on RecallWorkOrder". Do not connect it.

## Tests
- Playwright `tests/e2e/lifecycle-actions.spec.ts`: machine contract history (filter, pagination, 404 shown as an empty state) for admin and owner; owner confirm-received is visible only when DELIVERED and its POST URL is correct; the recall legacy review dialog requires a technician only for VERIFY_ALREADY_AT_DEPOT, and the body includes correlationId.
- Unit tests for the 3 API methods.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, `node --test tests/*.test.cjs` (no new failures) and the new spec pass. Print a per-file summary.
