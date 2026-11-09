# Evidence uploads: JSON → multipart (17 BE purposes)

Planner/reviewer: Claude. Workers by strength:
- **DeepSeek:** API layer, small exact edits per file.
- **Codex:** UI file pickers on many screens + e2e.

FE only; read `C:/GitHub/BEANS/dolores_platform`, never modify it. UTF-8 with Vietnamese diacritics. Verify with `bash scripts/verify/verify.sh`. No commit/push/install by workers.

## BE contract (BusinessEvidencePurpose, BusinessEvidenceMultipartReader, BusinessEvidenceFilePolicy)
- Request: `multipart/form-data` with exactly one part `data` (Content-Type `application/json`, JSON of the purpose's `*MultipartData`) and 0..n parts named `files` (each with a filename).
- Files: PDF/JPEG/PNG, 8 bytes to 20 MB each, at most 25 MB in total per request. Unknown parts are rejected; text "evidence reference" fields no longer exist.

| Purpose | Endpoint | files min..max | data fields (BE `*MultipartData`) | FE method | UI callers |
|---|---|---|---|---|---|
| TERMINATION_INSPECTION | POST /termination-cases/{caseId}/inspection | 1..1 | maintenanceTicketId, diagnosis, responsibility, actualCost, resolutionResult, notes, correlationId, inspectionDecision | terminationCasesApi.completeInspection | pages/technician/tasks/work-order-detail-screen.tsx |
| TERMINATION_SETTLEMENT | POST /termination-cases/{caseId}/settlement | 1..1 | decision, damageAmount, penaltyAmount, outstandingAmount, idempotencyKey, correlationId | terminationCasesApi.settle | components/contracts/termination-workflow-panel.tsx |
| DEPOSIT_DAMAGE | POST /billing/deposits/{contractId}/settle-damage | 1..1 | read DepositDamageMultipartData | billingApi.settleDepositDamage | (none) |
| MAINTENANCE_RESOLUTION | POST /maintenance-tickets/{ticketId}/resolve | 1..5 | diagnosis, resolutionResult, notes | machinesApi.resolveMaintenanceTicket | grep callers |
| MAINTENANCE_CUSTODY | POST /maintenance-requests/{requestId}/custody-events | 1..1 | eventType, machineId, conditionNotes, acknowledgementUnavailableReason | maintenanceRequestsApi.recordCustodyEvent | maintenance-custody-stepper.tsx, repair-case-detail-screen.tsx, work-order-detail-screen.tsx |
| REPAIR_INTAKE | POST /repair-cases/intakes | 0..1 | machineId, idempotencyKey, issueDescription | machinesApi.createRepairIntake, repairCasesApi intake method(s) | pages/dashboard/workflows/repair-intake-screen.tsx, technical-operations-screen.tsx |
| REPAIR_CUSTODY | POST /repair-cases/{caseId}/custody-events | 1..1 | eventType, machineId, conditionNotes | repairCasesApi.postCustodyEvent | grep callers |
| REPAIR_DIAGNOSIS | POST /repair-cases/{caseId}/diagnosis | 1..1 | diagnosis | repairCasesApi.recordDiagnosis | repair-case-detail-screen.tsx, work-order-detail-screen.tsx |
| REPAIR_COMPLETION | POST /repair-cases/{caseId}/work/complete | 1..5 | diagnosis, resolutionResult, workScope, notes, emergencyAuthorizationId | repairCasesApi.completeWork | repair-case-detail-screen.tsx, work-order-detail-screen.tsx |
| REPAIR_COST_PROPOSAL | POST /maintenance-tickets/{ticketId}/repair-cost-reviews | 1..5 | cause, diagnosis, estimatedAmount, currency, proposedResponsibleParty, costComponents | repairCostReviewsApi.propose | (none) |
| REPAIR_COST_DISPUTE | POST /repair-cost-reviews/{reviewId}/dispute | 1..5 | reason, disputedAmount | repairCostReviewsApi.dispute | (none) |
| REPLACEMENT_ACTIVATION | POST /replacement-assignments/{id}/activate | 1..1 | approvalReason, idempotencyKey, correlationId | replacementAssignmentsApi.activate | repair-case-detail-screen.tsx, contract-activation-panel.tsx |
| REPLACEMENT_RELEASE | POST /replacement-assignments/{id}/release | 1..1 | idempotencyKey, correlationId | replacementAssignmentsApi.release | repair-case-detail-screen.tsx |
| BUYBACK_INSPECTION | POST /buybacks/{caseId}/inspection | 0..5 | condition, valuationAmount, currency, notes, idempotencyKey, correlationId | buybacksApi.submitInspection | buyback-workflow-controller.tsx |
| BUYBACK_COLLECTION | POST /buybacks/{caseId}/collection/evidence | 1..1 | confirmedSerial, collectionLocation, idempotencyKey, correlationId | buybacksApi.recordCollectionEvidence | buyback-workflow-controller.tsx |
| BUYBACK_REFURBISHMENT | POST /buybacks/{caseId}/refurbishment/complete | 0..5 | workPerformed, result, idempotencyKey, correlationId | buybacksApi.completeRefurbishment | buyback-workflow-controller.tsx |
| OFFLINE_DECISION | POST /offline-violation-reviews/{reviewId}/decision | 1..5 | decision, reason | offlineViolationReviewsApi.decide | offline review pages (via onDecide) |

Response bodies are unchanged; keep each method's existing response parsing and identity checks.

## Steps
1. **DeepSeek D1:** `src/lib/evidence-multipart.ts`:
   - `validateEvidenceFiles(files, { min, max })` throws Vietnamese errors: count, type, size per file, total size.
   - `buildEvidenceForm(data, files)` returns FormData: `data` = `new Blob([JSON.stringify(data)], { type: "application/json" })`; each file appended as `files`.
2. **DeepSeek D2..Dn, one API file per run:** each method in the table takes `files: File[]` (last parameter) and sends `buildEvidenceForm(dataWithoutEvidenceFields, files)` with `headers: { "Content-Type": "multipart/form-data" }`. Its request schema matches the BE data fields: remove evidenceReference/evidenceReferences fields and keep everything else. UI callers will not compile until step 3, which is expected.
3. **Codex C1/C2:** the TypeScript errors list every UI caller. In each form, replace the text "mã tham chiếu chứng từ / evidence reference" inputs with a file picker that follows the purpose's min..max, accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png", shows the selected file names and blocks submit with a reason until the minimum is met. Keep the action bar rules (`PageActions`, submit primary with `form=`). Update the e2e specs that posted JSON or typed a reference so they set files (`setInputFiles`) and assert a multipart request (`request.headers()["content-type"]` contains "multipart/form-data" and `postDataBuffer()` contains `name="data"`).
4. **Claude:** full verify, review, commit.
