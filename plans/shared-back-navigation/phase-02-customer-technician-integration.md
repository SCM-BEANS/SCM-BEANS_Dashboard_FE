# Phase 02 — Customer and technician integration

**ID:** `phase-02-customer-technician-integration`
**Stories:** US-01, US-02, US-03, US-04

## Objective

Đưa hành vi quay lại dùng chung vào các màn detail và workflow của customer dashboard và technician, giữ riêng điều hướng nghiệp vụ không phải hành động quay lại.

### Tests to Write First

- `tests/customer-technician-back-navigation.test.cjs`: route descriptor trả đúng parent fallback cho detail/workflow customer và technician.
- Test root/list không render BackButton; route có parent render đúng một nút và giữ các action nghiệp vụ riêng.
- Xác nhận các test này fail trước khi tích hợp screen/descriptor.

## Scope and Tasks

1. Tạo mapping theo `sectionPath` cho fallback/nhãn của customer catch-all; không suy luận trang cha chỉ bằng cắt URL.
2. Customer detail fallbacks gồm contracts detail → contracts list, machine detail → machines, invoice detail → invoices, recipe detail → menu và support case detail → support; machine model/history quay về route máy cha phù hợp.
3. Với workflow customer có parent rõ, đặt fallback về nhóm chứa workflow hoặc bước cha gần nhất: contracts, invoices, menu, support, buyback và notifications → dashboard; giữ nguyên các nút hành động nghiệp vụ khác.
4. Render `BackButton` một lần gần heading của read/workflow screen; loại các action link cũ chỉ có nhiệm vụ quay lại danh sách/cha khỏi `ActionBarAction`.
5. Technician routes: task detail/form → tasks; machine-history detail → history; form trả máy thay thế → bước máy thay thế; form bảo trì → lịch sử máy; danh sách root không nhận nút back dư.
6. Kiểm tra nhãn rõ nghĩa theo nhóm, ví dụ “Danh sách khách hàng”, “Hóa đơn”, “Công việc”; history-first vẫn ưu tiên màn Dolores vừa xem khi có.

## Files / Modules

- `src/components/navigation/back-button-heading.tsx` — helper hiển thị nút trước tiêu đề, không render nút khi không có parent
- `src/pages/dashboard/[[...sections]].page.tsx`
- `src/pages/dashboard/read/customer-read-descriptor.ts`
- `src/pages/dashboard/read/customer-read-screen.tsx`
- `src/pages/dashboard/contracts/contracts-screen.tsx`
- `src/pages/dashboard/machines/machines-screen.tsx`
- `src/pages/dashboard/invoices/invoices-screen.tsx`
- `src/pages/dashboard/menu/menu-screen.tsx`
- `src/pages/dashboard/workflows/customer-workflow-descriptor.ts`
- `src/pages/dashboard/workflows/customer-workflow-screen.tsx`
- `src/pages/dashboard/workflows/repair-intake-screen.tsx`
- `src/pages/dashboard/workflows/local-recipe-screen.tsx`
- `src/pages/dashboard/workflows/notification-inbox.tsx`
- `src/pages/technician/[[...sections]].page.tsx`
- `src/pages/technician/technician-route-screens.tsx`
- `tests/customer-technician-back-navigation.test.cjs`
- `src/routes/path.ts` — chỉ bổ sung hằng số nếu inventory phát hiện thiếu route cha.

## Dependencies

Phụ thuộc `phase-01-history-aware-back-control`.

## Acceptance / Verification

- Bao phủ tất cả read-detail và workflow customer có parent; route root `/dashboard` không có nút back vô nghĩa.
- Bao phủ technician task detail, history detail và workflow task có parent; route danh sách gốc không bị thêm nút thừa.
- Mỗi screen trong phạm vi chỉ có đúng một nút back; action bar vẫn giữ hành động tạo/gửi/điều chỉnh khác.
- Với một luồng đi từ list và một luồng mở thẳng URL ở mỗi role, hành vi là history-first và fallback nội bộ tương ứng.
- Kiểm tra bằng test route/component, walkthrough trình duyệt và các lệnh lint/TypeScript ở phase 04.

## Risks / Notes

- Customer route là catch-all và workflow có quan hệ nhiều bước; cần ánh xạ theo descriptor hiện có, không dùng mọi route con làm detail.
- Nhãn cụ thể có thể điều chỉnh theo `CUSTOMER_MESSAGES`/`TECHNICIAN_MESSAGES` nếu cần chuẩn hóa localization.

## Results

- `tests/customer-technician-back-navigation.test.cjs`: 6/6 pass, sau khi xác nhận 6/6 fail trước implementation.
- Kết hợp test Phase 01 và 02: 12/12 pass; lint và TypeScript pass.
- Local route smoke trả HTTP 200 cho dashboard customer root/detail và technician tasks/history detail.
- Browser Back/Forward walkthrough chưa thực hiện trên session đăng nhập; production build cũng chưa chạy vì `next dev` đang dùng chung `.next`.
- Phase 02 implementation hoàn tất, chờ người dùng duyệt theo chế độ `--hard`.
