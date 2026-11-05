# Kế hoạch hoàn thiện luồng thu mua máy cũ

## Trạng thái

- Trạng thái kế hoạch: đã được người dùng chốt và đang triển khai theo chế độ Standard; Phase 1–2 complete, Phase 3–5 partial.
- Repository mục tiêu: `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`.
- Phạm vi: tích hợp FE cho workflow buyback máy ngoài hệ thống (`workflowVersion = 2`) từ Owner tạo yêu cầu đến Moderator đăng ký máy.
- Backend `C:\GitHub\BEANS\dolores_platform` được dùng để đối chiếu contract trong lúc lập kế hoạch; kế hoạch này không bao gồm sửa mã BE.
- Dữ liệu workflow cũ gắn với hợp đồng (`workflowVersion` khác 2) phải tiếp tục hoạt động như hiện tại.
- Cập nhật plan 2026-11-04: phần bổ sung entry Technician cho thu máy/tân trang và kiểm chứng đọc kết quả đăng ký đang chờ thực thi; trạng thái các phase trước giữ nguyên.

## Quyết định đã chốt

| Chủ đề | Quyết định | Phương án khác đã cân nhắc | Lý do |
|---|---|---|---|
| Ranh giới FE | Giữ chung API, schema và thành phần dùng lại; tách điều phối UI cho Owner, Moderator, Technician. Giữ `/admin/buybacks` bằng một Admin adapter dùng chung thành phần operator và chỉ hiện thao tác Admin được BE cho phép. | Tiếp tục dồn mọi vai trò vào một `BuybackWorkflowScreen`; hoặc sao chép API/client theo vai trò. | Component hiện tại chứa nhiều nhánh theo vai trò và trạng thái. Tách UI giúp thêm thao tác mà không làm các role trộn lẫn; một domain API chung vẫn giữ contract và cache nhất quán. |
| Điều hướng | Giữ điều hướng đã thống nhất: Owner ở `/dashboard/buyback` và `/dashboard/buyback/new`; Moderator xem danh sách rồi bấm mã hồ sơ để mở route detail riêng có nút quay lại; Technician dùng `/technician/tasks/buyback-assessment`. | Tạo route detail riêng cho cả ba vai trò. | Bảo toàn hành vi Owner và Technician hiện có; giữ đúng yêu cầu đã chốt cho Moderator. |
| Bằng chứng thu máy | FE nhận `evidenceReference` thật đã được tạo ở hệ thống lưu trữ khác. Không thêm API upload BE trong phạm vi này. | Mở rộng cả BE để tạo upload/read API cho collection. | Người dùng chọn phạm vi FE. Nếu không có reference thật thì dừng tại bước ghi bằng chứng; không tạo reference giả hoặc gửi giá trị mẫu. |
| Nhiệm vụ thu máy, tân trang và xem kết quả của Technician | Mở rộng danh sách/detail buyback đang có tại `/technician/tasks/buyback-assessment`; không tạo route buyback mới và không dùng `/technician/tasks/retrieval` vốn thuộc luồng thu hồi máy theo hợp đồng. Dùng GET `/buybacks` và GET `/{caseId}` theo quyền hiện tại. | Tách trang thu máy buyback hoặc nhập luồng này vào trang thu hồi hợp đồng. | Giữ một nơi cho nhiệm vụ buyback theo đúng cấu trúc hiện có; tránh trộn hai nghiệp vụ có API và điều kiện giao việc khác nhau. |
| Quyền đăng ký và kết quả | Chỉ Moderator phụ trách gọi `POST /{caseId}/register-machine`. Các role được BE cho phép đọc hồ sơ thấy trạng thái `REGISTERED` và `registeredMachineId` từ GET buyback detail; không gọi thêm GET `/machines/{id}` trong scope này. | Cho Technician đăng ký hoặc tạo trang/GET chi tiết máy riêng. | Khớp authorization BE và lựa chọn của người dùng; phản hồi đăng ký đã có ID máy trong buyback case. |

## Mục tiêu và điều kiện hoàn tất

Owner có thể mở yêu cầu theo hợp đồng đang hoạt động, theo dõi trạng thái, rồi chấp nhận hoặc từ chối giá đã được duyệt. Moderator có thể xem hồ sơ trong danh sách API, mở detail riêng, giao việc, duyệt giá, điều phối thu máy, thanh toán, tân trang và đăng ký máy. Technician xem các hồ sơ Dolores giao cho tài khoản đó trong trang buyback hiện có, mở đúng nhiệm vụ thu máy/tân trang theo giai đoạn, nộp kết quả được giao và đọc trạng thái cùng mã máy sau khi Moderator đăng ký thành công.

Luồng workflow v2 hoàn tất khi FE hỗ trợ các chuyển trạng thái hợp lệ đến `REGISTERED`, mọi hành động gọi đúng endpoint và payload Dolores, dữ liệu danh sách/detail phản ánh trạng thái server sau mutation, các trường hợp lỗi/quyền bị từ chối được hiển thị rõ ràng, và các route Admin hiện có không bị suy giảm.

## Luồng nghiệp vụ và contract BE làm căn cứ

Base path: `/api/v1/buybacks`. Danh sách được lọc theo JWT hiện tại: Owner xem hồ sơ của mình, Moderator xem hồ sơ được giao phụ trách, Technician xem hồ sơ có nhiệm vụ được giao, Admin xem toàn hệ thống. Phân trang đọc `X-Page`, `X-Page-Size`, `X-Has-Next`.

