# Danh mục tính năng và API của frontend

Tài liệu này kiểm kê code hiện có trên nhánh ref tại commit cbdce2b (27/10/2026). Phần API được đối chiếu từ các module trong src/apis và nơi gọi chúng trong src/pages và src/components.

> Các endpoint dưới đây phản ánh cách frontend đang gọi API. Tài liệu chưa đối chiếu hợp đồng với Swagger hoặc xác nhận backend đang chạy; tên trường và khả năng truy cập thực tế còn phụ thuộc backend.

## Cách frontend kết nối API

- Các đường dẫn trong bảng được ghi tương đối theo /api/v1.
- API nghiệp vụ Dolores dùng base URL trình duyệt /api/dolores/v1. Next.js rewrite đường dẫn này sang /api/v1 của host trong biến môi trường DOLORES_API_URL.
- IDaaS dùng base URL trình duyệt /api/v1; route src/pages/api/v1/[...path].page.ts chuyển tiếp đến IDaaS. Nếu IDAAS_API_IP_URL được cấu hình, proxy thử health check trước; khi host đó không khả dụng thì dùng URL local theo thứ tự IDAAS_API_LOCAL_URL, NEXT_PUBLIC_API_URL, rồi localhost mặc định.
- Phần lớn request/response được kiểm tra bằng Zod schema trong src/schema. Màn hình tải dữ liệu dùng TanStack Query; các hàm API nhận AbortSignal để hủy request khi query không còn cần thiết.
- src/lib/http.ts gắn access token vào request Dolores/IDaaS đã xác thực. Khi gặp 401, interceptor tự gọi POST /auth/refresh, cập nhật access token rồi thử lại request một lần. Login, MFA, refresh, logout, xác minh email và đổi mật khẩu lần đầu được miễn gắn Authorization.
- Proxy IDaaS giữ cookie refresh do backend trả về và loại refresh_token khỏi JSON trả về cho trình duyệt ở các phản hồi login/refresh.

## Tổng quan mức độ hoàn thiện theo vai trò

| Vai trò / khu vực | Tính năng có code | Kết nối API hiện tại |
| --- | --- | --- |
| Khách chưa đăng nhập | Trang chủ, nội dung giới thiệu | Nội dung tĩnh; không thấy gọi API nghiệp vụ |
| Xác thực | Đăng nhập, MFA, xác minh email, đổi mật khẩu lần đầu, đăng xuất | Đã nối IDaaS; refresh chạy tự động trong HTTP interceptor |
| Admin | Tổng quan, doanh nghiệp/tài khoản Owner, cửa hàng, hợp đồng, máy/kho, IoT, menu, báo cáo, thông báo/cảnh báo | Đã nối API đọc/ghi theo các mục bên dưới |
| Moderator | Tổng quan, khách hàng, hợp đồng, máy/kho, IoT, xử lý kỹ thuật, hóa đơn/chứng từ, menu, cảnh báo, xem chi tiết thu mua | Đã nối một phần theo từng màn hình; tạo work order và danh sách buyback hiện chưa được nối |
| Customer / Owner | Tổng quan, hợp đồng, máy/Smart IoT, menu, hóa đơn/chứng từ, hỗ trợ, thông báo | Đã nối các API đọc, heartbeat và telemetry points cho máy Smart IoT trong scope Owner, gửi yêu cầu sửa chữa, lưu menu cục bộ và nộp chứng từ thanh toán. Một số luồng buyback/refund/reminder chỉ là giao diện chưa hoạt động |
| Technician | Danh sách công việc, lịch sử và các biểu mẫu thao tác | Màn hình/route có code nhưng dữ liệu và thao tác đang disabled/chưa khả dụng; ngoài đăng xuất chưa thấy API nghiệp vụ được gọi |

## Tính năng theo vai trò

### Admin

