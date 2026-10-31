# Rà soát tính năng và API của Admin

Tài liệu này kiểm kê phần Admin trong frontend hiện tại để làm cơ sở triển khai ứng dụng Flutter. Endpoint và điều kiện request được đối chiếu giữa API client, schema frontend và Swagger/OpenAPI tại thời điểm 29/10/2026 (xem mục 8). Swagger mô tả hợp đồng công khai; quyền Admin và quy tắc nghiệp vụ vẫn cần được backend kiểm tra khi xử lý request.

## 1. Tóm tắt

- Có 9 mục điều hướng Admin: Tổng quan, Doanh nghiệp, Cửa hàng, Hợp đồng, Máy & kho, IoT, Menu, Báo cáo và Thông báo. Màn chi tiết máy nằm dưới Máy & kho.
- Luồng Admin dùng hai dịch vụ: IDaaS cho đăng nhập và danh sách/chi tiết tài khoản; Dolores cho nghiệp vụ vận hành.
- Các trang có API đang dùng: tổng quan, danh sách Owner, cửa hàng, hợp đồng, máy/mẫu máy, dữ liệu IoT, menu toàn cục, báo cáo và thông báo/cảnh báo.
- Trang Doanh nghiệp hiện chỉ đọc danh sách và chi tiết Owner. Các API sửa, vô hiệu hóa, cấp lại mật khẩu tạm đã có wrapper nhưng chưa có nút/luồng Admin gọi chúng.
- Các thao tác chưa thấy ở Admin gồm: sửa/xóa hợp đồng, sửa/xóa máy, chỉnh sửa mẫu máy, acknowledge cảnh báo và quản lý tài khoản Admin.

## 2. Cấu trúc và quyền truy cập

### Route Admin

| Màn hình | Route |
| --- | --- |
| Tổng quan | `/admin` |
| Doanh nghiệp / Owner | `/admin/businesses` |
| Cửa hàng | `/admin/stores` |
| Hợp đồng | `/admin/contracts` |
| Danh sách máy, mẫu máy, tạo mới | `/admin/machines` |
| Chi tiết máy | `/admin/machines/{machineId}` |
| Tổng quan vận hành theo ngữ cảnh máy | `/admin/machines/{machineId}/operations` |
| IoT theo Owner | `/admin/iot` |
| Menu toàn cục | `/admin/menu` |
| Báo cáo | `/admin/reports` |
| Thông báo và cảnh báo | `/admin/notifications` |

Các trang con như tạo/chi tiết thường giữ cùng route và dùng query string `view`, `id`, `ownerId`, `page`, `status`, `fromDate`, `toDate`.

### Guard ở frontend

`AdminShell` đọc cookie `access_token`, giải mã claim `roles` ở phía trình duyệt và chỉ render khu vực Admin nếu có role `ADMIN` hoặc `ROLE_ADMIN`. Thiếu token thì chuyển tới `/login`; sai role thì hiện màn hình từ chối truy cập. Đây là chặn giao diện, không thay thế việc backend xác minh JWT và quyền trên từng endpoint.

Các request có xác thực gửi `Authorization: Bearer <access_token>`. Nếu response là 401, HTTP client gọi `POST /auth/refresh` một lần rồi thử lại request ban đầu. Khi đăng xuất, frontend gọi `POST /auth/logout`, rồi xóa cookie access token và hoàn tất luồng local kể cả khi request lỗi; endpoint logout hiện không có trong Swagger IDaaS đang chạy.

Các endpoint xác thực được dùng chung trước/sau khi vào Admin: `POST /auth/login` nhận email/mật khẩu; frontend còn gọi `POST /auth/login/mfa` để hoàn tất thử thách OTP, nhưng route này không có trong Swagger; `POST /auth/refresh` được interceptor tự gọi; `POST /auth/logout` được gọi khi thoát nhưng cũng không có trong Swagger. Sau login, frontend điều hướng token có role Admin tới `/admin`.

## 3. Cấu hình API

### Cách frontend hiện tại kết nối

| Dịch vụ | Đường dẫn trình duyệt | Đường dẫn backend thực tế |
| --- | --- | --- |
| IDaaS | `/api/v1/{endpoint}` | `{IDAAS_API_*}/api/v1/{endpoint}` |
| Dolores | `/api/dolores/v1/{endpoint}` | `{DOLORES_API_*}/api/v1/{endpoint}` |

