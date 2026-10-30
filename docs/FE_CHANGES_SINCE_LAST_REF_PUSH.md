# Thay đổi FE của 4 role so với lần push gần nhất trên `ref`

Ngày đối chiếu: 30/10/2026
Repo: `SCM-BEANS_Dashboard_FE`
Nhánh: `ref`

## Mốc so sánh

- Đã chạy `git fetch origin ref` trước khi lập báo cáo.
- Commit gần nhất trên `origin/ref`: `a40ca9fb50e46c3a6336198ed92cbab264fdbb95` (`Merge branch 'ref' of https://github.com/SCM-BEANS/SCM-BEANS_Dashboard_FE into ref`).
- `HEAD` hiện tại trùng commit đó. Các thay đổi dưới đây đang ở working tree, chưa commit/push.
- Diff FE tổng cộng có 72 file, tăng 5.923 dòng và xóa 802 dòng. Tài liệu này tập trung vào 4 role: **37 file màn hình/text theo role** và **30 file dùng chung hỗ trợ các role đó**. Ba tài liệu API vai trò và hai file test hiện có nằm ngoài phần trình bày chi tiết này.

## Admin

### Thay đổi chính

- **Hợp đồng:** bổ sung các thao tác về trạng thái hết hạn, quyết định gia hạn, tài liệu hợp đồng, kích hoạt, điều chỉnh/lịch sử chính sách, tiếp tục và yêu cầu chấm dứt hợp đồng.
- **Máy:** bổ sung chỉnh sửa/xóa máy; tại chi tiết máy có thể đọc heartbeat và telemetry theo khoảng ngày cho máy `SMART_IOT`.
- **Model máy:** thêm xem, tạo/cập nhật, gán máy vào model và vô hiệu hóa model.
- **Menu:** mở rộng quản lý công thức và đồng bộ công thức tới máy.
- **Cửa hàng/địa điểm:** bổ sung thao tác tạo, sửa và vô hiệu hóa địa điểm.
- **Tài khoản:** mở rộng thao tác và dữ liệu hiển thị trong trang quản lý người dùng.
- **Thông báo:** bổ sung trạng thái chưa đọc và thao tác cập nhật trạng thái đọc.

### File màn hình Admin

- `src/pages/admin/contracts/index.page.tsx`
- `src/pages/admin/machines/machine-detail-screen.tsx`
- `src/pages/admin/machines/machine-model-detail.tsx`
- `src/pages/admin/menu/index.page.tsx`
- `src/pages/admin/notifications/index.page.tsx`
- `src/pages/admin/stores/index.page.tsx`
- `src/pages/admin/users/index.page.tsx`

## Customer/Owner

### Thay đổi chính

- **Hợp đồng:** mở rộng thông tin chi tiết hợp đồng và tài liệu.
- **Máy:** mở rộng dữ liệu máy được Owner quản lý.
- **Menu:** thêm dữ liệu và thao tác liên quan công thức.
- **Yêu cầu hỗ trợ/bảo trì:** mở rộng danh sách và luồng làm việc, gồm lịch hẹn, thông tin sửa chữa/custody và các trạng thái xử lý liên quan.
- Cập nhật descriptor và workflow để mô tả/điều hướng các thao tác mới.

### File màn hình Customer/Owner

- `src/pages/dashboard/contracts/contracts-screen.tsx`
- `src/pages/dashboard/machines/machines-screen.tsx`
- `src/pages/dashboard/menu/menu-screen.tsx`
- `src/pages/dashboard/read/customer-read-descriptor.ts`
- `src/pages/dashboard/read/customer-read-screen.tsx`
- `src/pages/dashboard/support/support-requests-list-screen.tsx`
- `src/pages/dashboard/workflows/customer-workflow-descriptor.ts`
- `src/pages/dashboard/workflows/customer-workflow-screen.tsx`

## Moderator

### Thay đổi chính

- **Cảnh báo:** bổ sung trạng thái và thao tác xử lý cảnh báo.
- **Buyback:** mở rộng quy trình từ tạo hồ sơ, thu thập/kiểm định/định giá đến thanh toán, tân trang, QA và xem lịch sử.
- **Hợp đồng/lắp đặt:** bổ sung thông tin hợp đồng và yêu cầu lắp đặt.
- **Khách hàng:** mở rộng xem và cập nhật chi tiết hồ sơ khách hàng.
- **Hóa đơn:** bổ sung xem hóa đơn và duyệt chứng từ thanh toán.
- **IoT:** chọn máy Smart IoT, đọc heartbeat và tải telemetry theo khoảng ngày.
- **Máy, công thức và kỹ thuật:** mở rộng thao tác quản lý máy/công thức và xử lý công việc kỹ thuật.
- Cập nhật shell, trang đọc và nội dung thông báo Moderator.

