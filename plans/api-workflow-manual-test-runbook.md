# Runbook kiểm thử thủ công các luồng API theo role

**Ngày:** 2026-11-02  
**Phạm vi:** 10 luồng người dùng trong [plan API Workflow](./api-workflow-guide-ui-api.md).  
**Môi trường:** Chỉ chạy trên local/staging được xác nhận là không production.

Runbook này hướng dẫn kiểm tra UI, phân quyền và trạng thái server sau mỗi bước. Một màn hình mở được không đồng nghĩa luồng đã PASS. Đánh dấu `BLOCKED` nếu đến bước cần API hoặc bằng chứng chưa được backend xác nhận; không tự đoán request để đi tiếp.

## 1. Chuẩn bị một bộ dữ liệu test

Tạo hoặc nhờ backend chuẩn bị dữ liệu dành riêng cho test:

- `ADMIN`: tài khoản vận hành toàn hệ thống.
- `MODERATOR-A`: chỉ có quyền trong phạm vi hợp đồng của `OWNER-A`.
- `OWNER-A` và `OWNER-B`: hai tài khoản thuộc hai phạm vi dữ liệu khác nhau.
- `TECH-A`: Technician được giao máy/công việc của `OWNER-A`.
- `TECH-B`: Technician không được giao các máy/công việc đó.
- Hợp đồng test còn hiệu lực; địa điểm; một máy thường; một máy `SMART_IOT`.
- Hóa đơn test `RENTAL` chưa nộp chứng từ và một hóa đơn riêng để kiểm tra nhánh từ chối chứng từ.
- Yêu cầu bảo trì, RepairCase, termination case/recall work order, buyback và cảnh báo test tương ứng nếu backend có seed dữ liệu.
- File PDF/ảnh giả lập đã được duyệt dùng trong staging; không dùng sao kê, thông tin khách hàng hay bằng chứng thanh toán thật.

Mở mỗi role trong một phiên trình duyệt riêng (hoặc đăng xuất hoàn toàn trước khi đổi role). Ghi lại URL môi trường, build/commit, browser, role và ID các fixture. Không ghi token, cookie, nội dung chứng từ riêng tư hoặc PII vào báo cáo.

### Quy ước kết quả

- `PASS`: thao tác đúng role, request/response đúng hợp đồng, UI cập nhật theo trạng thái server.
- `FAIL`: sai quyền, sai dữ liệu, mất trạng thái, gửi trùng hoặc lỗi UI/API ngoài dự kiến.
- `BLOCKED`: thiếu endpoint, quyền, fixture hoặc luồng evidence đã được xác nhận.
- `NOT RUN`: chưa thực hiện.

Mỗi thao tác ghi nhận: role, resource ID, hành động, trạng thái UI trước/sau, endpoint và HTTP status nhìn thấy trong Network, kết quả mong đợi, kết quả thực tế. Che thông tin xác thực trước khi chụp ảnh hoặc chia sẻ log.

## 2. Kiểm tra chung cho từng màn hình

Với từng role, kiểm tra các trường hợp phù hợp trước khi chạy luồng nghiệp vụ:

1. Mở màn hình lần đầu: loading xuất hiện rồi dữ liệu hiển thị; không tạo request ghi ngoài ý muốn.
2. Thử danh sách rỗng: UI phân biệt empty với lỗi hoặc forbidden.
3. Thử lỗi mạng/401/403/404 hoặc 409 bằng fixture/mock được phép: thông báo đúng, có thể thử lại khi phù hợp; không hiển thị dữ liệu cũ như thể mới tải thành công.
4. Refresh trang ở trang danh sách và chi tiết: route còn hợp lệ, ID lấy từ URL/API vẫn được giữ đúng.
5. Dùng một ID đã biết thuộc `OWNER-B` khi đăng nhập `OWNER-A` hoặc `MODERATOR-A`; backend phải từ chối/ẩn dữ liệu. Không thử ID ngẫu nhiên.
6. Sau mutation, kiểm tra trạng thái được tải lại từ server; không chỉ đổi nhãn local/optimistic.
7. Đăng xuất rồi đăng nhập role khác: cache của role trước không được hiện trong phiên mới.

