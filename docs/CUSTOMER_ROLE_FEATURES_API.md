# Rà soát tính năng và API của Customer (Owner)

Ngày rà soát: 29/10/2026. Tài liệu dựa trên code trong workspace, Swagger Dolores local Docker tại http://localhost:8082/v3/api-docs, Swagger Dolores server tại http://100.75.202.72:8082/v3/api-docs và Swagger IDaaS tại http://localhost:4000/swagger/doc.json, http://100.75.202.72:4000/swagger/doc.json.

## 1. Tình trạng cập nhật nhánh

- Đã fetch và chạy pull fast-forward cho branch ref; kết quả là Already up to date. Không có commit mới từ origin/ref trong lần kiểm tra này.
- Workspace đang ở commit 7f85e54, origin/ref đang ở b493e8c; local ahead 2 commit, không bị behind. Worktree có các file sửa đổi và file chưa commit từ công việc trước; không reset hoặc ghi đè các file đó.
- Không có thay đổi mới từ remote trên ref để cập nhật tài liệu Admin hoặc Moderator. Vì vậy tài liệu này tập trung vào Customer/Owner.
- Swagger Dolores local có 276 operation/237 path; server có 274 operation/235 path. Hai operation chỉ có ở local là POST /dev/v1/brew-records, POST /api/v1/notifications/installations và DELETE /api/v1/notifications/installations/{installationId}. Server-only là POST /api/v1/installation-checklist-templates. Các endpoint Customer được rà soát trong tài liệu có ở cả hai Swagger và có cùng DTO chính.
- Swagger IDaaS local và server đều có 23 operation/20 path; cả hai đều không công bố POST /auth/logout.

## 2. Phạm vi role và cấu trúc màn hình

Frontend gọi role này là Customer; JWT/backend gọi chủ thể nghiệp vụ là OWNER. Route gốc là /dashboard, được xử lý bởi dynamic page src/pages/dashboard/[[...sections]].page.tsx. Sidebar có tám mục:

| Mục điều hướng | Route | Trạng thái code |
| --- | --- | --- |
| Tổng quan | /dashboard | Có API và màn hình |
| Hợp đồng | /dashboard/contracts | Có danh sách và chi tiết đọc |
| Máy của tôi | /dashboard/machines | Có danh sách và chi tiết đọc |
| Menu của tôi | /dashboard/menu | Có danh sách/chi tiết công thức; có lưu cấu hình cục bộ |
| Hóa đơn | /dashboard/invoices | Có danh sách, chi tiết và gửi chứng từ thanh toán |
| Yêu cầu hỗ trợ | /dashboard/support | Có danh sách yêu cầu sửa chữa và gửi intake sửa chữa |
| Thu mua máy cũ | /dashboard/buyback | Route có giao diện, hiện chưa nối API Customer |
| Thông báo | /dashboard/notifications | Có danh sách, lọc chưa đọc, đánh dấu đã đọc |

CustomerShell đọc cookie access_token, giải mã claim roles ở trình duyệt và chỉ cho vào khu vực khi có OWNER, không đồng thời có TECHNICIAN. Đây là chặn điều hướng phía frontend, không phải kiểm soát bảo mật. API backend vẫn phải xác thực Bearer token, role và phạm vi dữ liệu cho từng endpoint.

Riêng danh sách hợp đồng, frontend lấy claim sub từ access token, kiểm tra sub là UUID theo ProfileIdSchema rồi dùng nó làm ownerId trên URL. Vì thế việc tải danh sách cần IDaaS sub trùng với Profile ID mà Dolores nhận diện. Nếu thiếu token, token không giải mã được, role không hợp lệ hoặc sub không phải UUID, trang sẽ chuyển về login hoặc hiển thị lỗi không có định danh.

## 3. Cấu hình API và xác thực hiện tại

### 3.1 Cách website gọi API