- **Tổng quan và báo cáo:** lấy số liệu tổng quan; báo cáo có thể truy vấn theo cặp ngày bắt đầu/kết thúc và lấy danh sách hóa đơn.
- **Doanh nghiệp / Owner:** đọc danh sách user theo role, mở thông tin tài khoản và tải hợp đồng của Owner theo trang.
- **Cửa hàng:** tổng hợp Owner và các địa điểm; xem địa điểm, xem hồ sơ Owner và tạo địa điểm mới.
- **Hợp đồng:** đọc danh sách, tạo hợp đồng, xem chi tiết/trạng thái hết hạn/tài liệu, tải tài liệu và xem lịch sử hợp đồng theo máy.
- **Máy và kho:** đọc máy/kho và tổng hợp tồn kho, tạo máy, xem chi tiết/lịch bảo trì, heartbeat và telemetry points cho Smart IoT; hồ sơ máy có liên kết tới aggregate operational overview theo khoảng ngày.
- **IoT:** chọn Owner rồi đọc profile, máy, hợp đồng và địa điểm liên quan.
- **Menu:** xem công thức toàn cục và phát hành công thức toàn cục.
- **Thông báo:** đọc thông báo/cảnh báo và đánh dấu thông báo đã đọc.

### Moderator

- **Tổng quan:** dùng API overview chung.
- **Khách hàng:** đọc/tìm trang danh sách profile, xem profile và tạo tài khoản Owner; màn tạo tài khoản hiển thị mật khẩu tạm thời và trạng thái gửi email từ phản hồi API.
- **Hợp đồng:** đọc danh sách/chi tiết/tài liệu và tạo hợp đồng bằng form dùng chung với Admin.
- **Máy và IoT:** đọc kho, máy, lịch bảo trì, ticket, địa điểm và heartbeat. Moderator không gọi telemetry-points vì Swagger không cấp quyền role này; trang chi tiết giữ vùng trạng thái quyền.
- **Kỹ thuật:** xem danh sách repair case, lịch sử maintenance ticket theo máy và chi tiết installation work order khi có ID. Nút tạo work order hiện bị disabled.
- **Hóa đơn:** đọc hóa đơn, bổ sung tên Owner và trạng thái chứng từ thanh toán, mở chi tiết, tải nội dung chứng từ.
- **Menu/cảnh báo:** đọc công thức toàn cục và cảnh báo; notification inbox riêng đọc/đếm chưa đọc/đánh dấu đã đọc.
- **Thu mua máy cũ:** chỉ màn hình chi tiết theo ID đang gọi API. Trang danh sách hiện báo chưa khả dụng.

### Customer / Owner

- **Tổng quan, hợp đồng, máy:** đọc overview, hợp đồng theo Owner, máy và chi tiết hợp đồng/máy. Từ hồ sơ máy, Owner mở operational overview theo khoảng ngày; dữ liệu là aggregate theo JWT scope.
- **Máy của tôi:** hiển thị heartbeat trên danh sách/chi tiết; Owner có telemetry history cho máy Smart IoT trong phạm vi backend trả về.
- **Menu:** đọc công thức toàn cục và menu cục bộ; có luồng POST để lưu/cập nhật menu cục bộ.
- **Hóa đơn:** đọc danh sách/chi tiết, khoản mục, chứng từ thanh toán; tải lên chứng từ gồm file, số tiền và idempotency key.
- **Hỗ trợ sửa chữa:** đọc máy để người dùng chọn máy; gửi intake sửa chữa qua API. Màn danh sách hỗ trợ đọc maintenance request và repair case.
- **Thông báo:** lọc chưa đọc, xem tổng chưa đọc, đánh dấu một hoặc tất cả đã đọc.
- **Buyback, hoàn tiền, nhắc thanh toán và một số màn gửi menu:** có descriptor/form trong workflow nhưng action đang disabled; không được xem là luồng API hoàn chỉnh.

### Technician

Các trang nhiệm vụ, lịch sử, notification và form được dựng dưới dạng descriptor. Form, bộ lọc và thao tác gửi kết quả đang disabled với thông báo dữ liệu/chức năng chưa khả dụng. Chưa thấy module API công việc được gọi từ technician-route-screens.tsx; shell chỉ gọi API logout.

## Danh mục endpoint theo nghiệp vụ

### IDaaS: xác thực và phiên

| Method | Endpoint | Cách frontend sử dụng |
| --- | --- | --- |
| POST | /auth/login | Gửi email/mật khẩu. UI phân loại phản hồi thành đăng nhập thường, yêu cầu MFA, xác minh email hoặc bắt buộc đổi mật khẩu lần đầu. |
| POST | /auth/login/mfa | Gửi thông tin thử thách MFA và mã OTP; hoàn tất đăng nhập khi mã hợp lệ. |
| POST | /auth/verify | Xác minh email bằng OTP. Sau khi xác minh thành công, UI thử đăng nhập lại bằng email/mật khẩu vừa nhập. |
| POST | /auth/resend | Gửi lại email OTP xác minh. |
| POST | /auth/first-login/password-change | Gửi challenge và mật khẩu mới; sau thành công UI đăng nhập lại bằng mật khẩu mới. |
| POST | /auth/logout | Gọi khi Admin, Moderator, Customer hoặc Technician đăng xuất. |
| POST | /auth/refresh | Interceptor gọi khi API được bảo vệ trả 401; làm mới access token rồi retry request ban đầu. Đây là request tự động, không gọi trực tiếp từ màn hình. |