### File Moderator

- `src/pages/moderator/[[...sections]].page.tsx`
- `src/pages/moderator/alerts/alerts-screen.tsx`
- `src/pages/moderator/buyback/buyback-screen.tsx`
- `src/pages/moderator/contracts/contract-detail-screen.tsx`
- `src/pages/moderator/contracts/contract-installation-request-screen.tsx`
- `src/pages/moderator/customers/customer-create-screen.tsx`
- `src/pages/moderator/customers/customer-detail-screen.tsx`
- `src/pages/moderator/invoices/invoices-screen.tsx`
- `src/pages/moderator/iot/iot-screen.tsx`
- `src/pages/moderator/machines/machines-screen.tsx`
- `src/pages/moderator/menu/recipes-screen.tsx`
- `src/pages/moderator/moderator-read-screens.tsx`
- `src/pages/moderator/moderator-shell.tsx`
- `src/pages/moderator/technical/technical-screen.tsx`
- `src/text/moderator/moderator-messages.ts`

## Technician

### Thay đổi chính

- Thêm trang lịch sử máy và điều hướng giữa danh sách với chi tiết máy.
- Mở rộng bảng việc được giao và chi tiết work order.
- Bổ sung nội dung/tương tác cho checklist, phụ kiện và các bước xử lý work order; cập nhật hiển thị kết quả công việc.
- Cập nhật màn kiểm tra máy và giao diện responsive của chi tiết work order.

### File Technician

- `src/pages/technician/history/[machineId].page.tsx`
- `src/pages/technician/history/history-screen.tsx`
- `src/pages/technician/history/index.page.tsx`
- `src/pages/technician/machine-check/machine-detail-screen.tsx`
- `src/pages/technician/tasks/technician-tasks-table.tsx`
- `src/pages/technician/tasks/work-order-detail-screen.module.css`
- `src/pages/technician/tasks/work-order-detail-screen.tsx`

## Phần dùng chung hỗ trợ 4 role

Các thay đổi màn hình phía trên dựa vào 13 API client và 11 schema dùng chung. Những nhóm API được mở rộng gồm:

- Billing và payment proof.
- Buyback, kiểm định, định giá, thanh toán, tân trang và QA.
- Hợp đồng, tài liệu, gia hạn/chấm dứt và lịch sử chính sách.
- Dashboard action items.
- Installation work order.
- Địa điểm, hồ sơ Owner và thông tin liên hệ.
- Máy, model máy, bảo trì, maintenance request và repair case.
- Công thức global/local và đồng bộ công thức đến máy.
- Số lượng thông báo chưa đọc.

Các file hỗ trợ liên quan:

- API client: `src/apis/billing.api.ts`, `src/apis/buybacks.api.ts`, `src/apis/contracts.api.ts`, `src/apis/dashboard.api.ts`, `src/apis/installation-work-orders.api.ts`, `src/apis/locations.api.ts`, `src/apis/machine-models.api.ts`, `src/apis/machines.api.ts`, `src/apis/maintenance-requests.api.ts`, `src/apis/notifications.api.ts`, `src/apis/profiles.api.ts`, `src/apis/recipes.api.ts`, `src/apis/repair-cases.api.ts`.
- Schema: `src/schema/billing.schema.ts`, `src/schema/buybacks.schema.ts`, `src/schema/contracts.schema.ts`, `src/schema/dashboard.schema.ts`, `src/schema/installation-work-orders.schema.ts`, `src/schema/locations.schema.ts`, `src/schema/machine-models.schema.ts`, `src/schema/machines.schema.ts`, `src/schema/notifications.schema.ts`, `src/schema/profiles.schema.ts`, `src/schema/recipes.schema.ts`.
- Component dùng chung: `src/components/contracts/contract-activation-panel.tsx`, `src/components/create-form/contract-create-form.tsx`.
- Route: `src/routes/path.ts`, `src/routes/routes.ts`.
- Cấu hình chọn backend: `.env.example`, `src/lib/server/backend-api-selection.ts`.

## Ghi chú

- Các thay đổi API ở đây là phía FE: client gọi endpoint và schema kiểm tra request/response. Báo cáo không khẳng định mọi endpoint đã được kiểm thử đầu-cuối hoặc đã xác nhận đầy đủ với Swagger.
- Working tree tổng thể còn ba tài liệu API vai trò và hai file test được sửa; chúng không được phân tích chi tiết vì báo cáo tập trung vào 4 role.
- Các thay đổi ở repo Dolores BE và IDaaS là thay đổi riêng, không thuộc diff FE này.
- Không tạo commit hoặc push trong quá trình cập nhật báo cáo.
