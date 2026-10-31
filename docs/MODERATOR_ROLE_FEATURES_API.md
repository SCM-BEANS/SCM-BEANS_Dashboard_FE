# Rà soát tính năng và API của Moderator

Tài liệu này kiểm kê code Moderator trong workspace hiện tại, đối chiếu các API đang gọi với Swagger/OpenAPI local và server vào ngày 29/10/2026. Mục tiêu là mô tả chức năng đã chạy trong frontend, request/điều kiện đang áp dụng và các điểm cần chốt trước khi viết DTO cho Flutter.

## 1. Tình trạng cập nhật code

- Branch đang làm việc là `ref`. `git pull --ff-only` trả về `Already up to date`; `origin/ref` không có commit mới để kéo. Local đang ahead 2 commit và workspace còn thay đổi chưa commit; việc rà soát dưới đây dựa trên code hiện có trong workspace.
- `origin/planding` có commit mới, nhưng đây là branch khác nên không được trộn vào `ref`.
- Vì không có commit mới trên `ref`, lần này không có thay đổi Admin mới từ remote để bổ sung vào tài liệu Admin. Phần dưới đây tập trung vào Moderator theo yêu cầu.

## 2. Moderator có những chức năng nào?

Khu vực Moderator dùng route động `src/pages/moderator/[[...sections]].page.tsx`. Guard đọc cookie `access_token`, giải mã claim `roles` ở frontend và chỉ render khi có `MODERATOR` hoặc `ROLE_MODERATOR`. Kiểm tra này chỉ bảo vệ giao diện; backend vẫn phải xác minh token và quyền theo từng API.

Menu có 11 mục. Tình trạng tính năng hiện tại:

| Route | Tính năng đang có trong code | Mức triển khai |
| --- | --- | --- |
| `/moderator` | Tổng quan Owner, lượng ly, yêu cầu bảo trì và lắp đặt đang mở, usage theo ngày | Có API đọc |
| `/moderator/customers` | Tìm kiếm, lọc trạng thái, phân trang Owner; xem chi tiết, lịch sử và hợp đồng của Owner | Có API đọc/ghi thông tin liên hệ |
| `/moderator/customers/new` | Tạo tài khoản Owner, xác nhận trước khi gửi, hiển thị mật khẩu tạm sau khi tạo | Có API ghi IDaaS |
| `/moderator/contracts` | Danh sách và chi tiết hợp đồng, xem/tải tài liệu; tải bản scan hợp đồng chính cho hợp đồng nháp | Có API đọc/ghi tài liệu |
| `/moderator/contracts/new` | Tạo hợp đồng; chọn Owner và máy đủ điều kiện cho thuê | Có API ghi |
| `/moderator/contracts/{id}/installation-request` | Tạo work order lắp đặt từ hợp đồng nháp đủ điều kiện | Có API ghi, có điều kiện chặn |
| `/moderator/invoices` | Danh sách, chi tiết/dòng hóa đơn, xem/tải chứng từ, review chứng từ và cập nhật trạng thái hợp lệ | Có API đọc/ghi |
| `/moderator/machines` | Danh sách máy, thống kê kho; lọc một số nhóm ở frontend; cập nhật máy, đổi loại và gán Technician | Có API đọc/ghi |
| `/moderator/machines/{id}` | Chi tiết máy, heartbeat, địa điểm, lịch bảo trì, ticket và liên kết operational overview | Có API đọc và cập nhật máy; points hiển thị theo quyền Swagger |
| `/moderator/machines/{id}/operations` | Operational overview theo scope vận hành Moderator | Có API đọc aggregate; ẩn financial metrics |
| `/moderator/iot` | Chọn máy Smart IoT, xem heartbeat; xem/sửa địa điểm theo Owner | Có API đọc/ghi; telemetry points không được gọi bởi Moderator theo quyền Swagger hiện tại |
| `/moderator/iot/customer` | Tổng hợp địa điểm theo Owner; chỉnh sửa địa điểm | Có API đọc/ghi theo Owner |
| `/moderator/menu` | Danh sách, xem chi tiết, tạo và cập nhật công thức toàn cục | Có API đọc/ghi; danh sách dùng DTO summary riêng |
| `/moderator/technical-requests` | Triage repair request, xem timeline repair case; xem, phân công, đổi lịch hoặc hủy lệnh lắp đặt | Có API đọc/ghi theo trạng thái |
| `/moderator/machine-history` | Danh sách maintenance ticket; lọc ticket theo máy | Có API đọc |
| `/moderator/buyback` | Danh sách/chi tiết, tạo hồ sơ, inspection, định giá, tạo nghĩa vụ thanh toán, thu hồi, tân trang, QA; xem lịch sử | Có API đọc/ghi theo trạng thái; lookup proof còn thiếu endpoint danh sách |
| `/moderator/notifications` | Danh sách, số chưa đọc, đánh dấu từng thông báo đã đọc | Có API đọc/ghi |
| `/moderator/notifications/alerts` | Danh sách và acknowledge cảnh báo | Có API đọc/ghi |