### Tài khoản và profile

| Method | Endpoint | Trạng thái / cách sử dụng |
| --- | --- | --- |
| GET | /admin/users | Đang dùng để tải và phân trang danh sách Owner ở trang doanh nghiệp/cửa hàng. Query phụ thuộc màn hình, gồm role và thông tin phân trang. |
| GET | /admin/users/{userId} | Đang dùng để lấy chi tiết tài khoản Owner ở trang doanh nghiệp. |
| POST | /admin/users | Đang dùng ở màn Moderator tạo khách hàng/Owner. Payload được kiểm tra schema; phản hồi có mật khẩu tạm thời, thời hạn và trạng thái email để hiển thị dialog thành công. |
| PATCH | /admin/users/{userId} | Có API wrapper cập nhật tài khoản, nhưng chưa thấy màn hình nào gọi. |
| DELETE | /admin/users/{userId} | Có API wrapper vô hiệu hóa tài khoản, nhưng chưa thấy màn hình nào gọi. |
| POST | /admin/users/{userId}/temporary-password/reissue | Có API wrapper cấp lại mật khẩu tạm thời, nhưng chưa thấy màn hình nào gọi. |
| GET | /profiles | Đang dùng để phân trang/lọc Owner cho hợp đồng, cửa hàng, IoT; Moderator dùng để tìm danh sách khách hàng. Các query có role/status/từ khóa/page/size tùy màn hình. |
| GET | /profiles/{profileId} | Đang dùng để xem chi tiết khách hàng hoặc lấy thông tin Owner ở màn cửa hàng, IoT và hóa đơn Moderator. |
| GET | /profiles/{profileId}/contracts | Đang dùng để phân trang hợp đồng của Owner trên trang doanh nghiệp. |
| GET | /profiles/{profileId}/history | Có API wrapper nhận page/size nhưng hiện chưa thấy UI gọi. |
| GET | /tenants | Đang dùng ở màn IoT Moderator để lấy tenant rồi tải địa điểm từng tenant. |
| GET | /tenants/{tenantId} | Có API wrapper nhưng hiện chưa thấy UI gọi. |

### Tổng quan, hợp đồng và cửa hàng

| Method | Endpoint | Cách frontend sử dụng |
| --- | --- | --- |
| GET | /dashboard/overview | Dùng cho tổng quan Admin, Moderator, Owner và báo cáo Admin. Operational overview truyền `fromDate`/`toDate`; dữ liệu vẫn là aggregate theo JWT scope. Không gửi `ownerId`; Moderator không hiển thị financial metrics. |
| POST | /contracts | Tạo hợp đồng từ form dùng chung Admin/Moderator. Form tải Owner và máy trước khi gửi payload. |
| GET | /contracts | Tải danh sách hợp đồng cho Admin, Moderator và dữ liệu liên quan ở màn IoT Admin. |
| GET | /contracts/owner/{ownerId} | Tải hợp đồng của Owner đăng nhập ở Customer dashboard. |
| GET | /contracts/tenant/{tenantId} | Có API wrapper và kiểm tra tenant trả về, nhưng hiện chưa thấy UI gọi. |
| GET | /contracts/{contractId} | Xem chi tiết hợp đồng Customer, Admin hoặc Moderator. |
| GET | /contracts/{contractId}/expiry-status | Admin đọc trạng thái hết hạn trên chi tiết hợp đồng. |
| GET | /contracts/{contractId}/documents | Admin và Moderator đọc danh sách tài liệu hợp đồng. |
| GET | /contracts/{contractId}/documents/{documentId} | Admin tải file tài liệu hợp đồng dạng blob. |
| GET | /contracts/machine/{machineId}/history | Admin xem lịch sử hợp đồng gắn với máy. |
| GET | /locations?ownerId={ownerId}&activeOnly={boolean} | Admin tải địa điểm của Owner cho trang cửa hàng/IoT; Moderator lấy chi tiết địa điểm qua ID. |
| GET | /locations?tenantId={tenantId}&activeOnly=false | Moderator tải địa điểm theo từng tenant trên màn IoT; response được kiểm tra không vượt phạm vi tenant yêu cầu. |
| GET | /locations/{locationId} | Xem chi tiết địa điểm Admin hoặc địa điểm gắn với máy Moderator. |
| POST | /locations?ownerId={ownerId} | Admin tạo địa điểm cho Owner được chọn. |

