# Rà soát tính năng và API của Owner

Ngày rà soát: 29/10/2026. Trong tài liệu này, Owner là vai trò nghiệp vụ mà các tài liệu cũ gọi Customer; theo xác nhận của người dùng, tenant tương ứng với Owner.

## 1. Nguồn và tình trạng Swagger

- OpenAPI local: http://localhost:8082/v3/api-docs — 275 operation / 236 path.
- OpenAPI server truy cập được: http://100.75.202.72:8082/v3/api-docs — 274 operation / 235 path.
- So sánh toàn bộ operation: chỉ local có POST /dev/v1/brew-records; các endpoint liên quan Owner khớp giữa local và server.
- Địa chỉ http://192.168.1.125:8082/v3/api-docs bị timeout trong lượt này; server được đối chiếu qua http://100.75.202.72:8082/v3/api-docs.
- API Dolores dùng prefix Swagger /api/v1. Frontend gọi qua lớp API Dolores dùng chung; role guard chỉ kiểm soát giao diện, backend vẫn phải xác thực token và scope Owner.

## 2. Các mục Owner hiện có API

| Mục / route | Endpoint đang gọi | Mức độ |
| --- | --- | --- |
| Tổng quan — /dashboard | GET /dashboard/overview | Dashboard chính dùng kỳ mặc định. Operational overview mở từ hồ sơ máy gửi `fromDate`/`toDate`; số liệu vẫn là aggregate theo Owner scope, máy đang xem chỉ là ngữ cảnh điều hướng. |
| Hợp đồng — /dashboard/contracts và /contracts/{id} | GET /contracts/owner/{ownerId}; GET /contracts/{id}; GET /machines để hiển thị máy gắn với hợp đồng | Danh sách và chi tiết đã nối. Owner ID lấy từ sub của access token, xác thực định dạng UUID trước khi gọi. API chi tiết theo ID vẫn cần backend giới hạn quyền theo Owner. |
| Máy của tôi — /dashboard/machines, /machines/{id}, /machines/{id}/operations | GET /machines; GET /machines/{id}; GET /machines/{id}/maintenance-schedule; GET /telemetry-query/machines/{id}/heartbeats/latest; GET /telemetry-query/machines/{id}/points; GET /dashboard/overview | Danh sách, hồ sơ và operational overview dùng chung phần trình bày với Admin/Moderator. Owner thấy heartbeat trên danh sách/chi tiết, telemetry points theo 24h/7 ngày/30 ngày/khoảng tùy chọn, cùng aggregate overview theo JWT. Không gửi `ownerId`; backend phải scope theo người gọi. |
| Menu — /dashboard/menu và /menu/{recipeId} | GET /recipes/global; GET /recipes/local; GET /recipes/global/{id} | Đã nối danh sách công thức dùng chung/cục bộ và chi tiết công thức dùng chung. |
| Thêm món riêng — /dashboard/menu/add-dish | GET /recipes/global; POST /recipes/local | Đã nối form tạo/cập nhật cấu hình cục bộ. Request gửi globalRecipeId và dosageOverrides; không tự gửi ownerId. |
| Hóa đơn — /dashboard/invoices, kỳ và chi tiết | GET /billing/invoices; GET /billing/invoices/{invoiceId}; GET /billing/invoices/{invoiceId}/line-items; GET /billing/invoices/{invoiceId}/payment-proofs | Đã nối đọc danh sách, chi tiết, dòng hóa đơn và chứng từ. |
| Gửi chứng từ thanh toán | POST /billing/invoices/{invoiceId}/payment-proofs | Đã nối multipart file, amount và header Idempotency-Key; frontend yêu cầu amount dương, file không rỗng và key không rỗng. |
| Hỗ trợ — /dashboard/support và /support/{id} | GET /maintenance-requests; GET /maintenance-requests/{requestId}; GET /maintenance-requests/{requestId}/custody-events; GET /repair-cases; GET /repair-cases/{caseId}; GET /repair-cases/{caseId}/timeline; GET /repair-cases/{caseId}/custody-events; GET /machines | Đã nối danh sách và chi tiết yêu cầu, tiến độ RepairCase, lịch sử bàn giao và hiển thị máy liên quan. Danh sách hiện có cả bảo trì định kỳ và sửa chữa. |
| Thao tác Owner trong hỗ trợ | POST /maintenance-requests/{requestId}/confirm; POST /maintenance-requests/{requestId}/reschedule; POST /maintenance-requests/custody-events/{eventId}/acknowledge; POST /repair-cases/{caseId}/custody-events/{eventId}/acknowledge; POST /repair-cases/{caseId}/replacement-decision | Đã nối xác nhận/đề nghị đổi lịch trong khung hợp đồng, xác nhận bàn giao bảo trì/sửa chữa và quyết định đề nghị máy thay thế. API chỉ gọi cho Owner đã đăng nhập. |
| Báo sự cố — /dashboard/support/new | POST /repair-cases/intakes | Đã nối. Request bắt buộc machineId, issueDescription và idempotencyKey; evidenceReference tùy chọn theo Swagger. |
| Thông báo — /dashboard/notifications | GET /notifications; GET /notifications/unread-count; POST /notifications/{id}/read; POST /notifications/read-all | Đã nối inbox, số chưa đọc, đánh dấu một hoặc tất cả đã đọc; client dựa vào server scope theo Owner đăng nhập. |

