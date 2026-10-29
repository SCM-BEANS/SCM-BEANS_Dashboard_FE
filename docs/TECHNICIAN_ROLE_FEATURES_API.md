# Rà soát tính năng và API của Technician

Ngày rà soát: 29/10/2026. Tài liệu dựa trên code Technician trong workspace, Swagger Dolores local Docker tại http://localhost:8082/v3/api-docs, Swagger Dolores server tại http://100.75.202.72:8082/v3/api-docs và Swagger IDaaS local/server.

## 1. Tình trạng code và Swagger

- Workspace đang ở branch ref, ahead 2 commit và không behind origin/ref. Worktree có thay đổi chưa commit từ công việc trước; các file đó được giữ nguyên.
- Swagger Dolores local và server đều công bố các endpoint máy, đánh dấu máy sẵn sàng, lệnh lắp đặt được giao, và các thao tác Technician trên RepairCase được nêu trong tài liệu này.
- Swagger Dolores local có 276 operation/237 path; server có 274 operation/235 path. Ba operation chỉ có local là POST /dev/v1/brew-records, POST /api/v1/notifications/installations và DELETE /api/v1/notifications/installations/{installationId}; một operation chỉ có server là POST /api/v1/installation-checklist-templates. Không có khác biệt cho các endpoint Technician được đối chiếu.
- Swagger IDaaS local và server đều có 23 operation/20 path. Cả hai đều không công bố POST /auth/logout, dù TechnicianShell đang gọi route đó.

## 2. Phân quyền và cấu trúc route

Frontend chỉ mở khu vực Technician khi token có role TECHNICIAN và không đồng thời có OWNER. Token không có, giải mã không được hoặc role không phù hợp sẽ bị đưa về login hoặc hiện màn hình không đủ quyền. Đây chỉ là guard giao diện; API Dolores phải xác thực token và quyền trên từng thao tác.

Sidebar gồm bốn mục:

| Mục | Route | Tình trạng |
| --- | --- | --- |
| Việc được giao | /technician/tasks | Giao diện danh sách có sẵn, chưa tải dữ liệu |
| Check máy | /technician/machine-check | Đã nối API đọc danh sách và chi tiết máy, có thao tác đánh dấu sẵn sàng cho thuê |
| Lịch sử máy | /technician/history | Placeholder, chưa gọi API |
| Thông báo | /technician/notifications | Placeholder, chưa gọi API |

Các route công việc được router chấp nhận:

| Route | Mục đích hiển thị | Tình trạng thực tế |
| --- | --- | --- |
| /technician và /technician/tasks | Danh sách công việc được giao | Bộ lọc và nút xem chi tiết bị khóa; màn hình không gọi API |
| /technician/tasks/{workOrderId} | Chi tiết công việc | Màn hình chung, các trường/nút thao tác bị khóa; không gọi API |
| /technician/tasks/standard-handover | Bàn giao máy thường | Form mô tả nhưng disable |
| /technician/tasks/smart-activation | Lắp đặt và kích hoạt Smart IoT | Form mô tả nhưng disable |
| /technician/tasks/repair | Sửa chữa và thay linh kiện | Form mô tả nhưng disable |
| /technician/tasks/retrieval | Thu hồi máy | Form mô tả nhưng disable |
| /technician/tasks/substitute và /substitute-return | Bàn giao và thu hồi máy thay thế | Form mô tả nhưng disable |
| /technician/tasks/refurbishment | Tân trang và kiểm thử | Form mô tả nhưng disable |
| /technician/tasks/buyback-assessment | Đánh giá máy thu mua | Form mô tả nhưng disable |
| /technician/tasks/maintenance-history | Ghi lịch sử bảo trì | Form mô tả nhưng disable |
| /technician/history và /history/{machineId} | Lịch sử máy | Placeholder; không tải lịch sử |
| /technician/machine-check | Kiểm tra máy | Có API đọc |
| /technician/machine-check/{machineId} | Chi tiết máy | Có API đọc và mutation đánh dấu sẵn sàng |
| /technician/notifications | Thông báo công việc | Bộ lọc/nút đánh dấu đã đọc bị khóa; không gọi API |