### Máy, hỗ trợ, kỹ thuật và telemetry

| Method | Endpoint | Cách frontend sử dụng |
| --- | --- | --- |
| GET | /machines | Tải danh sách máy cho Customer, Admin, Moderator, IoT, hỗ trợ và các form tạo hợp đồng/sửa chữa. |
| POST | /machines | Admin tạo máy mới. |
| GET | /machines/{machineId} | Xem chi tiết máy ở Customer, Admin, Moderator và IoT Moderator. |
| GET | /inventory/summary | Đọc số liệu tổng hợp kho ở Admin và Moderator. |
| GET | /machines/{machineId}/maintenance-schedule | Đọc lịch bảo trì trong hồ sơ máy theo role. |
| GET | /maintenance-tickets | Moderator xem ticket bảo trì; có thể lọc theo máy ở màn lịch sử ticket. |
| GET | /maintenance-requests | Customer đọc danh sách yêu cầu bảo trì tại màn hỗ trợ. |
| GET | /repair-cases | Customer xem tình trạng repair case; Moderator xem danh sách case kỹ thuật. |
| POST | /repair-cases/intakes | Customer gửi yêu cầu sửa chữa: chọn máy, nhập mô tả lỗi tối đa 4.000 ký tự. Gửi machineId, issueDescription và idempotency key do frontend tạo để hạn chế gửi trùng. |
| GET | /installation-work-orders?tenantId={tenantId} | Có wrapper đọc danh sách work order theo tenant nhưng hiện chưa thấy UI gọi. |
| GET | /installation-work-orders/{workOrderId} | Moderator tải chi tiết work order khi mở route có ID hợp lệ. |
| GET | /telemetry-query/machines/{machineId}/heartbeats/latest | Lấy heartbeat mới nhất cho máy Smart IoT trên danh sách/chi tiết của Owner, Admin và Moderator. |
| GET | /telemetry-query/machines/{machineId}/points | Owner/Admin đọc telemetry theo range, phân trang limit=100 và offset. Moderator không gửi request này theo quyền Swagger hiện tại. |

### Công thức menu

| Method | Endpoint | Cách frontend sử dụng |
| --- | --- | --- |
| GET | /recipes/global | Tải công thức dùng chung cho Admin, Moderator và Customer. |
| GET | /recipes/global/{recipeId} | Đọc chi tiết công thức toàn cục trong màn menu Admin/Moderator/Customer. |
| POST | /recipes/global | Admin phát hành công thức toàn cục từ form. |
| GET | /recipes/local | Customer đọc menu/công thức riêng của cửa hàng. |
| POST | /recipes/local | Customer lưu hoặc cập nhật công thức cục bộ. |
| GET | /recipes/local/{recipeId} | Có API wrapper đọc công thức cục bộ theo ID nhưng hiện chưa thấy UI gọi. |
| DELETE | /recipes/local/{recipeId} | Có API wrapper xóa công thức cục bộ nhưng hiện chưa thấy UI gọi. |

### Hóa đơn và chứng từ thanh toán

| Method | Endpoint | Cách frontend sử dụng |
| --- | --- | --- |
| GET | /billing/invoices | Customer đọc hóa đơn; Moderator tải danh sách hóa đơn; Admin dùng danh sách hóa đơn trong báo cáo. |
| GET | /billing/invoices/{invoiceId} | Customer và Moderator mở chi tiết hóa đơn. |
| GET | /billing/invoices/{invoiceId}/line-items | Customer tải các khoản mục của hóa đơn. |
| GET | /billing/invoices/{invoiceId}/payment-proofs | Customer/Moderator đọc chứng từ đã gửi; danh sách Moderator cũng tải tóm tắt chứng từ cho từng hóa đơn. |
| POST | /billing/invoices/{invoiceId}/payment-proofs?amount={amount} | Customer nộp file chứng từ dạng multipart. Request kèm header Idempotency-Key; frontend yêu cầu số tiền dương và file không rỗng. |
| GET | /billing/payment-proofs/{proofId}/content | Moderator tải nội dung file chứng từ dạng blob về máy. |

