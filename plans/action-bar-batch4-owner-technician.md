# Action bar batch 4: Owner + Technician + remaining shared screens

Context: `plans/action-bar-ux.md` (R1-R11). Batches 0-3 are committed. See `src/components/action-bar/` (`PageActions`, `priority`, `entity-page-actions.ts`) and earlier batches for the pattern. Priorities: form submit/cancel 100, status-driven next step 50, create 20, edit 10, shortcuts/history/danger 0. FE only; you may read `C:/GitHub/BEANS/dolores_platform` for status/role rules but never modify it. Do not commit, push or install. Keep BE calls and behaviour unchanged.

After this batch, no file outside `src/components/action-bar/` may render `ActionBarConfig`, `<ActionBar>` or `ActionBarActions` directly; everything goes through `PageActions`. Verify with grep.

## 1. Remaining direct action-bar users
- `src/components/create-form/contract-create-form.tsx` (shared Admin/Moderator create contract): R8. "Hủy" (secondary, 100, confirm if dirty, back to list) and "Tạo hợp đồng" (primary submit, 100), with `disabledReason` when invalid or pending. After success, do not keep a disabled "Đã tạo" button in the bar; the success dialog handles the next step.
- `src/pages/technician/machine-check/machine-check-table.tsx`: refresh/retry leaves the bar (R3; keep an inline retry next to errors).
- `src/pages/technician/machine-check/machine-detail-screen.tsx`: remove "Về danh sách" (R2; make sure the heading has the shared back control). Move any real page action (e.g. a check/report action) into `PageActions`.
- `src/pages/technician/tasks/technician-tasks-table.tsx`: same review. Row actions stay inline; refresh/back leave the bar.

## 2. Owner (`src/pages/dashboard/**`) and Technician (`src/pages/technician/**`) audit
Grep these trees (and the feature components they render that are not covered by batches 1-3) for **page-level** action buttons still rendered inline in content: form submit/cancel rows at the bottom of a page form, "Tạo …"/"Gửi …"/"Xác nhận …" buttons that act on the page's main entity, and detail-level status actions. Move each into `PageActions` following R5/R8, with shared builders in `entity-page-actions.ts` when the same entity appears in another role (e.g. a repair request form used by Owner, or a technician task status action). Row/item actions, steppers, dialog buttons, pagination and filters stay inline. Do not change `customer-read-*` / `customer-workflow-*` descriptor behaviour beyond what R1-R4 require (they were migrated in batch 0); just verify there is a single primary and no navigation duplicates.

## 3. Technician screen (`src/pages/technician/technician-screen.tsx`)
Verify against R2/R3: no back or refresh in the bar, and the task's next status step is primary.

## 4. Tests
- Add `tests/e2e/owner-technician-page-actions.spec.ts` (mocked APIs, owner/technician cookies). Cover:
  - each screen you migrated: the primary is the last button with primary styling, there is no back/refresh in the bar, and the form submit is primary with `form=`;
  - Technician machine-check detail has no "Về danh sách" in the bar;
  - the create contract form (Admin) shows "Hủy" + "Tạo hợp đồng" primary, and "Hủy" asks for confirmation when dirty.
- Update node tests only where they assert placement; never newly fail an unrelated test.

## Done when
- `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` (default dist dir; delete extra `.next-*` folders) pass.
- The full `npx playwright test tests/e2e` passes except the 2 known failures (`buyback-collection-payment.spec.ts:151`, `landing-page.spec.ts:169`).
- `node --test --test-reporter=tap tests/*.test.cjs` has no new failure titles.
- `grep -rn "ActionBarConfig\|<ActionBar\b\|ActionBarActions" src --include=*.tsx` matches only inside `src/components/action-bar/` (and the role shells' `ActionBarLayout`).

Print a per-file summary and a screen → bar actions (order, variant) → kept inline table.