Ngoài các luồng trên, một số đường dẫn legacy trong `PATH_MODERATOR` vẫn render thông báo trang chờ hoặc chưa khả dụng, gồm các trang invoice phụ, cho vay/thay thế máy và quy trình hết hạn/chấm dứt hợp đồng. Chúng không nằm trong menu chính hiện tại.

Các thao tác ghi đang gọi gồm: tạo/cập nhật thông tin Owner; tạo, phân công, đổi lịch hoặc hủy work order; tải tài liệu hợp đồng; cập nhật trạng thái invoice và duyệt chứng từ; tạo/cập nhật recipe; triage repair request; sửa địa điểm; điều phối hồ sơ buyback; acknowledge alert; và đánh dấu thông báo đã đọc.

## 3. Cấu hình kết nối API

### Base URL dùng trong trình duyệt

| Dịch vụ | Base URL frontend | Đường dẫn backend |
| --- | --- | --- |
| IDaaS | `/api/v1` | `{IDAAS_API_*}/api/v1` |
| Dolores | `/api/dolores/v1` | `{DOLORES_API_*}/api/v1` |

Moderator dùng chung Axios client với Admin. Client gửi `Authorization: Bearer <access_token>` từ cookie `access_token`, bật credentials và timeout 10 giây. Khi request có xác thực nhận 401, interceptor thử `POST /auth/refresh` một lần rồi gửi lại request ban đầu. Đăng xuất gọi `POST /auth/logout`, sau đó xóa cookie local dù API thất bại.

Next.js proxy chọn cặp IDaaS/Dolores theo cùng một môi trường để JWT key không bị lệch:

| Biến | Giá trị mẫu | Mục đích |
| --- | --- | --- |
| `IDAAS_API_IP_URL` | `http://100.75.202.72:4000/api/v1` | IDaaS server |
| `IDAAS_API_LOCAL_URL` | `http://localhost:4000/api/v1` | IDaaS Docker local |
| `DOLORES_API_IP_URL` | `http://100.75.202.72:8082` | Dolores server origin, không thêm `/api/v1` |
| `DOLORES_API_LOCAL_URL` | `http://localhost:8082` | Dolores Docker local |
| `DOLORES_API_URL` | `http://100.75.202.72:8082` | Tên remote cũ, chỉ fallback khi thiếu `DOLORES_API_IP_URL` |
| `IDAAS_REFRESH_COOKIE_PATH` | `/api/v1/auth` | Path cookie refresh nếu khác mặc định |

Khi đủ cả hai URL remote, proxy kiểm tra IDaaS `/health` và Dolores `/actuator/health`; nếu cả hai trả status dưới 500 thì dùng server, nếu không thì dùng cả cặp local. Lựa chọn được cache 5 giây. Nếu server rớt giữa lúc kiểm tra và request, GET/HEAD có thể retry local; mutation không tự gửi lại sang local để tránh tạo dữ liệu trùng. Proxy Dolores có timeout 15 giây và giới hạn body 10 MB.

`localhost` chỉ đúng với tiến trình Next.js/Docker trên máy dev. Flutter chạy trên điện thoại hoặc emulator cần địa chỉ host mà thiết bị truy cập được; Flutter cũng không tự thừa hưởng cơ chế chọn cặp local/server của Next.js.

### Swagger đã kiểm tra