### Thông báo, cảnh báo và thu mua

| Method | Endpoint | Cách frontend sử dụng |
| --- | --- | --- |
| GET | /notifications | Tải inbox Customer/Moderator/Admin. Customer có thể thêm query unreadOnly=true để lọc chưa đọc. |
| GET | /notifications/unread-count | Đếm thông báo chưa đọc cho Customer và Moderator. |
| POST | /notifications/{notificationId}/read | Đánh dấu một thông báo đã đọc; được gọi từ các inbox đã nối. |
| POST | /notifications/read-all | Customer đánh dấu tất cả đã đọc. |
| GET | /alerts | Tải cảnh báo ở trang alerts Moderator và khu thông báo Admin. |
| GET | /buybacks/{buybackId} | Moderator xem chi tiết hồ sơ thu mua theo ID. API wrapper kiểm tra ID trong response trùng với ID yêu cầu. |

## API wrapper hiện có nhưng chưa được nối vào màn hình

Đây là những hàm đã có trong src/apis, nhưng tìm kiếm call site ở src/pages và src/components không thấy màn hình gọi tại snapshot được kiểm kê:

| Module | Endpoint | Ghi chú |
| --- | --- | --- |
| Admin users | PATCH /admin/users/{userId} | Chưa có luồng UI cập nhật tài khoản trong các call site hiện tại. |
| Admin users | DELETE /admin/users/{userId} | Chưa có luồng UI vô hiệu hóa tài khoản. |
| Admin users | POST /admin/users/{userId}/temporary-password/reissue | Chưa có luồng UI cấp lại mật khẩu tạm thời. |
| Profiles | GET /profiles/{profileId}/history | Wrapper đã có phân trang, chưa có màn hình gọi. |
| Tenants | GET /tenants/{tenantId} | Wrapper đọc chi tiết tenant, chưa có màn hình gọi. |
| Contracts | GET /contracts/tenant/{tenantId} | Wrapper đọc hợp đồng theo tenant, chưa có màn hình gọi. |
| Recipes | GET /recipes/local/{recipeId} | Chưa có màn chi tiết công thức cục bộ dùng endpoint này. |
| Recipes | DELETE /recipes/local/{recipeId} | Chưa có thao tác xóa công thức cục bộ nối API. |
| Installation work orders | GET /installation-work-orders?tenantId={tenantId} | Wrapper đọc danh sách theo tenant chưa được màn kỹ thuật gọi; màn chi tiết hiện tải theo ID. |

## Màn hình có giao diện nhưng chưa phải luồng API hoàn chỉnh

- Các màn workflow Customer về buyback, hoàn tiền, nhắc thanh toán, báo vấn đề chứng từ và một số thao tác menu có descriptor/UI nhưng action đang disabled. Không có call site đến buybacksApi từ Customer.
- Moderator buyback chỉ đọc chi tiết theo ID; danh sách hồ sơ đang hiển thị trạng thái chưa khả dụng, và chưa có API tạo/cập nhật/thanh toán trong buybacks.api.ts.
- Moderator technical đọc repair cases, maintenance tickets và work order detail; nút tạo work order đang disabled. Chưa thấy API POST tạo installation work order.
- Các biểu mẫu nhiệm vụ Technician hiện disabled và chưa dùng API cho nhận việc, cập nhật trạng thái, gửi kết quả hoặc tải lịch sử.
- Một số trang có liên kết/menu được khai báo nhưng không đồng nghĩa toàn bộ thao tác nghiệp vụ đã nối API. Hãy đối chiếu cột trạng thái và mục endpoint wrapper trước khi kết luận chức năng đã hoàn tất.

## File nguồn để kiểm tra

- API clients: [src/apis](../src/apis)
- HTTP client, token refresh và base URL: [src/lib/http.ts](../src/lib/http.ts)
- Proxy IDaaS: [src/pages/api/v1/[...path].page.ts](../src/pages/api/v1/%5B...path%5D.page.ts)
- Rewrite Dolores: [next.config.js](../next.config.js)
- Schema xác thực dữ liệu: [src/schema](../src/schema)
- Màn hình theo role: [src/pages/admin](../src/pages/admin), [src/pages/moderator](../src/pages/moderator), [src/pages/dashboard](../src/pages/dashboard), [src/pages/technician](../src/pages/technician)
