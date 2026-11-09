# Evidence read APIs (19 new BE GET endpoints) + multipart follow-up

Planner/reviewer: Claude · Worker: **DeepSeek only** (trial to compare with Codex). FE only; read `C:/GitHub/BEANS/dolores_platform`, never modify it. UTF-8 with Vietnamese diacritics. Verification: `bash scripts/verify/verify.sh` (run by Claude after each chunk).

## BE contract (read from dolores_platform)
- List: `GET /api/v1/{parent}/{parentId}/evidence?page=0&size=50` (size 1..100) → `{ items: Evidence[], page, size, hasNext }`.
- Evidence = `BusinessEvidenceMetadataResponse { id (uuid), resourceType, resourceId (uuid), purpose, originalFilename, contentType, sizeBytes (number), sha256, uploadedBy (uuid), uploadedAt (ISO instant), downloadPath }`.
- Content: `GET /api/v1/{parent}/{parentId}/evidence/{evidenceId}/content` streams the file (`Content-Disposition: attachment`). The FE downloads it as a Blob and saves it with `originalFilename`.
- Parents (resourceType → path):
  - TERMINATION_CASE → `termination-cases`
  - DEPOSIT → `billing/deposits` (parentId = contractId)
  - MAINTENANCE_TICKET → `maintenance-tickets`
  - MAINTENANCE_REQUEST → `maintenance-requests`
  - REPAIR_CASE → `repair-cases`
  - REPAIR_COST_REVIEW → `repair-cost-reviews`
  - REPLACEMENT_ASSIGNMENT → `replacement-assignments`
  - BUYBACK_CASE → `buybacks`
  - OFFLINE_REVIEW → `offline-violation-reviews`
- Access is checked by the BE per resource (`BusinessEvidencePolicyRegistry.requireRead`): 403 = no access, 404 = not found, 503 = storage unavailable. The FE hides the section on 403 and does not guess roles.
- `GET /api/v1/termination-cases/{caseId}/inspection` (ADMIN/MODERATOR only) → `TerminationInspectionResponse { caseId, maintenanceTicketId, status, inspectionDecision (NO_DAMAGE|DAMAGE|PARTIAL_DAMAGE|null), diagnosis, actualCost (number|null; null = not recorded, different from 0), completedAt (instant|null) }`. 404 = no inspection ticket yet. The result counts as final only when status is RESOLVED and completedAt is set.

## Phase A: chunks (DeepSeek)
- A1. `src/schema/evidence.schema.ts`, `src/apis/evidence.api.ts` (generic `listEvidence(resource, parentId, {page,size}, signal)` and `downloadEvidence(resource, parentId, evidenceId, signal)`, following existing api/schema style with zod, `DOLORES_API_BASE_URL`, UUID validation and identity checks), plus a blob save helper if none exists.
- A2. Shared `src/components/evidence/evidence-list.tsx` (+ css module):
  - Columns: tên tệp, mục đích (Vietnamese label map with a fallback), dung lượng, thời gian tải lên, and a "Tải xuống" row action.
  - States: loading, empty ("Chưa có chứng từ."), 403 (render nothing), other errors with an inline "Thử lại".
  - Pagination with Trang trước/Trang sau.
  - Uses `DataTable headerVariant="admin"`.
- A3. Termination inspection read: api + schema in `termination-cases.api.ts`/schema, and a read-only "Kết quả kiểm tra" block in `src/components/contracts/termination-workflow-panel.tsx` (Admin/Moderator).
- A4. Mount EvidenceList in:
  - the maintenance ticket detail (`maintenance-ticket-actions.tsx` details panel);
  - maintenance request detail (`maintenance-request-detail-screen.tsx`);
  - repair case detail (`repair-case-detail-screen.tsx`).
- A5. Mount in:
  - offline review detail (`src/components/machines/offline-review-panel.tsx`, selected review);
  - repair cost review (`repair-cost-review-screen.tsx`);
  - replacement assignment (wherever its detail is shown in `repair-case-detail-screen.tsx` / `maintenance-request-actions.tsx`).
- A6. Mount in:
  - buyback case detail (`buyback-workflow-controller.tsx` / shared detail);
  - termination workflow (`termination-workflow-panel.tsx`): termination-case evidence plus deposit evidence (parent = contractId).
- A7. Playwright `tests/e2e/evidence-read.spec.ts` (mocked API): list rendering, download request, empty, 403 hidden, and termination inspection block.

## Phase B (after A, separate decision): multipart migration
The BE now requires `multipart/form-data` (`data` JSON part + `files`) for about 17 evidence POSTs that the FE still sends as JSON (likely 415 today). Candidates found by a static scan, to be confirmed one by one against `consumes = MULTIPART_FORM_DATA_VALUE` in the BE controllers:
- billing `settle-damage`;
- buyback `inspection`, `collection/evidence` and `refurbishment/complete`;
- maintenance-ticket `resolve`;
- repair `intakes` (x3);
- maintenance-request `custody-events` (x2);
- offline review `decision`;
- repair-case `custody-events` (x2), `diagnosis` and `work/complete`;
- repair-cost-review create and `dispute`;
- replacement-assignment `activate` and `release`;
- termination `inspection` and `settlement`.

Each needs its BE `*MultipartData` DTO read, and its UI needs a file input instead of a text "evidence reference".