## 3. Mười luồng nghiệp vụ

### Luồng 1 — Tạo tài khoản Owner và xác minh hồ sơ

**Vai trò:** ADMIN tạo tài khoản; OWNER đăng nhập; MODERATOR kiểm tra hồ sơ trong phạm vi được phép.

1. ADMIN vào quản lý người dùng, tạo tài khoản với role Owner và email test duy nhất.
2. Kiểm tra phản hồi thành công hiển thị đúng trạng thái gửi email/mật khẩu tạm thời theo API; không ghi mật khẩu vào log.
3. Dùng UUID trả về để mở hồ sơ Dolores và hợp đồng của Owner. Xác nhận ID, tên/email và trang dữ liệu khớp tài khoản vừa tạo.
4. OWNER đăng nhập bằng flow IDaaS thực tế và mở hồ sơ/hợp đồng của mình.
5. OWNER-A không được xem hồ sơ/hợp đồng OWNER-B. MODERATOR-A chỉ thấy hồ sơ theo phạm vi backend cho phép.

**PASS khi:** role tạo đúng, UUID được nối xuyên suốt, dữ liệu không lẫn Owner. Không gọi API internal profile-sync từ browser.

### Luồng 2 — Tạo địa điểm, máy và gán máy

**Vai trò:** ADMIN hoặc role được backend cấp quyền; OWNER kiểm tra dữ liệu thuộc mình; Technician kiểm tra quyền máy nếu đã cấp.

1. Tạo địa điểm test trong phạm vi Owner/tenant đúng.
2. Tạo máy thường và máy Smart IoT bằng form hiện có.
3. Gán máy vào địa điểm bằng ID máy và location do API trả về; refresh cả chi tiết máy và địa điểm.
4. Nếu kiểm thử quyền truy cập Technician cấp theo máy, cấp cho TECH-A rồi kiểm tra TECH-A; thử TECH-B để xác nhận không có quyền.
5. Phân biệt quyền truy cập máy với phân công một ticket: cấp quyền máy không được tự tạo assignment công việc.
6. OWNER-A kiểm tra chỉ thấy tài sản của mình; OWNER-B không thấy các máy test của OWNER-A.

**PASS khi:** ID chuẩn từ response được dùng cho bước tiếp, danh sách/chi tiết đồng bộ sau refresh, scope Owner đúng.

### Luồng 3 — Hóa đơn và chứng từ thanh toán

**Vai trò:** OWNER nộp chứng từ; ADMIN/MODERATOR duyệt theo quyền.

1. OWNER mở hóa đơn `RENTAL`, xem chi tiết và line items; xác nhận số tiền/kỳ lấy từ API.
2. Nộp file test hợp lệ nhỏ hơn giới hạn API (20 MiB), với số tiền hợp lệ.
3. Kiểm tra response trả proof ID và trạng thái chờ duyệt; refresh trang để xác nhận server đã lưu.
4. ADMIN hoặc MODERATOR mở proof, tải nội dung được phép và duyệt với lý do không rỗng.
5. Kiểm tra proof/hóa đơn đổi trạng thái sau khi tải lại. Dùng hóa đơn/proof khác để kiểm thử nhánh từ chối; không đổi quyết định trên chứng từ thật.
6. Nếu mô phỏng timeout/retry trong staging, retry đúng cùng thao tác bằng luồng UI; xác nhận không tạo proof trùng.
7. OWNER-A thử mở hóa đơn OWNER-B; phải bị chặn.

**PASS khi:** file được gửi dạng multipart, có idempotency theo hợp đồng, UI không tuyên bố đã nhận tiền chỉ vì upload thành công. Không dùng `POST /payments` cũ và không thực hiện thanh toán thật.

### Luồng 4 — Yêu cầu bảo trì, ticket và chi phí sửa chữa

**Vai trò:** OWNER xác nhận lịch; ADMIN tạo/giao ticket; TECH-A thực hiện phần được phép; OWNER/operator xử lý review chi phí nếu có.

