# Action bar batch 4b: finish Owner/Technician/shared feature screens

Context: `plans/action-bar-ux.md` (R1-R11) and `plans/action-bar-batch4-owner-technician.md`. The batch 4 working tree (contract create form, technician machine-check/tasks) is NOT committed yet. Keep it and build on it. Priorities: form submit/cancel 100, status-driven next step 50, create 20, edit 10, shortcuts/history/danger 0. FE only; you may read `C:/GitHub/BEANS/dolores_platform` but never modify it. Do not commit, push or install.

## Classification rule (apply to each candidate button)
- **Move to `PageActions`:** the button acts on the page's main entity or flow and is visible on the page itself. Examples: a page form's bottom Save/Cancel/Submit row, a detail screen's status step ("Xác nhận…", "Gửi…", "Duyệt…"), "Tạo …" for the page's entity.
- **Keep inline:** buttons inside a dialog (`NotificationDialog`, `ReasonDialog`, modals), row/item/card actions in lists, stepper step actions, pagination, filters, inline retry beside errors, upload/download of a specific item, and per-section sub-forms when a page has several independent section forms. With several section forms, only the section the user is editing may register its Save/Cancel; the others stay inline.
- Remove back/refresh/"Về danh sách" from any bar (R2/R3).

## Files to review (counts are grep hits; many are dialog buttons that stay)
Owner/Technician first:
- `src/pages/dashboard/menu/owner-recipe-adjustments-screen.tsx`: the recipe editor's save/cancel → `PageActions` (R8, dirty confirm).
- `src/components/features/buyback/buyback-technician-screen.tsx`: the inspection submission → primary.
- `src/components/features/buyback/buyback-owner-screen.tsx`
- `src/pages/technician/tasks/work-order-detail-screen.tsx`
- `src/components/features/coffee-packages/owner-order-form-panel.tsx`
- `src/components/features/coffee-packages/owner-refund-panel.tsx`
- `src/components/features/coffee-packages/owner-invoice-panel.tsx`
- `src/components/features/asset-management/technician-machine-access-panel.tsx`

Shared/operator screens:
- `src/components/features/repair-workflow/repair-case-detail-screen.tsx`
- `src/components/features/repair-workflow/direct-replacement-assignment-panel.tsx`
- `src/components/features/contract-termination/contract-termination-panel.tsx`
- `src/components/features/contract-termination/recall-work-orders-screen.tsx`
- `src/components/features/coffee-packages/operator-order-actions-panel.tsx`
- `src/components/features/coffee-packages/operator-refund-detail-panel.tsx`
- `src/components/features/coffee-packages/operator-catalog-panel.tsx`
- `src/components/features/coffee-packages/operator-payout-attempts-panel.tsx`
- `src/components/features/coffee-packages/operator-exceptions-panel.tsx`
- `src/components/features/billing/refund-workflow-panel.tsx`
- `src/components/features/billing/invoice-refund-panel.tsx`
- `src/components/features/asset-management/machine-registration-form.tsx`
- `src/components/features/asset-management/locations-management-panel.tsx`
- `src/components/features/recipe-menus/recipe-menus-screen.tsx`
- `src/components/features/recipe-menus/legacy-recipe-overrides.tsx`
- `src/components/features/recipe-menus/recipe-sync-panel.tsx`
- `src/components/features/operations/action-items-panel.tsx`

When the same entity appears in several roles, put the action list in a shared builder in `entity-page-actions.ts`. Keep each role's BE permission and status checks; show only valid actions (R4).

## Tests
Extend `tests/e2e/owner-technician-page-actions.spec.ts`. For each migrated screen, cover at least one case: the primary is the last bar button with primary styling and the form submit uses `form=`. Include:
- the Owner recipe editor: save is primary, and cancel confirms when dirty;
- the Technician buyback inspection: submit is primary;
- the Technician machine-check detail: no "Về danh sách" in the bar.

Update existing e2e specs that look for moved buttons in content, so they look in the bar.

## Done when
- `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` pass.
- The full `npx playwright test tests/e2e` passes except the 2 known failures (`buyback-collection-payment.spec.ts:151`, `landing-page.spec.ts:169`). If the runner hangs at teardown after printing results, report the printed results.
- `node --test --test-reporter=tap tests/*.test.cjs` has exactly 89 `not ok` titles. Compare against the baseline by running it on `git stash` first if needed, then `git stash pop`.
- Restore `debug.log` (`git checkout -- debug.log`) if your runs modify it.

Print a per-file summary (moved vs kept inline with the reason) and the command results.
