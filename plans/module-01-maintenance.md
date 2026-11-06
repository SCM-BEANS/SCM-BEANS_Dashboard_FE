# Module 1: Maintenance tickets and maintenance requests (8 APIs)

Planner/reviewer: Claude · Implementer: Codex.
FE repo: `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`. BE (READ-ONLY reference): `C:\GitHub\BEANS\dolores_platform`.

## Hard constraints
- NEVER edit anything in `dolores_platform`. You may read it to confirm DTOs and rules.
- Do not commit, push, create branches, or install packages.
- Follow the existing structure: `src/apis/*.api.ts` (axios + `DOLORES_API_BASE_URL`, zod-parse every response), `src/schema/*.schema.ts` (zod schemas and types), `src/components/features/<module>/` (shared UI), `src/pages/<role>/...` (role screens only wire in shared components). No API calls directly in page/components beyond the existing pattern (TanStack Query `useQuery`/`useMutation` calling `xxxApi`).
- Reuse existing components first: `ActionButton`, `ButtonBar`, `DataTable`, `StatusBadge`, `TruncatedId`, `NotificationDialog`, the existing dialog/form patterns in `components/features/*`. If the same UI is needed in ≥2 places and no component exists, create one in `src/components/<area>/` or `src/components/features/maintenance-workflow/`.
- One UI per action, shared by every role that is allowed (ADMIN/MODERATOR/OWNER/TECHNICIAN). Do not build separate per-role variants; the role only decides whether the action is shown.
- All user-facing text in Vietnamese, matching current tone. Use the existing error helper (`getApiErrorMessage`) for failed requests and map 400/403/404/409 to clear messages.
- Each mutation must invalidate or refetch the related queries so the screen shows the new state without reload.
- Light visual polish is allowed in the screens you touch. Do not restyle unrelated screens.

## APIs to connect

### A. Maintenance tickets (`MaintenanceController`)
Add them to `src/apis/machines.api.ts`, next to the existing ticket methods, and add schemas in `src/schema/machines.schema.ts`. Response = `MaintenanceTicketDetails` (existing schema; it already has `version`, `alertLevel`, `scheduledDueAt`, `actionableInstructions`, `overdueReview*`).

1. `POST /machines/{machineId}/maintenance-tickets`: create an on-demand ticket.
   - Body (optional): `{ alertLevel?: string (≤50, default "Warning"), createdBy?: string }`. Check the BE DTO class `OnDemandTicketRequest` (grep in `dolores_platform/src/main/java`) for exact fields.
   - Roles: ADMIN/MODERATOR on any machine; OWNER only on own machine; TECHNICIAN within assignment scope.
   - Errors: 409 means the machine has no single ACTIVE non-legacy contract. Show the message "Máy chưa có đúng một hợp đồng đang hiệu lực nên chưa thể tạo phiếu bảo trì." 403/404 also need messages.
   - UI: a "Tạo phiếu bảo trì" button on the machine detail screen (admin `pages/admin/machines/machine-detail-screen.tsx`, moderator `pages/moderator/machines/machine-detail-screen.tsx`, owner machine detail in `pages/dashboard/machines/`, technician machine screen if one exists). It opens one shared dialog `CreateMaintenanceTicketDialog` with an alert level select (Info/Warning/Critical, default Warning) and a confirm step. On success, show the ticket in the machine's ticket list and link to its detail.
2. `PATCH /maintenance-tickets/{ticketId}/details`: edit ticket details.
   - Body: `{ expectedVersion: number (required), scheduledDueAt?: ISO datetime | null, alertLevel?: string, actionableInstructions?: string | null }`. Omit a field to keep it; send `null` to clear `scheduledDueAt`/`actionableInstructions`. Send only the changed fields.
   - Roles: ADMIN (all); MODERATOR (tickets whose contract the moderator created; otherwise 404).
   - 409 means the version changed: show "Phiếu đã được cập nhật bởi người khác, hãy tải lại.", refetch, and keep the form open.
   - UI: an "Chỉnh sửa chi tiết" action in the ticket detail used by admin and moderator. Use one shared `MaintenanceTicketDetailsForm` (due date-time, alert level, instructions textarea).
3. `POST /maintenance-tickets/{ticketId}/overdue-review`: record an overdue review.
   - Body `{ reason: string (not blank) }`. Roles: ADMIN or MODERATOR in contract scope.
   - Only show it when `overdueReviewRequired === true && !overdueReviewedAt` (BE rejects otherwise: "not awaiting overdue review").
   - UI: a shared `ReasonDialog` (title, description, required textarea, confirm). Create it in `src/components/` if no equivalent exists. It is reused by B.1 and B.3.