1. OWNER mở yêu cầu bảo trì của máy mình và xác nhận lịch phù hợp.
2. ADMIN tạo preventive ticket từ request đã xác nhận; kiểm tra ticket giữ đúng request ID.
3. ADMIN tìm Technician đủ điều kiện, giao ticket cho TECH-A.
4. TECH-A mở `/technician/tasks`; xác nhận maintenance ticket và installation work order là hai nguồn/công việc riêng.
5. TECH-A bắt đầu công việc và cập nhật parts/status theo form được bật. Refresh để xác nhận trạng thái từ API.
6. Kiểm tra chi tiết repair-cost review và điều kiện cần có trước khi bắt đầu/hoàn thành công việc.
7. **Điểm dừng hiện tại:** nếu bước hoàn tất/đề xuất chi phí cần private evidence mà hệ thống không có flow upload/đọc đã xác nhận, đánh dấu `BLOCKED`; không nhập URL hoặc tự điền evidence reference. Xác nhận các nút phụ thuộc evidence bị khóa.

**PASS phần khả dụng khi:** scope ticket đúng Technician; lỗi của một nguồn công việc không làm mất nguồn còn lại; bước bị chặn được giải thích rõ. Chỉ kết luận end-to-end khi backend cung cấp evidence flow.

### Luồng 5 — Chấm dứt hợp đồng và thu hồi máy

**Vai trò:** ADMIN/MODERATOR khởi tạo hoặc theo dõi; TECHNICIAN thao tác phần việc được giao; OWNER xác nhận custody khi UI/API yêu cầu.

1. Trên hợp đồng test, mở phần termination/recovery và tạo hoặc mở case chỉ từ ID do API trả về.
2. Kiểm tra recall work order list; mở work order để lấy termination case ID. Không đoán hoặc nhập ID không có trong response.
3. TECHNICIAN kiểm tra chỉ thấy recall work order được giao; TECH-B không được truy cập việc của TECH-A.
4. Theo dõi các trạng thái recovery/custody do server trả về; xác nhận Owner acknowledgement ở đúng bước nếu được bật.
5. Tạo/kiểm tra inspection ticket chỉ khi case đã tới điều kiện mà server trả về.
6. **Điểm dừng hiện tại:** case không có recall work order chưa có collection riêng để tìm; inspection/settlement cần private evidence chưa có upload/read contract xác nhận. Đánh dấu `BLOCKED` ở bước đó, không tự chuyển trạng thái hợp đồng.

**PASS phần khả dụng khi:** case ID bắt nguồn từ response, ticket/case được nối đúng và không hiển thị case ngoài scope. Chỉ dùng case test mới cho bước hoàn tất không thể đảo ngược.

### Luồng 6 — Máy thay thế trực tiếp và RepairCase

**Nhánh A: thay thế theo Contract**

1. ADMIN/MODERATOR mở Contract test, chọn máy thay cùng loại và nhập khoảng thời gian/lý do hợp lệ.
2. Tạo assignment một lần; kiểm tra assignment ID/status `PLANNED` từ server và hiển thị trong chi tiết.
3. Dùng Contract test khác để kiểm tra hủy khi assignment còn `PLANNED`.
4. Không thử activate/release nếu chưa có private evidence hợp lệ được backend chấp nhận.

**Nhánh B: RepairCase**