Các field trong task forms bị disabled ở TechnicianScreen. Các filters cũng disabled; action submit được khai báo disabled. Do đó các route dạng form hiện chỉ diễn tả ý định nghiệp vụ, chưa nhận hoặc gửi dữ liệu.

## 3. API Technician đang gọi

Các endpoint Dolores dưới đây tính từ /api/v1.

| Tính năng | Endpoint | Cách dùng và điều kiện trong code |
| --- | --- | --- |
| Danh sách để kiểm tra máy | GET /machines | Gọi khi vào /technician/machine-check. Không gửi status, machineType, ownerId, locationId, region, serialNumber, page hoặc size dù Swagger hỗ trợ các query này. Response được kiểm tra bằng MachineInventorySchema rồi hiển thị id, owner, serial, trạng thái và loại máy. Backend cần tự giới hạn tập máy mà Technician hiện tại được phép xem. |
| Chi tiết máy | GET /machines/{id} | Gọi ở /technician/machine-check/{machineId}. ID phải là UUID; wrapper kiểm tra response id trùng với id yêu cầu. Hiển thị serial, status, owner, location, vùng, lịch bảo trì kế tiếp, số ly từ lần tẩy cặn, loại/model và thông tin mapping nếu có. |
| Đánh dấu máy sẵn sàng cho thuê | POST /inventory/machines/{machineId}/readiness | Gọi từ nút cập nhật trạng thái ở màn chi tiết máy. Body gồm reason; UI gửi câu cố định “Máy đã được kiểm tra và đủ điều kiện cho thuê.” Wrapper kiểm tra machineId là UUID và reason không rỗng. Thành công thì invalidate cache chi tiết và danh sách máy. |
| Đăng xuất | POST /auth/logout trên IDaaS | TechnicianShell gọi route này, sau đó xóa cookie access_token và điều hướng về login kể cả khi request lỗi. Route chưa được công bố trong Swagger IDaaS local/server. |

### Điều kiện nút đánh dấu sẵn sàng

Nút bị disable nếu chưa có máy tải được, thiếu serialNumber, máy đã có status AVAILABLE_FOR_RENT, đang tải/lỗi hoặc mutation đang chạy. Khi lỗi, giao diện hiển thị lỗi API và có thể thử lại.

Swagger mô tả POST /inventory/machines/{machineId}/readiness là xác nhận **máy trong kho** đã sẵn sàng cho thuê. Điều kiện ở client hiện không bắt buộc status phải là IN_WAREHOUSE; vì vậy nút có thể được bật cho máy đang triển khai/bảo trì hoặc trạng thái khác. Backend có thể từ chối các chuyển trạng thái đó; UI nên đối chiếu trạng thái hợp lệ trước khi hiển thị thao tác. Swagger chỉ định nghĩa field reason dạng string nhưng không đánh dấu bắt buộc; frontend lại yêu cầu reason không rỗng. Swagger của operation này cũng không nêu rõ role Technician hoặc response 401/403, nên quyền thực tế của Technician cần được xác nhận với backend.

## 4. Endpoint Swagger phù hợp với task flow nhưng Technician chưa gọi

### 4.1 Lệnh lắp đặt được giao

Swagger có endpoint riêng cho Technician:

- GET /installation-work-orders/assigned — lấy lệnh lắp đặt được giao cho Technician đăng nhập. Có bộ lọc status, machineType và phân trang page/size; response là danh sách InstallationWorkOrderSummaryResponse. Swagger liệt kê các lỗi 400/401/403.
- GET /installation-work-orders/{workOrderId} — xem chi tiết, checklist, phụ kiện và evidence; ID lệnh là UUID.
- POST /installation-work-orders/{workOrderId}/start — bắt đầu lệnh; không có body; Swagger liệt kê 400/401/403/404/409.
- PUT /installation-work-orders/{workOrderId}/checklist/{checklistItemId} — ghi result bắt buộc thuộc PENDING/PASSED/FAILED/NOT_APPLICABLE; notes tùy chọn. Mô tả Swagger nói không được gửi PENDING làm kết quả.
- POST /installation-work-orders/{workOrderId}/accessories — ghi phụ kiện bàn giao; accessoryName bắt buộc, quantity, serialNumber và notes tùy chọn.
- POST /installation-work-orders/{workOrderId}/evidence — tải evidence multipart; API có thể trả lỗi 400/401/403/404/409/413/415/503.
- POST /installation-work-orders/{workOrderId}/fail — failureReason bắt buộc.
- POST /installation-work-orders/{workOrderId}/complete — handoverRecipient bắt buộc.