| Thứ tự | Vai trò | API/điều kiện | Kết quả cần thể hiện trên UI |
|---|---|---|---|
| Tạo hồ sơ | Owner | `GET /buybacks`, `POST /buybacks`; yêu cầu hợp đồng `ACTIVE`. Body tạo hồ sơ chỉ có `idempotencyKey`, `correlationId`. Dolores tạo trạng thái `REQUESTED` và tự tìm Moderator phụ trách khi đủ điều kiện. | Giữ form `/dashboard/buyback/new`; không yêu cầu thông tin máy hoặc giá ở bước này; sau khi tạo thành công hiển thị hồ sơ mới và trạng thái server trả về. |
| Giao Moderator dự phòng | Admin | `POST /{caseId}/moderator/assign`; chỉ dùng khi hồ sơ chưa được gán theo cơ chế tự động và chỉ Admin có quyền. | Có thao tác riêng ở Admin; không hiện cho Moderator/Owner. |
| Phân công kiểm tra | Moderator phụ trách | `POST /{caseId}/inspection/assign`, chọn Technician đang hoạt động; `profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", ... })` là nguồn lựa chọn hiện có. | Chỉ hiện thao tác khi role và trạng thái hồ sơ cho phép; lưu người được giao và cập nhật detail/list. |
| Kiểm tra và đề xuất giá | Technician được giao | `POST /{caseId}/inspection/start`, sau đó `POST /{caseId}/inspection` với tình trạng, `valuationAmount > 0`, currency, ghi chú/bằng chứng tùy chọn, khóa idempotency và correlation. | Trang `/technician/tasks/buyback-assessment` hiển thị nhiệm vụ được giao, form bắt đầu và form nộp kết quả. |
| Duyệt giá | Moderator phụ trách hoặc Admin | `POST /{caseId}/valuation`; duyệt phải gửi `approvedPrice`, từ chối gửi lý do. | Hiển thị giá Technician đề xuất; chỉ cho phép duyệt/từ chối ở đúng trạng thái. |
| Quyết định giá | Owner | `POST /{caseId}/owner-decision`; chỉ Owner của case được chấp nhận/từ chối giá đã duyệt. | Hiển thị giá duyệt; yêu cầu lý do theo schema hiện có; sau khi chọn phản ánh giá/quyết định server. |
| Điều phối thu máy | Moderator phụ trách | `POST /{caseId}/collection/request`, rồi `POST /{caseId}/collection/assign`. Chỉ sau khi Owner chấp nhận giá. | Chuyển sang trạng thái chờ thu; phân công Technician thu máy. |
| Ghi nhận thu máy | Technician được giao | `POST /{caseId}/collection/evidence` với `confirmedSerial`, `collectionLocation`, `evidenceReference`, `idempotencyKey`, `correlationId`. FE không upload file trong phase này. | Nhập mã serial xác nhận, địa điểm và reference thật từ hệ thống lưu trữ bên ngoài. Hiển thị kết quả ghi nhận từ server. |
| Xác nhận đã nhận máy | Moderator/Admin theo quyền endpoint | `POST /{caseId}/collection/confirm` với `evidenceReference`, `idempotencyKey`, `correlationId`. Chỉ gọi sau khi Technician đã ghi nhận bằng chứng. | Màn hình xác nhận dùng reference thật có thể truy xuất từ quy trình lưu trữ bên ngoài; không tự điền placeholder. Thành công chuyển case sang `COLLECTED`. |
| Thanh toán | Moderator phụ trách hoặc Admin | `POST /{caseId}/payments`; chỉ sau `COLLECTED` và Owner đã chấp nhận. Server lấy số tiền từ giá Owner chấp nhận, client không gửi amount. Upload chứng từ qua `POST /{caseId}/payment-proofs`; đọc metadata và nội dung qua API chứng từ hiện có; duyệt qua `POST /payment-proofs/{proofId}/review`. Người gửi chứng từ không tự duyệt chứng từ đó. | Hiển thị amount/currency server trả; hỗ trợ upload file, xem/tải chứng từ theo API private hiện có, duyệt/từ chối theo quyền và trạng thái. Chỉ khi chứng từ được duyệt case mới sang `PAID`. |
| Tân trang | Moderator phụ trách phân công; Technician được giao thực hiện | `POST /{caseId}/refurbishment/assign`, `/refurbishment/start`, `/refurbishment/complete`. Bắt đầu sau `PAID`; ghi kế hoạch, chi phí phụ tùng, tiền tệ, công việc và kết quả. | Danh sách nhiệm vụ Technician hiện có chứa nhiệm vụ tân trang; hiển thị trạng thái và form tương ứng. Với workflow v2, hoàn tất tân trang chuyển trực tiếp sang `READY_FOR_REGISTRATION`; không chèn bước QA legacy. |
| Đăng ký máy | Moderator phụ trách | `POST /{caseId}/register-machine` với `machineType`, `modelId`, region tùy chọn, reason và khóa idempotency/correlation. Chọn model từ `machine-models.api.ts` hiện có. Controller chỉ cho Moderator phụ trách thao tác. | Chỉ mở thao tác khi case `READY_FOR_REGISTRATION`; sau thành công hiển thị `registeredMachineId`/thông tin máy và trạng thái `REGISTERED`. |

Chuỗi trạng thái mục tiêu của workflow v2: `REQUESTED` → `INSPECTION_PENDING` → `VALUATION_PENDING` → `APPROVED` → `COLLECTION_PENDING` → `COLLECTED` → `PAYMENT_PENDING` → `PAID` → `REFURBISHING` → `READY_FOR_REGISTRATION` → `REGISTERED`. Nhánh từ chối kết thúc ở `REJECTED`. Trạng thái thực tế và quyền thao tác luôn lấy từ Dolores; FE không tự chuyển trạng thái.

### Quy tắc hiển thị nhiệm vụ Technician và kết quả đăng ký

| Dữ liệu server | Hiển thị trong trang buyback Technician | Thao tác/điều hướng |
|---|---|---|
| `COLLECTION_PENDING`, `collectionTechnicianId = null` | Chờ phân công thu máy; không coi là việc đã giao cho Technician. | Không hiện action thu máy. |
| `COLLECTION_PENDING`, `collectionTechnicianId` có giá trị | Đang thu máy. | Chỉ tài khoản khớp ID được mở action “Thu máy”; detail dùng form evidence hiện có. Khi `collectionEvidenceRecorded = true`, detail báo đang chờ Moderator/Admin xác nhận. |
| `PAID`, `refurbishmentTechnicianId` khớp tài khoản | Nhiệm vụ tân trang được giao. | Hiện action “Tân trang” tới detail để bắt đầu. |
| `REFURBISHING`, `refurbishmentTechnicianId` khớp tài khoản | Đang tân trang. | Hiện action “Tiếp tục tân trang” tới detail để ghi kết quả. |
| `READY_FOR_REGISTRATION` | Đang chờ Moderator đăng ký máy. | Technician chỉ xem trạng thái; không được đăng ký. |
| `REGISTERED` và có `registeredMachineId` | Đã đăng ký; detail hiển thị mã máy Dolores. | Mã hồ sơ dạng text link hiện có mở detail; không thêm nút/trang kết quả riêng. Mọi role chỉ thấy dữ liệu nếu GET hồ sơ cho phép. |

## Ranh giới triển khai

- Domain requests/responses tiếp tục dùng `src/apis/buybacks.api.ts` và schema Zod trong `src/schema/buybacks.schema.ts`; mọi HTTP call đi qua `axiosClient`/Dolores base URL hiện có.
- Thêm các API method và DTO còn thiếu cho Admin gán Moderator dự phòng, Moderator gán Technician kiểm tra/thu máy/tân trang, Technician ghi bằng chứng thu máy, và đăng ký máy. Rà lại `confirmCollection` để body đúng contract, không thay thế endpoint ghi bằng chứng.
- Tách điều phối màn hình vào các component theo role trong `src/components/features/buyback/`; dùng lại thành phần hiển thị trạng thái, thông tin case, lịch sử, form và bảng nơi phù hợp. Không tạo client API riêng theo role.
- Owner workflow được mount từ `src/pages/dashboard/workflows/customer-workflow-screen.tsx`; route động đang xử lý `/dashboard/buyback` và `/dashboard/buyback/new`.
- Moderator workflow tiếp tục đi qua `src/pages/moderator/buyback/buyback-screen.tsx` và catch-all route. Mã hồ sơ trong bảng dùng `TextLinkButton` tới `PATH_MODERATOR.BUYBACK_DETAIL(id)`; detail ẩn danh sách và có `ButtonBar` “Quay lại danh sách” trong `ActionBarConfig`.
- Technician thay descriptor placeholder tại `src/pages/technician/tasks/buyback-assessment.page.tsx` bằng màn hình buyback riêng. Danh sách dùng GET `/buybacks` theo scope Technician và thao tác trên hồ sơ được chọn trong cùng route nhiệm vụ.
- Bảo toàn `/admin/buybacks` bằng Admin adapter dùng shared operator components; giữ Admin fallback assign Moderator và những thao tác Admin mà BE cho phép. Không đổi shell, authentication, route guard hay các workflow khác.
- Danh sách dùng `DataTable`; action bar và nút dùng component chung. Mỗi màn hình có trạng thái loading, empty, error/retry, validation và success. Không coi 403/404/network failure là danh sách rỗng hoặc mutation thành công.
- Dùng khóa idempotency ổn định cho retry cùng một thao tác; chống double-submit. Sau mutation gọi lại query liên quan; không optimistic update trạng thái nghiệp vụ.

## Các phase triển khai

### Phase 1 — Hoàn thiện contract FE và tách màn hình theo role

**Kết quả:** Có API/schema đầy đủ cho workflow v2 và các route chính được chuyển sang UI theo vai trò mà không mất hành vi đang chạy.

