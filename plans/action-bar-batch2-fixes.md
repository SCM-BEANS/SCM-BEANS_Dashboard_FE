# Action bar batch 2: review fixes

Batch 2 (`plans/action-bar-batch2-admin.md`) is in the working tree (not committed). Fix exactly these in `src/pages/admin/contracts/index.page.tsx` (contract detail `PageActions`):

1. **R4, follow the BE status rules.** The BE `TerminationCaseService` (lines 100, 134, 385) and `ContractPolicyVersionService.amendPolicy` (line 58) only accept `ACTIVE` contracts. Show "Chấm dứt hợp đồng" and "Sửa chính sách" only when `contract.data.status === "ACTIVE"`. "Tạo hợp đồng tiếp nối" stays TERMINATED-only, as it is now.
2. **Focus while a lifecycle form is open (amend/continuation):** the bar shows only that form's "Hủy" + submit. Remove "Chấm dứt hợp đồng" and "Lịch sử hợp đồng" from the list while `lifecycleView` is set, because a danger button next to "Hủy" invites mis-clicks.
3. Remove the pending text baked into the `label` (`amendPolicy.isPending ? "Đang xác nhận sửa đổi" : …`); `pendingLabel` already covers it.
4. Update `tests/e2e/admin-page-actions.spec.ts`:
   - an ACTIVE contract shows terminate (danger) + edit policy;
   - a TERMINATED contract shows neither, and shows "Tạo hợp đồng tiếp nối" as primary;
   - with the amend form open, exactly two buttons are in the bar ("Hủy", "Xác nhận sửa đổi" primary) and no overflow trigger.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build` (default dist dir; delete any extra `.next-*` build folders you create) pass; `npx playwright test tests/e2e/admin-page-actions.spec.ts tests/e2e/page-actions.spec.ts` pass; `node --test --test-reporter=tap tests/*.test.cjs` has no new failure titles. Do not commit, push or install. Print a per-file summary.
