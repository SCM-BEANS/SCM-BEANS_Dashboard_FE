# Phase 04 — Cross-role coverage and accessibility validation

**ID:** `phase-04-cross-role-validation-accessibility`
**Stories:** US-01, US-02, US-03, US-04

## Objective

Rà lại toàn bộ màn đã tích hợp, loại trường hợp thiếu/trùng, kiểm chứng history/fallback đa vai trò và chuẩn accessibility/responsive.

### Tests to Write First

- `tests/back-navigation-coverage.test.cjs`: enumerate route descriptors and assert all in-scope routes have one fallback mapping and one BackButton.
- Test accessible label, visible focus selector and minimum 44 px styling contract at desktop/mobile rules.
- Confirm route-coverage tests fail when a detail mapping/control is removed, before final cleanup.

## Scope and Tasks

1. Quét các link/nút có nhãn back/quay lại và các branch detail/workflow trong route descriptors; đối chiếu route inventory với spec.
2. Kiểm tra một flow list → detail với query/filter ở customer, moderator, admin và technician; xác nhận history back trở về đúng entry list.
3. Mở trực tiếp ít nhất một route detail/workflow mỗi role; xác nhận fallback cùng-origin và đúng parent.
4. Kiểm tra back/forward liên tiếp, route replace, shallow query, và trường hợp đăng nhập/redirect không bị ghi thành route detail trước đó.
5. Kiểm tra keyboard tab/focus-visible, accessible label, vùng chạm ≥44 px tại breakpoint mobile và desktop; xác nhận mỗi màn chỉ có một nút.
6. Chạy `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false` và `npm.cmd run build`; ghi riêng lỗi nền đã có nếu xuất hiện.

## Files / Modules

- Tất cả component/screen đã thay đổi ở phase 01–03.
- `src/routes/path.ts` và các route descriptor đã thêm fallback mapping.
- Không tạo module sản phẩm mới trong phase audit.

## Dependencies

Phụ thuộc phase 02 và phase 03 hoàn tất; phase 01 phải ổn định trước tất cả walkthrough.

## Acceptance / Verification

- 100% route detail/workflow có parent trong inventory có đúng một nút shared BackButton.
- 100% walkthrough deep-link điều hướng về fallback Dolores, không ra external origin.
- 100% walkthrough list → detail → back khôi phục đúng route/query; browser forward vẫn mở lại detail.
- Tất cả nút back đáp ứng nhãn/focus-visible và chiều cao tối thiểu 44 px.
- Lint, TypeScript và production build hoàn tất; nếu lỗi baseline có sẵn, nêu rõ và xác nhận không phát sinh lỗi mới.

## Execution Notes - 2026-10-27

- TDD red/green: `tests/back-navigation-coverage.test.cjs` failed before the missing Admin mappings/headings existed, then passed 3/3 after implementation.
- Route verification: combined navigation tests passed 20/20, including internal fallbacks, root-list exclusions, preserved query parameters, history Back/Forward/replace, and the 44 px/focus/label contract.
- Static checks passed: `npm.cmd run lint` and `npx.cmd tsc --noEmit --incremental false`.
- Production build passed using a temporary isolated `distDir` to avoid writing into the active dev server's `.next`; the temporary build directory was cleaned up.
- Full suite: 103/149 passed; 46 failures match the existing baseline failures documented in earlier phases.
- Read-only code review: score 10.0, with 0 CRITICAL, 0 HIGH, 0 MEDIUM, and 0 LOW findings.
- Manual browser role walkthrough was not completed because the available Admin session reached the forbidden screen. Automated deep-link fallback and route-state checks passed; interactive UI behavior remains unverified.
- Phase 04 was approved by the user on 2026-10-27. Interactive browser validation remains unverified.

## Risks / Notes

- TDD regression suite bổ sung route coverage cho các phase trước; walkthrough vẫn xác minh trình duyệt và responsive behavior.
- Ghi lại kết quả riêng theo role để một route thành công không che lấp lỗi ở catch-all hoặc query-state view khác.