Đây là API có thể dùng để hiện thực danh sách giao máy, mở chi tiết, checklist và kết quả bàn giao. Hiện tại không trang Technician nào gọi các endpoint này và chưa có API client cho route /assigned.

Thông báo trong code tại src/text/technician/technician-messages.ts hiện ghi rằng API chỉ liệt kê công việc theo tenant và chưa có endpoint xác nhận công việc được giao cho Technician. Nội dung đó không còn đúng với Swagger hiện tại vì GET /installation-work-orders/assigned đã được công bố trên cả local lẫn server. Nút và danh sách vẫn đang khóa, nên đây là khoảng cách giữa code thông báo và hợp đồng API.

### 4.2 Sửa chữa và bàn giao RepairCase

Swagger cũng có các endpoint ghi nhận công việc sửa chữa theo RepairCase:

- GET /repair-cases và GET /repair-cases/{caseId} — danh sách theo phạm vi role và chi tiết; detail trả lịch sử sự kiện. Có thêm GET /repair-cases/{caseId}/timeline để lấy timeline theo page/size.
- POST /repair-cases/{caseId}/diagnosis — diagnosis và evidenceReference bắt buộc.
- POST /repair-cases/{caseId}/work/start — workScope bắt buộc; emergencyAuthorizationId tùy chọn. Mô tả yêu cầu Owner đã xác nhận nhận máy thay thế.
- POST /repair-cases/{caseId}/work/complete — diagnosis, resolutionResult, workScope và evidenceReferences bắt buộc; notes và emergencyAuthorizationId tùy chọn. Mô tả endpoint nêu việc hoàn tất kèm chẩn đoán và evidence riêng tư.
- GET/POST /repair-cases/{caseId}/custody-events — đọc/ghi sự kiện bàn giao máy. Khi ghi, eventType, machineId, conditionNotes và evidenceReference đều bắt buộc; eventType thuộc PRIMARY_COLLECTED, REPLACEMENT_DELIVERED, REPLACEMENT_COLLECTED hoặc PRIMARY_RETURNED.

Các thao tác này chưa được nối vào route /technician/tasks/repair, /substitute hoặc /substitute-return. UI hiện không đọc RepairCase và không cho nhập/chụp evidence. Trước khi bật các nút, cần khớp trạng thái RepairCase, quyền Technician, thứ tự bàn giao và dạng lưu evidence theo API.

### 4.3 Lịch sử và thông báo

- Swagger có GET /maintenance-tickets với các bộ lọc source, status, machineId, ownerId, contractId, page và size; GET /maintenance-tickets/{ticketId}; và GET /machines/{id}/maintenance-tickets. Có thể dùng để xây lịch sử ticket theo máy, nhưng không có trang Technician nào gọi chúng.
- Swagger có GET /repair-cases/{caseId}/timeline và các API chi tiết installation work order; hiện chưa có trang lịch sử kết hợp các loại sự kiện.
- Swagger có GET /notifications, GET /notifications/unread-count, POST /notifications/{id}/read và POST /notifications/read-all. Generic list hỗ trợ ownerId/unreadOnly/page/size nhưng không nhận technicianId query. Màn hình Technician đang chờ xác nhận việc backend tự scope thông báo theo người nhận; hiện không gọi bất kỳ endpoint thông báo nào.

### 4.4 Tân trang và thu mua máy cũ

Swagger công bố một số thao tác Buyback & Refurbishment như đọc hồ sơ, bắt đầu/hoàn tất refurbishment, gửi inspection/QA. Tuy nhiên task pages của Technician chỉ là form disabled, không gọi buybacksApi hay endpoint nào trong nhóm này. Swagger của các thao tác này không đủ để kết luận tất cả đều cho phép TECHNICIAN; cần kiểm tra role policy và quy trình QA trước khi nối.

## 5. API client/schema có trong code nhưng không được Technician dùng

