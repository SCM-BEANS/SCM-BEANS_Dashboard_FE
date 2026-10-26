# Brainstorm: kết nối API cho Owner Dashboard

**Ngày:** 2026-10-26
**Trạng thái:** Đã chốt phạm vi và đang triển khai
**Project root:** E:/Đồ án/SCM-BEANS_Dashboard_FE (git root; không có .skills.json ở các thư mục cha đã kiểm tra)

## Mục tiêu người dùng

Kết nối API cho các màn hình Dashboard của Owner theo thứ tự từ trên xuống như sidebar hiện tại. Riêng Thu mua máy cũ tạm thời chưa kết nối API theo xác nhận mới nhất:

1. Tổng quan
2. Hợp đồng
3. Máy của tôi
4. Menu của tôi
5. Hóa đơn
6. Yêu cầu hỗ trợ
7. Thu mua máy cũ
8. Thông báo

Tuân thủ kiến trúc và cách chia file hiện tại. Tài liệu API được cung cấp qua Swagger ở http://192.168.1.125:8082/swagger-ui/index.html#/ .

## Khảo sát repo

- Repo dùng Next.js Pages Router và các tầng hiện tại như pages, apis, schema, lib, routes, text, assets, components.
- Dashboard khách hàng/Owner có route và UI sẵn, nhưng các màn hình Owner cần được nối API theo từng lát cắt.
- Màn hình đọc và luồng nghiệp vụ nằm chủ yếu ở src/pages/dashboard/read/customer-read-screen.tsx và src/pages/dashboard/workflows/customer-workflow-screen.tsx; route ở src/pages/dashboard/[[...sections]].page.tsx; thứ tự sidebar ở src/routes/routes.ts.
- Có sẵn một số API module dùng ở các vai trò khác; chỉ tái sử dụng khi endpoint và quyền Owner được xác nhận. Không dùng dữ liệu giả để che API thiếu.

## Kết quả đọc OpenAPI/Swagger

Chỉ đọc tài liệu OpenAPI tại /v3/api-docs; không gửi yêu cầu nghiệp vụ tới API và không tạo/sửa dữ liệu.

| Sidebar | API đã xác nhận | Giới hạn cần giữ |
|---|---|---|
| Tổng quan | GET /api/v1/dashboard/overview | Owner được xác định từ JWT. fromDate và toDate phải truyền cùng nhau; mặc định 7 ngày, tối đa 90 ngày. |
| Hợp đồng | GET /api/v1/profiles/{idaasUserId}/contracts?page=&size=, GET /api/v1/contracts/{id} | Owner chỉ đọc profile/hợp đồng của chính mình. Không cho client tự chọn ID Owner khác. |
| Máy của tôi | GET /api/v1/machines, GET /api/v1/machines/{id} | Phạm vi Owner được lấy từ JWT; API từ chối truy cập chéo Owner. |
| Menu của tôi | GET /api/v1/recipes/global, GET /api/v1/recipes/local, POST /api/v1/recipes/local | Dùng API global/local có phạm vi được nêu. Không dựa vào /recipes/effective/{machineId} nếu chưa xác minh quyền/phạm vi của endpoint đó. |
| Hóa đơn | GET /api/v1/billing/invoices cùng API chi tiết/line items/payment proofs | Phạm vi Owner do API áp dụng. Nộp chứng từ dùng multipart và Idempotency-Key; không dùng API payments cũ đã bị vô hiệu hóa. |
| Yêu cầu hỗ trợ | POST /api/v1/repair-cases/intakes | Đây là API Owner báo lỗi máy. Request cần machineId, issueDescription và idempotencyKey; triage không thuộc Owner. Phạm vi hiện tại chỉ gửi intake, chưa nối danh sách/history. |
| Thu mua máy cũ | Không gọi API trong giai đoạn này | Người dùng xác nhận tạm thời chưa cần nối Buyback & Refurbishment. |
| Thông báo | GET /api/v1/notifications, unread count, mark-read, read-all | Không gửi ownerId; phạm vi lấy từ JWT. |

### Ý nghĩa của hai nhóm API vừa được xác nhận

- **Repair Cases:** Trong phạm vi hiện tại, Owner chỉ gửi intake qua POST /api/v1/repair-cases/intakes. Endpoint triage là Moderator/Admin; không nối case history trong đợt này.
- **Buyback & Refurbishment:** Tạm thời nằm ngoài phạm vi, không gọi endpoint nào.

## Các cách tiếp cận đã cân nhắc

1. **Vertical slice đúng thứ tự sidebar — chọn.** Hoàn thiện một màn hình/luồng theo thứ tự người dùng đã chỉ định, dùng endpoint đã xác nhận, giữ trạng thái loading/empty/error riêng. Bỏ qua mục Buyback trong khi tạm hoãn API và tiếp tục với Thông báo.
2. **Nối tất cả màn hình đọc trước, rồi mới làm thao tác ghi.** Có thể kiểm tra nhanh độ phủ đọc, nhưng người dùng đã yêu cầu thứ tự từ trên xuống và cách này làm các luồng của từng màn hình bị tách rời.
3. **Làm nền identity/scope cho Owner trước toàn bộ UI.** Tốt nếu phát hiện không thể lấy danh tính Owner hiện tại an toàn; hiện Swagger đã quy định phạm vi Owner từ JWT ở phần lớn API, nên chỉ xử lý phần identity cần thiết trong lát cắt đầu tiên, không biến thành một đợt tái cấu trúc riêng.

## Đề xuất

- Triển khai theo đúng thứ tự 1–8, mỗi màn hình hoàn thành API/state/error handling trước khi chuyển sang màn kế tiếp; bước 7 Buyback được bỏ qua theo yêu cầu.
- Dùng bearer session hiện tại; không nhận Owner ID từ query hoặc form để đổi phạm vi dữ liệu. Nếu route hợp đồng yêu cầu IDaaS user ID, lấy từ danh tính đã xác thực và xác minh trong repo trước khi gọi.
- Với Repair Cases, Owner gửi intake và nhận trạng thái phản hồi API. Không tạo chức năng triage hoặc giả lập lịch sử intake.
- Không kết nối Buyback & Refurbishment trong giai đoạn này.
- Nộp chứng từ và các mutation khác phải theo đúng điều kiện, idempotency và quyền của OpenAPI; không gửi mutation thử vào môi trường nghiệp vụ trong giai đoạn khảo sát.

## Quyết định đã có

- Người dùng chọn thứ tự nối từ trên xuống theo sidebar.
- Owner gửi yêu cầu sửa chữa bằng POST /api/v1/repair-cases/intakes.
- Thu mua máy cũ tạm thời chưa cần kết nối API.

## Bàn giao

Spec chi tiết: plans/owner-dashboard-api-integration/spec.md.
Pointer hiện hành: plans/.current-brainstorm.md.

Mã nguồn đã được cập nhật theo phạm vi trên; Buyback giữ nguyên trạng thái chưa kết nối API.
