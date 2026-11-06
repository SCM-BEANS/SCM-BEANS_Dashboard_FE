# Plan — Cleaning & Telemetry integration

Mode: --hard
Risk: high-risk — dữ liệu máy theo JWT/scope, nhiều role và API ngoài FE.
Test: --tdd (người dùng đã yêu cầu khi chạy cook).
Tasks: default.
Ngày: 2026-11-06.
Status: Phase 01 passing, code review APPROVED; chờ người dùng duyệt Phase 02. Chưa sửa UI.
Spec: [spec.md](spec.md). Scenarios: [scenarios.md](scenarios.md).
Directory: `plans/cleaning-telemetry-integration/`.
Project root: Git root `E:/Đồ án/SCM-BEANS_Dashboard_FE` (không có `.skills.json` marker); tracking tại root `feature_list.json`.

## Scope Challenge và chất lượng spec

- Exists: heartbeat/points và shared machine presentation đã tồn tại. Owner operations còn đọc dashboard aggregate; Owner Analytics, cleaning read model và offline-review adapter chưa có.
- Minimum: mở rộng các màn máy hiện có; dùng Owner Analytics đúng máy; thêm cleaning history và offline review theo quyền; không tạo module/router mới.
- Complexity: Hard — quyền theo role và machine context, phạm vi ACTIVE contract, phân trang và hai cách chia thời gian khác nhau.
- Spec quality: PASS về user stories/acceptance có thể kiểm thử; WARN về runtime contract chưa xác minh, timezone dailyBreakdown và tài khoản live test. Các điểm này là gate cụ thể trong Phase 01/04, không giả định đã giải quyết.
- Đây là công việc lập tài liệu. Không chạy mutation, không chạy Docker, không sửa BE hay source FE trong lượt lập plan.

## Hướng triển khai

1. Giữ Next Pages Router, shell và URL hiện tại. Owner operations đi qua dispatch `src/pages/dashboard/read/customer-read-screen.tsx`; không thêm route vật lý trùng với catch-all.
2. Shared components trong `src/components/machines` nhận dữ liệu/state/callback. Query, quyền và mutation nằm tại page role hoặc API adapter. Không dùng chung Owner Analytics query cho Admin/Moderator.
3. Owner thấy kết nối và vệ sinh trong danh sách; hồ sơ thêm số ly hôm nay cùng hai trạng thái vệ sinh. Operations chia tab Pha chế, Vệ sinh, Kết nối & thông số.
4. Admin/Owner/Technician đọc telemetry theo quyền runtime. Moderator không gửi heartbeat/points; Admin/Moderator/Owner đọc offline review; chỉ Admin/Moderator quyết định.
5. Giữ hạn bảo trì riêng với vệ sinh đầu/cuối ngày. Compliance percentage, provisioning identity/certificate, replay/reconcile, device ingestion và 3D nằm ngoài các phase này.

## Research đã đối chiếu

- Hướng Primary: giữ list/detail ở `machines-screen.tsx`; Owner operations orchestration sang API riêng; sử dụng `authScopedQuerySubject` hiện có; panel lịch sử Owner nằm cạnh Owner page vì không role khác dùng API đó.
- Hướng Alternative: một dashboard query-owning chung cho nhiều role giảm JSX nhưng trộn Owner-only API và grant Technician. Không chọn; dùng shared rendering + role adapters theo cấu trúc đang chạy.
- Có hai query panels trong `src/components/features/operations` chưa thấy consumer: `machine-heartbeat-panel.tsx` và `machine-telemetry-points-panel.tsx`. Không nối chúng chỉ để tái sử dụng; dùng các panel đang active trong `src/components/machines`, không cleanup rộng.
- `OperationalOverview` đang phục vụ aggregate Admin/Moderator. Không đổi contract component đó thành Owner Analytics để tránh đổi số liệu các role khác.
- `TelemetryHistoryPanel` đang vẽ vị trí điểm theo index: cần sửa sang trục thời gian thật khi chart trong Phase 03.