## 3. Tính năng Owner chưa nối hoặc chưa hoàn chỉnh

| Màn hình / tính năng | API Swagger có thể liên quan | Trạng thái hiện tại |
| --- | --- | --- |
| Hết hạn hợp đồng — /contracts/expiry và chi tiết hợp đồng | GET /contracts/{id}/expiry-status; POST /contracts/{id}/expiry-decision | Đã nối đọc tình trạng hết hạn và chọn CONTINUE/DO_NOT_CONTINUE từ chi tiết hợp đồng. Chỉ Owner của hợp đồng được chọn; hợp đồng phải còn ACTIVE, đã ánh xạ và chưa quá ngày hết hạn. Quyết định đầu tiên không đổi; CONTINUE chỉ ghi ý định, không tự gia hạn. |
| Kết thúc hợp đồng / hoàn cọc — /end-early, /end, /deposit-complete | POST /contracts/{contractId}/termination-cases và API quyết toán tương ứng | Chưa nối. Tạo termination case và quyết toán là luồng vận hành; Swagger/backend không cấp thao tác chấm dứt trực tiếp cho Owner. |
| Tạo hợp đồng — /contracts/new | GET /machines; POST /contracts | Chưa nối form. Swagger chỉ cho tạo hợp đồng DRAFT với máy đang ở kho; các xung đột có thể trả 409/422. |
| Lịch sử máy — /machines/history | GET /machines/{id}/maintenance-schedule; GET /maintenance-requests; GET /maintenance-tickets; GET /contracts/machine/{machineId}/history | Đã nối trang lịch sử theo từng máy, ghép lịch hợp đồng, lịch bảo trì, phiếu bảo trì và yêu cầu hỗ trợ. Không có một endpoint timeline tổng hợp; máy thay thế vẫn chưa nối. |
| Gửi menu đến máy / xem trạng thái đã áp dụng — /menu/sent, /menu/applied | GET /machines; POST /recipes/sync; GET /recipes/sync/{machineId}; GET /recipes/sync/{machineId}/history | Đã nối chọn máy thuộc Owner, yêu cầu đồng bộ, trạng thái và lịch sử đồng bộ. Backend kiểm tra machine thuộc Owner. Trang đã áp dụng đọc appliedVersion/state; không gọi GET /recipes/effective/{machineId} vì endpoint thiết bị này không kiểm tra Owner scope trong controller. |
| Yêu cầu thanh toán / khoản thiếu / nhắc thanh toán / hoàn tiền — /invoices/payment, /shortfall, /reminder, /refund, /standard-payment | POST /billing/invoices/{invoiceId}/payment-proofs phục vụ gửi chứng từ; endpoint POST /billing/invoices/{invoiceId}/payments được Swagger ghi là API thanh toán cũ đã vô hiệu hóa | Các route workflow riêng hiện chưa gọi API. Không nên dùng API payments đã vô hiệu hóa để giả lập thanh toán; lượt rà soát không thấy endpoint Owner riêng cho yêu cầu nhắc hoặc hoàn tiền. |
| Cập nhật menu cần hỗ trợ — /support/menu | POST /recipes/sync qua luồng /menu/sent | Trang hỗ trợ điều hướng Owner sang `/dashboard/menu/sent`; thao tác gửi đồng bộ và kiểm tra Owner được thực hiện ở trang chọn máy. |
| Thu mua máy cũ — /buyback và các route con | GET /buybacks; POST /buybacks; các API valuation/payment-proofs/inspection/collection | Toàn bộ màn Buyback hiện chưa gọi buybacksApi. Swagger mô tả tạo hồ sơ cho hợp đồng thuê đang hoạt động; không suy ra các bước inspection/QA/refurbishment đều dành cho Owner nếu Swagger không nêu rõ role. |
| Hồ sơ Owner | Không thấy endpoint self-profile rõ ràng trong luồng giao diện đang dùng | Không có màn hồ sơ/cấu hình Owner được nối trong các mục hiện tại. |