Next.js proxy chọn cùng một môi trường cho cả hai dịch vụ: kiểm tra IDaaS `/health` và Dolores `/actuator/health`; dùng server nếu cả hai trả status dưới 500, nếu một dịch vụ không sẵn sàng thì chuyển cả cặp sang Docker local. Kết quả được cache 5 giây. Cấu hình này ở `src/lib/server/backend-api-selection.ts`.

### Biến môi trường

| Biến | Dạng giá trị | Mục đích |
| --- | --- | --- |
| `IDAAS_API_IP_URL` | `http://<server>:4000/api/v1` | API IDaaS trên server |
| `IDAAS_API_LOCAL_URL` | `http://localhost:4000/api/v1` | IDaaS trong Docker local |
| `DOLORES_API_IP_URL` | `http://<server>:8082` | Dolores trên server; chỉ origin, không thêm `/api/v1` |
| `DOLORES_API_LOCAL_URL` | `http://localhost:8082` | Dolores trong Docker local |
| `DOLORES_API_URL` | `http://<server>:8082` | Tên cũ, dùng làm remote fallback khi `DOLORES_API_IP_URL` không được đặt |
| `IDAAS_REFRESH_COOKIE_PATH` | `/api/v1/auth` | Path cookie refresh nếu backend cần path khác mặc định |

Ví dụ mẫu hiện có trong `.env.example` dùng server `100.75.202.72`, IDaaS port `4000` và Dolores port `8082`. File `.env` máy phát triển có thể khác và không nên đưa bí mật vào Flutter source hoặc Git.

### Lưu ý khi dùng cho Flutter

- Các URL `/api/v1` và `/api/dolores/v1` phía trên là đường dẫn proxy của Next.js. Flutter có thể gọi chính Next.js proxy nếu app có thể truy cập host web; nếu gọi thẳng backend thì dùng base URL IDaaS có `/api/v1` và Dolores origin rồi nối `/api/v1`.
- Cơ chế tự chọn server/local hiện nằm trong Next.js server. Flutter gọi backend trực tiếp sẽ không tự kế thừa cơ chế này; Flutter cần chọn cùng một cặp IDaaS/Dolores theo môi trường.
- `localhost` trong `.env` là từ góc nhìn tiến trình Next.js/Docker trên máy phát triển. Với app Flutter chạy trên điện thoại hoặc emulator, `localhost` là chính điện thoại/emulator; cần dùng địa chỉ máy host mà thiết bị truy cập được.
- Web frontend giữ access token trong cookie trình duyệt và dựa vào cookie refresh do proxy chuyển tiếp. Native Flutter cần có cookie jar tương thích nếu đi qua proxy, hoặc triển khai lưu trữ/refresh token theo hợp đồng backend đã xác nhận.

## 4. Tính năng và API theo màn hình

Trong các bảng dưới đây, endpoint được ghi tương đối theo base URL backend. `IDaaS` tương ứng `http://<host>:4000/api/v1`; `Dolores` tương ứng `http://<host>:8082/api/v1`.