## Route và URL state

Giữ các path `/dashboard/machines`, `/dashboard/machines/{id}`, `/dashboard/machines/{id}/operations`, `/admin/iot`, `/admin/machines/{id}/operations`, `/moderator/iot`, các route hồ sơ Moderator và Technician hiện có.

Owner operations query dùng allowlist:

- `tab=brewing|cleaning|connection`.
- `fromDate`, `toDate` cho ngày lịch analytics; `brewPage`, `recipeName`; `cleaningPage`, `cleaningType`, `cleaningStatus` cho lịch sử riêng.
- `telemetryFrom`, `telemetryTo`, `field` cho khoảng time-series độc lập; `reviewId`, `reviewStatus`, `reviewPage` cho offline review ở connection tab.
- Admin/Moderator IoT dùng `reviewId`, `reviewStatus`, `reviewPage`, optional `machineId` trong query route hiện có, giữ tham số khác.
- Đợi `router.isReady`, parse query trước query API; thay committed filter reset page tương ứng trong cùng navigation. Draft input chưa submit không ghi URL. `router.push` shallow cho hành động người dùng, chuẩn hóa URL invalid có kiểm soát; không tạo effect loop.

## API, quyền và thời gian

| Dữ liệu | Endpoint | Quyền / validation |
|---|---|---|
| Số ly | GET `/owner/cup-count` | Owner; từ JWT, optional machineId; from inclusive/to exclusive. Không gán aggregate toàn role thành số máy. |
| Lịch sử pha | GET `/owner/brew-records` | Owner; PageResponse metadata; machineId/recipeName/page/size. |
| Lịch sử vệ sinh | GET `/owner/cleaning-records` | Owner; STARTUP/CLOSING, COMPLETED/FAILED/ABORTED; PageResponse; boolean bắt buộc theo source/OpenAPI. |
| Kết nối/health | GET `/telemetry-query/machines/{id}/heartbeats/latest` | Admin/Owner/Technician; machine identity match; Moderator zero requests. |
| Telemetry | GET `/telemetry-query/machines/{id}/points` | Cùng quyền; limit≤500, offset≤100000; max30d cần kiểm tra config runtime. |
| Offline list/detail | GET `/offline-violation-reviews`, GET `/{id}` | Admin/Moderator/Owner theo scope; pagination headers. |
| Quyết định | POST `/offline-violation-reviews/{id}/decision` | Admin/Moderator, REVIEW_REQUIRED; NO_ACTION/FOLLOW_UP, reason≤2000 và evidenceReferences bắt buộc. |

Ngày lịch dùng Asia/Ho_Chi_Minh, không theo timezone browser. Chọn 06/11/2026 tạo bounds `[2026-11-05T17:00:00Z, 2026-11-06T17:00:00Z)`. Phase01 đã xác minh `dailyBreakdown.date` là ngày UTC qua BE service/repository: chart ghi rõ ngày UTC. Không đổi nhãn UTC thành VN và không cộng các trang history thiếu dữ liệu để dựng tổng.

Cleaning summary tải snapshot hôm nay khi mở/làm mới, tối đa5 trang ×100 dòng tuần tự có hủy request; dữ liệu còn trang hoặc vượt ngân sách thì máy chưa có bằng chứng ghi “Chưa kiểm tra đầy đủ”. Có COMPLETED đúng loại có thể kết luận hoàn tất ngay; chỉ ghi “Chưa ghi nhận” khi đủ phạm vi. Không polling cleaning/analytics mỗi5s theo heartbeat. Đây là ngân sách FE bảo thủ, không phải giới hạn BE; Phase02 kiểm tra request-count/partial states trước khi nối badge.

## Phase overview

