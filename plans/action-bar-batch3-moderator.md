# Action bar batch 3: Moderator + shared feature screens

Context: `plans/action-bar-ux.md` (R1-R11). Batches 0-2 are committed. See `src/components/action-bar/` (`PageActions`, `priority`, `entity-page-actions.ts`) and the Admin batch (`src/pages/admin/contracts/index.page.tsx`) for the established pattern. Priorities: form submit/cancel 100, status-driven next step 50, create 20, edit 10, shortcuts/history/danger 0. FE only; you may read `C:/GitHub/BEANS/dolores_platform` for status rules but never modify it. Do not commit, push or install. Keep BE calls and behaviour unchanged.

## 1. Shared contract detail actions (R9)
Admin `pages/admin/contracts/index.page.tsx` and Moderator `pages/moderator/contracts/contract-detail-screen.tsx` show the same contract lifecycle. Extract `buildContractDetailActions(input)` into `entity-page-actions.ts`, using the exact Admin rules from batch 2:
- terminate (danger) and amend (secondary, 10) only when ACTIVE;
- continuation (primary, 50) only when TERMINATED;
- history (secondary, 0) when there is a `machineId`;
- while a lifecycle form is open, show only "Hủy" (100, confirm if dirty) + that form's submit (primary, 100).

Both screens must use it. Moderator detail drops "Làm mới dữ liệu" from the bar (R2/R3; keep an inline retry next to errors if one exists). Use each role's own termination path constant. Preserve the role checks: only show what the Moderator is allowed (BE `hasAnyRole` on the termination, amend and continuation endpoints) and verify them.

## 2. `pages/moderator/moderator-shell.tsx#renderActions`
- Delete `disabledAction` and the three permanently disabled placeholders (reconcile invoice, create technical request, create buyback request) per R4, and remove their now-unused message keys only if nothing else uses them.
- Replace `ActionBarConfig` + `ButtonBar` with `PageActions`, and only on root section lists (`isSectionList`):
  - Contracts: "Tạo hợp đồng" (primary, 20).
  - Customers: "Tạo khách hàng" (primary, 20).
- Remove the pure navigation shortcuts:
  - overview → invoices "pending work";
  - IoT → machines;
  - machine history → technical requests;
  - notifications → alerts;
  - default → overview.

  These duplicate the sidebar (R2). Exception: keep overview → "Việc cần xử lý" as a secondary only if the overview has no other way to reach it; otherwise remove it.
- Update `tests/moderator-shell-*.test.cjs` assertions that check the removed placeholders/shortcuts, but only where they assert placement or presence, and keep other behaviour assertions. Never newly fail a test unrelated to these changes. The baseline-failing test "Moderator shell shows section actions only on root lists and overview" may be updated to the new expectations.

## 3. `pages/moderator/machines/machines-screen.tsx`
Same as Admin machines list: "Tạo máy" primary (20), "Tạo dòng máy" secondary (10), "Xem IoT" secondary (0), using `PageActions`.

## 4. Shared feature screens (used by Admin/Moderator)
- `components/features/admin-users/admin-user-create-view.tsx`: R8 "Hủy" (secondary, 100, confirm if dirty, navigates back) + "Tạo người dùng" primary submit (100) with disabled reason.
- `components/features/admin-users/admin-user-detail-view.tsx`: "Lưu" primary submit (100) with a disabled reason when `!canEdit`; remove the "Quay lại" nav (R2; the heading has back). If the form is not dirty, "Lưu" is disabled with "Chưa có thay đổi để lưu." if dirty tracking is available or easy to add.
- `components/features/buyback/buyback-moderator-screen.tsx`: cancel-buyback is danger (0) via `PageActions`; keep its reason dialog as the confirm step.
- `components/features/buyback/buyback-workflow-shared.tsx`: remove the back link from the bar (R2); make sure the heading has a back control (use `BackButtonHeading` if it is missing).
- `components/features/recipe-menus/recipe-menus-screen.tsx`: remove "Về danh sách menu" from the bar (R2, use the heading back); move the remaining page actions to `PageActions` with correct variants.

## 5. Tests
- Add `tests/e2e/moderator-page-actions.spec.ts` (moderator cookie, mocked APIs). Cover:
  - the contract detail for ACTIVE (terminate danger + amend), TERMINATED (continuation primary, no terminate), and form-open (2 buttons);
  - no disabled placeholder buttons on the invoices, technical requests and buyback lists;
  - the contracts list shows "Tạo hợp đồng" primary;
  - the IoT list has no action bar (dock hidden);
  - the machines list shows "Tạo máy" primary.
- Re-run `tests/e2e/admin-page-actions.spec.ts` to confirm the shared contract builder kept Admin behaviour.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build` (default dist dir; delete any extra `.next-*` folders you create) pass. The full `npx playwright test tests/e2e` passes except the 2 known pre-existing failures (`buyback-collection-payment.spec.ts:151`, `landing-page.spec.ts:169`). `node --test --test-reporter=tap tests/*.test.cjs` has no new failure titles. Print a per-file summary and a screen → bar actions (order, variant) → kept inline table.