### 4.1 Tổng quan

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/dashboard/overview` | Tải số Owner, lượng ly đã ghi nhận, ticket bảo trì và installation work order đang mở, sử dụng hằng ngày, tổng hợp tài chính. Trang tổng quan gọi không truyền ngày để nhận kỳ mặc định của backend. |

Response được kiểm tra bằng `DashboardOverviewSchema`. Màn hình hiển thị `totalOwners`, `cupsInSelectedPeriod`, `openMaintenanceTickets`, `openInstallationWorkOrders`, dữ liệu `dailyAcceptedCupUsage` và các chỉ số tài chính theo currency. Dữ liệu thiếu được hiển thị bằng dấu gạch ngang hoặc trạng thái trống.

### 4.2 Doanh nghiệp / tài khoản Owner

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | IDaaS | `/admin/users` | Danh sách Owner, `role=owner`, `page` bắt đầu từ 1, `page_size=20`; có thể gửi `q` và `status=ACTIVE\|DISABLED`. |
| GET | IDaaS | `/admin/users/{userId}` | Chi tiết Owner; chỉ gọi khi `view=detail` và `userId` là UUID hợp lệ. |
| GET | Dolores | `/profiles/{idaasUserId}/contracts` | Hợp đồng của Owner trong màn chi tiết; gọi sau khi chi tiết tài khoản tải thành công, `page` bắt đầu từ 0, `size=20`. |

Ô tìm kiếm giới hạn 100 ký tự. Lọc trạng thái và phân trang được giữ trong query string. Chi tiết hiển thị tên, email, ID, role, trạng thái, xác minh email, ngày tạo và hợp đồng của Owner.

**Chưa được nối vào màn Admin:** `PATCH /admin/users/{userId}`, `DELETE /admin/users/{userId}`, `POST /admin/users/{userId}/temporary-password/reissue`. Các wrapper này có trong `adminUsersApi`, nhưng không có call site từ trang Admin. `POST /admin/users` hiện được dùng ở luồng Moderator tạo Owner, không phải màn Admin.

Schema cập nhật tài khoản chỉ chấp nhận `status=ACTIVE`; vô hiệu hóa có wrapper riêng bằng `DELETE`.

### 4.3 Cửa hàng

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/profiles?role=OWNER&page={page}&size=100` | Lấy danh sách Owner theo các trang; trang cửa hàng tải tối đa 5 trang song song mỗi lượt để tổng hợp cửa hàng. |
| GET | IDaaS | `/admin/users?role=owner&page={page}&page_size=100` | Lấy danh sách Owner cho dropdown tạo cửa hàng. |
| GET | Dolores | `/locations?ownerId={ownerId}` | Đọc địa điểm của từng Owner; các request chạy theo nhóm tối đa 5 Owner. Có thể lọc bằng `ownerId` trên màn danh sách. |
| GET | Dolores | `/locations/{locationId}` | Chi tiết địa điểm; chỉ gọi khi route chứa UUID hợp lệ. |
| GET | Dolores | `/profiles/{idaasUserId}` | Lấy Owner gắn với địa điểm ở màn chi tiết. |
| POST | Dolores | `/locations?ownerId={ownerId}` | Tạo cửa hàng cho Owner đã chọn. |

Body tạo cửa hàng gồm `name` bắt buộc; `address`, `city`, `contactPerson`, `phoneNumber` tùy chọn. Response phải đúng schema địa điểm; nếu `ownerId` trả về khác Owner đã chọn, UI báo lỗi và chặn gửi lặp. Khi lỗi mạng không rõ request đã được ghi nhận hay chưa, UI cũng chặn gửi lặp để tránh tạo trùng.

Các giới hạn độ dài ở form UI là tên 160, địa chỉ 500, thành phố 120, người liên hệ 160 và điện thoại 40 ký tự. Schema hiện chỉ bắt buộc tên sau khi trim không rỗng. Danh sách địa điểm của mỗi Owner được kỳ vọng trả về hoàn chỉnh một lần; nếu response báo còn trang tiếp theo, schema hiện tại từ chối response thay vì phân trang địa điểm.

