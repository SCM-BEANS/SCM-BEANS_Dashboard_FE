# Phase 01 — Route map và module metadata

## Mục tiêu

Gắn module nghiệp vụ vào từng entry điều hướng đang tồn tại để nhóm menu và breadcrumb dùng chung một nguồn dữ liệu theo role.

## Phạm vi

- Rà soát `ADMIN_NAVIGATION_LINKS`, `MODERATOR_NAVIGATION_LINKS`, `CUSTOMER_NAVIGATION_LINKS` và `TECHNICIAN_NAVIGATION_LINKS` trong `src/routes/routes.ts` với route/page thật.
- Định nghĩa kiểu metadata module tùy chọn, tối thiểu gồm `operations` và `maintenance-inventory`; không đưa metadata vào entry không thuộc hai nhóm.
- Gắn module cho đúng href theo bảng ánh xạ trong `plan.md`; giữ nguyên nhãn, icon, href và quyền của entry.
- Truyền metadata qua các adapter role hiện có: `src/pages/admin/menu/admin-menu.tsx`, `src/pages/moderator/moderator-shell.tsx`, `src/pages/dashboard/customer-shell.tsx`, `src/pages/technician/technician-shell.tsx`.
- Dùng kiểu `SidebarItem` hiện tại làm điểm giao diện; không tạo bản sao menu hoặc một resolver path thứ hai.
- Ghi nhận entry “Hóa đơn” lặp trong menu Admin và xử lý theo quyết định của người dùng trước khi cook.

## Files/modules

- `src/routes/routes.ts`
- `src/components/sidebar/sidebar.tsx` — kiểu `SidebarItem` nếu cần mở rộng.
- `src/pages/admin/menu/admin-menu.tsx`
- `src/pages/moderator/moderator-shell.tsx`
- `src/pages/dashboard/customer-shell.tsx`
- `src/pages/technician/technician-shell.tsx`
- `feature_list.json` — trạng thái phase do cook cập nhật.

## Phụ thuộc

Không có. Đây là nền tảng cho Phase 02 và Phase 03.

## Tiêu chí nghiệm thu

- Từng mục được gán module đều trỏ tới route/page hiện có của đúng role.
- Mọi href cũ, role guard và quyền API giữ nguyên.
- Không tạo nhóm hoặc mục điều hướng mới chỉ để làm đủ danh sách.
- Metadata đến được `SidebarItem` ở cả bốn role.
- Xử lý entry hóa đơn trùng theo quyết định được chốt; không có hai liên kết cùng href trong menu sau khi nhóm.

## Rủi ro và lưu ý

`routes.ts`, `moderator-shell.tsx` và `feature_list.json` đang có thay đổi chưa commit. Khi triển khai, sửa trên trạng thái hiện tại và giữ nguyên các thay đổi không thuộc tính năng này.

## Kết quả Phase 01

- **Trạng thái:** Hoàn tất; chờ người dùng duyệt trước Phase 02 theo review gate `cook --hard`.
- **Thay đổi:** Thêm metadata `operations` hoặc `maintenance-inventory` cho các mục menu đã chốt; chuyển metadata qua adapter của bốn role; mở rộng `SidebarItem`; bỏ một entry Hóa đơn Admin trùng URL.
- **Kiểm tra:** `node --test tests/shared-role-navigation-cross-role.test.cjs` (7/7), `npm.cmd run lint` (0 lỗi, 3 cảnh báo có sẵn ngoài phạm vi), `npx.cmd tsc --noEmit --incremental false` (pass), `git diff --check` (pass).
- **Review:** Đọc lại diff Phase 01; không phát hiện lỗi hoặc thay đổi URL, quyền, API hay luồng màn hình.
