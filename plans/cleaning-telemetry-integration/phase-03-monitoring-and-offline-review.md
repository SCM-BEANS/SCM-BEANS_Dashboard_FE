# Phase 03 — Monitoring và Offline Review

Status: passing; code review APPROVED; người dùng đã duyệt Phase 04.
Canonical ID: `phase-03-monitoring-and-offline-review`.
Stories: CT-05, CT-06, CT-07.

## Mục tiêu và tasks

Đồng bộ cách đọc kết nối/thông số ở role được phép và thêm review mất kết nối đúng scope, không biến review thành phạt/nợ.

1. Mở rộng active `MachineHeartbeatPanel`: nhóm connection riêng health, lastSeen/healthReportedAt rõ timezone VN;0 hợp lệ; health cũ không được quảng bá là hiện tại. Có nhãn người dùng, chi tiết kỹ thuật mở rộng.
2. TelemetryHistoryPanel giữ field picker/chart/table; dùng timestamp thật trên trục thời gian, numeric finite, không đoán unit; ghi phạm vi điểm đã tải khi còn trang. Range/field controlled bởi page để URL khôi phục; limit/range theo phase01.
3. Admin/Owner query có subject và visible/Smart IoT gate; pause polling background/offscreen, giữ stagger list. Technician nối query thực sự vào machine-check detail theo grant runtime sau machine lookup;403 là state quyền, không OFFLINE. Không nối duplicate panels không consumer trong features/operations.
4. Moderator không request heartbeat/points trên mọi entry/retry/deep link; card quyền tiếng Việt trong vị trí hợp lý. Có link review theo máy từ hồ sơ, không dùng annotation Swagger để tự mở quyền.
5. Offline list/detail ở Admin IoT, Moderator IoT, Owner connection tab; query reviewId/status/page/machine có URL. Dùng pagination headers và kiểm tra response context. Owner read-only; Technician không query review.
6. Shared offline review presentation nhận dữ liệu/state/callback. Admin/Moderator decision form chỉ REVIEW_REQUIRED, NO_ACTION/FOLLOW_UP; reason trim≤2000, evidenceReferences bắt buộc; xác nhận NotificationDialog hiện có.
7. Trước submit đọc lại detail/gate; pending khóa double submit. Timeout không auto-retry POST; refetch xác định kết quả.409 refresh giữ draft reason nhưng không gửi lặp; không thêm idempotency header/API không được mô tả.

## File/modules

- Shared: `src/components/machines/machine-heartbeat-panel.tsx`, `telemetry-history-panel.tsx`, `smart-iot-panel.tsx`, `machines.module.css`; đề xuất `src/components/machines/offline-review-panel.tsx` cần duyệt tạo.
- Admin: `src/pages/admin/machines/index.page.tsx`, `machine-detail-screen.tsx`, `machine-operational-overview-screen.tsx` nếu cần link/filter, `src/pages/admin/iot/index.page.tsx`.
- Moderator: `src/pages/moderator/iot/iot-screen.tsx`, `src/pages/moderator/machines/machine-detail-screen.tsx` và operations nếu dùng chung tab rendering; giữ machine/contract quản lý.
- Owner: operations page đã sửa Phase02, integrate offline read-only; không thay analytics thành global.
- Technician: `src/pages/technician/machine-check/machine-detail-screen.tsx` — queries và shared panels theo scope; giữ action task hiện có.
- Adapter/schema Offline Review từ phase01; role messages theo file text hiện tại. Path helper chỉ đổi khi cần query link, không route hierarchy mới.
- Test hiện có `tests/dolores-telemetry.test.cjs`, `tests/admin-machines-iot.test.cjs`, E2E operations và offline adapter tests đã duyệt nếu có.

## Dependencies

Phase01 DTO/permission/pagination; Phase02 Owner operations tabs. Chưa có mutation test environment thì kiểm tra request/409/timeout bằng mock; live mutation cần ủy quyền cụ thể trước hành động, không mặc định test trên server chung.

## Tests / acceptance

- S01/S02/S03/S04/S21/S22/S26/S34: subject isolation, correct machine/role, Moderator zero calls, Technician expired grant403, Owner read-only review và Technician no review.
- S05/S06/S33: double click/timeout/409 không duplicate mutation, required reason/evidence đúng schema, không billing/penalty route.
- S07/S08/S11/S12/S14: invalid range/page, health0/null, header paging, Smart IoT/visible budget.
- S19/S31: Influx503 cục bộ, OFFLINE và stale health tách biệt; không ẩn số ly/cleaning.
- S28/S30: không log raw nhạy cảm, không gọi device ingestion/provisioning/replay.
- Irregular timestamps render đúng khoảng thời gian; field text chỉ bảng; chart không tuyên bố toàn bộ lịch sử khi còn page.
- Live GET role acceptance ghi riêng với mocks; kiểm tra UI390/768/1023/1024/1440px và action bar.

## Risks / gate

Không có endpoint upload evidence riêng cho offline review trong đặc tả: chỉ nhận reference theo schema, không bịa file upload. GET403 không chứng minh máy offline; review state server là nguồn quyết định. Admin/Moderator không có Owner Analytics thì không dựng số ly/vệ sinh từng máy giả để ép cùng dữ liệu.

## Kết quả triển khai — 2026-11-07

- Shared `OfflineReviewPanel` đã được duyệt và tạo đúng đường dẫn; chỉ nhận data/state/callback. Query và quyết định thuộc Admin/Moderator IoT; Owner connection tab chỉ đọc. Technician không gọi offline review.
- URL giữ reviewId/reviewStatus/reviewPage/machineId, có kiểm tra UUID/context và reset bộ lọc sai. Query keys có authenticated subject. Moderator profile có liên kết đến review theo máy, không gọi heartbeat/points.
- Form quyết định chỉ REVIEW_REQUIRED, bắt buộc lý do và private reference đúng schema, có NotificationDialog và khóa double submit. Adapter GET lại trạng thái trước POST; không retry mutation; sau thành công/lỗi đều refetch. 409 giữ draft; timeout/response không hợp lệ báo chưa xác minh kết quả.
- Admin heartbeat list/detail có subject, Smart IoT/visibility gate. Admin/Technician giữ range/field trong URL; trường thời gian nhập và hiển thị theo UTC+7. Shared chart dùng timestamp thật và ghi rõ phần dữ liệu đã tải.
- TDD: offline từ 4 RED ban đầu thành 11/11; ba bộ telemetry/Owner Analytics/offline đạt 33/33. Playwright file operations đạt 10/10, gồm ba role tại 390/768/1023/1024/1440px, Owner readonly/deep link/refresh, Moderator zero telemetry + một POST + giữ draft khi 409, Admin form + Back/Forward và analytics regressions.
- Code review APPROVED sau sửa một finding MEDIUM về thông báo lỗi mutation. Lint: 0 errors/3 warnings cũ; git diff --check đạt. Full Node: 204/296, còn 92 failures (khớp số lượng baseline đã ghi; chưa đối chiếu từng tên với HEAD). TypeScript còn 4 lỗi baseline ở generated validator và recipe-menus-screen, không có lỗi mới trong phase.
- Chưa xác minh GET có đăng nhập trên API thật, scope giữa hai Owner hoặc grant Technician hết hạn thật; không mutation server/Docker. Không commit/push. Phase04 vẫn chưa bắt đầu.