## 4. Kiểm tra tương thích code với Swagger và scope dữ liệu

- GET /recipes/local dùng schema summary riêng gồm id, ownerId, globalRecipeId theo Swagger; chi tiết dosage override chỉ hiển thị khi được trả bởi endpoint chi tiết hoặc thao tác lưu.
- Các schema danh sách công thức dùng chung và RepairCase hiện đã tách summary phù hợp; nhận định cũ rằng danh sách công thức dùng chung hoặc RepairCase list bắt buộc chi tiết/timeline không còn đúng với code hiện tại.
- GET /contracts/owner/{ownerId} dùng Owner ID lấy từ JWT sub. Cần bảo đảm ID này chính là Owner UUID Dolores; backend phải kiểm tra caller không thể truy vấn Owner khác bằng cách thay path ID.
- GET /machines, /billing/invoices, /maintenance-requests, /repair-cases và /notifications không gửi ownerId từ UI. Đây là chủ đích chỉ an toàn nếu backend luôn áp dụng scope từ token; không lấy tham số ownerId tùy chọn trong Swagger làm quyền truy vấn tenant khác.
- Các list hiện chưa truyền page/size dù một số endpoint Swagger có hỗ trợ. Hợp đồng API có giới hạn mặc định thì màn có thể chỉ hiển thị tập mặc định; cần kiểm tra khi dữ liệu tăng.
- Swagger GET /billing/invoices/{invoiceId}/line-items và POST /inventory/machines/{machineId}/readiness khai báo response thành công nhưng thiếu một số response lỗi xác thực/403. Không nên hiểu việc thiếu response 401/403 trong tài liệu là endpoint công khai.

## 5. Tệp code đã đối chiếu

- src/pages/dashboard/[[...sections]].page.tsx và src/routes/routes.ts
- src/pages/dashboard/overview/overview-screen.tsx
- src/pages/dashboard/contracts/contracts-screen.tsx
- src/pages/dashboard/machines/machines-screen.tsx; `src/components/machines` (shared list/detail/IoT/overview presentation)
- src/pages/dashboard/menu/menu-screen.tsx
- src/pages/dashboard/invoices/invoices-screen.tsx
- src/pages/dashboard/support/support-requests-list-screen.tsx
- src/pages/dashboard/workflows/repair-intake-screen.tsx
- src/pages/dashboard/workflows/local-recipe-screen.tsx
- src/pages/dashboard/workflows/notification-inbox.tsx
- src/pages/dashboard/shared/customer-screen-common.tsx
- src/apis/dashboard.api.ts, contracts.api.ts, machines.api.ts, recipes.api.ts, billing.api.ts, maintenance-requests.api.ts, repair-cases.api.ts, notifications.api.ts, buybacks.api.ts
- src/schema/dashboard.schema.ts, contracts.schema.ts, machines.schema.ts, recipes.schema.ts, billing.schema.ts, notifications.schema.ts

Các mục hỗ trợ, lịch bảo trì và xác nhận bàn giao đã được nối sau lượt rà soát. Phase 04 kiểm tra UI Owner bằng API giả lập; chưa xác minh quyền/data API thật bằng phiên Owner. Các workflow khác ở bảng trên vẫn chưa được nối hoặc cần xác nhận điều kiện nghiệp vụ trước khi bật.