| Phase ID | Mục tiêu | Stories |
|---|---|---|
| [phase-01-api-contracts-and-role-scope](phase-01-api-contracts-and-role-scope.md) | Chốt contract runtime, schema/API/date/scope và proposed file paths | CT-01, CT-03, CT-04, CT-05, CT-06 |
| [phase-02-owner-analytics-and-cleaning](phase-02-owner-analytics-and-cleaning.md) | List/detail Owner và ba tab operations, pha chế/vệ sinh theo máy | CT-01–CT-04, CT-07 |
| [phase-03-monitoring-and-offline-review](phase-03-monitoring-and-offline-review.md) | Đồng bộ heartbeat/telemetry theo quyền và offline review | CT-05–CT-07 |
| [phase-04-cleaning-telemetry-validation](phase-04-cleaning-telemetry-validation.md) | Kiểm thử role, dữ liệu, route, responsive và runtime gaps | CT-01–CT-07 |

Thứ tự: Phase 01 → Phase 02 → Phase 03 → Phase 04. Shared presentation không phải lý do mở rộng quyền BE. Phase chỉ được đánh dấu hoàn tất bằng evidence của chính phase; test giả lập không chứng minh security backend.

## File map và duyệt source trước khi tạo

Sửa hiện có: `src/apis/telemetry.api.ts`, `src/schema/telemetry.schema.ts`, các page machine/operations/IoT đúng role, active panels và `machines.module.css`, text role, `src/routes/path.ts` chỉ khi cần helper query. Không thay route hierarchy.

Các đường dẫn mới dưới đây chỉ là đề xuất cho lúc cook; người dùng mới duyệt tài liệu, chưa duyệt source/test:

- `src/apis/owner-analytics.api.ts`, `src/schema/owner-analytics.schema.ts`.
- `src/apis/offline-violation-reviews.api.ts`, `src/schema/offline-violation-reviews.schema.ts`.
- `src/pages/dashboard/machines/machine-brew-history-panel.tsx`, `src/pages/dashboard/machines/machine-cleaning-history-panel.tsx`.
- `src/components/machines/offline-review-panel.tsx` — shared presentation cho Admin/Moderator/Owner, query/callback do role page cung cấp.
- Nếu cần test riêng: `tests/owner-analytics.test.cjs`, `tests/offline-violation-reviews.test.cjs`; ưu tiên mở rộng test hiện có trước. Xin duyệt chính xác các đường dẫn thực sự cần trước khi tạo, không tạo sẵn file trống.

## Critical/High scenario traceability

| Phase | Scenario |
|---|---|
| 01 | S01, S02, S03, S04, S07, S08, S11, S16, S21, S22, S23, S25, S26, S28, S29, S30, S34 |
| 02 | S01, S04, S07, S08, S10, S11, S12, S13, S14, S15, S16, S20, S23, S29, S34 |
| 03 | S01, S02, S03, S04, S05, S06, S07, S08, S11, S12, S14, S19, S21, S22, S26, S28, S30, S31, S33, S34 |
| 04 | Mọi CRITICAL/HIGH S01–S34 trong scenarios.md; bổ sung MEDIUM accessibility/empty/latency |

## Kiểm tra và evidence

- Unit/adapter: mở rộng `tests/dolores-telemetry.test.cjs`, `tests/admin-machines-iot.test.cjs`; test mới chỉ sau duyệt paths. Test boundary ngày VN, page metadata, response identity và role requests.
- E2E: mở rộng `tests/e2e/machine-operational-overview.spec.ts` để bao phủ tabs/deep link/Back/Forward và các role.
- Static: `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false`, `git diff --check`. Ghi baseline trước sửa; không quy lỗi cũ thành lỗi feature hoặc nói build đạt khi chưa đạt.
- Browser ở390/768/1023/1024/1440px, keyboard, reduced motion, action bar; chỉ dữ liệu test được phép.
- Live GET có phiên role hợp lệ để xác minh shape/scope. Decision mutation mặc định dùng mock hoặc backend test local; muốn live mutation phải có ủy quyền cụ thể. Lượt plan không gọi mutation.

