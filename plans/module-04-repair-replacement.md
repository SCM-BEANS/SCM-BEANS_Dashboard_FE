# Module 4: Repair case: fallback replacement offer and emergency work authorization (2 APIs)

Same hard constraints as `plans/module-01-maintenance.md` (FE only, BE read-only, no commit/push/install, follow existing structure, shared UI across roles, Vietnamese text, tests required).
BE reference: `controller/RepairCaseReplacementController.java`, `service/RepairCaseReplacementService.java#offerFallback`, `service/RepairCaseWorkService.java#authorizeEmergencyWork` (and where it is consumed, around line 160-175).

## APIs
1. `POST /repair-cases/{caseId}/replacement-offers`: ADMIN/MODERATOR (moderator only when the case is visible to them).
   - Body `{ replacementMachineId: uuid, startAt: LocalDateTime, endAt: LocalDateTime, reason: string (≤1000, required) }`. Datetimes are sent without a timezone offset, `YYYY-MM-DDTHH:mm:ss`, the same format other LocalDateTime bodies use in this FE (grep for an existing helper).
   - Response 201 `RepairCaseEvent` (the schema already exists, since `decideFallback` parses it).
   - Rules: the case status must be `WAITING_REPLACEMENT` or `WAITING_OWNER_DECISION`; only allowed when no same-type machine is available (BE returns 409 otherwise); the candidate must be a different machine type, IN_WAREHOUSE, without an owner, and free in the window; the window must lie within the active contract term. Afterwards the status becomes `WAITING_OWNER_DECISION` and the owner decides with the already connected `decideFallback`.
   - UI: in the operator repair case detail (`components/features/repair-workflow/repair-case-detail-screen.tsx`, used by admin and moderator), a "Đề xuất máy khác loại" action visible only in those statuses. It opens a shared `FallbackReplacementOfferDialog`: start/end datetime (defaults within the contract term), a candidate machine picker (use the existing availability/rental candidate APIs: grep `listRentalCandidates`, `machine-availability` in `src/apis`; show only machines of a different type than the case machine), and a required reason. Show the BE 400/409 message text. After success, refresh the case and its timeline. The owner's existing decision UI should then show the offer.
2. `POST /repair-cases/{caseId}/emergency-work-authorizations`: ADMIN/MODERATOR.
   - Body `{ reason: string (≤2000), workScope: string (≤2000) }`, both required. Response 201 `RepairEmergencyWorkAuthorizationResponse` (read the BE DTO and add a zod schema).
   - Rules: the case status is `DIAGNOSIS` or `REPAIR_IN_PROGRESS` AND the case's repair cost review is `DISPUTED`. The authorization is single-use for that work scope (consumed by start/complete work; check `RepairCaseWorkService` around lines 160-175 for whether the technician request must carry the authorization id, and if the FE start/complete work forms need an `emergencyAuthorizationId` field, add it).
   - UI: a "Cho phép xử lý khẩn cấp" action in the same operator case detail, visible only when the conditions above hold (use the cost review status already loaded or the repair cost reviews API). It opens the shared `ReasonDialog` (created in module 1 under `src/components/`) extended with a second required textarea "Phạm vi công việc", or a small dedicated dialog built on the same base. Show the active authorization in the case timeline/detail so the technician sees what is allowed.

## Tests
- Playwright `tests/e2e/repair-case-replacement-actions.spec.ts`: the offer action appears only in the allowed statuses; the candidate list excludes same-type machines; the POST body format is correct; the 409 message is shown; the emergency authorization appears only when status and DISPUTED review match; POST body. Cover admin and moderator.
- Unit tests for the 2 API methods.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, `node --test tests/*.test.cjs` (no new failures) and the new spec pass. Print a per-file summary.
