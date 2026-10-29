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
| `/moderator/customers` | Tìm kiếm, lọc trạng thái, phân trang Owner; xem chi tiết hồ sơ | Có API đọc |
| `/moderator/customers/new` | Tạo tài khoản Owner, xác nhận trước khi gửi, hiển thị mật khẩu tạm sau khi tạo | Có API ghi IDaaS |
| `/moderator/contracts` | Danh sách và chi tiết hợp đồng, xem metadata tài liệu | Có API đọc |
| `/moderator/contracts/new` | Tạo hợp đồng; chọn Owner và máy đủ điều kiện cho thuê | Có API ghi |
| `/moderator/contracts/{id}/installation-request` | Tạo work order lắp đặt từ hợp đồng nháp đủ điều kiện | Có API ghi, có điều kiện chặn |
| `/moderator/invoices` | Danh sách, chi tiết hóa đơn, trạng thái chứng từ thanh toán và tải file chứng từ | Có API đọc/tải file |
| `/moderator/machines` | Danh sách máy và thống kê kho; lọc một số nhóm ở frontend | Có API đọc |
| `/moderator/machines/{id}` | Chi tiết máy, địa điểm, lịch bảo trì và ticket | Có API đọc |
| `/moderator/iot` | Chọn máy Smart IoT, heartbeat và biểu đồ telemetry | Có API đọc; response telemetry chưa khớp spec |
| `/moderator/iot/customer` | Tổng hợp địa điểm theo tenant | Code gọi API chưa có hợp đồng phù hợp trong Swagger |
| `/moderator/menu` | Danh sách và chi tiết công thức toàn cục | Có API đọc; schema danh sách chưa khớp spec |
| `/moderator/technical-requests` | Danh sách repair case; xem chi tiết installation work order | Có API đọc; schema danh sách repair case chưa khớp spec |
| `/moderator/machine-history` | Danh sách maintenance ticket; lọc ticket theo máy | Có API đọc |
| `/moderator/buyback` | Mở chi tiết buyback theo UUID | Chi tiết có API; danh sách chưa nối và response schema không khớp |
| `/moderator/notifications` | Danh sách, số chưa đọc, đánh dấu từng thông báo đã đọc | Có API đọc/ghi |
| `/moderator/notifications/alerts` | Danh sách cảnh báo | Có API đọc |

Ngoài các luồng trên, nhiều đường dẫn có trong `PATH_MODERATOR` nhưng vẫn render thông báo trang chờ hoặc trạng thái chưa khả dụng. Các thao tác đang bị khóa gồm đối soát hóa đơn, thêm công thức, tạo technical request và tạo buyback. Máy cho vay/thay thế, các bước hết hạn/chấm dứt hợp đồng và các luồng invoice phụ cũng chưa thành tính năng API trong giao diện hiện tại.

Các thao tác ghi thực sự đang gọi là: tạo Owner, tạo hợp đồng, tạo installation work order, và đánh dấu một thông báo đã đọc. Các màn còn lại chủ yếu đọc dữ liệu.

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
| POST | IDaaS `/admin/users` | Tạo tài khoản khách hàng với `role=owner`; body gồm `name`, `email`, `role`. Frontend yêu cầu tên 2–50 ký tự, email hợp lệ tối đa 255 ký tự và xác nhận trước khi gửi. Thành công trả mật khẩu tạm để hiện dialog. |

Tài khoản tạo ở màn này là Owner, không phải thao tác tạo tenant Dolores riêng. Luồng hiện không gửi `tenant_id`. Swagger IDaaS cũng chỉ khai báo `email`, `name`, `role` cho request này.

