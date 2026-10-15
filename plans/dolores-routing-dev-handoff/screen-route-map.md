# Dolores screen and route contract

**Hiện trạng:** 48 route pattern thuộc một trong bốn workspace đã được resolver nhận diện, cộng landing route /. Catch-all Next.js nhận role + segments rồi ánh xạ vào PageKind/ScreenBody. Đây là bản đồ prototype, chưa là auth policy hoặc API contract.

**Quy ước link:** :id biểu thị tham số record. Luôn nạp entity theo ID, quyền và quan hệ đã xác thực. Giữ context khi từ danh sách đi chi tiết rồi back. Route hợp lệ với ID không tồn tại trả 404; entity có tồn tại nhưng actor ngoài scope trả forbidden/không tiết lộ dữ liệu theo policy được chốt. Không fallback sang dữ liệu mẫu khác.

## Các route trong menu hiện tại

| ID | Vai trò | Route | Người xem / thao tác dự kiến | Bản prototype hiện trạng |
|---|---|---|---|---|
| ADM-01 | Admin | /admin | Dashboard vận hành tổng hợp | Có màn; các số/sample chart là demo. |
| ADM-02 | Admin | /admin/accounts | Tạo/quản lý Tenant, Moderator, Technician; đặt trạng thái Tenant và cấp quyền truy cập | Tạo demo account; chưa quản lý vòng đời/quyền đầy đủ. |
| ADM-03 | Admin | /admin/customers | Khách/shop → hợp đồng/máy | List và links; IDs/sample scope hard-code. |
| ADM-04 | Admin | /admin/stores | Tạo/quản lý shop và địa điểm; liên kết quyền truy cập Tenant theo quyết định đã chốt | Nội dung mẫu, chưa có quản lý record thực. |
| ADM-05 | Admin | /admin/contracts | Hợp đồng, kỳ hạn, lịch sử | Data demo; trạng thái thời gian chưa thống nhất giữa screens. |
| ADM-06 | Admin | /admin/machines | Máy thuê, kho và lịch sử | List demo; máy detail bắt active contract; history branch bị che. |
| ADM-07 | Admin | /admin/monitoring | Tổng quan Smart khách/máy | Cards demo; chưa tạo đúng bước chọn khách → danh sách máy. |
| ADM-08 | Admin | /admin/global-menu | Global Menu nội bộ | Màn demo; chưa quản lý device acknowledgement thật. |
| ADM-09 | Admin | /admin/reports | Operating summary / revenue / service SLA compliance | Biểu đồ đang hard-code và tính từ bill status, chưa dùng ledger đối soát. Chỉ tính SLA khi có target và quy tắc đồng hồ từ nguồn đã duyệt; task chưa cấu hình bị loại khỏi tổng đúng/trễ hạn. |
| ADM-10 | Admin | /admin/notifications | Reminder/work overview | List cục bộ, không có scheduler/delivery audit. |
| MOD-01 | Moderator | /moderator | Tổng quan việc vận hành và SLA task | Nội dung/task counts demo; cần hiển thị deadline đã thỏa thuận, việc sắp đến hạn/quá hạn khi SLA đã được cấu hình. Điều phối Technician vẫn thủ công. |
| MOD-02 | Moderator | /moderator/contracts | Contract negotiation/upload/end tracking | List demo; detail links cần giữ customerId và action context. |
| MOD-03 | Moderator | /moderator/customers | Tạo Tenant account; xem khách/shop và quản lý hợp đồng trong phạm vi được giao | Tạo demo account; không được tạo Moderator/Technician, tạo/quản lý shop, đổi trạng thái Tenant hoặc cấp quyền truy cập. |
| MOD-04 | Moderator | /moderator/invoices | Bill, proof, internal bank reconciliation, refunds | Có form demo; cần bổ sung event timestamps/lineage và xử lý SRS. |
| MOD-05 | Moderator | /moderator/deposits | Recover/assess/settle/refund | Hiện chỉ seed một hợp đồng; dữ liệu cọc/assessment singleton. |
| MOD-06 | Moderator | /moderator/machines | Kho, gán/thu máy, replacement | Một số lượng và dòng kho là hard-code; allocation không cập nhật kho thật. |
| MOD-07 | Moderator | /moderator/monitoring | Overview khách → Smart IoT machine | Hiện chưa có hierarchy/chọn máy như yêu cầu. |
| MOD-08 | Moderator | /moderator/global-menu | Internal Global Menu | Dùng store demo chung với menu Tenant. |
| MOD-09 | Moderator | /moderator/technical-requests | Tạo/nhận/điều phối/theo dõi công việc và SLA | Form/list demo; thiếu loại bảo trì, liên kết parent request chính xác, deadline/trạng thái SLA theo nguồn được duyệt và hiển thị đến hạn/quá hạn. Điều phối Technician vẫn thủ công; không có lịch nhân sự hoặc tự phân công. |
| MOD-10 | Moderator | /moderator/machine-history | Tra lịch sử theo máy | Có màn nhưng ID không truyền ổn định từ một số link; admin branch khác bị che. |
| MOD-11 | Moderator | /moderator/buyback | Case eligibility → assessment → evidence → collection → stock | Chỉ seed case; chưa có tạo case, release gate đúng Moderator. |
| MOD-12 | Moderator | /moderator/notifications | Chứng từ/hạn/task cần xử lý | List local, chưa gắn hết tới đúng hồ sơ/action. |
| TEC-01 | Technician | /technician | Việc được giao, deadline đã cam kết | Có list task mẫu; người nhận được hard-code. Cần hiển thị deadline SLA trên task được giao khi hợp đồng đã cấu hình. Không cần lịch ca/giờ hoặc lịch hẹn Technician. |
| TEC-02 | Technician | /technician/history | Lịch sử công việc/máy liên quan | List demo; scope giao việc chưa áp dụng thực. |
| TEC-03 | Technician | /technician/notifications | Công việc cần biết | List demo; chưa có notification source/delivery record. |
| CUS-01 | Customer | /customer | Dashboard shop của user đăng nhập | Màn demo; customer data hiện cố định một ID ở nhiều chỗ. |
| CUS-02 | Customer | /customer/contracts | Contract riêng, due/expiry/new-contract interest | Có list; status/history phải lấy từ records. |
| CUS-03 | Customer | /customer/machines | Máy thuộc shop/user, inventory không dành cho Tenant | Màn machine list; phải lọc current ownership/assignment. |
| CUS-04 | Customer | /customer/menu | Private customization và received Global | Màn dùng state global/shared, thiếu tenant/device scoping. |
| CUS-05 | Customer | /customer/invoices | Bill, upload, confirm, transfer/refund view | Có màn demo; evidence chỉ giữ tên file, chưa phục vụ xem evidence thật. |
| CUS-06 | Customer | /customer/support | Tạo và theo dõi request/cam kết SLA của mình | Có form; thiếu máy thay thế đang dùng, SLA theo nguồn được duyệt khi đã cấu hình và kết quả liên kết. Không hiển thị deadline tự suy diễn. |
| CUS-07 | Customer | /customer/buyback | Eligibility, status, view/ack evidence | Có case cards; thiếu detail identity/file view đầy đủ. |
| CUS-08 | Customer | /customer/notifications | Reminder/expiry/update | List local; action target/reference chưa đầy đủ. |