- src/lib/http.ts tạo Axios client với base URL IDaaS là /api/v1, timeout 10 giây và withCredentials bật.
- API Dolores dùng base URL phía trình duyệt /api/dolores/v1. Next proxy tại src/pages/api/dolores/v1/[...path].page.ts thêm /api/v1 rồi chuyển tiếp tới Dolores.
- IDaaS được proxy qua src/pages/api/v1/[...path].page.ts.
- Request xác thực gắn Authorization: Bearer <access_token> từ cookie access_token. Các route đăng nhập, MFA, refresh, logout, xác minh email và đổi mật khẩu lần đầu nằm trong danh sách không tự gắn Authorization.
- Khi API trả 401, Axios gọi POST /auth/refresh; nếu refresh thành công, client cập nhật access_token và thử request ban đầu thêm một lần. Nếu refresh bị 401/403, cookie bị xóa và trình duyệt chuyển về trang đăng nhập.
- Các query dữ liệu dùng TanStack Query và truyền AbortSignal; một số thao tác ghi làm mới cache liên quan sau khi thành công.

### 3.2 Chọn backend local/server

Các biến mẫu nằm trong .env.example:

| Biến | Ý nghĩa |
| --- | --- |
| IDAAS_API_IP_URL | Gốc API IDaaS từ xa, ví dụ có phần /api/v1 |
| IDAAS_API_LOCAL_URL | Gốc API IDaaS local; mặc định http://localhost:4000/api/v1 |
| DOLORES_API_IP_URL | Origin Dolores từ xa, không thêm /api/v1 |
| DOLORES_API_URL | Biến Dolores remote cũ, chỉ dùng khi DOLORES_API_IP_URL chưa được đặt |
| DOLORES_API_LOCAL_URL | Origin Dolores Docker local; mặc định http://localhost:8082 |
| IDAAS_REFRESH_COOKIE_PATH | Path cookie refresh; mẫu là /api/v1/auth |

src/lib/server/backend-api-selection.ts chỉ chọn remote khi cả hai URL remote được cấu hình và health check IDaaS /health cùng Dolores /actuator/health đều trả HTTP dưới 500. Hai backend được chọn cùng một môi trường để tránh ghép IDaaS và Dolores có JWT signing key khác nhau. Nếu một check lỗi, cặp local được dùng. Lựa chọn được cache 5 giây.

Dolores proxy có timeout 15 giây và giới hạn request body 10 MiB. Nếu đang dùng remote mà kết nối bị rớt sau health check, proxy chỉ thử lại local cho GET/HEAD; không gửi lại POST/PUT/PATCH/DELETE vì có thể tạo thao tác trùng. Cấu hình local dùng cho Docker trên máy phát triển của website; app Flutter native phải gọi host/IP mà thiết bị hoặc emulator truy cập được, không mặc định localhost trên điện thoại.

### 3.3 Quy tắc auth và scope cho Flutter

- Website có thể dùng Next proxy; Flutter native nên cấu hình trực tiếp origin IDaaS và Dolores theo môi trường, ví dụ host Docker trên LAN, sau đó gọi route dưới /api/v1.
- Request Dolores được xác thực cần gửi Bearer access token. Flutter không nên phụ thuộc vào cookie access_token hay route proxy của Next.
- Flutter phải quản lý vòng đời access/refresh token theo hợp đồng IDaaS và lưu token trong vùng lưu trữ an toàn của nền tảng. Swagger hiện chỉ xác nhận endpoint refresh; tài liệu này không giả định định dạng hoặc cách dùng refresh token ngoài hợp đồng đang có.
- Các API có ownerId hoặc hỗ trợ bộ lọc ownerId không đồng nghĩa client được tự quyết định scope. Backend phải xác minh người gọi được phép đọc ownerId đó; những endpoint không truyền ownerId cần tự suy ra phạm vi từ JWT.

## 4. Tính năng đang gọi API

Các đường dẫn dưới đây là path API Dolores, tính từ /api/v1; IDaaS được ghi rõ khi khác.