| Dịch vụ | Local | Server |
| --- | --- | --- |
| Dolores | [`http://localhost:8082/v3/api-docs`](http://localhost:8082/v3/api-docs) | [`http://100.75.202.72:8082/v3/api-docs`](http://100.75.202.72:8082/v3/api-docs) |
| IDaaS | [`http://localhost:4000/swagger/doc.json`](http://localhost:4000/swagger/doc.json) | [`http://100.75.202.72:4000/swagger/doc.json`](http://100.75.202.72:4000/swagger/doc.json) |

IDaaS local/server có cùng 23 operation. Dolores local có 276 operation, server có 273; ba operation chỉ thấy ở local là `POST /dev/v1/brew-records`, `POST /api/v1/notifications/installations`, `DELETE /api/v1/notifications/installations/{installationId}`. Không operation nào trong số đó được các màn Moderator hiện tại gọi.

## 4. API Moderator đang dùng

Trong bảng dưới, đường dẫn Dolores tính từ `/api/v1`; IDaaS tính từ base path `/api/v1` của spec. “Điều kiện” mô tả điều kiện frontend gọi hoặc cho phép thao tác, không thay thế kiểm tra quyền/dữ liệu ở backend.

### 4.1 Tổng quan

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/dashboard/overview` | Gọi khi mở `/moderator`; không truyền khoảng ngày. UI đọc `operationalMetrics` để hiện tổng Owner, số ly, ticket bảo trì và installation work order đang mở, usage theo ngày và financial metrics. |

### 4.2 Khách hàng / Owner

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/profiles?role=OWNER&page={0-based}&size=20` | Tải danh sách Owner. Có thể thêm `status` và `q`; đổi tìm kiếm/trạng thái đưa trang về 0. Swagger trả page có `items/page/size/totalElements/totalPages`. |
| GET | Dolores `/profiles/{idaasUserId}` | Chi tiết Owner; chỉ gọi với UUID hợp lệ. |
| GET | Dolores `/profiles/{ownerId}/history?page={page}&size=20` | Lịch sử thay đổi hồ sơ Owner theo trang. |
| GET | Dolores `/profiles/{ownerId}/contracts?page={page}&size=20` | Hợp đồng thuộc Owner; phân trang. |
| PUT | Dolores `/profiles/{ownerId}/contact-info` | Cập nhật thông tin liên hệ theo body và UUID hợp lệ. |
| POST | IDaaS `/admin/users` | Tạo tài khoản khách hàng với `role=owner`; body gồm `name`, `email`, `role`. Frontend yêu cầu tên 2–50 ký tự, email hợp lệ tối đa 255 ký tự và xác nhận trước khi gửi. Thành công trả mật khẩu tạm để hiện dialog. |

Tài khoản tạo ở màn này là Owner, không phải thao tác tạo tenant Dolores riêng. Luồng hiện không gửi `tenant_id`. Swagger IDaaS cũng chỉ khai báo `email`, `name`, `role` cho request này.

### 4.3 Hợp đồng và yêu cầu lắp đặt

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/contracts` | Tải danh sách summary trong phạm vi Moderator (hợp đồng do tài khoản Moderator đó tạo); hiện không gửi query filter hoặc page/size. |
| GET | Dolores `/profiles?role=owner&page={0-based}&size=100` | Form lấy Owner theo trang; tải tiếp đến hết `totalPages`, tối đa 5 trang đồng thời mỗi lô. |
| GET | Dolores `/inventory/rental-candidates` | Moderator truyền `ownerRole="owner"` cho form nên máy chọn từ endpoint rental candidates, không lọc máy kho bằng `/machines`. Frontend đọc `content` từ page response. Swagger hỗ trợ filter `machineType`, `modelId`, `region`, `locationId`, `page`, `size`; form hiện không truyền filter. |
| POST | Dolores `/contracts` | Tạo hợp đồng; body bắt buộc `ownerId`, `machineId`, `startDate`, `endDate`, `terms`, `monthlyRentalFee`; các phí cọc/lắp đặt/PAYG và snapshot điều khoản được gửi nếu có. `endDate` phải sau `startDate`; phí không âm; ID là UUID; `offlineLimitMinutes` nếu có phải là số nguyên dương. |
| GET | Dolores `/contracts/{id}` | Tải chi tiết hợp đồng theo UUID. |
| GET | Dolores `/contracts/{contractId}/documents` | Tải metadata tài liệu sau khi hợp đồng hợp lệ đã tải. |
| GET | Dolores `/contracts/{contractId}/documents/{documentId}` | Tải nội dung tài liệu dạng file khi người dùng yêu cầu. |
| POST | Dolores `/contracts/{id}/documents?documentType=MAIN_CONTRACT` | Tải bản scan cho hợp đồng `DRAFT`; chấp nhận PDF/JPEG/PNG tối đa 20 MB. Upload thành công làm mới điều kiện kích hoạt hợp đồng. |
| POST | Dolores `/installation-work-orders` | Tạo yêu cầu lắp đặt từ hợp đồng. Body bắt buộc `ownerId`, `contractId`, `machineId`; `scheduledFor` và `installationNotes` tùy chọn, ghi chú tối đa 4.000 ký tự. |

Trước khi mở form tạo hợp đồng, frontend cần danh sách Owner và rental candidates. Trước khi cho tạo work order, hợp đồng phải là `DRAFT`, không bị đánh dấu `legacyUnmapped`, có `ownerId`/`machineId` và có tài liệu `MAIN_CONTRACT` chưa lưu trữ. Thời gian lắp đặt không bắt buộc; nếu có thì được gửi dạng ISO datetime.

Snapshot điều khoản của form yêu cầu chu kỳ bảo trì 1–24 tháng, cửa sổ bảo trì 0–30 ngày, số ngày thanh toán 1–60, ít nhất một loại máy thay thế và số tháng tối thiểu mua lại 0–120. Trách nhiệm sửa chữa là `TENANT|COMPANY|UNKNOWN`. `offlineViolationAction` dùng `WARN_ONLY|MANUAL_REVIEW`, `buybackValuationMethod` dùng `MANUAL_APPRAISAL`; cả hai được chọn từ control giới hạn theo enum Swagger.

### 4.4 Máy, bảo trì và lịch sử

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/machines` | Tải danh sách máy một lần; màn Moderator lọc một số nhóm ở client. “Máy trong kho” giữ status `IN_WAREHOUSE`, `PENDING_ACTIVATION`, `AVAILABLE_FOR_RENT`; máy thuộc Owner được xét theo `ownerId`. |
| GET | Dolores `/inventory/summary` | Số liệu tổng quan kho hiển thị cạnh danh sách. |
| GET | Dolores `/machines/{id}` | Chi tiết máy; ID phải là UUID. |
| GET | Dolores `/machines/{id}/maintenance-schedule` | Đọc lịch bảo trì sau khi ID máy hợp lệ. |
| GET | Dolores `/maintenance-tickets` | Dùng ở lịch sử và chi tiết máy; UI lọc theo `machineId` ở client. |
| GET | Dolores `/locations?ownerId={ownerId}&activeOnly={true|false}` | Tải địa điểm của Owner; màn máy lấy địa điểm đang hoạt động, màn tổng hợp Owner gồm cả trạng thái không hoạt động. |
| GET | Dolores `/locations/{id}` | Chỉ gọi ở chi tiết máy nếu máy có `locationId` hợp lệ; UI so sánh Owner giữa máy và địa điểm trước khi hiển thị tên. |
| PUT | Dolores `/locations/{id}` | Cập nhật tên/địa chỉ/thành phố ở màn địa điểm của Owner. |
| PUT | Dolores `/machines/{id}` và `/machines/{id}/type` | Cập nhật thông tin máy và loại máy từ form Moderator. |
| POST/DELETE | Dolores `/technician-assignments/{technicianId}/machines/{machineId}` | Gán hoặc thu hồi Technician; form lấy profile Technician đang hoạt động và xác thực UUID. |

Các trang này không tự đổi lịch maintenance ticket; API quản lý ticket vẫn tách khỏi thao tác cập nhật thông tin máy.

### 4.5 IoT

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/machines` | Nạp danh sách và chọn máy có `machineType=SMART_IOT`. |
| GET | Dolores `/machines/{id}` | Xác minh lại máy đã chọn là UUID hợp lệ và có `machineType=SMART_IOT`. |
| GET | Dolores `/telemetry-query/machines/{machineId}/heartbeats/latest` | Gọi sau khi xác minh máy là Smart IoT; dùng ở màn IoT và hồ sơ máy. |
| GET | Dolores `/telemetry-query/machines/{machineId}/points` | Không gọi bởi Moderator: role này không được Swagger cấp quyền points. Shared detail giữ cùng vị trí nội dung và hiển thị trạng thái quyền. |
| GET | Dolores `/dashboard/overview?fromDate={date}&toDate={date}` | Route `/moderator/machines/{machineId}/operations` đọc aggregate theo scope vận hành; không gửi `ownerId` và không hiển thị financial metrics. |

Trang “địa điểm theo Owner” lấy Owner qua `/profiles?role=OWNER`, rồi gọi `/locations?ownerId={ownerId}` theo lô. Theo cách dùng hiện tại của Dolores, Owner là định danh phạm vi cho các dữ liệu trước đây được gọi là tenant; Moderator không cần endpoint `/tenants` cho luồng này.

### 4.6 Technical request và machine history

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/dashboard/action-items?actionType=REPAIR_TRIAGE` | Lấy các repair request đang chờ triage; `resourceId` của item là maintenance request ID. |
| POST | Dolores `/repair-cases/intakes/{requestId}/triage` | Chấp nhận/từ chối request với `accepted` và `reason`; chỉ gọi từ action item phù hợp. |
| GET | Dolores `/repair-cases` | Danh sách repair case dạng summary; UI không giả định response có timeline. |
| GET | Dolores `/repair-cases/{caseId}` | Chi tiết repair case theo UUID hợp lệ. |
| GET | Dolores `/repair-cases/{caseId}/timeline?page={0-based}&size=20` | Lịch sử xử lý theo trang trong màn chi tiết. |
| GET | Dolores `/maintenance-tickets` | Danh sách ticket ở machine history; nếu mở theo máy thì lọc `machineId` ở client. |
| GET | Dolores `/installation-work-orders/{workOrderId}` | Chi tiết work order theo UUID; hiển thị trạng thái, checklist, phụ kiện và evidence. |
| POST | Dolores `/installation-work-orders/{id}/assign` | Gán Technician đang hoạt động. |
| POST | Dolores `/installation-work-orders/{id}/reschedule` | Đổi lịch, yêu cầu thời điểm tương lai. |
| POST | Dolores `/installation-work-orders/{id}/cancel` | Hủy work order đang chờ/phân công, bắt buộc nêu lý do. |

Moderator triage repair intake do Owner tạo; `POST /repair-cases/intakes` vẫn thuộc luồng Owner. Các thao tác work order sửa chữa/thay thế khác không được giả lập bằng work order lắp đặt.

### 4.7 Hóa đơn và chứng từ thanh toán

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/billing/invoices` | Tải hóa đơn; UI hiện không truyền filter/pagination. |
| GET | Dolores `/profiles/{idaasUserId}` | Khi dựng danh sách, lấy tên cho mỗi Owner duy nhất có trong invoice. |
| GET | Dolores `/billing/invoices/{invoiceId}` | Chi tiết invoice khi route chứa UUID hợp lệ. |
| GET | Dolores `/billing/invoices/{invoiceId}/payment-proofs` | Tải chứng từ sau khi invoice detail có dữ liệu; ở danh sách, hiện gọi song song cho từng invoice để tính trạng thái chứng từ. |
| GET | Dolores `/billing/invoices/{invoiceId}/line-items` | Tải dòng chi tiết của hóa đơn. |
| GET | Dolores `/billing/payment-proofs/{proofId}/content` | Tải file chứng từ dạng blob khi người dùng yêu cầu mở/tải file. |
| POST | Dolores `/billing/invoices/{invoiceId}/status` | Chuyển trạng thái theo transition hợp lệ; UI không dùng để xác nhận hóa đơn đã thanh toán. |
| POST | Dolores `/billing/payment-proofs/{proofId}/review` | Duyệt/từ chối chứng từ với lý do. |

Danh sách hóa đơn ghép dữ liệu Owner và chứng từ bằng nhiều request đồng thời; dữ liệu lớn có thể tạo nhiều request. Schema Moderator chấp nhận cả `SUPPLY`, `RENTAL` và `REPAIR`. Màn không cung cấp đối soát thủ công hay chuyển thẳng invoice sang `PAID`.

### 4.8 Menu

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/recipes/global` | Danh sách công thức toàn cục. |
| GET | Dolores `/recipes/global/{id}` | Chi tiết công thức đã chọn; ID phải là UUID. |
| POST | Dolores `/recipes/global` | Tạo công thức: tên, ít nhất một bước pha và một mục giới hạn định lượng. |
| PUT | Dolores `/recipes/global/{id}` | Cập nhật công thức bằng schema publish. |

Danh sách dùng DTO summary (`id`, `name`, `revision`, `menuId`); chi tiết lấy riêng theo UUID. Xóa chưa được đưa vào giao diện do backend còn kiểm tra điều kiện tham chiếu.

### 4.9 Buyback

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/buybacks` | Liệt kê hồ sơ Moderator được phép xem; dùng `page`/`size` và đọc `X-Page`, `X-Page-Size`, `X-Has-Next`. |
| GET | Dolores `/buybacks/{caseId}` | Chi tiết theo UUID hợp lệ. |
| GET | Dolores `/buybacks/{caseId}/inspections`, `/refurbishments`, `/qa-decisions` | Đọc lịch sử từng bước, mỗi request giới hạn 50 bản ghi. |
| POST | Dolores `/buybacks` | Tạo hồ sơ cho hợp đồng `ACTIVE`, đúng Owner/máy, bật điều khoản buyback và đạt số tháng tối thiểu. Frontend lọc bước đầu; server xác minh điều kiện đầy đủ. |
| POST | Dolores `/buybacks/{caseId}/inspection/start` và `/inspection` | Bắt đầu kiểm tra trong `REQUESTED`; gửi tình trạng, định giá, ghi chú/chứng cứ trong `INSPECTION_PENDING`. |
| POST | Dolores `/buybacks/{caseId}/valuation` | Moderator duyệt/từ chối trong `VALUATION_PENDING`; khi duyệt cần giá dương và lý do. |
| POST | Dolores `/buybacks/{caseId}/payments` | Tạo nghĩa vụ thanh toán ngoài hệ thống khi `APPROVED`; body có `paymentMethod`, `externalReference`, `idempotencyKey`, `correlationId`. Phản hồi chứa mã thanh toán; thao tác không xác nhận Owner đã trả tiền. |
| POST | Dolores `/buybacks/{caseId}/collection/request` và `/collection/confirm` | Yêu cầu thu hồi sau khi thanh toán đã ghi nhận; xác nhận thu hồi kèm mã chứng cứ. |
| POST | Dolores `/buybacks/{caseId}/refurbishment/start` và `/refurbishment/complete` | Ghi kế hoạch, chi phí và kết quả tân trang theo trạng thái hồ sơ. |
| POST | Dolores `/buybacks/{caseId}/qa` | QA độc lập; chỉ hồ sơ QA đạt mới chuyển máy sang `AVAILABLE_FOR_RENT`. |
| POST | Dolores `/buybacks/{caseId}/cancel` | Hủy khi transition cho phép; bắt buộc có lý do. |
| POST | Dolores `/buybacks/{caseId}/payments` | Tạo nghĩa vụ thanh toán ngoài hệ thống khi định giá được duyệt; Moderator được cấp quyền operator và phản hồi trả về `paymentId`. |
| POST | Dolores `/buybacks/{caseId}/payment-proofs` | Tải chứng từ multipart với `paymentId`, `idempotencyKey`, `correlationId`; chưa nối trong Moderator UI. |
| POST | Dolores `/buybacks/payment-proofs/{proofId}/review`; GET `/buybacks/payment-proofs/{proofId}/content` | Operator duyệt/từ chối hoặc đọc chứng từ theo UUID; chưa có danh sách payment/proof để UI tìm các ID cần xử lý. |

Ở bước `APPROVED`, Moderator có thể tạo nghĩa vụ thanh toán; khi `PAYMENT_PENDING`, giao diện báo chờ Owner trả tiền và backend xác nhận. Controller cho phép Moderator gọi API proof theo quyền operator, nhưng Swagger không có API liệt kê payment/proof theo hồ sơ; UI chưa thể tra cứu `paymentId`/`proofId` để tải chứng từ hoặc review sau khi tải lại màn.

### 4.10 Notifications và alerts

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/notifications` | Danh sách thông báo. |
| GET | Dolores `/notifications/unread-count` | Số thông báo chưa đọc. |
| POST | Dolores `/notifications/{id}/read` | Đánh dấu một thông báo; ID phải là UUID, chỉ hiển thị nút cho mục chưa đọc. Response phải xác nhận đúng ID và `read=true`; thành công thì invalidate danh sách. |
| GET | Dolores `/alerts` | Danh sách cảnh báo. |
| POST | Dolores `/alerts/{id}/ack` | Acknowledge cảnh báo chưa được xác nhận theo UUID. |

`POST /notifications/read-all` có wrapper nhưng màn Moderator chưa gọi.

## 5. Điểm còn cần xác nhận với Swagger/runtime

1. **Telemetry points:** Swagger mô tả response generic `object`, trong khi Owner/Admin client parse danh sách point có `machineId`. Moderator hiện không gọi endpoint points do Swagger không cấp quyền role này. Cần xác nhận response thực tế trước khi Flutter dùng chung DTO. Chưa gọi endpoint có token trong lần rà soát tài liệu này.
2. **IDaaS MFA/logout:** Swagger IDaaS được đối chiếu không khai báo `POST /auth/login/mfa` và `POST /auth/logout`. `POST /auth/mfa/confirm` là thao tác bật MFA sau xác thực, không thay cho OTP đăng nhập bằng `temp_token`/`code`.
3. **Chứng từ thanh toán buyback:** Moderator UI đã tạo payment khi `APPROVED`; API có tải chứng từ, review và tải nội dung theo ID, nhưng chưa có endpoint liệt kê payment/proof theo hồ sơ. Do đó UI chưa tra cứu được ID cần tải/review sau khi reload.

Các lệch DTO đã được xử lý trong code hiện tại: `Owner` là phạm vi dữ liệu thay cho nhãn tenant; repair-case list dùng summary và tải timeline riêng; buyback dùng `ownerId`; invoice chấp nhận `REPAIR`; recipe list dùng summary riêng; và enum snapshot hợp đồng được giới hạn theo Swagger. Giới hạn form phía frontend không thay thế validation hoặc phân quyền backend.

## 6. File và wrapper đã rà soát

- Route, menu và shell: `src/pages/moderator`, `src/routes/path.ts`, `src/routes/routes.ts`, `src/lib/auth-role.ts`, `src/text/moderator/moderator-messages.ts`.
- API wrapper dùng bởi Moderator: `src/apis/auth.api.ts`, `admin-users.api.ts`, `dashboard.api.ts`, `profiles.api.ts`, `contracts.api.ts`, `machines.api.ts`, `machine-models.api.ts`, `locations.api.ts`, `installation-work-orders.api.ts`, `repair-cases.api.ts`, `buybacks.api.ts`, `billing.api.ts`, `notifications.api.ts`, `recipes.api.ts`, `telemetry.api.ts`, `tenants.api.ts`.
- Form dùng chung: `src/components/create-form/contract-create-form.tsx`, `src/components/account/account-create-form.tsx`, `src/components/account/account-success-dialog.tsx`.
- Schema: `src/schema/admin-users.schema.ts`, `profiles.schema.ts`, `contracts.schema.ts`, `machines.schema.ts`, `installation-work-orders.schema.ts`, `buybacks.schema.ts`, `billing.schema.ts`, `notifications.schema.ts`, `recipes.schema.ts`, `telemetry.schema.ts`, `tenants.schema.ts`.
- Cấu hình/proxy: `src/lib/http.ts`, `src/lib/server/backend-api-selection.ts`, `src/pages/api/v1/[...path].page.ts`, `src/pages/api/dolores/v1/[...path].page.ts`, `.env.example`.

Việc đối chiếu chỉ tải và đọc Swagger/OpenAPI; không gọi các endpoint nghiệp vụ cần token nên chưa xác nhận được dữ liệu runtime, phân quyền thực tế hoặc validation backend chưa mô tả.
