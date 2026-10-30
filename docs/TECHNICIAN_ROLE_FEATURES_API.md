# Rà soát tính năng và API của Technician

Ngày rà soát: 29/10/2026. Đây là lượt đối chiếu lại code hiện tại với OpenAPI Dolores local và server. Tài liệu này thay thế các kết luận cũ bên dưới về danh sách việc được giao, xử lý lệnh lắp đặt và thông báo.

## 1. Nguồn và tình trạng Swagger

- OpenAPI local: http://localhost:8082/v3/api-docs — 275 operation / 236 path.
- OpenAPI server truy cập được: http://100.75.202.72:8082/v3/api-docs — 274 operation / 235 path.
- So sánh toàn bộ operation cho thấy chỉ có POST /dev/v1/brew-records ở local mà server không có; đây là API dev, không ảnh hưởng các nhóm Technician/Owner đã rà soát. Các endpoint liên quan hai role khớp giữa local và server.
- Địa chỉ http://192.168.1.125:8082/v3/api-docs bị timeout trong lượt này. Vì vậy đối chiếu server dùng địa chỉ 100.75.202.72.
- API Dolores dùng prefix Swagger /api/v1. Tài khoản cần token hợp lệ; việc route hiện trong frontend không thay thế phân quyền ở backend.

## 2. Mục Technician và trạng thái nối API

| Mục / route | Tình trạng trong code hiện tại | Endpoint chính |
| --- | --- | --- |
| Việc được giao — /technician/tasks | Đã tải lệnh lắp đặt được giao và hồ sơ RepairCase trong phạm vi Technician | GET /installation-work-orders/assigned; GET /repair-cases |
| Chi tiết lệnh lắp đặt — /technician/tasks/{workOrderId} | Đọc chi tiết; bắt đầu, lưu checklist, ghi phụ kiện, tải minh chứng, hoàn tất và báo thất bại đã nối | GET /installation-work-orders/{workOrderId}; POST .../{workOrderId}/start; PUT .../{workOrderId}/checklist/{checklistItemId}; POST .../{workOrderId}/accessories; POST .../{workOrderId}/evidence; POST .../{workOrderId}/complete; POST .../{workOrderId}/fail |
| Chi tiết sửa chữa — /technician/tasks/{caseId} | Đọc tiến độ, lịch sử và bàn giao; ghi chẩn đoán, bắt đầu/hoàn tất sửa chữa và ghi sự kiện bàn giao | GET /repair-cases/{caseId}; GET .../{caseId}/timeline; GET/POST .../{caseId}/custody-events; GET /maintenance-tickets/{ticketId}; POST .../{caseId}/diagnosis; POST .../{caseId}/work/start; POST .../{caseId}/work/complete |
| Check máy — /technician/machine-check và /{machineId} | Đọc danh sách/chi tiết máy; xác nhận sẵn sàng chỉ khi máy IN_WAREHOUSE, chưa gán Owner và đủ điều kiện model | GET /machines; GET /machines/{id}; POST /inventory/machines/{machineId}/readiness |
| Lịch sử máy — /technician/history và /history/{machineId} | Đã đọc phiếu bảo trì/yêu cầu trong phạm vi được giao; trang chi tiết máy đọc lịch bảo trì và lọc lịch sử theo máy | GET /maintenance-tickets; GET /maintenance-requests; GET /machines/{id}; GET /machines/{id}/maintenance-schedule |
| Thông báo — /technician/notifications | Đã nối inbox, số chưa đọc, đánh dấu một hoặc tất cả đã đọc | GET /notifications; GET /notifications/unread-count; POST /notifications/{id}/read; POST /notifications/read-all |

### Điều kiện và giới hạn của luồng lắp đặt đang có

- Danh sách hiện gọi GET /installation-work-orders/assigned mà không gửi status, machineType, page hoặc size; các bộ lọc/phân trang Swagger hỗ trợ chưa được UI sử dụng.
- Lệnh lắp đặt chỉ cho bắt đầu ở trạng thái ASSIGNED; lưu checklist, ghi phụ kiện, tải minh chứng, hoàn tất và báo thất bại chỉ khả dụng khi IN_PROGRESS. Báo thất bại cần failureReason.
- Hoàn tất lắp đặt yêu cầu ít nhất một minh chứng và người nhận bàn giao không rỗng. Checklist được lưu riêng; API complete hiện vẫn chỉ gửi handoverRecipient.
- Tệp minh chứng ở frontend giới hạn 20 MiB và chỉ nhận PDF, JPEG hoặc PNG. Swagger cũng có thể trả 413, 415 hoặc 503 cho thao tác upload.
- Màn Check máy gọi GET /machines không truyền bộ lọc. Nút sẵn sàng chỉ mở khi máy IN_WAREHOUSE và có serial; backend còn yêu cầu máy chưa gán Owner, đã gắn model đang hoạt động và không bị chặn bởi nghiệp vụ vòng đời. Swagger ghi quyền ADMIN/MODERATOR/TECHNICIAN.

