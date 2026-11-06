# Cleaning & Telemetry — đặc tả FE đã chốt

Ngày: 2026-11-06. Trạng thái: thiết kế và ba quyết định vận hành được người dùng chốt; kế hoạch đã rà soát. Chưa triển khai.

## Nguồn và phạm vi

- Đặc tả người dùng: `C:/Users/khang/.codex/attachments/72be5c5a-308a-4f09-8860-10c9bb8f8eac/Pasted text.txt`, dẫn nguồn BE main `fb11d12`. Đây là thông tin đọc source, chưa phải bằng chứng runtime.
- FE đã rà tại `5cb5f07`: có telemetry API/schema, shared machine presentation và role pages; Owner operations vẫn đọc dashboard tổng hợp. Next Pages Router; Owner operations được catch-all route dispatch, không thêm route vật lý trùng.
- Giữ layout shell, bảng, card, button, font và màu Dolores hiện tại. Chỉ mở rộng vùng máy/vận hành liên quan.
- Phạm vi triển khai: Owner Analytics, lịch sử vệ sinh, hoàn thiện heartbeat/telemetry theo quyền, Offline Review. Provisioning identity/certificate, replay/reconcile, ingestion, 3D và tỷ lệ compliance là phần sau; không có UI mutation cho các phần này.
- Tài liệu này thay thế giả định cũ về quyền heartbeat Moderator và việc chưa có API số ly từng máy trong plan IoT 2026-11-01. Không sửa trạng thái/bằng chứng lịch sử của plan đó.

## User stories

| ID | Ưu tiên | Hành vi và điều kiện nghiệm thu |
|---|---|---|
| CT-01 | P1 | Owner mở danh sách/hồ sơ máy, thấy kết nối, số ly hôm nay và vệ sinh đầu/cuối ngày; không biến lỗi tải thành 0, OFFLINE hoặc chưa vệ sinh. |
| CT-02 | P1 | Owner mở dữ liệu vận hành máy; tab Pha chế/Vệ sinh/Kết nối & thông số và bộ lọc sống trong URL, mở thẳng/refresh/Back/Forward khôi phục chính xác. |
| CT-03 | P1 | Pha chế dùng cup-count + brew-records trong phạm vi Owner và máy đang chọn, có phân trang; không gán phí hoặc doanh thu từ số ly. |
| CT-04 | P1 | Vệ sinh hiển thị bản ghi STARTUP/CLOSING, COMPLETED/FAILED/ABORTED và chi tiết cờ; không kết luận thiếu chỉ vì một trang không có bản ghi. ABORTED được xác nhận qua source và OpenAPI, thay mô tả INTERRUPTED ban đầu. |
| CT-05 | P1 | Admin/Owner/Technician đọc heartbeat/points theo quyền BE; Moderator không gửi hai request này. Kết nối và health tách biệt. |
| CT-06 | P1 | Admin/Moderator/Owner xem Offline Review trong scope; chỉ Admin/Moderator được ghi NO_ACTION/FOLLOW_UP khi REVIEW_REQUIRED, có reason/evidenceReferences và xác nhận. |
| CT-07 | P2 | Giao diện dùng được bằng bàn phím, mobile 390px, tablet 768/1023px và desktop 1024/1440px; state tải/rỗng/lỗi/quyền rõ ràng. |

## API và nguồn dữ liệu

| API | Dùng | Ràng buộc |
|---|---|---|
| GET /api/v1/owner/cup-count | Tổng ly, theo máy/ngày/món | OWNER; from inclusive/to exclusive Instant; không truyền ownerId. Chỉ máy có Contract ACTIVE. |
| GET /api/v1/owner/brew-records | Lịch sử pha | OWNER; machineId, recipeName, page/size; PageResponse. |
| GET /api/v1/owner/cleaning-records | Lịch sử vệ sinh | OWNER; machineId, cleaningType/status, page/size; PageResponse. |
| GET /api/v1/telemetry-query/machines/{id}/heartbeats/latest | Kết nối và health | ADMIN/OWNER/TECHNICIAN theo scope, không MODERATOR. Dùng status server, không suy OFFLINE từ request lỗi. |
| GET /api/v1/telemetry-query/machines/{id}/points | Time-series | limit 1–500, offset ≤100000, mặc định max range 30 ngày cần xác minh runtime. |
| GET /api/v1/offline-violation-reviews | Review list | ADMIN/MODERATOR/OWNER theo scope; X-Page/X-Page-Size/X-Has-Next. |
| GET /api/v1/offline-violation-reviews/{id} | Review detail | Cùng scope; kiểm tra machine/contract context nếu đã chọn. |
| POST /api/v1/offline-violation-reviews/{id}/decision | Ghi quyết định | Admin/Moderator, REVIEW_REQUIRED; reason ≤2000, evidenceReferences bắt buộc; không phát sinh phạt/nợ. |
| GET /api/v1/machines/{id}/maintenance-schedule | Hạn bảo trì | Giữ section riêng; không dùng để suy ra vệ sinh hàng ngày. |

## Thiết kế và route