4. `POST /maintenance-tickets/{ticketId}/unassign`: cancel the assignment.
   - No body. Roles: ADMIN/MODERATOR (`isOperator`). Only valid when `status === "ASSIGNED"` (not started). Afterwards the ticket goes back to PENDING and the technician is notified.
   - UI: a "Hủy phân công" button beside the existing assign action, shown only when ASSIGNED, with a confirm dialog.

### B. Maintenance requests (`MaintenanceRequestController`, `MaintenanceRequestService`)
Add them to `src/apis/maintenance-requests.api.ts` and the matching schema file. Response = `MaintenanceRequestDetails` (existing) or `MaintenanceCustodyEvent` (existing, used by `getCustodyEvents`).

1. `POST /maintenance-requests/{requestId}/overdue-review`: body `{ reason }`. ADMIN/MODERATOR. Only when request `status === "OVERDUE_REVIEW"` and it has not been reviewed yet. Uses `ReasonDialog`.
2. `PUT /maintenance-requests/{requestId}/replacement-assignment/{assignmentId}`: link a replacement machine assignment. ADMIN/MODERATOR. The assignment must be `ACTIVE`, belong to the same contract, and the machine must have the same machine type. UI: a picker that lists replacement assignments (use the existing `replacement-assignments.api.ts`) filtered to ACTIVE ones for the same contract, then a confirm. Show it only while the request has no `replacementAssignmentId`.
3. `POST /maintenance-requests/{requestId}/closure-exception`: body `{ reason }`. ADMIN/MODERATOR. Only after a `PRIMARY_RETURNED` custody event exists; this closes the request. Uses `ReasonDialog`. Label it "Đóng yêu cầu (ngoại lệ)" with a warning that it is audited.
4. `POST /maintenance-requests/{requestId}/custody-events`: record a custody event.
   - Body `{ eventType: "PRIMARY_COLLECTED"|"REPLACEMENT_DELIVERED"|"REPLACEMENT_COLLECTED"|"PRIMARY_RETURNED", machineId: uuid, conditionNotes: string(≤2000, required), evidenceReference: string(≤512, required), acknowledgementUnavailableReason?: string(≤1000) }`.
   - Roles: read `custodyActorRole()` in the controller (TECHNICIAN, plus ADMIN/MODERATOR). `acknowledgementUnavailableReason` only for ADMIN/MODERATOR.
   - Preconditions (BE): request status CONFIRMED or IN_PROGRESS, replacement assignment linked, maintenance work order (ticket) linked, events in order and each only once, machineId must match the event type (primary vs replacement machine), PRIMARY_COLLECTED only within the contract window and when the ticket is ASSIGNED, REPLACEMENT_COLLECTED only after the ticket is RESOLVED. Read `recordCustody` in `MaintenanceRequestService` for the exact order.
   - UI: a stepper/timeline "Bàn giao máy" in the maintenance request detail (`components/features/repair-workflow/maintenance-request-detail-screen.tsx`, and wherever the technician sees the request). It shows the 4 steps, marks recorded ones from `getCustodyEvents`, and enables only the next valid step. The machineId is filled automatically (primary or replacement machine) and is not typed by the user. For `evidenceReference`, find how evidence is uploaded elsewhere (grep `evidenceReference` / `evidence` in `src/apis`, e.g. repair-cases custody events or ticket resolve `evidenceReferences`) and reuse the same upload flow and component. If there is no upload endpoint, use a required text field for the reference code.

## Placement checklist
- API and schema: in the files named above only.
- Shared UI: `src/components/features/maintenance-workflow/` (ticket parts) and `src/components/features/repair-workflow/` (request parts), plus generic `ReasonDialog` in `src/components/` if new.
- Role screens only render the shared components, gated by role and status.

## Tests (required)
- Add Playwright specs in `tests/e2e/` following the pattern of the existing specs (cookie `access_token` with base64 roles payload, `page.route("**/api/dolores/v1/...")` mocks):
  - `maintenance-ticket-actions.spec.ts`: create on-demand (success and 409 message), edit details (success and 409 conflict), overdue review visible only when required, unassign visible only when ASSIGNED. Run it for both admin and moderator so both roles prove they use the same UI.
  - `maintenance-request-actions.spec.ts`: overdue review, link replacement, the custody stepper enabling only the next step, closure exception visible only after PRIMARY_RETURNED.
- Assert the request method, URL and JSON body sent for each mutation.

## Done when
- `npx tsc --noEmit -p .` passes, `npm run lint` passes, and `npm run build` succeeds.
- `npx playwright test tests/e2e/maintenance-ticket-actions.spec.ts tests/e2e/maintenance-request-actions.spec.ts` passes.
- `node --test tests/` (the `*.test.cjs` unit tests) still passes. Update `tests/dolores-api-requests.test.cjs` / `tests/dolores-api-signatures.test.cjs` / `tests/maintenance-workflow-phase3.test.cjs` to cover the new API methods in the same style.
- Print a per-file summary and the command results.