| Tính năng | Endpoint | Cách frontend dùng và điều kiện |
| --- | --- | --- |
| Tổng quan Owner | GET /dashboard/overview | Gọi khi mở /dashboard. Không truyền khoảng ngày; hiển thị tổng hợp hợp đồng, máy, số ly, ticket bảo trì và các số liệu tài chính theo response. Wrapper cho phép fromDate/toDate nhưng bắt buộc truyền cùng nhau; khoảng hợp lệ phải là ngày lịch, không vượt quá hôm nay và tối đa 90 ngày. Trang hiện chưa có date picker. |
| Hợp đồng của Owner | GET /contracts/owner/{ownerId} | Gọi ở /dashboard/contracts sau khi sub trong JWT được xác nhận là UUID. Không truyền status/page/size. Swagger cho phép status, page, size; frontend hiện tải danh sách rồi phân trang phía client 20 dòng/lần. |
| Máy cho danh sách hợp đồng | GET /machines | Gọi cùng danh sách hợp đồng để bổ sung serial và loại máy. Frontend không gửi ownerId hay page/size dù Swagger hỗ trợ các query này; cần backend giới hạn response theo role/người gọi. |
| Chi tiết hợp đồng | GET /contracts/{id} | Gọi tại /dashboard/contracts/{uuid}. ID phải là UUID. Frontend hiển thị mã, máy, trạng thái, ngày, phí thuê và tiền cọc. Việc người gọi có quyền trên hợp đồng phải được backend kiểm tra. |
| Danh sách máy Owner | GET /machines | Gọi ở /dashboard/machines. Không gửi ownerId, status, page hoặc size. Màn hình hiển thị serial, status, type và liên kết chi tiết. |
| Chi tiết máy Owner | GET /machines/{id} | Gọi tại /dashboard/machines/{uuid}; UUID được xác thực trong API wrapper và ID trả về phải khớp ID yêu cầu. Hiển thị tình trạng, loại, vùng, ngày triển khai, kết thúc hợp đồng và lịch bảo trì kế tiếp nếu response có. |
| Công thức chung | GET /recipes/global | Gọi ở /dashboard/menu để dựng danh sách. Swagger hỗ trợ q/page/size nhưng frontend không truyền bộ lọc hoặc phân trang. |
| Công thức cục bộ của Owner | GET /recipes/local | Gọi ở /dashboard/menu cùng danh sách công thức chung để hiển thị cấu hình ghi đè. Không truyền globalRecipeId/page/size. Backend cần trả dữ liệu trong phạm vi Owner đăng nhập. |
| Chi tiết công thức chung | GET /recipes/global/{id} | Gọi tại /dashboard/menu/{uuid}; hiển thị tên, bước pha, giới hạn định lượng và override cục bộ tương ứng nếu có. |
| Lưu cấu hình công thức cục bộ | POST /recipes/local | Form /dashboard/menu/add-dish gửi globalRecipeId và dosageOverrides dạng danh sách chuỗi; backend có thể nhận id và ownerId tùy chọn nhưng frontend không gửi. Cần chọn công thức chung và nhập ít nhất một dòng override. Owner được suy ra/ủy quyền phía server. |
| Danh sách yêu cầu hỗ trợ | GET /maintenance-requests | Gọi khi mở /dashboard/support; không truyền requestType/status/ownerId/page/size. Frontend lọc response ở client, chỉ giữ requestType=REPAIR. Swagger mô tả danh sách trong phạm vi được phép của người gọi. |
| Danh sách máy cho form sửa chữa | GET /machines | Gọi ở /dashboard/support và /dashboard/support/new để tạo nhãn máy/chọn máy. Request không truyền ownerId; cần backend scope theo token. |
| Trạng thái Repair Case liên quan | GET /repair-cases | Chỉ gọi sau khi danh sách maintenance request tải thành công. Frontend ghép theo maintenanceRequestId để ưu tiên hiển thị trạng thái repair case. |
| Gửi intake sửa chữa | POST /repair-cases/intakes | Form /dashboard/support/new gửi machineId, issueDescription và idempotencyKey; evidenceReference là tùy chọn nhưng UI hiện không gửi. Cần chọn máy thuộc phạm vi Owner, mô tả không rỗng và không quá 4.000 ký tự. Idempotency key được giữ lại khi retry cùng dữ liệu và đổi khi người dùng sửa form. Endpoint Swagger mô tả là Owner báo sự cố máy. |
| Danh sách thông báo | GET /notifications | Gọi tại /dashboard/notifications. Khi chọn “Chưa đọc”, truyền unreadOnly=true; khi chọn “Tất cả”, bỏ query này. ownerId/page/size không được frontend truyền; yêu cầu backend tự scope theo caller. |
| Số thông báo chưa đọc | GET /notifications/unread-count | Hiển thị số đếm trong hộp thư thông báo; frontend không truyền ownerId. |
| Đánh dấu một thông báo đã đọc | POST /notifications/{id}/read | Chỉ hiện hành động với item chưa đọc. ID phải là UUID; frontend kiểm tra response có đúng ID và read=true rồi làm mới query list/count. |
| Đánh dấu tất cả đã đọc | POST /notifications/read-all | Nút bị disable nếu đang xử lý hoặc unreadCount=0. Sau khi thành công, frontend làm mới list và unread count. |
| Đăng xuất | POST /auth/logout trên IDaaS | CustomerShell gọi endpoint này, sau đó luôn xóa cookie access_token ở trình duyệt và điều hướng về login kể cả khi request lỗi. Endpoint này không xuất hiện trong Swagger IDaaS local/server hiện tại, nên cần xác nhận route logout với backend. |