**Phạm vi:** Đối chiếu lại quyền, điều kiện trạng thái, payload, response và pagination của từng endpoint với controller/DTO BE trước khi dùng. Bổ sung DTO/API method còn thiếu; giữ API method đang có cho list/detail/create, inspection submit/start, valuation, owner decision, collection request/confirm, payment/proofs, refurbishment start/complete. Tách Owner, Moderator, Technician orchestration; giữ Admin compatibility. Nối danh sách GET vào `DataTable`, giữ trang tạo Owner và detail Moderator theo quyết định đã chốt.

**Ngoài phạm vi:** Sửa BE, tạo endpoint upload bằng chứng thu máy, thay đổi flow cũ, sửa auth hoặc gọi mutation lên dữ liệu thật.

**Phụ thuộc:** Các contract BE đã đọc; shared axios client, query client, DataTable, ButtonBar, TextLinkButton, ActionBar, profiles API, machine-models API.

**Ranh giới/thành phần:** `buybacks.api.ts`, `buybacks.schema.ts`, các màn hình role trong `components/features/buyback/`, route Owner/Moderator/Technician và adapter Admin hiện có.

**Tác động phụ:** Chỉ GET được dùng trong xác nhận màn hình phase này; không gửi lệnh thay đổi dữ liệu Dolores.

**Xác minh:** Kiểm tra TypeScript/lint và các kiểm tra hiện có phù hợp; đối chiếu request serialization với DTO BE; xác nhận pagination headers, lỗi xác thực/quyền, query key theo subject/role, route Moderator detail/back và Owner create route. Không kiểm tra bằng mutation lên production.

**Tiêu chí chấp nhận:** Từng API method mới parse payload/response bằng schema; các role dùng cùng domain API; Owner list/create, Moderator list/detail/back, Technician assignment page và Admin route render đúng; không có hành vi ghi giả lập.

**Điều kiện vào/ra và review:** Vào phase sau khi scope FE-only và ba quyết định UX/kiến trúc ở trên được chốt. Chỉ rời phase khi mapping API/role/state được review và không có sai khác contract chưa xử lý.

**Rủi ro/dừng:** Nếu code BE hiện tại khác contract đã khảo sát, dừng endpoint tương ứng để xác minh lại; không suy luận quyền từ label UI. Nếu API GET không trả đúng scope hoặc pagination thì giữ màn hình unavailable/error rõ ràng, không dùng dữ liệu mẫu thay thế.

### Phase 2 — Owner tạo hồ sơ, phân công kiểm tra, định giá

**Kết quả:** Một hồ sơ mới đi từ yêu cầu Owner đến quyết định giá của Owner bằng các mutation đúng role.

**Phạm vi:** Giữ form `/dashboard/buyback/new`, kiểm tra hợp đồng ACTIVE và checkbox xác nhận; gửi đúng hai khóa tạo hồ sơ. Hiển thị hồ sơ `REQUESTED` trong list. Moderator detail có form gán Technician kiểm tra; Technician bắt đầu và nộp tình trạng/giá; Moderator/Admin duyệt hoặc từ chối giá; Owner chấp nhận hoặc từ chối giá đã duyệt. Giao diện chỉ hiện nút hợp lệ cho trạng thái và role hiện tại. Admin fallback gán Moderator được đặt trong `/admin/buybacks` khi case cần xử lý thủ công.

**Ngoài phạm vi:** Điều phối thu máy, payout, tân trang, đăng ký; nhập thông tin máy ở form tạo yêu cầu.

**Phụ thuộc:** Phase 1, profile Technician đang hoạt động, quyền Moderator phụ trách/Admin theo contract.

**Ranh giới/thành phần:** Owner, Moderator, Technician, Admin buyback screens; forms và status/action helpers dùng chung; mutation API tạo/assign/start/submit/decide.

**Tác động phụ:** Các mutation tạo hồ sơ, assignment, inspection snapshot, valuation decision và owner decision làm đổi trạng thái thật ở Dolores khi người dùng sử dụng. Không phát mutation trong kiểm tra local hoặc trên tài khoản production.

**Xác minh:** Kiểm tra payload bắt buộc, field validation (giá dương, currency, lý do), khóa idempotency khi retry, invalidation list/detail, xử lý 401/403/409/422, và role không được gọi action ngoài quyền. E2E mutation chỉ dùng test/staging account và dữ liệu được phép.

**Tiêu chí chấp nhận:** Owner tạo đúng một hồ sơ theo retry; Technician được gán mới nộp inspection; Moderator/Admin quyết định valuation; Owner chỉ quyết định sau khi giá được duyệt; không có action xuất hiện sai trạng thái; mọi view phản ánh lại server response.

**Điều kiện vào/ra và review:** Vào khi Phase 1 đạt exit gate và có môi trường test/fixture không ảnh hưởng dữ liệu thật. Rời khi toàn bộ đường từ `REQUESTED` đến `APPROVED` hoặc `REJECTED` có kiểm chứng role và trạng thái.

**Rủi ro/dừng:** Trường hợp không có Moderator tự động gán phải được đưa qua Admin fallback; không tự gán người không đủ điều kiện. Dừng nếu OWNER context, `responsibleModeratorId`, profile UUID hoặc semantics giá không khớp BE.

### Phase 3 — Điều phối thu máy và thanh toán

**Kết quả:** Sau khi Owner chấp nhận giá, hồ sơ được giao thu máy, ghi bằng chứng, xác nhận đã nhận và hoàn tất payout có chứng từ.

**Phạm vi:** Moderator yêu cầu thu và gán Technician. Technician nhập serial xác nhận, địa điểm và `evidenceReference` thật để gọi `/collection/evidence`. Moderator/Admin xác nhận collection bằng `/collection/confirm` sau khi server báo đã có bằng chứng. Sau `COLLECTED`, Moderator/Admin tạo payout (amount do BE tính), upload chứng từ, đọc metadata/nội dung private, và người có quyền khác submitter duyệt/từ chối proof. Owner có thể theo dõi tiến độ và thông tin được phép đọc.

**Ngoài phạm vi:** Upload/đọc file bằng chứng thu máy từ Dolores; tự tạo object key; thay đổi quy tắc payout; giao Technician không có profile hợp lệ.

**Phụ thuộc:** Phase 2 accepted price và `ownerAccepted = true`; reference có thật từ hệ thống lưu trữ bên ngoài; endpoint payment proof và object storage hoạt động.

**Ranh giới/thành phần:** Moderator/Technician/Owner/Admin role screens; `buybacks.api.ts`/schema; payment proof controls và collection forms. API collection evidence là mutation riêng, không dùng nhầm `confirmCollection`.

**Tác động phụ:** Ghi collection evidence, xác nhận thu, tạo payout, upload và review chứng từ đều thay đổi dữ liệu/tiền trạng thái trên server. Chỉ chạy kịch bản mutation ở test/staging được cấp phép.

**Xác minh:** Dùng reference thật trong môi trường kiểm thử; kiểm tra serial/location/reference bắt buộc, case chỉ xác nhận sau evidence, không gửi amount do client tự nhập, giới hạn loại/kích thước file theo API hiện có, người upload không tự duyệt, lỗi storage không báo thành công, và các status được refresh sau mutation.

**Tiêu chí chấp nhận:** `APPROVED` + Owner chấp nhận mới cho yêu cầu thu; Technician được giao mới ghi evidence; Moderator/Admin chỉ xác nhận sau evidence; payment chỉ tạo ở `COLLECTED`; case chỉ thành `PAID` khi review proof được duyệt; Owner không thấy nội dung/reference private trái quyền.

**Điều kiện vào/ra và review:** Vào khi Phase 2 và test reference sẵn sàng. Rời khi luồng từ owner acceptance đến `PAID` được xác minh trên staging/test, gồm đường upload/review thành công và lỗi.