## Route được nhận diện ngoài menu

| ID | Route pattern hiện có | Resource/scope | Kết quả / trách nhiệm yêu cầu |
|---|---|---|---|
| TEC-A1 | /technician/tasks | Bí danh task list | Hiển thị list giống /technician; không nhầm với detail. |
| ADM-D1 | /admin/customers/:customerId | Một Customer | Load customer thật, shops/contracts; Admin scope. |
| ADM-D2 | /admin/contracts/:contractId | Một rental contract | Máy chính, terms, bills, history; không ẩn contract khi kết thúc. |
| ADM-D3 | /admin/machines/:machineId | Một máy vật lý | Tồn kho/lifecycle ngay cả khi chưa có contract; kiểm tra hiện nhánh history bị render unreachable. |
| ADM-D4 | /admin/monitoring/:customerId/:machineId | Smart device của customer | Kiểm tra hai IDs có quan hệ đúng; hiển thị telemetry/location thực, không sample fallback. |
| MOD-D1 | /moderator/contracts/new | Tạo rental contract | Nạp customer và available inventory theo type; không chọn máy đã allocated. |
| MOD-D2 | /moderator/contracts/:contractId | Rental contract | Correct linked customer, machine, amounts, signed document and lifecycle. |
| MOD-D3 | /moderator/machines/:machineId | Một máy | Kho/assignment/service/history; machine không cần active contract mới xem được. |
| MOD-D4 | /moderator/monitoring/:customerId/:machineId | Một Smart device | Valid relationship/scope; Admin/Moderator must not be sent to Customer menu route. |
| MOD-D5 | /moderator/technical-requests/new | Tạo request/task | Form must retain source case, contract, machine and support request; enforce valid machine/job type. |
| MOD-D6 | /moderator/technical-requests/:taskId | Một work task | Moderator theo dõi target SLA đã chốt, thời gian còn lại và mốc Technician thực tế; điều phối thủ công, không quản lý lịch nhân viên. Việc chưa có target phải ghi “Chưa cấu hình SLA”. |
| TEC-D1 | /technician/tasks/:taskId | Assigned task | Chỉ Technician được giao mới cập nhật; hiển thị deadline SLA từ nguồn đã duyệt và ghi các mốc thực tế cần thiết; lưu actor/time và parent entity. Không có lịch/availability Technician hay tự động xếp lịch. |
| CUS-D1 | /customer/contracts/:contractId | Customer's own contract | Require authenticated owner relation; no cross-customer ID enumeration. |
| CUS-D2 | /customer/machines/:machineId | Current/history machine relationship | Check customer scope and current vs historical assignment; machine type is stored data, not ID parsing. |
| CUS-D3 | /customer/machines/:machineId/telemetry | Smart-only telemetry | Resolve exact machine path parameter and customer authorization; no S-018 fallback. Conventional should not have this page. |

## Screen-level workflow gaps

- Không có record address/deep-link hiện tại cho invoiceId, buybackCaseId, supportRequestId, depositSettlementId và depositAssessmentId. Đây không bắt buộc phải thêm page: modal/drawer được nếu state có ID, có thể reload/mở link, và không phụ thuộc row index.
- Form technical new cần nhận các IDs từ workflow nguồn: customer, contract, primary/replacement machine, support request hoặc buyback case, job type. Route đang chỉ biểu diễn trang form, chưa định nghĩa cách giữ context.
- Moderator mở task detail rồi link qua Technician URL là demo role switch. Production phải dùng user/session Technician thật; không chấp nhận Moderator tự thao tác task Technician qua direct URL.
- Notification cần link tới đúng bill/contract/task/case; route generic mà không mang ID chưa đủ để thực hiện công việc.
- Drawer/form/modal thành công phải update đúng record/detail/list; browser refresh/back không được làm mất state máy/khách/kỳ lọc.