### 4.1 Điều kiện và giới hạn của gửi chứng từ thanh toán

Form gửi chứng từ được gắn trực tiếp trong chi tiết hóa đơn tại /dashboard/invoices/{invoiceId}, không phải trong các route payment tĩnh. Endpoint:

- POST /billing/invoices/{invoiceId}/payment-proofs
- Query bắt buộc: amount, số dương.
- Header bắt buộc: Idempotency-Key.
- Multipart bắt buộc: file.
- Wrapper kiểm tra invoiceId là UUID, amount là số hữu hạn lớn hơn 0, file có dung lượng lớn hơn 0 và idempotency key không rỗng.
- Trình duyệt giới hạn lựa chọn PDF/JPG/JPEG/PNG. Proxy giới hạn tổng request body 10 MiB; giới hạn nghiệp vụ khác về định dạng/kích thước phải do backend áp dụng.
- Idempotency key được giữ khi retry cùng dữ liệu; thay đổi amount hoặc file sẽ tạo key mới.

Các request đọc ở chi tiết hóa đơn gọi thêm GET /billing/invoices/{invoiceId}, GET /billing/invoices/{invoiceId}/line-items và GET /billing/invoices/{invoiceId}/payment-proofs. UI hiện không truyền filter status/page/size. Phân trang ở route list chưa có; route /dashboard/invoices/{YYYY-MM} lọc invoice.period ở client; /dashboard/invoices/standard cũng đang dùng cùng danh sách, không truyền type=STANDARD.

## 5. Route có giao diện nhưng chưa nối nghiệp vụ

Các route này được router chấp nhận nhưng workflow chỉ hiển thị thông tin chưa khả dụng, các field/action dạng mẫu bị disable hoặc chỉ có link điều hướng. Việc có endpoint tương ứng trong Swagger không có nghĩa frontend Customer đã gọi endpoint đó.