### 4.4 Hợp đồng

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/contracts` | Tải danh sách hợp đồng; hiện trả về dạng danh sách và UI không phân trang endpoint này. |
| GET | Dolores | `/profiles?role=OWNER&page={page}&size=100` | Tải toàn bộ Owner để hiển thị tên và chọn chủ hợp đồng; phân trang theo lô. |
| POST | Dolores | `/contracts` | Tạo hợp đồng từ form dùng chung Admin/Moderator. |
| GET | Dolores | `/contracts/{contractId}` | Chi tiết hợp đồng; gọi với UUID hợp lệ. |
| GET | Dolores | `/contracts/{contractId}/expiry-status` | Tình trạng hết hạn; chỉ tải sau khi chi tiết hợp đồng có dữ liệu. |
| GET | Dolores | `/contracts/{contractId}/documents` | Tài liệu của hợp đồng; chỉ tải sau khi chi tiết hợp đồng có dữ liệu. |
| GET | Dolores | `/contracts/{contractId}/documents/{documentId}` | Tải file blob; tên file được làm sạch trước khi lưu về máy. |
| GET | Dolores | `/contracts/machine/{machineId}/history` | Lịch sử hợp đồng theo máy; chỉ gọi trong chế độ history với machine UUID hợp lệ. |

Form tạo hợp đồng lấy Owner và máy có trạng thái `IN_WAREHOUSE`. Payload gồm `ownerId`, `machineId`, `startDate`, `endDate`, `terms`, phí thuê tháng và các khoản phí tùy chọn. Điều kiện frontend: ngày bắt đầu phải trước ngày kết thúc; phí là số hữu hạn không âm; ID Owner/máy là UUID; `terms` không rỗng.

Form gửi thêm `contractTermsSnapshot` với `policyVersion=1`, chu kỳ bảo trì 1–24 tháng, cửa sổ bảo trì 0–30 ngày, ít nhất một loại máy thay thế, trách nhiệm sửa chữa thuộc `TENANT\|COMPANY\|UNKNOWN`, hạn thanh toán 1–60 ngày, giới hạn mua lại 0–120 tháng và phương thức định giá không rỗng. `offlineLimitMinutes` nếu có phải là số nguyên dương. Form khóa sau khi tạo thành công; lỗi có kết quả không chắc chắn sẽ chặn gửi lặp.

### 4.5 Máy, kho và mẫu máy

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/inventory/summary` | Thẻ tổng số máy, trong kho, đang triển khai, đang bảo trì/tân trang/chờ kiểm định. |
| GET | Dolores | `/machines` | Danh sách máy; lọc status trên client. Trạng thái gồm `IN_WAREHOUSE`, `PENDING_ACTIVATION`, `DEPLOYED_CONTRACT_OWNER`, `DEPLOYED_STORE_OWNER`, `UNDER_MAINTENANCE`, `REFURBISHING`, `PENDING_QA`, `AVAILABLE_FOR_RENT`, `RETIRED`. |
| GET | Dolores | `/machine-models` | Danh sách mẫu máy; dùng cho tab mẫu, chi tiết mẫu và dropdown khi tạo máy. Frontend hiện tìm chi tiết trong danh sách; Swagger có thêm `GET /machine-models/{modelId}` trả về model đầy đủ, nhưng frontend chưa gọi route này. Schema danh sách hiện là summary và không đủ các trường mà Zod frontend yêu cầu; xem mục 8. |
| POST | Dolores | `/machine-models` | Tạo mẫu máy: mã, nhà sản xuất, tên hiển thị, loại máy `CONVENTIONAL\|SMART_IOT`, `specifications` dạng object JSON. |
| POST | Dolores | `/machines` | Tạo máy với serial bắt buộc, loại máy, status cố định `IN_WAREHOUSE`, `cupsServedSinceLastDescale=0`, region tùy chọn. UI chỉ tiếp tục bước gắn mẫu nếu status trả về là 200 hoặc 201. |
| POST | Dolores | `/machine-models/{modelId}/machines/{machineId}` | Gắn máy vừa tạo vào mẫu máy; body có `reason` không rỗng. Đây là bước thứ hai sau khi POST máy thành công. |
| GET | Dolores | `/machines/{machineId}` | Chi tiết máy; chỉ gọi với UUID hợp lệ. |
| GET | Dolores | `/machines/{machineId}/maintenance-schedule` | Lịch bảo trì; gọi sau khi chi tiết máy tải thành công. |

Nếu tạo máy thành công nhưng gắn mẫu thất bại, máy đã tồn tại. UI giữ lại thông tin đang gắn và cho retry bước gắn mẫu, tránh POST tạo máy lần nữa. Tạo máy bị khóa nếu chưa tải được danh sách mẫu hoặc không có mẫu nào.