- src/apis/installation-work-orders.api.ts có create, listByTenant và getById; Technician pages không import module này. Không có method listAssigned/start/complete/checklist/evidence.
- src/apis/machines.api.ts chứa nhiều API khác như inventory summary, maintenance schedule, maintenance tickets và repair intake; ngoài list/getById/markReady nêu trên, Technician screens không gọi các method đó.
- src/apis/telemetry.api.ts tồn tại nhưng Technician không dùng telemetry.
- Technician không gọi notificationsApi, maintenanceRequestsApi, repairCasesApi, profilesApi hoặc buybacksApi.

Schema InstallationWorkOrderSummarySchema hiện yêu cầu tenantId. Swagger response của GET /installation-work-orders/assigned là InstallationWorkOrderSummaryResponse với ownerId và không liệt kê tenantId. Vì vậy không nên tái sử dụng schema list hiện có cho endpoint assigned nếu DTO response giữ nguyên như Swagger; cần tạo schema phù hợp với response Technician và xác nhận DTO thực tế.

## 6. Cấu hình và luồng xác thực

Frontend dùng cùng cấu hình API như các role khác:

- Dolores phía browser: /api/dolores/v1; Next proxy chuyển tiếp tới {DOLORES_API_LOCAL_URL hoặc DOLORES_API_IP_URL}/api/v1.
- IDaaS phía browser: /api/v1; proxy dùng IDAAS_API_LOCAL_URL hoặc IDAAS_API_IP_URL.
- Mẫu local là http://localhost:8082 cho Dolores và http://localhost:4000/api/v1 cho IDaaS. Remote cần cấu hình cả hai URL để health check và chọn cùng một môi trường JWT.
- Axios gắn Bearer access_token vào API đã xác thực, timeout 10 giây và tự refresh một lần khi gặp 401. Proxy server timeout 15 giây, giới hạn body 10 MiB.
- Nếu Flutter native gọi trực tiếp, dùng host/IP mà thiết bị truy cập được, gửi Authorization Bearer token và quản lý refresh token theo hợp đồng IDaaS. Cấu hình proxy Next và cookie trình duyệt không tự áp dụng cho Flutter.
- Mark-ready là POST nên khi remote API rớt, proxy không tự replay request sang local. Người dùng có thể thấy lỗi 502 và cần kiểm tra trạng thái máy trước khi thử gửi lại để tránh thao tác trùng.

## 7. Kết luận cho việc dùng chung logic trong Flutter

Đã có thể hiện thực API cho màn Check máy theo ba endpoint đang hoạt động. Các màn Task, lịch sử và thông báo hiện chủ yếu là thiết kế/placeholder.

Backend đã có endpoint assigned work order nhưng UI hiện vẫn báo là chưa có endpoint và chưa gọi nó. Trước khi triển khai task list trong Flutter, cần sửa hợp đồng giao diện theo GET /installation-work-orders/assigned, xác nhận scope chỉ trả task của Technician đăng nhập, và dùng DTO response riêng khớp Swagger. Các task sửa chữa cần dùng RepairCase API theo đúng điều kiện Owner xác nhận bàn giao; task bảo trì cần chốt API/status và phạm vi người được giao. Thông báo cần xác nhận scope theo recipient.

## 8. File code đã rà soát

- src/pages/technician/technician-shell.tsx
- src/pages/technician/technician-screen.tsx
- src/pages/technician/technician-route-screens.tsx
- src/pages/technician/technician-route-page.tsx
- src/pages/technician/tasks/task-screens.tsx và các route tasks
- src/pages/technician/machine-check/machine-check-table.tsx
- src/pages/technician/machine-check/machine-detail-screen.tsx
- src/pages/technician/history/history-screen.tsx
- src/pages/technician/notifications/notifications-screen.ts
- src/routes/routes.ts và src/routes/path.ts
- src/apis/machines.api.ts, src/apis/auth.api.ts, src/apis/installation-work-orders.api.ts, src/apis/telemetry.api.ts
- src/schema/machines.schema.ts và src/schema/installation-work-orders.schema.ts
- src/lib/http.ts, src/lib/auth-role.ts, src/lib/server/backend-api-selection.ts và các route proxy API.

Đây là kiểm kê tĩnh code và hợp đồng OpenAPI. Chưa gọi API nghiệp vụ bằng tài khoản Technician, chưa xác minh phân quyền runtime và chưa chạy test trong lượt rà soát này.