**Rủi ro/dừng:** Dolores không có upload/read API collection; nếu chưa lấy được reference thật, dừng trước `POST /collection/evidence`, không gửi chuỗi tự tạo hay giá trị mẫu. Nếu Moderator không thể truy xuất reference cần cho `/collection/confirm`, ghi nhận blocker vận hành và không giả lập xác nhận. Nếu proof storage trả lỗi, giữ trạng thái pending và cho retry an toàn.

### Phase 4 — Tân trang và đăng ký máy

**Kết quả:** Máy đã thanh toán được giao tân trang và đăng ký thành máy Dolores.

**Phạm vi:** Moderator phụ trách gán Technician tân trang; Technician bắt đầu với kế hoạch và chi phí phụ tùng, hoàn tất công việc với kết quả; Moderator phụ trách đăng ký máy từ model hợp lệ bằng `machineType`, `modelId`, region tùy chọn và reason. Hiển thị machine ID/trạng thái đăng ký sau response.

**Ngoài phạm vi:** Quy trình QA cho v2, tạo/sửa model, thay đổi service đăng ký máy, upload evidence cho refurbishment nếu BE chưa hỗ trợ endpoint upload.

**Phụ thuộc:** Phase 3 case đã `PAID`, profiles API, machine models API và endpoint registration.

**Ranh giới/thành phần:** Màn hình role-based; API/schema buybacks; model selector dùng API hiện có; Admin route tiếp tục giữ các thao tác Admin mà BE cấp, nhưng không được dùng thay Moderator phụ trách để đăng ký máy.

**Tác động phụ:** Assignment, start/complete refurbishment và đăng ký máy ghi dữ liệu nghiệp vụ thật. Chỉ xác minh mutation trên staging/test.

**Xác minh:** Kiểm tra chi phí không âm, model UUID hợp lệ, status gating `PAID` → `REFURBISHING` → `READY_FOR_REGISTRATION` → `REGISTERED`, xử lý response/error, và tránh gọi QA cho workflowVersion 2. Kiểm tra một Technician không được giao không thể nộp kết quả.

**Tiêu chí chấp nhận:** Technician được giao hoàn tất refurbishment; v2 chuyển tới `READY_FOR_REGISTRATION` không cần QA; chỉ Moderator phụ trách đăng ký được máy; case cuối cùng hiển thị `REGISTERED` cùng ID máy Dolores trả về.

**Điều kiện vào/ra và review:** Vào khi Phase 3 hoàn tất ở `PAID`. Rời khi registration response, role authorization và status cuối được xác minh.

**Rủi ro/dừng:** Model không tồn tại/không active hoặc API trả registration conflict thì không chọn model thay thế bằng label hay UUID tự đoán. Dừng action cho đến khi dữ liệu model/contract được sửa hoặc xác minh.

### Phase 5 — Kiểm chứng xuyên vai trò và bàn giao

**Kết quả:** Hoàn tất kiểm chứng toàn workflow, tương thích route cũ và tài liệu vận hành FE cần thiết.

**Phạm vi:** Chạy kiểm tra phù hợp với repo; rà soát query invalidation, pagination, action gating, responsive table/detail, accessibility cơ bản, error text tiếng Việt, Admin compatibility và luồng v1. Ghi lại endpoint matrix thực tế, phần nào được xác minh, và blocker nếu còn. Thực hiện review code thay đổi theo phase.

**Ngoài phạm vi:** Gọi mutation production để tạo case mẫu; sửa BE hoặc thay đổi scope evidence đã chốt; chỉnh authentication ngoài buyback.

**Phụ thuộc:** Phase 1–4; credentials và fixture staging/test nếu cần E2E.

**Ranh giới/thành phần:** Chỉ các file buyback, route role liên quan và test/e2e liên quan trực tiếp; không mở rộng sang dashboard khác.

**Tác động phụ:** Kiểm tra đọc được phép dùng staging/test. Mutation test chỉ dùng dữ liệu staging đã được cấp phép; không chạm dữ liệu production.

**Xác minh:** TypeScript/lint; tests hiện có cho schemas/API/routes; browser flow theo Owner → Moderator → Technician → Moderator/Admin; lỗi/permission/empty states; ghi lại build/test command và kết quả thực tế. Không tạo test mới ngoài phạm vi được user chấp thuận riêng.

**Tiêu chí chấp nhận:** Luồng đạt trạng thái `REGISTERED` trong test/staging; các nhánh từ chối và lỗi không tạo trạng thái thành công giả; không regression route Admin/Owner/Moderator/Technician; chênh lệch BE/API hoặc thiếu reference được nêu rõ thay vì bị che đi.

**Điều kiện vào/ra và review:** Chỉ bắt đầu sau Phase 4. Bàn giao khi review cuối không còn lỗi chặn và bằng chứng xác minh đã ghi đủ; nếu thiếu staging hoặc evidence reference thì đánh dấu đúng điểm dừng, không tuyên bố toàn workflow hoàn tất.

**Rủi ro/dừng:** Không có session đúng role hoặc môi trường staging thì không suy ra kết quả E2E từ mock. Ghi phần chưa xác minh làm điều kiện còn lại.

## Bổ sung kế hoạch theo yêu cầu Technician → đăng ký → xem kết quả

Các hạng mục dưới đây tiếp nối Phase 3–5 trong tài liệu này; không tạo plan thứ hai và không thay đổi lịch sử xác minh đã ghi. API nghiệp vụ thu máy, tân trang và đăng ký đã được nối ở FE; phần bổ sung tập trung vào entry point nhiệm vụ Technician và kiểm chứng quyền đọc kết quả theo role.

### Phase 3 follow-up — Tìm và mở nhiệm vụ thu máy

**Kết quả:** Technician tìm thấy hồ sơ thu máy đã được giao trong danh sách buyback hiện tại và mở đúng detail để ghi evidence.

**Phạm vi:** Mở rộng list/detail tại `/technician/tasks/buyback-assessment`. `GET /buybacks` tiếp tục dùng server scope theo JWT. Thêm action “Thu máy” ở hàng có `status = COLLECTION_PENDING` và `collectionTechnicianId` khớp Technician hiện tại; action mở detail hiện có, nơi `POST /{caseId}/collection/evidence` gửi serial, địa điểm, evidence reference thật và khóa request. Giữ chính xác nhãn/ngữ nghĩa: `COLLECTION_PENDING` không có `collectionTechnicianId` là chờ phân công; có Technician được giao là đang thu máy; đã có evidence thì chờ Moderator/Admin xác nhận.

**Ngoài phạm vi:** Route mới; thay đổi `/technician/tasks/retrieval` (luồng thu hồi theo hợp đồng); thao tác phân công/yêu cầu thu của Moderator; upload evidence hoặc sửa BE.

**Phụ thuộc:** API GET list/detail và API collection evidence đang có; current authenticated Technician ID; assignment từ `/collection/assign`.

**Ranh giới/thành phần:** `buyback-technician-screen.tsx`, `buyback-workflow-controller.tsx`, `buyback-workflow-shared.tsx`, `buybacks.api.ts` và `buybacks.schema.ts`. Dùng lại TextLinkButton/mã hồ sơ để vào detail; action “Thu máy” chỉ là entry tới form, không gọi mutation ngay trong list.

**Tác động phụ:** GET list/detail chỉ đọc; gửi evidence là mutation thật khi người dùng submit. Mọi xác minh mutation phải dùng mock hoặc fixture/staging được cấp phép; không dùng reference giả.

**Xác minh:** Bao phủ hàng chờ phân công không có action; hồ sơ đã giao cho tài khoản hiện tại có action; hồ sơ giao người khác không có action và bị từ chối nếu cố truy cập; mở detail đúng case; form lỗi/đang gửi/thành công; sau evidence detail phản ánh response và vẫn ở trạng thái do server trả tới khi Moderator/Admin xác nhận.