## 3. Tính năng chưa nối hoặc mới nối một phần

| Màn hình / thao tác | API có trong Swagger | Phần frontend còn thiếu |
| --- | --- | --- |
| Tập con checklist/phụ kiện vượt giới hạn chi tiết | GET /installation-work-orders/{workOrderId}/checklist-items; GET /installation-work-orders/{workOrderId}/accessories | Giao diện dùng tối đa 20 mục/phụ kiện được nhúng trong chi tiết; chưa gọi các endpoint collection phân trang riêng. |
| Thu hồi và máy thay thế | GET/POST các repair-case custody-events; API replacement-assignment và sự kiện bàn giao | Các route retrieval, substitute, substitute-return đang là placeholder; chưa ghi nhận từng sự kiện bàn giao. Một số bước phân máy thay thế thuộc Moderator/Admin, không phải thao tác Technician. |
| Bảo trì | GET /maintenance-requests, GET /maintenance-requests/{requestId}, GET/POST /maintenance-requests/{requestId}/custody-events; GET /maintenance-tickets và GET /maintenance-tickets/{ticketId} | Lịch sử máy hiện đọc phiếu và yêu cầu được backend scope cho Technician. Các thao tác assign/status/resolve trên maintenance-ticket vẫn không mở cho Technician theo phạm vi hiện tại. |
| Tân trang / thu mua / kiểm định | GET /buybacks; GET các inspection/refurbishment/QA records; POST bắt đầu/hoàn tất refurbishment, inspection và QA | Các thao tác POST inspection và refurbishment có kiểm tra quyền TECHNICIAN theo case, nhưng GET /buybacks hiện chỉ cho ADMIN/MODERATOR/OWNER; Technician không có API danh sách để tìm case được giao. Các trang UI vẫn để chờ thay vì gọi danh sách sẽ trả 403. |
| Kích hoạt Smart IoT | Swagger có các API danh tính thiết bị/chứng chỉ máy | Route smart-activation chưa gọi API. Mô tả Swagger chưa đủ để kết luận Technician có quyền trên các thao tác này. |
| Lịch sử tổng hợp | GET /machines/{id}/maintenance-schedule; GET /maintenance-tickets; GET /repair-cases/{caseId}/timeline | Chưa có màn hợp nhất lịch sử máy giữa bảo trì, sửa chữa và lắp đặt; không thấy một endpoint lịch sử tổng hợp duy nhất cho Technician. |

## 4. Điều kiện API và các điểm cần xác nhận

- GET /installation-work-orders/assigned được Swagger mô tả dành cho TECHNICIAN; list và detail có thể trả 401/403/404 tùy token, quyền và ID.
- Start chỉ có ý nghĩa với lệnh được giao; complete cần handoverRecipient. Swagger yêu cầu xử lý các trạng thái xung đột 409.
- RepairCase work/start chỉ được thực hiện sau khi Owner xác nhận đã nhận máy thay thế. Diagnosis cần diagnosis và evidenceReference; hoàn tất cần diagnosis, resolutionResult, workScope, evidenceReferences; custody event cần đúng eventType, machineId, conditionNotes và evidenceReference.
- GET /notifications không gửi ownerId hay technicianId từ client; frontend dựa vào backend để scope theo người gọi. Không được xem tham số ownerId tùy chọn trong Swagger là quyền đọc chéo tenant.
- Machine readiness cần xác nhận lại quyền TECHNICIAN và trạng thái máy hợp lệ ở backend; mô tả API chỉ nói máy trong kho sẵn sàng cho thuê.

## 5. Tệp code đã đối chiếu

- src/pages/technician/tasks/technician-tasks-table.tsx
- src/pages/technician/tasks/work-order-detail-screen.tsx
- src/pages/technician/tasks/task-screens.tsx và các route tasks
- src/pages/technician/machine-check/machine-check-table.tsx
- src/pages/technician/machine-check/machine-detail-screen.tsx
- src/pages/technician/history/history-screen.tsx
- src/pages/technician/notifications/notifications-screen.tsx
- src/components/notifications/notification-inbox.tsx
- src/apis/installation-work-orders.api.ts, machines.api.ts, notifications.api.ts, repair-cases.api.ts, maintenance-requests.api.ts, buybacks.api.ts
- src/schema/installation-work-orders.schema.ts, machines.schema.ts, notifications.schema.ts
- src/routes/routes.ts và src/lib/auth-role.ts

Các mục lắp đặt, RepairCase, lịch sử bảo trì trong phạm vi Technician và Owner bàn giao đã được nối trong lượt triển khai sau rà soát. Chưa gửi request nghiệp vụ bằng tài khoản Technician và chưa chạy test/build trong lượt này; các luồng còn ghi ở bảng trên vẫn cần được nối hoặc cần API danh sách/quyền backend rõ hơn.
