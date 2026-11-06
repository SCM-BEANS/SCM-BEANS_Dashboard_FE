# Module 4 review fixes (Claude review)

Same constraints as module-04-repair-replacement.md. The work is in the working tree (not committed). Fix the following.

## BE facts (verified in `RepairCaseWorkService`)
- `authorizeEmergencyWork` creates a timeline event `eventType = "EMERGENCY_WORK_AUTHORIZED"` with `details = "authorizationId=<uuid>;scope=<workScope>;disputedReviewId=<uuid>"`.
- When the latest cost review of the case ticket is `DISPUTED`, the technician's `startWork` (`RepairWorkStartRequest { workScope, emergencyAuthorizationId }`) and `completeWork` (`RepairWorkCompletionRequest`, which has `emergencyAuthorizationId`) must send an authorization id, and the request's work scope must **equal exactly** the authorization's `workScope`. An authorization can be used only once (otherwise 409 "already used or does not match this work scope").
- There is no endpoint that lists cost reviews per case. Reviews can only be read by id (`GET /repair-cost-reviews/{reviewId}`).

## 1. Technician must not type the authorization ID
In `repair-case-detail-screen.tsx`, replace the free-text authorization ID input with:
- a parser helper `parseEmergencyAuthorizationEvents(timelineEvents)` in `src/components/features/repair-workflow/` that returns `{ authorizationId, workScope, disputedReviewId, authorizedAt, actorRole, reason }[]` from `EMERGENCY_WORK_AUTHORIZED` events (parse `details` safely; ignore malformed ones). Unit-test it.
- When the case is under an open dispute, the technician start/complete work form shows a select "Ủy quyền xử lý khẩn cấp" with those authorizations (newest first). Choosing one fills `emergencyAuthorizationId` and sets the work scope field to the authorization's `workScope` (read-only, so it always matches exactly). On 409, show "Ủy quyền này đã được sử dụng hoặc không khớp phạm vi công việc." and let the technician choose another.
- When there is no dispute, hide the select and send no `emergencyAuthorizationId`.

## 2. Reliable dispute detection
The operator "Cho phép xử lý khẩn cấp" action and the technician select both need to know whether the latest cost review is `DISPUTED`:
- Load **all** timeline pages for the case (loop `getTimeline(caseId, page, 50)` while `hasNext`, max 20 pages) in one query `["dolores","repair-cases",caseId,"timeline","all"]`, instead of relying on the page that is currently shown.
- Find the latest event that references a cost review id (inspect the existing timeline event shapes and the repair-cost-review screens to see which field or `details` key holds the review id; grep `repairCostReview`/`reviewId` in `src/`), then `repairCostReviewsApi.getById(reviewId)` and check `status === "DISPUTED"`. Extract this into a hook `useRepairCaseCostDispute(caseId)` in `src/components/features/repair-workflow/`, used by both the operator action and the technician form.
- Show the action only when the case status is `DIAGNOSIS` or `REPAIR_IN_PROGRESS` and the hook reports DISPUTED.

## 3. Show authorizations in the case detail
List the parsed authorizations (time, actor role label, reason, work scope) in an "Ủy quyền khẩn cấp" section visible to operators and the assigned technician. Use Vietnamese labels.

## 4. Tests
Extend `tests/e2e/repair-case-replacement-actions.spec.ts`:
- Offer action hidden for other statuses (e.g. `DIAGNOSIS`) and visible for `WAITING_REPLACEMENT` and `WAITING_OWNER_DECISION`.
- Emergency action: hidden when the review is not DISPUTED or the status is not DIAGNOSIS/REPAIR_IN_PROGRESS; visible and posts `{ reason, workScope }` when both hold, for admin and moderator.
- Technician start work under dispute: the select lists the authorization from the timeline, the scope becomes read-only and equal, and the POST body has `emergencyAuthorizationId` plus the exact `workScope`; a 409 shows the message.
- Add a unit test for `parseEmergencyAuthorizationEvents`.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, `npx playwright test tests/e2e/repair-case-replacement-actions.spec.ts` pass, and `node --test tests/*.test.cjs` has no new failure titles. Print a per-file summary.