**Tiêu chí chấp nhận:** Technician có thể tìm và mở việc thu máy từ list; action chỉ hiện khi status và ID người được giao cùng hợp lệ; không thể ghi evidence ngoài assignment; luồng legacy và màn assessment hiện tại giữ nguyên.

**Điều kiện vào/ra và review:** Vào sau khi xác nhận staging/test account Technician và fixture case ba trạng thái: chưa phân công, giao cho chính Technician, giao cho Technician khác. Rời phase khi role/status gating, detail routing và evidence refresh được review.

**Rủi ro/dừng:** Nếu GET list không còn trả hồ sơ đã giao sau khi trạng thái đổi, hoặc GET detail trả 403 cho Technician được gán, dừng và đối chiếu contract/security BE; không tạo fallback gọi GET máy hay dùng dữ liệu cache cũ để giả lập nhiệm vụ.

### Phase 4 follow-up — Theo dõi tân trang và đọc kết quả đăng ký

**Kết quả:** Technician theo dõi việc tân trang đã giao tới `READY_FOR_REGISTRATION`; sau khi Moderator phụ trách đăng ký, Technician và các role được phép xem thấy trạng thái `REGISTERED` cùng `registeredMachineId` trên detail hồ sơ.

**Phạm vi:** Thêm action “Tân trang” khi `status = PAID` và `refurbishmentTechnicianId` khớp Technician hiện tại; thêm “Tiếp tục tân trang” ở `REFURBISHING` với cùng điều kiện. Form start/complete hiện có tiếp tục gọi đúng API và refresh case. Hiển thị trạng thái chờ đăng ký ở `READY_FOR_REGISTRATION`. Moderator phụ trách vẫn là role duy nhất gọi `POST /{caseId}/register-machine`. Sau mutation, dùng response và GET detail để hiển thị trạng thái server `REGISTERED` cùng `registeredMachineId`; mọi role có quyền GET case dùng detail hiện có để xem kết quả. Không gọi `GET /machines/{id}` và không thêm route riêng.

**Ngoài phạm vi:** Cho Technician đăng ký; thay đổi authorization/API BE; tạo trang riêng cho kết quả; lấy thông tin máy bổ sung từ Machine API; thay đổi model catalog hoặc QA workflow v2.

**Phụ thuộc:** Phase 3 case đạt `PAID`; technician assignment tân trang; registration API/model catalog hiện có; case fixture đã `READY_FOR_REGISTRATION` và kết quả `REGISTERED` trong môi trường kiểm thử.

**Ranh giới/thành phần:** Buyback Technician list/detail và shared case summary; Moderator registration screen/controller; shared buyback API/schema và query invalidation theo role/case ID.

**Tác động phụ:** Start/complete refurbishment và đăng ký máy ghi thay đổi nghiệp vụ thật. GET list/detail để xem kết quả chỉ đọc. Mutation chỉ xác minh trên test/staging được cấp phép.

**Xác minh:** Kiểm tra assignment/status gating cho hai action tân trang; xác nhận Tech không thấy/không thể gọi register; registration chỉ do Moderator phụ trách; sau registration, refetch list/detail cho từng role được cấp quyền; hiển thị mã máy chỉ từ response `registeredMachineId`, trạng thái từ `status`, không báo thành công khi GET chưa phản ánh kết quả. Kiểm tra 401/403/404/409/422 và dữ liệu thiếu ID.

**Tiêu chí chấp nhận:** Toàn đường Tech thu máy → collection xác nhận → payout được duyệt → Tech tân trang → `READY_FOR_REGISTRATION` → Moderator đăng ký → các role có quyền xem `REGISTERED` và đúng mã máy trên detail. Tech không có action đăng ký; không cần endpoint Machine bổ sung.

**Điều kiện vào/ra và review:** Vào khi có case `PAID`/`READY_FOR_REGISTRATION`, model active và identity Technician/Moderator/Owner/Admin hợp lệ ở test/staging. Rời khi đường đọc kết quả được xác minh bằng GET sau registration, authorization từng role đúng và các gate Phase 3 còn mở được ghi nhận rõ.

**Rủi ro/dừng:** Không có dữ liệu thật/test cho registration thì chỉ hoàn tất mock/local và giữ staging gate mở. Nếu GET detail của Technician không cho đọc case đã đăng ký dù assignment còn gắn, ghi nhận chênh lệch contract; không tự gọi Machine API để vòng qua quyền.

## Điều kiện dừng chung

- Endpoint, role, request/response, trạng thái hoặc authorization BE khác với mapping trong kế hoạch: dừng endpoint/phase đó để đối chiếu lại contract trước khi tiếp tục.
- Không phát sinh side effect thật trong Dolores khi chỉ đang kiểm thử UI hoặc API client.
- Không tạo evidence reference giả; không dùng serial, model ID, case ID hay profile ID lấy từ text hiển thị để thay cho UUID nếu API yêu cầu UUID.
- Nếu backend trả `401`, `403`, `404`, `409`, `422` hoặc lỗi storage, giữ đúng lỗi theo ngữ cảnh và cho phép người dùng xử lý; không thông báo thành công hoặc biến thành empty state.
- Không thay đổi BE trong kế hoạch này. Nếu việc vận hành thực tế yêu cầu upload/read bằng chứng thu máy, cần lập scope BE riêng trước khi triển khai thay đổi đó.

## Execution record