| Route/nhóm | Tình trạng hiện tại |
| --- | --- |
| /dashboard/contracts/new, /contracts/expiry, /contracts/end-early, /contracts/end, /contracts/deposit-complete và các workflow hợp đồng khác | Chưa có thao tác hợp đồng Customer hoạt động. Không gọi tạo hợp đồng, gia hạn, chấm dứt hoặc quyết toán từ các màn này. |
| /dashboard/machines/history, /machines/substitute, /machines/{id}/model | Chưa có trang lịch sử bảo trì, đổi máy hoặc model hoạt động. Endpoint lịch sử/schedule có thể có trong Swagger nhưng Customer page chưa gọi chúng. |
| /dashboard/invoices/payment, /shortfall, /refund, /reminder, /standard-payment | Các route workflow riêng chưa hoạt động. Chứng từ thanh toán đang dùng form trong chi tiết hóa đơn; không có thao tác tạo nhắc thanh toán, yêu cầu hoàn tiền hoặc thanh toán bổ sung tại các route placeholder. |
| /dashboard/menu/espresso, /fresh-milk, /sent, /applied | Chưa có luồng sửa/gửi/áp dụng menu; các route workflow hiển thị trạng thái chưa khả dụng. Luồng đang ghi được là thêm cấu hình cục bộ qua /menu/add-dish. |
| /dashboard/support/menu và /support/{uuid} | Trang menu cần hỗ trợ và trang tiến độ theo yêu cầu chưa gọi detail API; danh sách hỗ trợ và intake sửa chữa vẫn dùng được. |
| /dashboard/buyback và các route documents/new/issue | Chưa gọi API Buyback từ Customer. Wrapper buybacksApi.getById tồn tại nhưng không được Customer screen sử dụng; trang Buyback hiện là placeholder. |

Customer cũng chưa gọi profilesApi, locationsApi, telemetryApi hoặc alertsApi. Không có màn hình hồ sơ tài khoản, cấu hình địa điểm, telemetry hay cảnh báo trong nhóm Customer hiện tại.

## 6. Sai khác giữa DTO Swagger và schema frontend cần xử lý

### 6.1 Danh sách công thức Menu không khớp DTO

- Swagger GET /recipes/global trả mảng GlobalRecipeSummaryResponse gồm id, name, revision, menuId.
- Frontend GlobalRecipesSchema lại yêu cầu mỗi phần tử có steps và dosageBounds. Hai trường này chỉ có trong GlobalRecipeDetailsResponse của GET /recipes/global/{id}.
- Vì vậy khi response list đúng theo Swagger, Zod parse trong recipesApi.listGlobal có thể lỗi và query danh sách Menu hiển thị thông báo tải lỗi. Chi tiết công thức theo ID có đủ trường chi tiết, nhưng người dùng khó mở vì danh sách không dựng được.
- Swagger GET /recipes/local trả LocalRecipeSummaryResponse gồm id, ownerId, globalRecipeId; LocalRecipesSchema của frontend còn yêu cầu dosageOverrides. Do đó query cấu hình cục bộ cũng có thể lỗi parse và làm màn Menu báo lỗi.

Nên tách schema list khỏi schema detail: list chỉ kiểm tra fields Swagger thực sự trả về, còn chi tiết dùng endpoint theo ID để lấy steps/dosageBounds. Với local recipes, cần endpoint detail hoặc bổ sung dosageOverrides vào response list rồi thống nhất DTO.

### 6.2 Danh sách Repair Case thiếu timeline mà schema yêu cầu

- Swagger GET /repair-cases trả RepairCaseSummaryResponse với id, maintenanceRequestId, ownerId, contractId, primaryMachineId, status, createdAt, updatedAt, closedAt.
- Frontend RepairCaseListSchema dùng RepairCaseSchema có thêm trường timeline bắt buộc dạng array.
- Response summary không có timeline nên Zod parse có thể làm query Repair Case thất bại. Màn Support không hiển thị lỗi query Repair Case riêng; sau khi query lỗi, danh sách maintenance request vẫn có thể hiện nhưng không được ghép status Repair Case.
- Nếu cần timeline thì gọi endpoint detail/timeline phù hợp theo ID ở backend; nếu chỉ cần trạng thái ở danh sách thì dùng schema summary riêng không bắt buộc timeline.

