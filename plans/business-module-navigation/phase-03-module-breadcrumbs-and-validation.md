# Phase 03 — Breadcrumb module và kiểm tra điều hướng

## Mục tiêu

Hiện vai trò, module và trang đang mở ở header desktop và breadcrumb mobile, dùng đúng route metadata đã gắn.

## Phạm vi

- Mở rộng component breadcrumb hiện có trong `src/components/heading/admin-breadcrumb.tsx` để nhận nhãn module tùy chọn; giữ liên kết quay về hiện tại nếu đang có.
- Dùng breadcrumb đã mở rộng tại Admin, Moderator, Owner và Technician shell; không thêm breadcrumb thứ hai trong từng page.
- Lấy current navigation entry bằng `getActiveNavigationItem`, dùng kết quả đó cho cả nhãn trang và module để tránh hai resolver khác nhau.
- Với route detail, chọn item có href cha khớp cụ thể nhất; query/hash/trailing slash tiếp tục được chuẩn hóa bởi matcher hiện có.
- Với trang ngoài hai module hoặc không ánh xạ được, tiếp tục hiển thị breadcrumb hiện tại mà không bịa module.
- Walkthrough thủ công qua URL list/detail, tải trực tiếp, refresh, Back/Forward và query string; kiểm tra responsive tại 360, 768, 1023 và 1024px.

## Files/modules

- `src/components/heading/admin-breadcrumb.tsx`
- `src/components/sidebar/navigation-route.ts` — chỉ nếu cần xuất thêm resolver dựa trên matcher hiện có; không tạo luật path riêng.
- `src/pages/admin/admin-shell.tsx`
- `src/pages/moderator/moderator-shell.tsx`
- `src/pages/dashboard/customer-shell.tsx`
- `src/pages/technician/technician-shell.tsx`

## Phụ thuộc

Phase 01 cung cấp metadata; Phase 02 hoàn tất cấu trúc grouped navigation trước khi kiểm tra trạng thái active cuối cùng.

## Tiêu chí nghiệm thu

- Trang thuộc module hiển thị `Role / Module / Mục điều hướng` cả desktop lẫn mobile.
- Trang detail sâu vẫn hiển thị module của item cha chính xác; current item không nhảy sang route gần tên.
- Tải trực tiếp hoặc refresh route không làm breadcrumb rỗng hoặc sai.
- Back/Forward và URL có query/hash cập nhật đúng active item, nhóm mở và breadcrumb.
- Trang ngoài module không bị gắn nhãn module sai.
- Các kiểm tra viewport xác nhận drawer/sidebar và logout vẫn dùng được; không có lỗi console mới do điều hướng.

## Rủi ro và lưu ý

Admin và Moderator đã có breadcrumb chung nhưng Owner/Technician có markup riêng. Giữ một quy tắc render dùng chung, đồng thời không thay đổi header notification, action bar hoặc nội dung page.