### 4.3 Hợp đồng và yêu cầu lắp đặt

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/contracts` | Tải danh sách hợp đồng; hiện không gửi query filter hoặc page/size. |
| GET | Dolores `/profiles?role=owner&page={0-based}&size=100` | Form lấy Owner theo trang; tải tiếp đến hết `totalPages`, tối đa 5 trang đồng thời mỗi lô. |
| GET | Dolores `/inventory/rental-candidates` | Moderator truyền `ownerRole="owner"` cho form nên máy chọn từ endpoint rental candidates, không lọc máy kho bằng `/machines`. Frontend đọc `content` từ page response. Swagger hỗ trợ filter `machineType`, `modelId`, `region`, `locationId`, `page`, `size`; form hiện không truyền filter. |
| POST | Dolores `/contracts` | Tạo hợp đồng; body bắt buộc `ownerId`, `machineId`, `startDate`, `endDate`, `terms`, `monthlyRentalFee`; các phí cọc/lắp đặt/PAYG và snapshot điều khoản được gửi nếu có. `endDate` phải sau `startDate`; phí không âm; ID là UUID; `offlineLimitMinutes` nếu có phải là số nguyên dương. |
| GET | Dolores `/contracts/{id}` | Tải chi tiết hợp đồng theo UUID. |
| GET | Dolores `/contracts/{contractId}/documents` | Tải metadata tài liệu sau khi hợp đồng hợp lệ đã tải. Màn chi tiết liệt kê tài liệu, không tải nội dung file. |
| POST | Dolores `/installation-work-orders` | Tạo yêu cầu lắp đặt từ hợp đồng. Body bắt buộc `ownerId`, `contractId`, `machineId`; `scheduledFor` và `installationNotes` tùy chọn, ghi chú tối đa 4.000 ký tự. |

Trước khi mở form tạo hợp đồng, frontend cần danh sách Owner và rental candidates. Trước khi cho tạo work order, hợp đồng phải là `DRAFT`, không bị đánh dấu `legacyUnmapped`, có `ownerId`/`machineId` và có tài liệu `MAIN_CONTRACT` chưa lưu trữ. Thời gian lắp đặt không bắt buộc; nếu có thì được gửi dạng ISO datetime.

Snapshot điều khoản của form yêu cầu chu kỳ bảo trì 1–24 tháng, cửa sổ bảo trì 0–30 ngày, số ngày thanh toán 1–60, ít nhất một loại máy thay thế và số tháng tối thiểu mua lại 0–120. Trách nhiệm sửa chữa là `TENANT|COMPANY|UNKNOWN`. Swagger còn giới hạn `offlineViolationAction` thành `WARN_ONLY|MANUAL_REVIEW` và `buybackValuationMethod` thành `MANUAL_APPRAISAL`; form hiện dùng text input cho hai giá trị này.

### 4.4 Máy, bảo trì và lịch sử

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/machines` | Tải danh sách máy một lần; màn Moderator lọc một số nhóm ở client. “Máy trong kho” giữ status `IN_WAREHOUSE`, `PENDING_ACTIVATION`, `AVAILABLE_FOR_RENT`; “máy theo tenant” lọc theo `tenantId`. |
| GET | Dolores `/inventory/summary` | Số liệu tổng quan kho hiển thị cạnh danh sách. |
| GET | Dolores `/machines/{id}` | Chi tiết máy; ID phải là UUID. |
| GET | Dolores `/machines/{id}/maintenance-schedule` | Đọc lịch bảo trì sau khi ID máy hợp lệ. |
| GET | Dolores `/maintenance-tickets` | Dùng ở lịch sử và chi tiết máy; UI lọc theo `machineId` ở client. |
| GET | Dolores `/locations/{id}` | Chỉ gọi ở chi tiết máy nếu máy có `locationId` hợp lệ; UI so sánh Owner/tenant giữa máy và location trước khi hiển thị tên địa điểm. |

Các trang này hiện không gọi API sửa/xóa máy, gán máy hoặc cập nhật lịch bảo trì.

### 4.5 IoT

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/machines` | Nạp danh sách và chọn máy có `machineType=SMART_IOT`. |
| GET | Dolores `/machines/{id}` | Xác minh lại máy đã chọn là UUID hợp lệ và có `machineType=SMART_IOT`. |
| GET | Dolores `/telemetry-query/machines/{machineId}/heartbeats/latest` | Chỉ gọi sau khi xác minh máy là Smart IoT. |
| GET | Dolores `/telemetry-query/machines/{machineId}/points?from={ISO}&to={ISO}&limit=100&offset={n}` | Chỉ gọi sau khi người dùng gửi form ngày hợp lệ; `from < to`. Tải từng trang 100 điểm, offset tối đa 100.000. Ngày UI chuyển thành khoảng `00:00:00`–`23:59:59` theo `+07:00`. |

Trang “địa điểm theo tenant” hiện gọi `GET /tenants`, rồi gọi `GET /locations?tenantId={id}&activeOnly=false` theo lô. Hai request này có vấn đề đối chiếu Swagger, xem mục 5.

### 4.6 Technical request và machine history

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/repair-cases` | Danh sách repair case ở `/moderator/technical-requests`; hiện không truyền filter/page. UI đọc event cuối trong `timeline` để hiện công việc mới nhất. |
| GET | Dolores `/maintenance-tickets` | Danh sách ticket ở machine history; nếu mở theo máy thì lọc `machineId` ở client. |
| GET | Dolores `/installation-work-orders/{workOrderId}` | Chi tiết work order theo UUID; hiển thị trạng thái, checklist, phụ kiện và evidence. |

