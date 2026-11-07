# Action bar batch 2: Admin pages

Context: `plans/action-bar-ux.md` (rules R1-R11). Batches 0-1 are committed. Use `PageActions` (`src/components/action-bar/page-actions.tsx`) with `priority` (form submit 100, status-driven next step 50, create 20, edit 10, shortcuts/transfer/danger 0). The registry merges groups, so the renderer picks one primary and handles overflow. FE only; do not commit, push or install; keep BE calls and behaviour unchanged.

Scope: `src/pages/admin/**`. Remove every direct `ActionBar`/`ActionBarConfig` + `ButtonBar` use for page-level actions and replace it with `PageActions`. Row actions (table rows, proof rows, document download) and pagination stay inline. "Thử lại" next to errors stays inline (R3). Remove "Thử lại"/"Làm mới" from the bar.

## Per screen

- **contracts/index.page.tsx**
  - List: "Tạo hợp đồng" primary (20); remove the retry/refresh button from the bar.
  - Detail (8-button bar), by state:
    - No lifecycle form open: primary "Tạo hợp đồng tiếp nối" (50) if allowed; secondary "Sửa chính sách" (10). When it is disabled (no `contractTermsSnapshot`), show `disabledReason` "Hợp đồng chưa có snapshot chính sách". Secondary "Lịch sử hợp đồng" (0, href/navigate). Danger "Chấm dứt hợp đồng" (0) goes to the termination page via href; navigating does not need a confirm, because the termination page has its own confirmation.
    - Amend form open: "Hủy" secondary (100, confirm when the form is dirty) + "Xác nhận sửa đổi" primary submit `form="contract-policy-amend-form"` (100). Hide the other lifecycle buttons while a form is open; "Lịch sử" and "Chấm dứt" may stay in the overflow.
    - Continuation form open: same pattern; primary "Tạo bản nháp tiếp nối" submit `form="contract-continuation-form"`.
  - Labels ≤ 4 words (R10).
- **machines/index.page.tsx**: "Tạo máy" primary (20); "Tạo dòng máy" secondary (10); "Xem IoT" secondary shortcut (0).
- **machines/create-machine-form.tsx, create-machine-model-form.tsx, machine-model-detail.tsx**: forms follow R8: "Hủy" (confirm if dirty) + "Tạo …"/"Lưu thay đổi" primary submit with `form=`, disabled with a reason while invalid/pending. Remove inline duplicate submit/cancel buttons that the bar replaces.
- **stores/index.page.tsx**: list "Tạo cửa hàng" primary; create/edit form "Hủy" + "Lưu" (R8); detail "Chỉnh sửa" (10, primary if it is the only action).
- **users/index.page.tsx**: "Tạo người dùng" primary; remove retry from the bar.
- **iot/index.page.tsx**: remove the "Máy" nav link and retry from the bar (R2/R3) unless the link is the obvious next step; if nothing is left, no bar.
- **notifications/index.page.tsx, overview/overview-content.tsx, reports/index.page.tsx**: cross-section shortcut links: keep at most the 1-2 obvious next steps as secondary (overview → Báo cáo, IoT, Máy is acceptable as secondaries; no primary needed). Notifications → Reports is not an obvious next step: remove it.
- **invoices/invoices-management-screens.tsx**: list refresh button leaves the bar/pagination area if it is a page action (keep pagination inline). Export job detail: "Tải file hóa đơn" primary (50), disabled with reason "File chưa sẵn sàng" until COMPLETED; "Cập nhật trạng thái" secondary; remove the "Danh sách hóa đơn" nav (R2). Invoice detail status-change buttons: if they are page-level (change invoice status), move them into `PageActions` (the most likely next status is primary, cancel/void is danger with confirm); proof review stays inline per proof row. Invalid-ID "Về danh sách" inside the error notice may stay inline (it is the recovery for that error).
- **machines/machine-detail-screen.tsx**: already migrated in batch 1; only verify.

## Tests
- Update existing node tests that assert old admin button placement only where the assertion is about placement, not behaviour; never newly fail a passing test.
- Add `tests/e2e/admin-page-actions.spec.ts` (mock APIs like the other specs, admin cookie). Cover:
  - The contract detail with no form open shows ≤ 3 visible buttons + "Thêm thao tác"; "Chấm dứt hợp đồng" is danger/first; the primary is last.
  - Opening amend shows "Hủy" + "Xác nhận sửa đổi" as primary.
  - On the contract list, "Tạo hợp đồng" is primary and there is no retry in the bar.
  - On the machines list, "Tạo máy" is primary.
  - The create machine form has "Lưu/Tạo" primary submit.
  - The overview bar has no primary and only secondary links.
  - At 390×844 the contract detail shows primary + overflow only.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build` pass. `npx playwright test tests/e2e/admin-page-actions.spec.ts tests/e2e/page-actions.spec.ts` plus any existing admin e2e specs pass. `node --test tests/*.test.cjs` has no new failure titles (89 baseline). Print a per-file summary and a table: screen → actions in the bar (order, variant) → kept inline.