1. OWNER gửi intake cho máy của mình; kiểm tra `machineId`/request ID và trạng thái từ response.
2. ADMIN/MODERATOR mở intake, triage chấp nhận/từ chối bằng lý do phù hợp. Dùng intake khác cho nhánh còn lại.
3. Nếu case hiển thị `REPLACEMENT_PLANNED`, kiểm tra máy thay thế/assignment đã tồn tại; không tạo assignment trùng.
4. ADMIN/MODERATOR giao ticket cho Technician được API xác nhận. TECH-A chỉ thấy việc được giao.
5. Theo checklist custody của API/UI: Technician/Admin/Moderator ghi nhận `PRIMARY_COLLECTED`; OWNER acknowledge sự kiện trước khi tiếp tục.
6. ADMIN/MODERATOR activate assignment sau khi máy chính đã được Owner xác nhận nhận lại theo điều kiện API; ghi `REPLACEMENT_DELIVERED`; OWNER acknowledge trước khi Technician chẩn đoán.
7. TECH-A ghi diagnosis. Nếu có nhánh cost review, kiểm thử trạng thái chờ/duyệt riêng; không coi quyết định tài chính là custody acknowledgement.
8. TECH-A bắt đầu việc với `workScope`; chỉ thêm emergency authorization nếu có tranh chấp và authorization hợp lệ đúng scope.
9. Hoàn tất sửa chữa chỉ khi API cho phép và có diagnosis, resolution result, work scope cùng private evidence reference hợp lệ. UI hiện chưa có nguồn evidence riêng đã xác nhận nên nhiều khả năng phải đánh dấu `BLOCKED` ở đây.
10. Sau sửa chữa: ghi `REPLACEMENT_COLLECTED`, Owner acknowledge; tiếp theo ghi `PRIMARY_RETURNED`, Owner acknowledge.
11. Chỉ release assignment/đóng case khi các custody acknowledgement đã hoàn tất. Dùng case test riêng cho bước đóng.

**PASS phần khả dụng khi:** đúng máy chính/máy thay thế theo từng event, thứ tự event và acknowledgement đúng; mỗi bước đọc trạng thái server. Nếu thiếu evidence API, dừng tại prerequisite đó thay vì gọi mutation trực tiếp.

### Luồng 7 — Buyback, thanh toán và refurbishment

**Vai trò:** OWNER tạo/xem hồ sơ; ADMIN/MODERATOR định giá/duyệt; TECHNICIAN chỉ kiểm tra việc được giao nếu backend có route discovery hợp lệ.

1. OWNER tạo buyback test từ Contract/máy đủ điều kiện và mở lại hồ sơ bằng ID response.
2. ADMIN/MODERATOR kiểm tra hồ sơ, thực hiện bước định giá/quyết định được UI bật; xác nhận server trả trạng thái mới.
3. Dùng proof test để kiểm tra upload/review nếu endpoint và fixture staging đã được xác nhận; không chuyển tiền thật.
4. Kiểm tra trạng thái collection và điều kiện bắt đầu refurbishment/QA.
5. **Điểm dừng hiện tại:** chưa có Technician case-list/assignment discovery contract; thiếu payment/proof collection reads và private evidence flow cho xác nhận thu máy. Đánh dấu `BLOCKED`; không tự gõ ID case cho Technician hoặc xác nhận thu máy bằng evidence tự tạo.

**PASS phần khả dụng khi:** Owner/operator list/detail phản ánh server state, quyết định chỉ xuất hiện cho role phù hợp, không tuyên bố thanh toán/thu máy đã xong khi chưa có xác nhận backend.

### Luồng 8 — Menu toàn cục, snapshot Owner và sync

**Vai trò:** ADMIN/MODERATOR quản lý menu toàn cục theo quyền; OWNER sao chép/chỉnh snapshot và yêu cầu sync.

1. ADMIN/MODERATOR xem danh sách/chi tiết menu toàn cục và thực hiện thao tác quản lý chỉ khi quyền backend cho phép.
2. OWNER-A duyệt menu/công thức toàn cục, sao chép vào menu cục bộ và chỉnh một trường trong snapshot.
3. OWNER-B mở menu cục bộ: không được thấy hoặc sửa snapshot của OWNER-A. OWNER-A cũng không được sửa menu toàn cục.
4. OWNER-A chọn máy UUID hợp lệ và yêu cầu sync; xem trạng thái/lịch sử do server trả về.
5. Refresh và xác nhận request/status/history nhất quán. Không gọi device poll/ack hoặc dùng device token trong browser.

**PASS khi:** snapshot độc lập với nguồn toàn cục, scope theo Owner đúng, sync chỉ báo trạng thái server xác nhận.

### Luồng 9 — Heartbeat và telemetry

**Vai trò:** ADMIN; OWNER của máy; TECHNICIAN được giao máy. Moderator hiện bị giới hạn bởi contract mismatch.