Tạo technical request hiện bị khóa; Moderator không gọi API tạo repair case từ màn này.

### 4.7 Hóa đơn và chứng từ thanh toán

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/billing/invoices` | Tải hóa đơn; UI hiện không truyền filter/pagination. |
| GET | Dolores `/profiles/{idaasUserId}` | Khi dựng danh sách, lấy tên cho mỗi Owner duy nhất có trong invoice. |
| GET | Dolores `/billing/invoices/{invoiceId}` | Chi tiết invoice khi route chứa UUID hợp lệ. |
| GET | Dolores `/billing/invoices/{invoiceId}/payment-proofs` | Tải chứng từ sau khi invoice detail có dữ liệu; ở danh sách, hiện gọi song song cho từng invoice để tính trạng thái chứng từ. |
| GET | Dolores `/billing/payment-proofs/{proofId}/content` | Tải file chứng từ dạng blob khi người dùng yêu cầu mở/tải file. |

Danh sách hóa đơn hiện ghép dữ liệu Owner và chứng từ bằng nhiều request đồng thời; dữ liệu lớn có thể tạo nhiều request. Không có thao tác duyệt/từ chối chứng từ hoặc đối soát hóa đơn trên màn Moderator hiện tại.

### 4.8 Menu

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/recipes/global` | Danh sách công thức toàn cục. |
| GET | Dolores `/recipes/global/{id}` | Chi tiết công thức đã chọn; ID phải là UUID. |

Màn menu hiện chỉ đọc. Nút thêm/cập nhật công thức đang bị khóa.