- Giữ `/dashboard/machines`, `/dashboard/machines/{id}` và `/dashboard/machines/{id}/operations`. Các route Admin/Moderator hiện có giữ nguyên; Technician giữ machine-check route.
- Operations query đề xuất: `tab=brewing|cleaning|connection`; ngày lịch `fromDate`, `toDate`; telemetry riêng `telemetryFrom`, `telemetryTo`, `field`; pha chế dùng `brewPage`, `recipeName`; vệ sinh dùng `cleaningPage`, `cleaningType`, `cleaningStatus`; offline review dùng `reviewId`, `reviewPage`, `reviewStatus`. Chuẩn hóa allowlist, reset page tương ứng khi filter đổi, không xóa query không thuộc feature.
- Hôm nay/Hôm qua/7 ngày/30 ngày/Tùy chọn cho analytics. Ngày lịch Asia/Ho_Chi_Minh đổi thành UTC Instant, `to` là đầu ngày kế tiếp. Không dùng timezone máy tính người xem.
- Daily breakdown API có thể là bucket UTC: phải xác minh source/runtime trước khi gọi cột là ngày Việt Nam; không chỉ đổi nhãn ngày UTC. Nếu UTC, chart ghi rõ ngày UTC hoặc dùng tổng/histories cho ngày VN; không cộng từ trang history thiếu dữ liệu.
- Telemetry 24h/7d/30d/Tùy chọn; không trộn ngày lịch analytics; một field numeric mỗi chart, không tự đoán đơn vị hay nội suy dữ liệu mất.
- Danh sách máy có badge kết nối và vệ sinh gọn. Không tạo GET cleaning cho mọi máy ở mỗi nhịp heartbeat. Một trang cleaning chung chỉ xác nhận trạng thái cho các máy có bản ghi; máy thiếu bằng chứng hiển thị chưa kiểm tra đến khi có scoped query đủ điều kiện. Không quét toàn bộ lịch sử vô hạn để dựng badge.
- Hồ sơ có số ly hôm nay và hai trạng thái vệ sinh. Có ít nhất một COMPLETED đúng loại thì ghi hoàn tất; nếu chỉ có FAILED/ABORTED nêu đúng kết quả; chỉ ghi chưa ghi nhận sau khi đã kiểm tra đủ phạm vi. Source hiện trả boolean bắt buộc; null là lỗi cấu trúc, không đổi thành false.
- Owner dùng analytics riêng; Admin/Moderator không gọi Owner API và không lấy tổng role làm số máy. Không thêm chỉ số vệ sinh cho role thiếu API đọc phù hợp.

## Kiến trúc và giới hạn

- Queries/mutations/role scope tại page role hoặc adapter hiện có; component `src/components/machines` chỉ trình bày và callback. Tái sử dụng DataTable, ButtonBar, ActionBarConfig, tabs, styles và Recharts đã cài.
- API ở src/apis, schema Zod ở src/schema. File mới source/test cần duyệt riêng theo MIGRATION_WORKFLOW trước lúc tạo; duyệt tài liệu không đồng nghĩa duyệt mọi source file đề xuất.
- Cache có auth subject+role+machine+filter+page; hủy request cũ khi đổi máy/tài khoản, không hiển thị previous data sai ngữ cảnh. Cấm retry tự động 401/403/mutation; 503 GET retry hữu hạn có backoff.
- Response không khớp schema phải báo lỗi; không nới enum/null/timezone tùy tiện. Đối chiếu OpenAPI/runtime trước khi khóa schema. Không log token, health raw, chứng cứ hay private key.
- Triển khai theo cook --hard --tdd; không mutate server, không chạy Docker, không chỉnh BE/config scheduler trong Phase 01.

## Đối chiếu Phase 01 — 2026-11-06

- GET OpenAPI server `http://100.75.202.72:8082/v3/api-docs` và BE checkout `fb11d12` xác nhận các route/DTO Owner Analytics, Offline Review và Heartbeat; chưa có capture authenticated data/role scope.
- `CleaningRecordStatus.java` và OpenAPI dùng ABORTED; cleaning flags là boolean primitive bắt buộc. Nullable: finishedAt/notes; brew receivedAt có thể null theo mapper.
- `OwnerAnalyticsService` đổi Instant sang LocalDateTime UTC; `BrewRecordRepository.aggregateDailyCups` CAST ngày từ UTC. Chart phải ghi ngày UTC, total vẫn theo bounds người dùng chọn. activeMachineCount là tổng fleet ACTIVE, không phải số máy trong filter.
- `OfflineViolationReviewResponse` dùng LocalDateTime không offset, service dùng giờ deployment chưa xác minh. Giữ nguyên chuỗi local; chưa được đổi sang VN/UTC. evidenceReferences private:// và tối đa 2000 ký tự theo service/DTO.
- application.yaml mặc định telemetry 30d/500 points, environment có thể override; FE dùng giới hạn bảo thủ 30d/500, giữ mỗi lần gọi 100 points.
- Cleaning snapshot đề xuất tối đa 5 trang ×100 dòng, tuần tự, chỉ mở/làm mới; chưa triển khai query UI. Nếu vượt budget còn dữ liệu thì trạng thái chưa kiểm tra đầy đủ, không kết luận thiếu. Detail có thể dùng scoped queries có giới hạn trong Phase02.

## Các quyết định đã được người dùng xác nhận — 2026-11-06

1. Danh sách máy tải trạng thái vệ sinh khi mở trang/làm mới, heartbeat vẫn theo visibility; không polling cleaning liên tục.
2. Lịch sử Owner inactive trả rỗng phải giải thích giới hạn hợp đồng ACTIVE, không nói toàn bộ lịch sử không tồn tại.
3. Nếu chưa có hai Owner session và Technician grant test, kiểm thử giả lập trước và ghi live scope chưa xác minh; không kết luận BE đã kiểm soát scope.