## Validation đã được người dùng xác nhận — 2026-11-06

1. Cleaning danh sách tải khi mở/làm mới; heartbeat giữ polling theo visibility, cleaning không tự tải mỗi5s.
2. Máy ngoài contract ACTIVE hiển thị giới hạn phạm vi analytics, không ép thành số0/lịch sử không tồn tại.
3. Nếu thiếu hai Owner test và Technician grant, hoàn tất kiểm tra FE giả lập nhưng ghi live scope chưa xác minh, không thử truy cập chéo tài khoản thật.

Ba điểm trên đã được chốt và plan review đã xử lý. Handoff: `cook --hard --tdd plans/cleaning-telemetry-integration/plan.md`. Chưa tự chạy cook; exact-path approval cho source/test mới được thực hiện trước khi tạo trong phase liên quan.

## Checklist

- [x] Người dùng xác nhận ba quyết định vận hành ngày 2026-11-06.
- [x] Plan review 2026-11-06: không có finding BLOCK/HIGH; đã đối chiếu code/route, quyền, timezone, cleaning completeness và scenario coverage. Tracker encoding được kiểm tra riêng trước handoff.
- [x] Phase 01 — contract/scope (targeted tests đạt; baseline compile/full-suite chưa đạt; người dùng đã duyệt Phase02).
- [x] Phase 02 — Owner analytics/cleaning (targeted25/25, E2E6/6, review APPROVED; chờ duyệt Phase03).
- [ ] Phase 03 — monitoring/offline review.
- [ ] Phase 04 — cross-role validation.

## Risks và phần hoãn

- Chưa có runtime capture: schema/DTO examples là source-derived; chỉ khóa field nullable/timezone sau xác minh.
- Scope gap cleaning compliance và certificate lifecycle nằm ở BE; chưa mở UI dựa riêng role-gate.
- Analytics ACTIVE-only; daily UTC buckets có thể khác calendar day VN.
- Request fan-out và page summary: dữ liệu thiếu phải unknown, không silent false negative.
- Không có DLQ list/detail API; không dựng màn chọn entry từ dữ liệu giả. Certificate chứa client.key, provisioning/delete/reissue cần workflow riêng.
- Plan IoT cũ giữ nguyên evidence; ưu tiên quyền và nguồn metric theo spec này cho thay đổi mới.

## Session Notes
<!-- Updated by cook automatically — do not edit manually -->

**Last active:** 2026-11-07 Asia/Ho_Chi_Minh.
**Phase in progress:** phase-02-owner-analytics-and-cleaning.
**Status:** Phase02 passing; review APPROVED; awaiting human approval for Phase03. Không commit/push.

### Decisions made this session

- Owner ACTIVE scope dùng lịch sử hợp đồng theo từng máy hiển thị với status=ACTIVE; không dùng endpoint danh sách chỉ dành Admin/Moderator, không dùng JWTsub làm businessOwnerId.
- UI Owner dùng ba tab, URL filters/page, ngày VN và daily bucket UTC; query thuộc page, hai history panel chỉ hiển thị.
- Cleaning snapshot tuần tự tối đa5×100; incomplete giữ unknown; analytics không polling theo heartbeat. Conventional và máy ngoài ACTIVE không bị ghi thành số0.
- Kiểm thử25/25 liên quan và E2E6/6 đạt (5viewport); review sửa2findings rồi APPROVED. Full Node196/288 với92baselinefailures; TypeScript4baselineerrors; lint0errors/3oldwarnings. Chưa live authenticated scope.

### Next immediate action

Chờ người dùng duyệt Phase03 theo cook --hard; sau duyệt nối monitoring/offline review đúng quyền, xin duyệt exact source paths mới nếu cần. Phase04 cross-role/live gaps kiểm tra sau. Giữ nguyên API và giao diện Admin/Moderator ngoài phần đã chốt.