1. ADMIN mở máy `SMART_IOT`, xem heartbeat; nếu màn có auto-refresh, xác nhận lần đọc tiếp theo theo chu kỳ khoảng 5 giây.
2. ADMIN tải telemetry theo khoảng ngày; kiểm tra phân trang tối đa 100 điểm mỗi lần và nút tải thêm chỉ gọi khi người dùng yêu cầu.
3. OWNER-A đọc heartbeat/telemetry máy của mình. Thử máy OWNER-B bằng ID fixture đã biết; không được lộ dữ liệu.
4. TECH-A đọc máy trong assignment; TECH-B thử cùng máy để xác nhận bị chặn.
5. Máy thường hoặc máy chưa được xác nhận `SMART_IOT` không được gọi API telemetry.
6. Với MODERATOR, kiểm tra danh sách máy vẫn hoạt động nhưng UI báo chưa được cấp quyền telemetry và **không phát request heartbeat/points** cho tới khi backend thống nhất quyền.

**PASS khi:** query có scope đúng role/subject, không tải points không giới hạn, không có telemetry request cho máy/role không hợp lệ; không gửi dữ liệu thiết bị hay command từ frontend.

### Luồng 10 — Dashboard, action items, cảnh báo và inbox

**Vai trò:** ADMIN, MODERATOR, OWNER, TECHNICIAN theo quyền từng endpoint.

1. Mỗi role mở overview, lọc action items theo bucket/trang; xác nhận loading, empty, lỗi và pagination.
2. Mở một action item: liên kết phải tới route frontend hợp lệ trong cùng role, không điều hướng thẳng tới `/api/...`.
3. ADMIN/MODERATOR dùng cảnh báo test `HIGH` hoặc `CRITICAL` để acknowledge. Kiểm tra đang xử lý/lỗi; khi server xác nhận, danh sách alert được tải lại và status cập nhật.
4. Thử alert mức thấp hoặc đã acknowledge: không có nút acknowledge.
5. Đọc notification chưa đọc, đánh dấu một thông báo đã đọc; xác nhận unread count/list chỉ đổi sau response thành công. Thử mark-all chỉ ở role/UI được cấp.
6. Đăng nhập role khác và kiểm tra inbox/cache tách biệt; không hiển thị thông báo của phiên trước.
7. Không acknowledge alert production hoặc alert không được phép thay đổi.

**PASS khi:** query/cache phân tách role và subject, acknowledgement dựa trên server response, action-item link không làm lộ API endpoint.

## 4. Kết thúc một lượt kiểm thử

Trước khi kết luận một luồng:

- Ghi trạng thái `PASS`, `FAIL`, `BLOCKED` hoặc `NOT RUN` cho từng bước; không gộp `BLOCKED` thành `PASS`.
- Đính kèm ảnh UI đã che PII và log Network đã loại token/cookie/nội dung file riêng tư.
- Ghi lại resource ID test, trạng thái trước/sau, endpoint, HTTP status và lỗi console nếu có.
- Với thất bại sau mutation hoặc timeout, tải lại resource/timeline trước khi retry. Dùng lại cùng idempotency key chỉ cho cùng thao tác và payload.
- Dọn dữ liệu test chỉ qua quy trình staging được cấp quyền; không tự xóa/đóng dữ liệu ngoài fixture test.
- Không chạy settlement, release/close, QA final, payment, hoặc các hành động không đảo ngược trên dữ liệu thật.

## 5. Các điểm đang chờ backend hoặc runtime

- Private evidence upload/read cho một số bước bảo trì, chi phí, termination, RepairCase và buyback.
- Collection/discovery APIs còn thiếu cho termination case và Technician buyback assignment.
- Payment/proof collection reads cho buyback chưa đủ để kiểm thử end-to-end.
- Heartbeat controller documentation và enforced Moderator service scope chưa đồng nhất.
- Admin replay/reconcile endpoint chưa có contract xác nhận.
- Kiểm thử UI đã đăng nhập, mobile/360 CSS px, 200% zoom và live Swagger parity cần môi trường staging, role accounts và backend contract tương ứng.
