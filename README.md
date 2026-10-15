# Dolores · Next.js prototype

Next.js bản local chuyển thể từ file Figma Dolores. Bốn không gian làm việc dùng chung một responsive app shell; các route chính đi theo vai trò Admin, Moderator, Technician và Khách hàng.

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000), sau đó chọn vai trò. Có thể mở trực tiếp `/admin`, `/moderator`, `/technician` hoặc `/customer`.

## Route chính

- **Admin:** `/admin`, `/admin/accounts`, `/admin/customers`, `/admin/contracts`, `/admin/machines`, `/admin/monitoring`, `/admin/global-menu`, `/admin/reports`.
- **Moderator:** `/moderator`, `/moderator/contracts`, `/moderator/contracts/new`, `/moderator/customers`, `/moderator/invoices`, `/moderator/deposits`, `/moderator/machines`, `/moderator/monitoring`, `/moderator/global-menu`, `/moderator/technical-requests`, `/moderator/machine-history`, `/moderator/buyback`.
- **Technician:** `/technician`, `/technician/tasks/YC-017`, `/technician/history`.
- **Khách hàng:** `/customer`, `/customer/contracts`, `/customer/machines`, `/customer/machines/S-018`, `/customer/machines/S-018/telemetry`, `/customer/menu`, `/customer/invoices`, `/customer/support`, `/customer/buyback`.

## Figma nguồn

[Dolores · UX/UI V3](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=3-68)

Các frame đã lấy ngữ cảnh và ảnh bằng Figma MCP trong quá trình chuyển thể gồm: Admin tổng quan `10:49`, Moderator tổng quan `11:8`, Technician công việc `13:49`, Khách hàng tổng quan `14:8`, danh sách máy `14:204`, chi tiết Smart IoT `14:300` và PAYG/ly gửi muộn `11:661`.

Chuyển động dùng cho đổi route, mở drawer/hộp thoại, biểu đồ và mô hình máy được dựng lại bằng Motion/CSS. Prototype Figma có nhiều frame trạng thái; các màn chính được ghép thành route và trạng thái tương tác theo luồng, không xuất thành 840 route riêng.

## Phạm vi bản local

Dữ liệu là minh họa. Bản này chưa kết nối backend, tài khoản thật, giao dịch/chuyển khoản, upload hồ sơ lên server, telemetry thời gian thực, đồng bộ menu với máy hay mô hình 3D tương tác. Các nút ghi nhận thao tác chỉ cập nhật trạng thái demo trên giao diện.