**Telemetry trong chi tiết máy:**

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/telemetry-query/machines/{machineId}/heartbeats/latest` | Gọi cho máy `SMART_IOT` trong danh sách/chi tiết; trạng thái kết nối tách khỏi lifecycle status. |
| GET | Dolores | `/telemetry-query/machines/{machineId}/points?from={ISO}&to={ISO}&limit=100&offset={n}` | Chi tiết máy Admin tải sau khi chọn khoảng thời gian hợp lệ; `from < to`; phân trang 100 điểm, offset tối đa 100.000. |
| GET | Dolores | `/dashboard/overview?fromDate={date}&toDate={date}` | Route `/admin/machines/{machineId}/operations` tải aggregate theo scope toàn hệ thống; máy đang chọn chỉ là ngữ cảnh, không lọc metric theo máy. |

Trang IoT tổng hợp theo Owner; heartbeat/chart telemetry nằm trong hồ sơ máy Smart IoT. Operational overview dùng chung trình bày và calendar range, nhưng metric giữ scope toàn hệ thống Admin. Admin chưa có thao tác cập nhật status máy từ màn danh sách.

### 4.6 IoT theo Owner

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/profiles?role=OWNER&page={page}&size=20` | Danh sách Owner có phân trang để chọn hồ sơ. |
| GET | Dolores | `/profiles/{idaasUserId}` | Chi tiết Owner; chỉ gọi nếu ID là UUID hợp lệ. |
| GET | Dolores | `/machines` | Tải danh sách máy và lọc Owner ở frontend. |
| GET | Dolores | `/contracts` | Tải danh sách hợp đồng và lọc Owner ở frontend. |
| GET | Dolores | `/locations?ownerId={ownerId}` | Tải địa điểm sau khi profile Owner có dữ liệu. |

Chi tiết Owner hiển thị số cửa hàng, máy, hợp đồng đang ACTIVE có `machineTypeSnapshot=SMART_IOT`. Màn này không gọi API telemetry; bấm vào máy sẽ mở chi tiết máy. Code giả định `ownerId` trên máy/hợp đồng và `idaasUserId` của profile dùng cùng một ID.

### 4.7 Menu toàn cục

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/recipes/global` | Danh sách công thức toàn cục. |
| GET | Dolores | `/recipes/global/{recipeId}` | Chi tiết công thức đã chọn; ID phải là UUID. |
| POST | Dolores | `/recipes/global` | Phát hành công thức từ form Admin. |

Body gồm `name` tối đa 160 ký tự, ít nhất một bước pha không rỗng và ít nhất một dòng dosage bound. Sau khi publish, query danh sách được làm mới. Trang hiện chỉ đọc chi tiết; UI ghi rõ chưa có chỉnh sửa và không có nút xóa.

### 4.8 Báo cáo

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/dashboard/overview?fromDate={date}&toDate={date}` | Chỉ bật query khi range hợp lệ; hai query param phải cùng có hoặc cùng vắng mặt. |
| GET | Dolores | `/billing/invoices` | Lấy danh sách hóa đơn; UI lọc client-side `type=RENTAL`. Endpoint này hiện không nhận khoảng ngày từ màn báo cáo. |

Ngày dùng định dạng `YYYY-MM-DD`; `fromDate <= toDate`; ngày kết thúc không ở tương lai theo UTC; khoảng tối đa 90 ngày. Bỏ lọc ngày sẽ dùng kỳ mặc định của endpoint overview. Bảng hóa đơn hiển thị period, Owner, contract, số tiền, status, ngày tạo hoặc hạn thanh toán.

### 4.9 Thông báo và cảnh báo

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| GET | Dolores | `/notifications` | Inbox thông báo Admin. |
| POST | Dolores | `/notifications/{notificationId}/read` | Đánh dấu một thông báo đã đọc; nút bị khóa nếu đã đọc hoặc request đang chạy. Response phải cùng ID và xác nhận `read=true`. |
| GET | Dolores | `/alerts` | Danh sách cảnh báo; trang hiện chỉ đọc, không acknowledge/resolve. |

`GET /notifications/unread-count` và `POST /notifications/read-all` có API wrapper nhưng trang Admin hiện không gọi.

### 4.10 Đăng xuất

| Method | Base | Endpoint | Cách dùng / điều kiện |
| --- | --- | --- | --- |
| POST | IDaaS | `/auth/logout` | Frontend gọi khi Admin chọn đăng xuất, rồi xóa token local và chuyển về `/login` qua animation; vẫn đăng xuất local nếu request thất bại. Route này hiện không xuất hiện trong Swagger IDaaS. |

## 5. Điều kiện dữ liệu chung cần giữ khi làm Flutter