- Execution mode: `Standard`; TDD: `off` (đã chốt với người dùng).
- Phase 1 status: `complete`. Các tiêu chí chấp nhận của phase đã được xác minh; dừng ở ranh giới trước Phase 2 theo chế độ Standard.
- Đã hoàn thành trong Phase 1: bổ sung API/schema cho các lệnh gán Moderator/Technician, ghi bằng chứng thu máy và đăng ký máy; tách controller dùng chung khỏi UI, tạo màn hình Owner/Moderator/Technician và adapter Admin; nối lại các route; cập nhật contract test tạo hồ sơ v2 và thêm kiểm tra route/payload cho API mới.
- Review: đã phát hiện và sửa landmark `<main>` lồng nhau bằng cách để buyback screen dùng `<section>` bên trong main của role shell. Review sau sửa không thấy lỗi chặn khác trong phạm vi Phase 1.
- Dependency restore: người dùng cho phép khôi phục Playwright để xác minh. Đã khôi phục dependency cục bộ, sau đó xác nhận `next@16.2.9`, `@playwright/test@1.64.1`, `playwright@1.64.1`, TypeScript và các package cần thiết hiện có; `package.json` và `package-lock.json` không đổi. Đã cài Chromium/headless shell mà Playwright yêu cầu vào cache user. Npm báo 30 audit findings trong dependency tree (12 moderate, 17 high, 1 critical); không chạy audit fix trong phạm vi này.
- Verification passed: `npm.cmd run build` (Next 16.2.9, production build pass; route table có `/admin/buybacks`, `/technician/tasks/buyback-assessment` và các catch-all Owner/Moderator); `node_modules/.bin/tsc.cmd --noEmit` (pass); `npm.cmd run lint` (0 lỗi, một warning hook ở `src/components/contracts/contract-activation-panel.tsx:96`, ngoài buyback); `node --test tests/buyback-workflow-phase6.test.cjs` (5/5); smoke browser với API GET mock và mọi request ghi bị chặn (4/4 màn hình Owner list/form, Moderator list/detail/back, Technician assessment, Admin list đã in `ok`); `git diff --check` (không có lỗi whitespace, chỉ có thông báo quy ước LF/CRLF). File smoke tạm đã được xóa.
- Broader regression E2E baseline: lần đầu chạy 9/14 test; 5 test lỗi ngoài buyback gồm một test Admin (nhập ngày sai định dạng, sau đó lộ locator bảng quá rộng), một test keyboard landing (focus/animation/Next devtools), một test touch-target tính cả liên kết menu ẩn, và hai route machine operations Owner/Moderator chưa được nối tới màn hình có sẵn. Các lỗi này nằm ngoài màn hình/API buyback.
- Phase 2 status: `complete`. Owner mở yêu cầu từ hợp đồng ACTIVE với checkbox xác nhận và chỉ gửi `idempotencyKey`/`correlationId`; yêu cầu lỗi tạm thời có thể gửi lại cùng khóa. Admin có thể gán Moderator cho case `REQUESTED` chưa được nhận; Moderator phụ trách gán Technician đủ điều kiện. Technician được gán mới thấy thao tác bắt đầu/nộp kiểm tra; UI không gửi evidence giả. Moderator duyệt/từ chối valuation; Owner chỉ quyết định khi case v2 đã `APPROVED` và có giá dương. Mutation làm mới list/detail từ response Dolores.
- Review Phase 2: phát hiện và sửa action bắt đầu kiểm tra của Technician để chỉ hiện khi UUID tài khoản khớp `inspectionTechnicianId`; xác minh lại nhánh Admin fallback, Moderator phụ trách, trạng thái Owner và luồng legacy giữ nguyên. Không thấy lỗi chặn khác trong phạm vi Phase 2.
- Verification Phase 2: `npm.cmd run build` (pass; có route Admin buybacks và Technician assessment); `node_modules/.bin/tsc.cmd --noEmit` (pass); `npm.cmd run lint` (0 lỗi; giữ một warning hook ngoài buyback tại `src/components/contracts/contract-activation-panel.tsx:96`); `node --test tests/buyback-workflow-phase6.test.cjs` (6/6); `git diff --check` (pass, chỉ thông báo quy ước LF/CRLF). Playwright trực tiếp với API mock chạy hết Owner create/retry, Admin Moderator fallback/retry, Moderator Technician assignment, Technician start/submit, Moderator approval/rejection và Owner decision; kiểm tra DTO chính xác, khóa retry ổn định, profile eligibility, action gating và refresh trạng thái. Mọi request API bị chặn/mock trong trình duyệt; không có mutation gửi lên Dolores. Script và server smoke tạm đã được dọn.
- Regression follow-up theo yêu cầu người dùng: route Owner/Moderator machine operations hiện dùng màn hình operational overview có sẵn; descriptor Owner có tiêu đề và đường quay lại máy; Admin E2E nhập `dd/mm/yyyy` nhưng tiếp tục xác nhận query API ISO; selector bảng chi tiết được giới hạn trong hàng đang mở; kiểm tra landing đợi nội dung/animation, loại Next devtools khỏi tab sequence và không tính liên kết menu ẩn vào kích thước touch target; kiểm tra heartbeat theo phạm vi quyền (Moderator không gọi telemetry heartbeat). `npm.cmd run test:e2e -- --project=chromium --workers=1 --grep "Admin can filter accepted cups|keyboard focus follows|landing keeps Arial|Owner can navigate|Moderator can navigate"` (5/5); toàn suite `npm.cmd run test:e2e -- --project=chromium --workers=1` (14/14, thoát mã 0); `npm.cmd run build` (pass); `node_modules/.bin/tsc.cmd --noEmit` (pass); `npm.cmd run lint` (0 lỗi, một warning hook có sẵn ngoài phạm vi); `git diff --check` (pass, chỉ cảnh báo LF/CRLF). Tất cả E2E dùng API mock; không có mutation gửi lên Dolores.
- Route unit test thử chạy `node --test tests/owner-technician-routing.test.cjs tests/moderator-shell-data-label.test.cjs` không tới assertion do loader test hiện có lỗi resolve import nội bộ (`./machines.schema`, `@/routes/path`, `@/schema/repair-cost-reviews.schema`). E2E browser thực tế đã xác minh cả hai route từ danh sách qua detail tới operational overview ở năm viewport đã khai báo.
- Gate sau Phase 2: Phase 1 và Phase 2 `complete`; execution khi đó dừng trước Phase 3 theo chế độ Standard. Năm lỗi regression E2E ngoài buyback đã được xử lý và suite 14/14 pass; chưa có mutation nào lên Dolores.
- Phase 3 status: `partial` — FE implementation và mock verification đã hoàn tất; exit gate staging/test chưa đạt vì workspace chưa có staging session được xác minh hoặc `evidenceReference` thật từ kho lưu trữ ngoài. Dừng trước mutation thật `/collection/evidence` và `/collection/confirm`.
- Phase 3 implementation: Moderator/Admin có thể yêu cầu thu sau khi Owner chấp nhận đúng giá; Moderator phụ trách gán Technician; Technician được gán mới nhập serial, địa điểm và reference ngoài; operator chỉ xác nhận sau khi response Dolores trả `collectionEvidenceRecorded=true`; payout chỉ tạo sau `COLLECTED`, số tiền lấy từ response server; upload proof dùng file PDF/JPEG/PNG tối đa 20 MB, metadata/private content theo quyền BE; proof review dùng trạng thái `SUBMITTED` và BE giữ ràng buộc người duyệt khác người tạo payout và người gửi. Owner theo dõi tiến độ và đọc chứng từ payout cho case của chính Owner theo quyền hiện hữu; collection reference private không được trả ra UI.
- Phase 3 review finding/BE gap: `confirmCollection` nhận `evidenceReference` bắt buộc và đưa vào hash idempotency, nhưng service chỉ kiểm tra Technician đã ghi `collectionEvidence` khác null; không so sánh reference operator gửi với reference Technician đã lưu. FE không thể xác nhận hai giá trị trùng nhau vì response case chỉ trả cờ `collectionEvidenceRecorded`. Cần sửa/đặc tả BE riêng trước khi dựa vào server để bảo đảm reference khớp; không sửa BE trong scope FE này.
- Phase 3 recovery/retry: không có GET payout list; FE lưu payout ID theo case trong `sessionStorage` của tab và cho phép nhập lại ID từ response Dolores nếu qua thiết bị/phiên khác. Storage chỉ là cache best-effort; idempotency key upload gắn với đúng File object để retry cùng file không đổi khóa.
- Verification Phase 3: `npm.cmd run build` pass; `node_modules/.bin/tsc.cmd --noEmit` pass; `npm.cmd run lint` 0 lỗi, giữ warning hook có sẵn ở `src/components/contracts/contract-activation-panel.tsx:96`; `node --test tests/buyback-workflow-phase6.test.cjs` 6/6; `npm.cmd run test:e2e -- --project=chromium --workers=1` 15/15 (luồng buyback mới dùng API mock, các mutation khác trong suite cũng mock); `git diff --check` pass, chỉ cảnh báo quy ước LF/CRLF. Không gọi mutation Dolores thật.
- Review Phase 3: sửa payout ID/invalidation để luôn scope theo case của mutation nếu người dùng điều hướng trong lúc chờ; sessionStorage lỗi/không khả dụng không còn làm hỏng mutation response. Còn open risk BE reference comparison nêu trên và staging gate chưa xác minh.
- Gate tại điểm cuối Phase 3: Phase 3 `partial`; Phase 4 và Phase 5 chưa bắt đầu theo chế độ Standard. Để đóng Phase 3 cần staging/test credentials có quyền đúng vai trò, evidenceReference thật được cấp trong hệ thống lưu trữ ngoài, và xác định/khắc phục contract gap xác nhận reference ở BE trước khi chạy collection confirmation trên staging.
- Phase 4 status: `partial` — FE flow và mock verification đã hoàn tất, nhưng Phase 3 chưa có case `PAID` được xác minh trên staging; đăng ký máy và phân quyền thực tế vẫn chưa được kiểm chứng với Dolores.
- Phase 4 implementation: Moderator phụ trách giao Technician tân trang ở `PAID`; Technician chỉ thấy action bắt đầu khi UUID được giao khớp tài khoản, nhập kế hoạch và chi phí không âm, rồi ghi kết quả để đi tới `READY_FOR_REGISTRATION`; không gọi QA cho v2. Chỉ Moderator phụ trách mới thấy form đăng ký; model lấy từ `machineModelsApi.list`, lọc active theo `machineType`, có lỗi/tải lại và empty state; response detail hiển thị machine ID ở `REGISTERED`. Không thêm upload evidence hay sửa BE.
- Review Phase 4: rà soát read-only guard theo role/status, UUID hồ sơ, kiểm tra model active/type, DTO, lỗi danh mục, invalidation detail và giữ nhánh legacy/QA ngoài v2. Không thấy lỗi chặn trong scope Phase 4. Còn rủi ro tích hợp live/staging nêu dưới đây.
- Verification Phase 4: `node_modules/.bin/tsc.cmd --noEmit` (pass); `npm.cmd run build` (pass); `npm.cmd run lint` (0 lỗi, một warning hook có sẵn tại `src/components/contracts/contract-activation-panel.tsx:96` ngoài buyback); `node --test tests/buyback-workflow-phase6.test.cjs` (6/6); `git diff --check` (pass, chỉ warning LF/CRLF). Chromium E2E với Dolores API được mock: full suite (15/15, exit code 0), gồm chuỗi collection/payout → assignment/start/complete refurbishment → registration, gating sai Technician/Moderator, chi phí âm, catalog 503/refetch, model inactive/type filter, không QA và machine ID response. Để lấy exit code đáng tin cậy, Next dev được chạy riêng trong tiến trình ẩn và dùng config Playwright tạm không có `webServer`; server, config và log tạm được dọn sau khi suite kết thúc. Các request Dolores của luồng buyback được route mock; không có mutation buyback thật. Lint/E2E có warning React key `/admin/invoices` ngoài buyback.
- Phase 4 còn thiếu: E2E staging với case `PAID`, identity thật đúng role, catalog/model thật và machine ID do server tạo. Không suy kết quả staging từ mock.
- Phase 5 status: `partial` — local/mock regression và final review đã chạy; acceptance staging/live chưa đạt vì không có session Dolores staging với case và identities được cấp.
- Phase 5 browser coverage: E2E buyback bắt đầu từ Owner tạo yêu cầu với hợp đồng ACTIVE, đi qua Moderator giao Technician inspection/valuation, Owner chấp nhận giá, collection/payout, refurbishment và đăng ký tới `REGISTERED`; gồm trường hợp thiếu hợp đồng, role sai, model catalog lỗi/tải lại, model active/type filter, không QA cho v2, legacy v1 qua QA, nút back Moderator trỏ `/moderator/buyback/list`, và form/list/detail ở viewport 375/768/1440 px.
- Phase 5 endpoint matrix được kiểm tra bằng API mock: Owner `GET /contracts/owner/{ownerId}`, `GET /buybacks`, `POST /buybacks`, `POST /{caseId}/owner-decision`; Moderator `GET /buybacks`, detail, `POST /inspection/assign`, `/valuation`, `/collection/request`, `/collection/assign`, `/collection/confirm`, `/payments`, `/payment-proofs`, proof review, `/refurbishment/assign`, `/register-machine`; Technician `GET /buybacks`, `POST /inspection/start`, `/inspection`, `/collection/evidence`, `/refurbishment/start`, `/refurbishment/complete`; catalog `GET /machine-models`; legacy `POST /refurbishment/start`, `/refurbishment/complete`, `/qa`. Contract tests kiểm tra serialization, parsing và pagination metadata. Mock pass không chứng minh quyền hoặc side effect trên BE thật.
- Review Phase 5: rà soát route/schema/API, data ownership/invalidation, privacy chứng từ/reference, action gating, Admin adapter, Owner/Moderator/Technician flow, back navigation, legacy QA và error/empty/retry states. Không phát hiện lỗi chặn mới trong phạm vi buyback; BE gap xác nhận collection reference từ Phase 3 còn mở.
- Verification Phase 5: `node_modules/.bin/tsc.cmd --noEmit` (pass); `npm.cmd run build` (pass); `npm.cmd run lint` (0 lỗi, warning hook có sẵn tại `src/components/contracts/contract-activation-panel.tsx:96`); `node --test tests/buyback-workflow-phase6.test.cjs` (6/6); Chromium full E2E (17/17, exit code 0) qua Next dev riêng và Playwright config tạm; `git diff --check` (pass, cảnh báo LF/CRLF). Mọi request/mutation buyback trong E2E đều mock; không gửi mutation Dolores thật. Server/config/log tạm đã dọn.
- Kiểm tra API rộng ngoài buyback chạy `node --test tests/buyback-workflow-phase6.test.cjs tests/dolores-api-requests.test.cjs tests/dolores-api-signatures.test.cjs`: 6 pass, 3 fail trong test không thuộc buyback. `dolores-api-requests.test.cjs` mong đợi `signal` nhưng implementation `machines.listMaintenanceTickets` đặt options khác và trả `signal: undefined`; một test repair loader dừng trước assertion với `Cannot read properties of undefined (reading 'id')`; `dolores-api-signatures.test.cjs` mong public methods của `profilesApi` thiếu `updateContactInfo` trong khi implementation hiện có method đó. Những test/module này không được thay đổi trong workflow buyback; chưa sửa ngoài scope.
- Current gate: Phase 3, Phase 4 và Phase 5 `partial`; local/mock criteria của Phase 5 đã xong nhưng toàn workflow chưa hoàn tất. Để đóng Phase 3 cần staging/test credentials đúng vai trò, `evidenceReference` thật từ hệ thống lưu trữ ngoài, và xử lý contract gap BE đối chiếu reference. Để đóng Phase 4–5 cần staging verification với case `PAID`, identities đúng role, danh mục model thật và machine ID server trả về; không suy kết quả staging từ mock.
- Plan update 2026-11-04 theo yêu cầu người dùng: tiếp tục file plan hiện tại; giữ Technician trong `/technician/tasks/buyback-assessment`; không gộp với `/technician/tasks/retrieval`; chỉ Moderator phụ trách được gọi đăng ký máy; mọi role được BE cho phép xem trạng thái `REGISTERED` và mã máy trên GET buyback detail. Bổ sung tiêu chí hiển thị action “Thu máy”/“Tân trang” theo assignment và trạng thái, cùng kiểm chứng việc đọc kết quả sau đăng ký. Form ghi evidence/tân trang, đăng ký Moderator và trường `registeredMachineId` đã có trong FE; entry action cho task collection/refurbishment và kiểm chứng lại đường đọc kết quả theo role là phần thực thi tiếp theo. Không đổi contract BE hoặc thêm GET `/machines/{id}`.
- Execution update 2026-11-04 — Phase 3 follow-up status: `partial`. Technician list hiển thị “Thu máy” chỉ khi hồ sơ v2 ở `COLLECTION_PENDING` và `collectionTechnicianId` khớp tài khoản hiện tại; hồ sơ chưa phân công hiện “Chờ phân công thu máy” và không có action. Detail thu máy ẩn form sau khi server trả `collectionEvidenceRecorded=true`. Summary schema khai báo rõ assignment IDs. E2E được đồng bộ với nút mã hồ sơ, action/detail hiện hành, Technician kiểm tra được dùng lại ở bước thu, trạng thái sau Owner đồng ý/yêu cầu thu, case 403 khi Technician khác mở detail trực tiếp, và nhánh legacy.
- Verification follow-up: production `npm.cmd run build` đã pass với route dynamic detail; production-server E2E `npm.cmd run test:e2e -- tests/e2e/buyback-collection-payment.spec.ts --project=chromium --workers=1` pass 3/3; `node --test tests/buyback-workflow-phase6.test.cjs` pass 6/6; `npm.cmd run lint` có 0 lỗi và một warning hook có sẵn tại `src/components/contracts/contract-activation-panel.tsx:96`; `git diff --check` pass. E2E chặn toàn bộ API Dolores bằng mock, không có mutation thật.
- Review follow-up: read-only review không phát hiện lỗi chặn mới trong assignment/status gating, route detail, evidence form sau khi submit, schema hoặc regression legacy. Next dev E2E vẫn không resolve dynamic detail route (404), trong khi production build ghi nhận route và production E2E mở route thành công; coi đây là khác biệt môi trường dev cần điều tra nếu tiếp tục dùng dev server để E2E.
- Gate follow-up: giữ `partial` vì chưa có staging session/identity Technician thật và evidence reference được cấp từ storage để xác minh authorization/collection flow với Dolores. Contract gap đối chiếu `evidenceReference` lúc `collection/confirm` đã ghi ở Phase 3 vẫn mở. Theo Standard, dừng tại boundary này; Phase 4 follow-up chưa được review như một phase riêng.
- Execution update 2026-11-04 — Phase 4 follow-up status: `partial`. Thêm action “Tân trang” cho hồ sơ v2 `PAID` được giao và “Tiếp tục tân trang” cho `REFURBISHING` được giao; hai action chỉ mở detail, form hiện tại vẫn dùng các endpoint start/complete. Khi `READY_FOR_REGISTRATION`, Technician xem trạng thái chờ đăng ký nhưng không có action đăng ký. Thêm cảnh báo chung nếu server báo `REGISTERED` mà thiếu `registeredMachineId`, tránh hiển thị thông báo hoàn tất không có mã.
- Verification Phase 4 follow-up: `npm.cmd run build` pass, production route table có Technician detail động; `npm.cmd run lint` 0 lỗi, warning hook có sẵn tại `src/components/contracts/contract-activation-panel.tsx:96`; `node --test tests/buyback-workflow-phase6.test.cjs tests/dolores-axios-client.test.cjs` 10/10 (gồm refresh một lần khi 401); Chromium production-server E2E cho buyback pass 5/5, bao gồm action/assignment, start → list → continue → complete, Admin/Technician/non-responsible Moderator không đăng ký, responsible Moderator đăng ký, GET detail sau mutation và đọc `REGISTERED`/`registeredMachineId` cho Owner, Moderator, Admin và Technician được giao, thiếu mã máy, cùng lỗi 403/404/409/422 không báo thành công; `git diff --check` pass. API Dolores trong E2E được mock; không có mutation thật.
- Review Phase 4 follow-up: read-only review không thấy lỗi chặn mới về trạng thái/assignment, role guard đăng ký, invalidation query theo role/case, hiển thị mã máy hoặc nhánh legacy. 401 dựa trên test shared Axios refresh; quyền GET thật của từng role và luồng đăng ký chỉ được xác minh theo contract nguồn/mock, chưa chạy trên staging.
- Gate Phase 4 follow-up: giữ `partial` do chưa có staging case `PAID`/`READY_FOR_REGISTRATION`, identities thật, catalog model active và machine ID được Dolores tạo để xác minh end-to-end. Phase 3 vẫn `partial` với gate evidence reference/collection confirmation chưa đóng. Theo Standard, dừng ở đây trước final integration Phase 5.
- Final integration update 2026-11-04: full Chromium E2E trên local production server pass 19/19 (`npm.cmd run test:e2e -- --project=chromium --workers=1`); buyback flow gồm các test follow-up Phase 3/4, còn lại cover admin overview, landing/accessibility, legacy workflow và operational overview. Production build pass; lint 0 lỗi với warning hook có sẵn ngoài scope; buyback + shared Axios contract tests pass 10/10; `git diff --check` pass. E2E dùng mock API; server local đã dừng.
- Final integrated review: read-only review không phát hiện blocker mới ở các thay đổi buyback đã thực hiện; các action chỉ điều hướng tới detail và mutation vẫn bị chặn bởi role/status guard hiện có. Dynamic detail route được xác minh trên production build/server; Next dev vẫn có lỗi resolve route đã ghi ở Phase 3 follow-up.
- Final integration status: `unverified` cho toàn workflow Dolores vì không có staging identity/case/model/evidenceReference; Phase 3 evidence-reference comparison gap trong BE vẫn mở. Local/mock integration đã pass nhưng không thay thế authorization hoặc dữ liệu staging. Không có mutation production/staging; không commit, push hoặc deploy.
- UI follow-up 2026-11-05: phần metadata “Chứng từ thanh toán” trên Moderator Buyback detail dùng `DataTable` chung để hiển thị dữ liệu GET `/buybacks/{caseId}/payment-proofs`, gồm trạng thái, tiền, tệp, thời điểm gửi, mã chứng từ, lý do và thao tác theo quyền; thêm empty state. API, payload và điều kiện duyệt không đổi. TypeScript, lint (0 lỗi; warning hook có sẵn ngoài scope), production build và `git diff --check` pass. Không chạy E2E/test và không gửi mutation Dolores thật. Phase 3–5 vẫn `partial`/`unverified` theo staging gates đã ghi ở trên.
- Owner payment receipt update 2026-11-05: đồng bộ FE với `POST /buybacks/payment-proofs/{proofId}/owner-receipt` và payload bắt buộc `received`, `idempotencyKey`, `correlationId`; Owner chỉ thao tác từ action dashboard `BUYBACK_OWNER_RECEIPT` do BE trả. `received: true` xác nhận chứng từ và chuyển hồ sơ sang PAID; `received: false` giữ PAYMENT_PENDING, ghi trạng thái Owner chưa nhận và gỡ action cho tới khi Moderator/Admin tải chứng từ cập nhật. Operator không còn duyệt chứng từ v2; review cũ chỉ còn cho v1. Bổ sung hiển thị trạng thái/thời điểm Owner phản hồi và cập nhật action tải lại chứng từ sau khi Owner báo chưa nhận.
- Verification Owner payment receipt: TypeScript, lint và production build pass; Chromium production-server E2E buyback pass 5/5. Luồng chính mock kiểm tra cả `received:false` → Owner action tạm dừng → Moderator tải chứng từ mới → Owner `received:true` → PAYMENT `PAID`, cùng payload idempotency/correlation và không gọi `/review` cho v2. Lần chạy ban đầu bằng Next dev gặp 404 do test đi tới `/dashboard/overview`; fixture đã sửa về route Owner thực tế `/dashboard` và production E2E pass. Các request Dolores đều được mock; không gửi mutation thật. `git diff --check` pass.
- Gate Owner payment receipt: kết quả production-server E2E chứng minh tích hợp FE với contract fixture, không xác minh phân quyền hay side effect trên Dolores thật. Trạng thái Phase 3–5 tiếp tục `partial`/`unverified` cho đến khi có staging identity/case và các gate evidence-reference/model đã nêu ở trên; không commit, push hoặc deploy.
- Detail parsing follow-up 2026-11-05: cho phép `refurbishment.machineId` null trong schema FE, khớp BuybackRefurbishmentResponse của BE. Workflow v2 tạo bản ghi tân trang trước khi máy được đăng ký, nên chưa có machine ID; schema cũ bắt buộc UUID và khiến GET `/buybacks/{caseId}` trả dữ liệu bị báo không hỗ trợ. Chỉ sửa parser; không đổi API hoặc luồng. `git diff --check` pass; chưa chạy test/build.