### 6.3 Hạn chế scope ở client cần xác nhận với backend

Swagger có query ownerId cho GET /billing/invoices, GET /notifications và các query scope tương tự cho một số endpoint. Frontend Customer hiện bỏ ownerId trên các request này và dựa vào quyền “current caller scope” của backend. Với GET /machines và GET /recipes/local cũng không gửi ownerId. Cần đảm bảo backend luôn áp dụng OWNER scope từ JWT và không trả dữ liệu liên tenant chỉ vì client không truyền filter.

## 7. Các lưu ý khi triển khai Flutter

1. Bản đồ màn hình có thể dùng theo tám mục sidebar ở mục 2. Cần phân biệt màn hình đã hoạt động với các route placeholder ở mục 5; hiện tại chưa thể coi Buyback, hoàn tiền, nhắc thanh toán, thay máy hay lịch sử máy là luồng có API UI hoàn chỉnh.
2. API Customer trực tiếp nên dùng gốc Dolores /api/v1. Các endpoint IDaaS dùng origin IDaaS riêng; không ghép hai môi trường local/remote khác JWT key.
3. Đăng nhập lấy access token từ IDaaS; gọi API Dolores bằng Bearer token. Backend chịu trách nhiệm scope theo owner, không tin ownerId lấy từ request của client.
4. Nếu Flutter cần danh sách công thức, sửa hợp đồng DTO trước khi dùng dữ liệu: summary hiện tại không đáp ứng GlobalRecipeSchema/LocalRecipeSchema của frontend.
5. Nếu Flutter hiển thị Repair Case, response list hiện là summary không có timeline. Không bắt buộc timeline khi parse danh sách.
6. Xác nhận route logout, chính sách refresh token, content-type upload và hạn mức/kích thước file chứng từ trực tiếp với IDaaS/Dolores; Swagger hiện không mô tả logout.
7. Nếu Customer cần lọc/phân trang lớn, API Swagger có page/size nhưng frontend hiện tải danh sách không tham số rồi xử lý một phần phía client.

## 8. File code đã rà soát

- src/pages/dashboard/customer-shell.tsx — guard Owner, sidebar và đăng xuất.
- src/pages/dashboard/[[...sections]].page.tsx — phân tích route Customer.
- src/pages/dashboard/read/customer-read-descriptor.ts và src/pages/dashboard/workflows/customer-workflow-descriptor.ts — phân loại màn hình hoạt động/chờ API.
- src/pages/dashboard/overview/overview-screen.tsx
- src/pages/dashboard/contracts/contracts-screen.tsx
- src/pages/dashboard/machines/machines-screen.tsx
- src/pages/dashboard/menu/menu-screen.tsx
- src/pages/dashboard/invoices/invoices-screen.tsx
- src/pages/dashboard/support/support-requests-list-screen.tsx
- src/pages/dashboard/workflows/repair-intake-screen.tsx
- src/pages/dashboard/workflows/local-recipe-screen.tsx
- src/pages/dashboard/workflows/notification-inbox.tsx
- src/pages/dashboard/shared/customer-screen-common.tsx
- src/routes/routes.ts và src/routes/path.ts
- src/apis/{dashboard,contracts,machines,recipes,billing,maintenance-requests,repair-cases,notifications,auth}.api.ts
- src/schema/{dashboard,contracts,machines,recipes,billing,notifications,auth}.schema.ts
- src/lib/http.ts, src/lib/auth-role.ts, src/lib/server/backend-api-selection.ts và hai route proxy API trong src/pages/api.

Đây là kiểm kê tĩnh code và hợp đồng OpenAPI. Chưa gọi API nghiệp vụ bằng một tài khoản Owner, chưa kiểm tra dữ liệu thực của tenant và chưa chạy test trong lượt rà soát này.