- UUID: ID Owner, cửa hàng, hợp đồng, máy, mẫu máy, thông báo phải theo format UUID trước khi gọi các wrapper tương ứng.
- Phân trang IDaaS `admin/users`: `page` bắt đầu từ 1; profile/Owner của Dolores dùng `page` bắt đầu từ 0. Không dùng chung một helper phân trang nếu chưa chuẩn hóa.
- Danh sách Owner: Admin dùng hai nguồn khác nhau tùy màn (`/admin/users` IDaaS hoặc `/profiles` Dolores). Các ID nối sang dữ liệu Dolores phải khớp.
- Request/response đang được kiểm tra bằng Zod. Flutter cần đối chiếu response schema nếu định dùng DTO/model riêng; endpoint HTTP thành công nhưng JSON sai shape vẫn làm frontend báo lỗi parse.
- Các danh sách hiện có thể tải toàn bộ Owner, hợp đồng hoặc máy rồi lọc trên client; Flutter cần xác nhận backend pagination/filter hỗ trợ trước khi giữ nguyên cách tải này khi dữ liệu tăng.

## 6. API đã có wrapper nhưng chưa phải tính năng Admin

| Wrapper | Endpoint | Tình trạng trong UI Admin |
| --- | --- | --- |
| `adminUsersApi.create` | `POST /admin/users` | Được gọi ở luồng tạo Owner của Moderator; Admin chưa có form tạo tài khoản. |
| `adminUsersApi.update` | `PATCH /admin/users/{userId}` | Không tìm thấy call site trong trang Admin. |
| `adminUsersApi.disable` | `DELETE /admin/users/{userId}` | Không tìm thấy call site trong trang Admin. |
| `adminUsersApi.reissueTemporaryPassword` | `POST /admin/users/{userId}/temporary-password/reissue` | Không tìm thấy call site trong trang Admin. |
| `machinesApi.markReady` | `POST /inventory/machines/{machineId}/readiness` | Không thấy thao tác “đưa vào sẵn sàng” trên màn Admin hiện tại. |
| `notificationsApi.unreadCount` | `GET /notifications/unread-count` | Không được trang Admin gọi. |
| `notificationsApi.markAllAsRead` | `POST /notifications/read-all` | Không được trang Admin gọi. |

## 7. Source đã rà soát

- Route, menu, quyền: `src/pages/admin`, `src/pages/admin/menu/admin-menu.tsx`, `src/routes/path.ts`, `src/routes/routes.ts`, `src/lib/auth-role.ts`.
- API wrappers: `src/apis/admin-users.api.ts`, `auth.api.ts`, `dashboard.api.ts`, `profiles.api.ts`, `locations.api.ts`, `contracts.api.ts`, `machines.api.ts`, `machine-models.api.ts`, `telemetry.api.ts`, `recipes.api.ts`, `billing.api.ts`, `notifications.api.ts`.
- HTTP và proxy: `src/lib/http.ts`, `src/lib/server/backend-api-selection.ts`, `src/pages/api/v1/[...path].page.ts`, `src/pages/api/dolores/v1/[...path].page.ts`.
- Quy tắc dữ liệu: `src/schema/admin-users.schema.ts`, `dashboard.schema.ts`, `contracts.schema.ts`, `machines.schema.ts`, `machine-models.schema.ts`, `locations.schema.ts`, `recipes.schema.ts`, `telemetry.schema.ts`.

## 8. Đối chiếu với Swagger/OpenAPI đang chạy

### Nguồn và phạm vi kiểm tra

Đã tải trực tiếp các JSON spec chỉ đọc vào ngày 29/10/2026:

| Dịch vụ | Swagger/OpenAPI local | Swagger/OpenAPI server | Kết quả |
| --- | --- | --- | --- |
| Dolores | [`localhost:8082/v3/api-docs`](http://localhost:8082/v3/api-docs) | [`100.75.202.72:8082/v3/api-docs`](http://100.75.202.72:8082/v3/api-docs) | Local có 276 operation, server có 273. Server không có 3 operation chỉ thấy ở local: `POST /dev/v1/brew-records`, `POST /api/v1/notifications/installations`, `DELETE /api/v1/notifications/installations/{installationId}`. Không operation nào trong ba mục này được màn Admin hiện tại gọi. |
| IDaaS | [`localhost:4000/swagger/doc.json`](http://localhost:4000/swagger/doc.json) | [`100.75.202.72:4000/swagger/doc.json`](http://100.75.202.72:4000/swagger/doc.json) | Cả hai spec giống nhau, có 23 operation. Base path trong spec là `/api/v1`. |

Phạm vi so sánh là route, method, query/path parameter và schema request/response mà Admin hiện dùng hoặc có wrapper chung. Đây là so sánh tài liệu hợp đồng, không gửi request nghiệp vụ có xác thực; vì vậy không xác nhận được dữ liệu runtime, quyền thực tế, hay các validation backend chưa được mô tả.

### Endpoint frontend gọi và tình trạng trong spec

| Nhóm | Đối chiếu |
| --- | --- |
| Xác thực dùng chung | `POST /auth/login`, `POST /auth/refresh` và `POST /auth/first-login/password-change` có trong IDaaS spec. Login request cần email/password; refresh nhận refresh cookie; đổi mật khẩu lần đầu cần `challenge` và `new_password`, khớp validator frontend. Login response là object tổng quát nên không xác minh được các nhánh token/MFA/challenge. `POST /auth/login/mfa` và `POST /auth/logout` frontend gọi nhưng không có trong spec. |
| Dashboard | `GET /dashboard/overview` có trong spec. Swagger khai báo `fromDate` và `toDate` là query tùy chọn; frontend yêu cầu gửi cả cặp hoặc bỏ cả hai. Quy tắc cặp này hiện chỉ thấy ở frontend, chưa được biểu đạt trong spec. |
| Owner và hồ sơ | `GET /admin/users`, `GET /admin/users/{id}`, `GET /profiles`, `GET /profiles/{idaasUserId}`, `GET /profiles/{idaasUserId}/contracts` đều có. IDaaS list hỗ trợ `page`, `page_size`, `role`, `status`, `q`; profile Dolores trả page có `items/page/size/totalElements/totalPages`, khớp schema frontend. |
| Cửa hàng | `GET /locations`, `GET /locations/{id}`, `POST /locations` đều có. Swagger yêu cầu query `ownerId` cho list và create; body create có schema `StoreLocationRequest`, nhưng spec không đánh dấu trường nào bắt buộc dù form frontend bắt buộc `name`. |
| Hợp đồng | Các route Admin gọi (`GET/POST /contracts`, `GET /contracts/{id}`, `/expiry-status`, `/documents`, tải document, và `/contracts/machine/{machineId}/history`) đều có trong spec. `GET /contracts` còn hỗ trợ filter `status/ownerId/machineId` và `page/size`; frontend hiện gọi không tham số và xử lý danh sách trả về. `POST /contracts` có schema và các trường bắt buộc chính khớp form. |
| Máy và kho | `GET /inventory/summary`, `GET/POST /machines`, `GET /machines/{id}`, `GET /machines/{id}/maintenance-schedule`, `GET/POST /machine-models`, và POST gắn máy vào model đều có. `GET /machines` có query filter/pagination trong Swagger; màn hiện tại tải không tham số. |
| IoT | Heartbeat có response schema rõ. `GET /telemetry-query/machines/{machineId}/points` có `machineId`, `from`, `to` bắt buộc và `limit/offset` tùy chọn, nhưng response Swagger chỉ khai báo `object`; frontend lại parse một mảng telemetry point. Đây là hợp đồng chưa đủ rõ để Flutter triển khai an toàn. |
| Menu toàn cục | `GET /recipes/global`, `GET /recipes/global/{id}`, `POST /recipes/global` đều có. Body publish yêu cầu `name`, `steps`, `dosageBounds`, khớp các field chính frontend gửi. Schema response danh sách là summary, không gồm `steps`/`dosageBounds` mà Zod frontend yêu cầu. |
| Báo cáo và hóa đơn | `GET /billing/invoices` có response danh sách và các field màn Admin dùng. Swagger hỗ trợ query `ownerId/status/type/period/page/size`, nhưng Admin hiện tải không query và lọc `type=RENTAL` ở client. |
| Thông báo và cảnh báo | `GET /notifications`, `POST /notifications/{id}/read`, `GET /alerts` đều có. `GET /notifications/unread-count`, `POST /notifications/read-all`, `POST /alerts/{id}/ack` cũng có trong Swagger nhưng chưa được màn Admin gọi. |

### Lệch hợp đồng cần lưu ý khi làm Flutter

1. **MFA đăng nhập và logout chưa được công bố trong IDaaS Swagger.** Frontend gọi `POST /auth/login/mfa` với `temp_token` và `code`, nhưng route này không xuất hiện. Swagger có `POST /auth/mfa/confirm`, song request của nó là `secret` và `token`, có BearerAuth; đây là xác nhận setup MFA, không phải contract tương đương với login challenge. `POST /auth/logout` frontend gọi cũng không có trong spec. `POST /auth/login` có schema request email/mật khẩu, nhưng response chỉ được mô tả là `object`, nên chưa thể xác minh từ Swagger các nhánh trả access token, MFA challenge và first-login challenge.
2. **Response cấp lại mật khẩu tạm không khớp validator frontend.** Swagger `AdminUserTemporaryPasswordReissueResponse` có `user_id`, `temporary_password`, `onboarding_email_sent`; `admin-users.schema.ts` bắt buộc thêm `temporary_password_expires_at`. Nếu backend trả đúng như spec, wrapper `adminUsersApi.reissueTemporaryPassword` sẽ lỗi parse. Wrapper hiện chưa có call site trong UI Admin.
3. **Danh sách mẫu máy chỉ được Swagger mô tả bằng summary.** `GET /machine-models` trả `MachineModelSummaryResponse` với `id/modelCode/manufacturer/displayName/machineType/active`; Zod `MachineModelSchema` còn bắt buộc `specifications/createdAt/updatedAt`. Swagger có `GET /machine-models/{modelId}` trả `MachineModelResponse` đầy đủ, nhưng frontend hiện không gọi route chi tiết đó. Cần điều chỉnh API DTO/spec hoặc frontend chỉ đòi field của summary và tải detail khi cần.
4. **Danh sách công thức toàn cục cũng có thể lỗi parse.** Swagger mô tả `GET /recipes/global` bằng `GlobalRecipeSummaryResponse` (`id/name/revision/menuId`), trong khi `GlobalRecipeSchema` frontend yêu cầu `id/name/steps/dosageBounds`. Route detail `/recipes/global/{id}` trả `GlobalRecipeDetailsResponse` đầy đủ. Nên tách schema summary và detail trong frontend hoặc cập nhật response list nếu backend thực sự trả full recipe.
5. **Telemetry points chưa có response contract cụ thể.** Swagger chỉ nói response là `object`; client hiện yêu cầu `array` và xác nhận `machineId` cho từng điểm. Cần backend chốt mảng trực tiếp hay object có field bọc trước khi viết DTO Flutter.
6. **Một số giới hạn là validation riêng của frontend.** Ví dụ `StoreLocationRequest.name` bắt buộc ở form nhưng không được đánh dấu `required` trong Swagger; các ngưỡng thời gian, độ dài và số tiền ở form/Zod cũng không phải lúc nào được mô tả thành `minimum/maximum` trong spec. Khi chuyển sang Flutter, không suy ra rằng backend đang cưỡng chế các giới hạn này nếu Swagger không ghi.
7. **Wrapper tạo/cập nhật tài khoản có field ngoài Swagger.** FE schema cho `POST /admin/users` và `PATCH /admin/users/{id}` cho phép `tenant_id`; hai request DTO Swagger hiện không khai báo field này. Create user là luồng Moderator, không phải màn Admin hiện tại; cần chốt contract nếu Flutter cũng làm luồng đó.

### Kết luận cập nhật cho tài liệu

Các route nghiệp vụ chính của Admin đã tồn tại trong Swagger và phần lớn method/query khớp API client. Các điểm không nên bê nguyên validator hiện tại sang Flutter khi chưa xác nhận gồm: login MFA/logout, response cấp lại mật khẩu tạm, response list mẫu máy, response list công thức và response telemetry points. Riêng ba operation Dolores local mới hơn server không ảnh hưởng tới các màn Admin đang liệt kê trong tài liệu này.
