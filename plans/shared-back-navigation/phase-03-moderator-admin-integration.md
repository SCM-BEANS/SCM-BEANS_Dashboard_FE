# Phase 03 — Moderator and admin integration

**ID:** `phase-03-moderator-admin-integration`
**Stories:** US-01, US-02, US-03, US-04

## Objective

Chuẩn hóa màn chi tiết và nested workflow của moderator/admin, thay các link/quay về section riêng lẻ bằng shared `BackButton` mà không làm mất chức năng action bar.

### Tests to Write First

- `tests/moderator-admin-back-navigation.test.cjs`: nested moderator routes có parent mapping, root routes không có nút back, mỗi detail chỉ render một nút.
- Test admin machine fallback và shallow `businesses/stores` giữ đúng q/status/page/ownerId của entry trước.
- Xác nhận các test này fail trước khi sửa shell và screen moderator/admin.

## Scope and Tasks

1. Moderator: ánh xạ parent cho toàn bộ nested routes có màn trước rõ ràng, gồm customer, contract, machine, IoT, invoice, recipe, technical request, machine history, buyback và notifications/alerts trong catch-all/dynamic routes.
2. Thay logic `moderator-shell` đang luôn đưa route con về `currentSection.HREF` bằng history-first BackButton có fallback/nhãn theo route; render nút ở đầu vùng nội dung, phía trên heading.
3. Loại link back trùng trong customer/contract detail screens, machine detail, invoice, recipe và technical detail; giữ link tới màn khác nếu đó là hành động nghiệp vụ riêng.
4. Admin machine detail: chuyển `ButtonBar` về máy từ action bar lên trước heading thành BackButton với `PATH_ADMIN.MACHINES` làm fallback; giữ link IoT và refresh trong action bar.
5. Admin businesses/stores: với `view=detail` shallow query, đặt BackButton trước heading, quay về entry danh sách trước để bảo toàn q/status/page; direct query detail fallback về màn list cùng route. Không đổi nút Cancel của create thành Back nếu ý nghĩa khác.
6. Không thêm nút ở danh sách root của admin/moderator.

## Files / Modules

- `src/pages/moderator/moderator-shell.tsx`
- `src/pages/moderator/moderator-read-screens.tsx`
- `src/pages/moderator/customers/customer-detail-screen.tsx`
- `src/pages/moderator/contracts/contract-detail-screen.tsx`
- `src/pages/moderator/machines/machines-screen.tsx`
- `src/pages/moderator/invoices/invoices-screen.tsx`
- `src/pages/moderator/menu/recipes-screen.tsx`
- `src/pages/moderator/technical/technical-screen.tsx`
- `src/pages/admin/machines/[machineId].page.tsx`
- `src/pages/admin/businesses/index.page.tsx`
- `src/pages/admin/stores/index.page.tsx`
- `src/routes/path.ts` — fallback constants nếu thiếu.

## Dependencies

Phụ thuộc `phase-01-history-aware-back-control`; có thể chạy song song về mặt code với phase 02 sau khi API component được cố định, nhưng không dùng `--parallel` plan.

## Acceptance / Verification

- Moderator detail/workflow có một BackButton phía trên heading, quay lại entry Dolores trước nếu có; direct detail dùng parent fallback đúng domain.
- Admin machine detail quay lại list; business/store detail state quay về query-state list trước đó hoặc list fallback; nút back nằm phía trên heading, không lẫn action bar.
- Mỗi trang chỉ có một nút quay lại; action menu, refresh, link xem liên quan và các thao tác khác không bị xóa.
- Không thêm nút vào route list/root; kiểm tra bằng walkthrough ở desktop và mobile.

## Risks / Notes

- `moderator-shell` đã render một hành động quay về section cho hầu hết route con; cần xác định một nơi sở hữu UI để tránh render trùng với màn detail.
- Admin stores/businesses có shallow query navigation, khác với dynamic detail routes; phải giữ nguyên query/filter khi quay về.

## Implementation status: 2026-10-27

- TDD red/green completed: the new Phase 03 test file moved from 5 failing checks to 5 passing checks.
- Added route-specific moderator parent mapping and a shared heading adapter; removed nested shell action-bar back buttons and duplicate detail links while preserving root-list actions.
- Added admin query fallback builders for business filters (`q`, `status`, `page`) and store owner scope (`ownerId`); kept create Cancel semantics.
- Verification: Phase 03 5/5; combined Phase 01-03 17/17; lint and TypeScript pass; five local route requests returned HTTP 200.
- Full suite: 100/146 pass, 46 existing failures unchanged. Browser walkthrough remains unverified because the current local session redirects to forbidden; production build was skipped while dev server is active.
- Status: implementation complete, awaiting user review before Phase 04.