### 4.9 Buyback

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/buybacks/{caseId}` | Chỉ gọi cho màn chi tiết với UUID hợp lệ. |

API `GET /buybacks` có trong Swagger nhưng danh sách buyback hiện báo chưa khả dụng và chưa có wrapper list. Các thao tác định giá, thanh toán, thu hồi, refurbishment và QA chưa được nối từ Moderator.

### 4.10 Notifications và alerts

| Method | Dịch vụ / endpoint | Cách dùng và điều kiện |
| --- | --- | --- |
| GET | Dolores `/notifications` | Danh sách thông báo. |
| GET | Dolores `/notifications/unread-count` | Số thông báo chưa đọc. |
| POST | Dolores `/notifications/{id}/read` | Đánh dấu một thông báo; ID phải là UUID, chỉ hiển thị nút cho mục chưa đọc. Response phải xác nhận đúng ID và `read=true`; thành công thì invalidate danh sách. |
| GET | Dolores `/alerts` | Danh sách cảnh báo, chỉ đọc. |

`POST /notifications/read-all` có wrapper nhưng màn Moderator không gọi. `POST /alerts/{id}/ack` có trong Swagger nhưng chưa có thao tác acknowledge trên màn.

## 5. Lệch Swagger/OpenAPI cần xử lý trước khi chuyển sang Flutter

1. **Tenant API chưa được công bố và query location không khớp.** Cả Swagger local/server đều không có `GET /tenants` hoặc `GET /tenants/{id}`. Swagger `GET /locations` yêu cầu `ownerId`; không khai báo `tenantId`. Màn IoT Moderator lại gọi `/tenants` và gửi `tenantId` để đọc locations, nên không thể triển khai DTO/luồng Flutter theo contract hiện công bố nếu backend chưa bổ sung spec hoặc chỉ rõ API thay thế.
2. **Buyback detail không khớp DTO frontend.** Swagger `BuybackCaseDetailsResponse` trả `ownerId`, `collectionEvidenceRecorded` và các dữ liệu inspection/refurbishment; Zod `BuybackCaseSchema` bắt buộc `tenantId`, `requestedBy`, `collectionEvidence` và `version`. Nếu backend trả đúng schema Swagger, `buybacksApi.getById` sẽ lỗi parse.
3. **Repair case list là summary nhưng frontend đòi timeline đầy đủ.** Swagger `GET /repair-cases` trả `RepairCaseSummaryResponse` không có `timeline`; frontend `RepairCaseSchema` bắt buộc `timeline` rồi đọc event cuối. Spec còn có API detail/timeline riêng nhưng Moderator hiện không gọi chúng.
4. **Work order detail dùng Owner ID trong Swagger, tenant ID trong frontend.** Swagger `InstallationWorkOrderSummaryResponse` có `ownerId` và không khai báo `tenantId`; `InstallationWorkOrderSummarySchema` frontend yêu cầu `tenantId`. Vì summary là một phần của `GET /installation-work-orders/{workOrderId}`, response theo Swagger có thể bị Zod từ chối.
5. **Invoice type `REPAIR` chưa được frontend Moderator cho phép.** Swagger enum invoice có `SUPPLY`, `RENTAL`, `REPAIR`; `ModeratorInvoiceSchema` chỉ nhận `SUPPLY` hoặc `RENTAL`. Hóa đơn repair sẽ lỗi parse nếu xuất hiện trong response.
6. **Recipe list chỉ trả summary.** Swagger `GET /recipes/global` trả `id/name/revision/menuId`, còn frontend `GlobalRecipeSchema` yêu cầu cả `steps` và `dosageBounds`. Route chi tiết trả schema đầy đủ; nên tách DTO list/detail hoặc xác nhận backend list trả thêm field.
7. **Telemetry points response chưa có shape dùng được.** Swagger khai báo response là generic `object`, còn frontend yêu cầu array và kiểm tra `machineId` trên từng điểm. Backend cần chốt array trực tiếp hay object bọc dữ liệu.
8. **Auth MFA login và logout không có trong IDaaS spec.** Frontend gọi `POST /auth/login/mfa` và `POST /auth/logout`, nhưng hai route vắng mặt. `POST /auth/mfa/confirm` trong Swagger nhận `secret`/`token` và yêu cầu BearerAuth, nên không phải contract thay cho login OTP bằng `temp_token`/`code`.
9. **Wrapper tenant-scoped chưa dùng không khớp spec.** `contractsApi.listByTenant` gọi `/contracts/tenant/{tenantId}` nhưng route này không có trong Swagger và hiện không có call site Moderator. `installationWorkOrdersApi.listByTenant` gọi `GET /installation-work-orders?tenantId=...`; Swagger endpoint list yêu cầu `ownerId`, không khai báo `tenantId`. Các wrapper này chưa tạo nên tính năng đang chạy trên màn Moderator.
10. **Form hợp đồng có thể gửi enum snapshot không được Swagger chấp nhận.** Zod frontend cho phép chuỗi tự do không rỗng ở `offlineViolationAction` và `buybackValuationMethod`, trong khi Swagger chỉ chấp nhận `WARN_ONLY|MANUAL_REVIEW` và `MANUAL_APPRAISAL`. Giá trị khởi tạo hiện khớp spec, nhưng Moderator có thể sửa text thành giá trị khác rồi vẫn qua frontend validation.

Các giới hạn form như min/max số tháng, tiền, ký tự và kiểm tra UUID chủ yếu nằm ở Zod/UI. Không nên coi chúng là validation backend nếu Swagger không mô tả tương ứng.

## 6. File và wrapper đã rà soát

- Route, menu và shell: `src/pages/moderator`, `src/routes/path.ts`, `src/routes/routes.ts`, `src/lib/auth-role.ts`, `src/text/moderator/moderator-messages.ts`.
- API wrapper dùng bởi Moderator: `src/apis/auth.api.ts`, `admin-users.api.ts`, `dashboard.api.ts`, `profiles.api.ts`, `contracts.api.ts`, `machines.api.ts`, `machine-models.api.ts`, `locations.api.ts`, `installation-work-orders.api.ts`, `repair-cases.api.ts`, `buybacks.api.ts`, `billing.api.ts`, `notifications.api.ts`, `recipes.api.ts`, `telemetry.api.ts`, `tenants.api.ts`.
- Form dùng chung: `src/components/create-form/contract-create-form.tsx`, `src/components/account/account-create-form.tsx`, `src/components/account/account-success-dialog.tsx`.
- Schema: `src/schema/admin-users.schema.ts`, `profiles.schema.ts`, `contracts.schema.ts`, `machines.schema.ts`, `installation-work-orders.schema.ts`, `buybacks.schema.ts`, `billing.schema.ts`, `notifications.schema.ts`, `recipes.schema.ts`, `telemetry.schema.ts`, `tenants.schema.ts`.
- Cấu hình/proxy: `src/lib/http.ts`, `src/lib/server/backend-api-selection.ts`, `src/pages/api/v1/[...path].page.ts`, `src/pages/api/dolores/v1/[...path].page.ts`, `.env.example`.

Việc đối chiếu chỉ tải và đọc Swagger/OpenAPI; không gọi các endpoint nghiệp vụ cần token nên chưa xác nhận được dữ liệu runtime, phân quyền thực tế hoặc validation backend chưa mô tả.
