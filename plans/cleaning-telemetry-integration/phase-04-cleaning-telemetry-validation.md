# Phase 04 — Cross-role validation

Status: passing — FE mock validation và code review APPROVED; live scope chưa xác minh. Người dùng duyệt triển khai ngày 2026-11-07.
Canonical ID: `phase-04-cleaning-telemetry-validation`.
Stories: CT-01–CT-07.

## Mục tiêu và tasks

Đánh giá feature bằng evidence đúng cấp: adapter/unit, browser mock và runtime GET được ghi riêng; không tuyên bố phân quyền BE từ FE tests.

1. Ghi baseline static/test trước thay đổi và delta cuối. Chạy các test feature liên quan; tsc/build lỗi cũ ghi rõ file/line và đối chứng khi cần.
2. Map mọi CRITICAL/HIGH trong scenarios sang test/assertion hoặc live acceptance có evidence; case thiếu credential ghi chưa xác minh, không đánh dấu passing giả.
3. Owner: list→detail→operations; tabs/filter/history paging URL; direct load, refresh, Back/Forward, account/machine switch với query đang pending. VN day bounds, daily buckets đúng timezone, cleaning partial pagination, ACTIVE-only.
4. Admin: inventory/detail/IoT→offline detail; thao tác quản lý máy và action bar cũ vẫn hiện. Moderator: cùng thiết kế, zero telemetry requests, review scope/decision state. Technician: grant cho máy và403 khi hết quyền; không review/Owner Analytics.
5. API failures:401/403/503/timeouts/malformed response/wrong machine; local error panels và không fake count/status. Mutation decision fake/local test double submit409/timeout; server chỉ GET khi chưa có ủy quyền mutation cụ thể.
6. Visual/accessibility:390/768/1023/1024/1440px; keyboard tab/Enter, focus, headings/aria, màu không là nguồn state duy nhất, reduced motion, bảng scroll trong card và fixed action bar không che.
7. Rà network allowlist: không device ingest/certificate/replay/billing/penalty, không fanout không giới hạn, cleaning không polling theo heartbeat. Rà log không token/health raw/private evidence.

## Files/modules

- Mở rộng `tests/e2e/machine-operational-overview.spec.ts`, `tests/dolores-telemetry.test.cjs`, `tests/admin-machines-iot.test.cjs`; các test mới được duyệt ởPhase01 nếu thực sự cần.
- Chỉ sửa source đã trong Phase01–03 để khắc phục regression thuộc feature; không cleanup module ngoài phạm vi.
- Cập nhật evidence/status bốn phase trong `feature_list.json` và checklist plan bằng kết quả thật; chưa chạy thì not_started.

## Dependencies

Phase01–03 có code và tests tương ứng; phiên Owner/Admin/Moderator/Technician test để live GET. Hai Owner test để kiểm tra scope chéo nếu có; không thử tài khoản thật hoặc tự suy đoán grant.

## Commands và acceptance

```powershell
node --test tests/dolores-telemetry.test.cjs tests/admin-machines-iot.test.cjs
npx playwright test tests/e2e/machine-operational-overview.spec.ts
npm.cmd run lint
npx.cmd tsc --noEmit --incremental false
git diff --check
```

Nếu tạo test mới đã duyệt, bổ sung đúng command chạy chúng vào evidence. E2E fixture/mock không thay phiên authenticated runtime. Build chỉ báo đạt khi chạy thực tế và exit0; lỗi baseline ghi riêng.

- CT-01–04: số liệu đúng selected machine/range, cleaning không false absence, không0 giả, lịch sử paging đúng, query URL ổn định.
- CT-05–06: đúng matrix role/API; Moderator no heartbeat/points; Owner no decision; Technician no offline review; mutations không phát sinh nghiệp vụ tài chính.
- CT-07: các viewport và keyboard đạt, không thay ngôn ngữ màu/bố cục shell hiện tại.
- Mọi CRITICAL/HIGH S01–S34: test hoặc status unverified kèm lý do rõ; unresolved security/data correctness không được coi release-ready.

## Handoff và giới hạn

Tóm tắt các route, endpoint đã nối, states còn gated, BE scope/UTC/ACTIVE-only limitations và file mới đã duyệt. Technical provisioning/replay và cleaning compliance vẫn ngoài scope; không đánh dấu hoàn thành chúng. Không tự commit/push hoặc mở live decision mutation khi chưa được yêu cầu.

## Kết quả — 2026-11-07

- Node feature suite: **33/33**. Playwright toàn file operations: **22/22** (parent chạy độc lập:37.9s), bao gồm 12 trường hợp bổ sung Phase04; ba role Owner/Admin/Moderator tại 390/768/1023/1024/1440px và Technician 403 riêng.
- Browser kiểm tra response cũ sau đổi Owner/máy/ngày; URL invalid zero feature reads; Technician lookup/grant403; double confirm + timeout một POST/giữ draft; keyboard/Escape/focus/reduced motion; telemetry503 + cleaning timeout; conventional/unknown; 100 máy với visible heartbeat subset; hidden/visible polling và cleaning không poll.
- Sửa đúng một regression nội dung thuộc feature: unknown machineType không còn bị gọi là máy thường. Các test còn lại không yêu cầu sửa API, route hierarchy hoặc thiết kế.
- Review APPROVED, không HIGH/CRITICAL findings. Ma trận S01–S36 được ghi ở `scenarios.md`, tách unit/browser/static với live UNVERIFIED.
- Lint: 0 lỗi/3 cảnh báo cũ. TypeScript: 4 lỗi baseline (`.next/types/validator.ts:46`, recipe-menus-screen.tsx:328–330). Production build thử với NEXT_DIST_DIR riêng thất bại ở validator baseline; **không tuyên bố build đạt**.
- Full Node trước Phase04: 204/296, 92 failures; Phase04 chỉ bổ sung E2E và copy nhỏ. Trong `admin-machines-iot.test.cjs`, 9 test còn lỗi do alias mock thiếu, route path cũ và kỳ vọng Moderator heartbeat trái quyền mới; chưa sửa các test lịch sử này.
- GET public `/v3/api-docs` server 100.75.202.72:8082 thành công, đủ 8 route của feature. Chưa gọi GET nghiệp vụ có JWT thật, chưa xác minh hai Owner/grant Technician/401refresh/bucket thực tế; không live mutation, không Docker. Các giới hạn này đã được cho phép ghi UNVERIFIED khi chốt kế hoạch.
- Thư mục build thử `.next-cleaning-review` còn untracked: lệnh dọn bị automatic policy chặn với thông báo “blocked by policy”; không thử lách bằng lệnh khác. Không commit/push.

## Route và API bàn giao

| Role / route | Phần hiện có được mở rộng |
|---|---|
| Owner `/dashboard/machines`, `/{machineId}`, `/{machineId}/operations` | Kết nối/vệ sinh, analytics theo máy ACTIVE, tab Pha chế/Vệ sinh/Kết nối, review chỉ đọc. |
| Admin `/admin/machines`, `/{machineId}`, `/admin/iot` | Heartbeat/telemetry được phép, list/detail offline review và quyết định. Operations aggregate Admin giữ nguồn dashboard. |
| Moderator `/moderator/machines/{machineId}`, `/moderator/iot` | Link review theo máy, list/detail/quyết định; không heartbeat/points. |
| Technician `/technician/machine-check/{machineId}` | Machine lookup trước heartbeat/points theo quyền runtime; không Owner Analytics/offline review. |

Endpoint mới/mở rộng: GET `/owner/cup-count`, `/owner/brew-records`, `/owner/cleaning-records`; GET `/telemetry-query/machines/{machineId}/heartbeats/latest`, `/points`; GET `/offline-violation-reviews`, `/{reviewId}` và POST `/{reviewId}/decision`. Prefix nghiệp vụ là `/api/v1`; FE đi qua proxy Dolores hiện có. `maintenance-schedule` vẫn tách khỏi trạng thái vệ sinh. Provisioning, ingestion, replay,3D và compliance percentage chưa triển khai trong kế hoạch này.


## Audit bổ sung — 92 test và quyền API thật (2026-11-07)

Bằng chứng này cập nhật các mục live UNVERIFIED tương ứng ở kết quả trước; phần kết quả cũ được giữ làm lịch sử. Sau lượt sửa TypeScript riêng, tsc và production build đã đạt. Lượt audit này chỉ cập nhật tài liệu, chưa sửa source hoặc 92 test.

### Test Node

Chạy lại 54 file tests/*.test.cjs: **296 mục, 204 pass, 92 fail, 0 skip**. Có 5 mục fail là cả file không khởi tạo được; số 296 không bao gồm các test nội bộ chưa được đăng ký trong những file này.

Đã đối chiếu từng lỗi đầu tiên với source hiện tại: 55 loader/mock, 15 đường dẫn cũ, 12 assertion bám source cũ, 6 harness React.lazy/Suspense, 3 chữ ký API cũ, 1 fixture tenantId thay ownerId. Chưa có lỗi đầu tiên nào chứng minh lỗi nghiệp vụ FE production. Tuy nhiên **70 lỗi loader/đường dẫn che assertion phía sau**, nên chưa kết luận toàn bộ suite sẽ xanh sau khi sửa các blocker này. Không nới schema hoặc bật lại Moderator telemetry để thỏa test lịch sử.

### API thật

- Server trực tiếp http://100.75.202.72:8082; public OpenAPI đọc thành công. Thời điểm mẫu 2026-11-07T05:20:40.960Z. Đăng nhập IDaaS thật bằng Admin, Moderator, Technician và hai Owner test đã cấu hình; cả 5 JWT subject khác nhau. Không ghi credential hoặc token vào báo cáo.
- **74 GET trực tiếp**; không tạo/sửa/xóa dữ liệu nghiệp vụ, không thay grant. Các POST phục vụ đăng nhập/refresh phiên kiểm thử.
- 19 response analytics/heartbeat và 7 response list/detail offline review thành công qua schema Zod hiện có: **26/26 phù hợp**. Telemetry points chưa có response 200 để kiểm tra schema.

| API / tình huống | Admin | Moderator | Technician | Owner đúng phạm vi | Owner ngoài phạm vi |
|---|---|---|---|---|---|
| GET /owner/cup-count, /brew-records, /cleaning-records | 403 cả 3 | 403 cả 3 | 403 cả 3 | 200 cả 3 | Owner thứ hai có 0 ACTIVE fleet: 200 rỗng; chưa đủ event để xác minh lọc chéo |
| GET heartbeat latest máy Owner Primary | 200 | 403 | 200 trên máy có lịch sử công việc được giao | 200 | 404 |
| GET telemetry points máy Owner Primary | 503 | 403 | 503 | 503 | 403 |
| GET heartbeat máy kho | 200 | 403 | 404 | 404 | 404 |
| GET points máy kho | 503 | 403 | 403 | 403 | 403 |
| GET offline reviews list | 200 / 5 dòng | 200 / 5 dòng | 403 | 200 / 1 dòng mỗi Owner | Filter ownerId khác phạm vi: 200 / 0 dòng |
| GET offline review detail Owner Primary | 200 | 200 | 403 | 200 | 403 |
| GET offline review detail Owner Secondary | chưa bổ sung | chưa bổ sung | chưa bổ sung | 200 | 403 với Owner Primary |

Thiếu JWT hoặc JWT không hợp lệ trả 401 ở các GET analytics/heartbeat đã thử.

**Vấn đề thực tế phía server cần kiểm tra:**

1. Live Swagger heartbeat ghi ADMIN/MODERATOR được xem nhưng Moderator thật nhận 403 trên máy Owner và máy kho. FE hiện không gọi heartbeat/points cho Moderator, phù hợp runtime đã đo. Không dựa riêng vào mô tả Swagger để mở lại query.
2. Telemetry points trả **503 SERVICE_UNAVAILABLE** cho Admin, Owner đúng phạm vi và Technician được server cho đọc heartbeat. Ngoài phạm vi vẫn bị 403. Chưa có log server để kết luận nguyên nhân hạ tầng của 503; chưa được gán lỗi này cho FE/schema.
3. Owner Primary có 1 máy ACTIVE trong analytics; Owner Secondary có 0. Cup count bằng 0, brew/cleaning/dailyBreakdown rỗng trong khoảng 2026-11-01T00:00:00Z đến 2026-11-08T00:00:00Z. Response hợp lệ nhưng chưa xác minh timezone bucket bằng event có dữ liệu.

### Trình duyệt thật: 401 → refresh → retry

Chromium Playwright dùng context riêng trên localhost:3000, trang Owner operations. Đăng nhập hợp lệ, sau đó thay chữ ký access token trong cookie riêng của context kiểm thử để backend trả **401 thật**; giữ refresh cookie HttpOnly do đăng nhập cấp. Không mock response mạng.

GET máy và unread-count nhận 401; FE gọi **đúng 1 POST /api/v1/auth/refresh → 200**, thay access cookie và retry hai GET → 200; history hợp đồng và Owner analytics tiếp tục 200. URL vẫn ở operations, không bị đưa về login. Đây là kiểm tra nhánh xử lý 401, không phải chờ JWT hết hạn tự nhiên; chưa bao phủ refresh cookie hết hạn/thu hồi.

### Còn chưa xác minh

- Grant Technician tường minh và việc hết hạn/thu hồi: không có public grant-management route trong OpenAPI. Máy cho 200 heartbeat và máy kho trả 404/403 xác nhận quyền đọc hiện tại, chưa chứng minh cơ chế hoặc expiry của grant. Các maintenance tickets của Technician đọc được đều RESOLVED.
- Telemetry response thật khi dịch vụ points phục hồi; daily UTC buckets và event-level isolation với hai Owner có dữ liệu pha/vệ sinh.
- Mutation quyết định offline review theo role: lượt này không phát sinh quyết định nghiệp vụ; preflight/POST409/double-submit vẫn chỉ có bằng chứng unit/E2E mock trước đó.
- Các assertion bị loader/path che cần chạy lại sau khi sửa harness. Chưa sửa 92 test trong lượt phân loại.

### Chi tiết từng test lỗi

#### Tổng số theo nhóm

| Category | Count |
|---|---:|
| L: Loader/mock blocker | 55 |
| P: Obsolete file path | 15 |
| A: Obsolete/brittle source assertion | 12 |
| S: Obsolete API signature expectation | 3 |
| H: Async lazy-render harness | 6 |
| F: Obsolete response fixture | 1 |
| Total | 92 |

No first-failure in this run proves a current production FE defect. This does not prove all blocked tests would pass after loader repair. In particular,55loader/mock and15path failures hide later assertions. Twelve static source assertions are coupled to prior layout/permissions/ownership; browser validation is required for layout semantics after updating them. Six lazy-render tests never reach the real domain screens. Do not weaken current API schema to satisfy old fixtures or re-enable Moderator telemetry for these tests.

#### Số lỗi theo file

| File | Count |
|---|---:|
| admin-machines-iot.test.cjs | 9 |
| admin-menu-reports-notifications.test.cjs | 4 |
| admin-operations.test.cjs | 1 |
| admin-overview.test.cjs | 4 |
| asset-management-api.test.cjs | 1 |
| asset-management-routing.test.cjs | 1 |
| back-navigation-coverage.test.cjs | 1 |
| customer-technician-back-navigation.test.cjs | 5 |
| customer-technician-mobile-navigation.test.cjs | 1 |
| dolores-api-requests.test.cjs | 2 |
| dolores-api-signatures.test.cjs | 1 |
| dolores-contracts.test.cjs | 3 |
| dolores-phase6.test.cjs | 2 |
| idaas-admin-users-routing.test.cjs | 1 |
| idaas-auth-cookie.test.cjs | 5 |
| maintenance-workflow-phase3.test.cjs | 2 |
| moderator-admin-back-navigation.test.cjs | 2 |
| moderator-dashboard.test.cjs | 6 |
| moderator-mobile-navigation.test.cjs | 5 |
| moderator-phase2.test.cjs | 8 |
| moderator-phase3.test.cjs | 12 |
| moderator-phase4.test.cjs | 8 |
| moderator-shell-data-label.test.cjs | 5 |
| operations-workflow-phase8.test.cjs | 1 |
| owner-technician-routing.test.cjs | 1 |
| shared-role-navigation-cross-role.test.cjs | 1 |

#### 92 mục lỗi

| # / title | Test location | Category | Root cause and current source evidence |
|---|---|---|---|
| not ok 1 - machine API reads inventory, summary, detail and schedule through the shared Dolores base | tests/admin-machines-iot.test.cjs:80 | L | Custom TypeScript loader cannot resolve/mock @/schema/profiles.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 2 - machine detail and telemetry reject mismatched machine identities | tests/admin-machines-iot.test.cjs:104 | L | Custom TypeScript loader cannot resolve/mock @/schema/profiles.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 4 - machine inventory page renders loaded rows and a meaningful empty state | tests/admin-machines-iot.test.cjs:193 | P | Reads removed source path src/pages/admin/machines.page.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 5 - machine detail rejects an invalid route UUID without issuing API reads | tests/admin-machines-iot.test.cjs:213 | L | Custom TypeScript loader cannot resolve/mock ./machine-detail-screen. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 6 - IoT Owner detail joins only matching machines, contracts and locations | tests/admin-machines-iot.test.cjs:220 | P | Reads removed source path src/pages/admin/iot.page.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 8 - shared list and detail components enforce summary-before-content hierarchy | tests/admin-machines-iot.test.cjs:276 | A | Checks literal controls= prop in every role page. Admin now renders MachineStatusFilter inside machineInventoryGroup (index.page.tsx:238), with summary still passed at205. Container placement drift; this assertion does not establish visible broken controls. |
| not ok 14 - all role machine lists query heartbeats only for visible Smart IoT rows and pause polling when hidden | tests/admin-machines-iot.test.cjs:390 | A | Requires Moderator getLatestHeartbeat despite approved current rule forbidding Moderator telemetry. Moderator list intentionally has no heartbeat GET; Admin/Owner visible polling covered in E2E. |
| not ok 15 - all role machine details poll the current Smart IoT heartbeat and show the shared connection state | tests/admin-machines-iot.test.cjs:408 | A | Requires Moderator heartbeat query in detail. Current Moderator detail shows permission/context content; no heartbeat call by design. |
| not ok 17 - Moderator IoT heartbeat polling stops on the locations route and does not share Admin cache keys | tests/admin-machines-iot.test.cjs:439 | A | Requires old Moderator heartbeat enabled expression; iot-screen now owns offline review only. Current requirement says Moderator must not call heartbeat/points. |
| not ok 21 - billing and notification schemas accept nullable legacy invoice scope fields and reject malformed responses | tests/admin-menu-reports-notifications.test.cjs:187 | L | Custom TypeScript loader cannot resolve/mock @/schema/contracts.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 23 - Admin menu route renders shared global management with current DTO and role actions | tests/admin-menu-reports-notifications.test.cjs:274 | L | Test loader lacks CSS-module mock/resolution for ./action-bar.module.css after traversing shared ActionBar. Next supports this import; test fails before rendering actual Menu behavior. |
| not ok 24 - reports page displays aggregate dashboard finance and full rental rows without deriving a total | tests/admin-menu-reports-notifications.test.cjs:319 | P | Reads removed source path src/pages/admin/reports.page.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 25 - notification page is read-only for alerts and changes the cache only after confirmed mark-read success | tests/admin-menu-reports-notifications.test.cjs:369 | P | Reads removed source path src/pages/admin/notifications.page.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 3 - tests\\admin-operations.test.cjs | tests/admin-operations.test.cjs:1 | L | Whole test file aborts during module initialization: custom loader cannot resolve relative schema dependency (./termination-cases.schema). Counted as one reported failed entry; internal tests were not enumerated. |
| not ok 32 - admin overview shows API metrics and links to available admin pages | tests/admin-overview.test.cjs:250 | L | Custom TypeScript loader cannot resolve/mock ./overview/overview-content. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 33 - admin overview renders retry feedback when Dolores fails | tests/admin-overview.test.cjs:294 | L | Custom TypeScript loader cannot resolve/mock ./overview/overview-content. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 34 - admin overview distinguishes loading, empty data, and forbidden access | tests/admin-overview.test.cjs:322 | L | Custom TypeScript loader cannot resolve/mock ./overview/overview-content. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 39 - Owner, Admin, and Moderator machine routes retain context for the shared operational overview | tests/admin-overview.test.cjs:478 | A | Parser uses exact export const PATH_CUSTOMER = { text, while source path.ts:156 has two spaces before {. MACHINE_OPERATIONAL_OVERVIEW exists at207; static formatting mismatch. |
| not ok 44 - machine registration supports an explicit Owner only for operator-created machines | tests/asset-management-api.test.cjs:24 | L | Custom TypeScript loader cannot resolve/mock @/schema/profiles.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 7 - tests\\asset-management-routing.test.cjs | tests/asset-management-routing.test.cjs:1 | L | Whole test file aborts during module initialization: custom loader cannot resolve relative schema dependency (./termination-cases.schema). Counted as one reported failed entry; internal tests were not enumerated. |
| not ok 51 - each admin create/detail page renders one shared heading back control and removes duplicate parent actions | tests/back-navigation-coverage.test.cjs:73 | A | Expects heading literally in Admin menu route wrapper. src/pages/admin/menu/index.page.tsx delegates to RecipeManagementScreen; BackButtonHeading exists in shared recipe screen at277. |
| not ok 68 - customer read detail descriptors define parent fallbacks and leave root lists alone | tests/customer-technician-back-navigation.test.cjs:62 | L | Custom TypeScript loader cannot resolve/mock @/schema/machines.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 69 - customer workflow descriptors map each form/detail to an internal parent and remove the duplicate parent action | tests/customer-technician-back-navigation.test.cjs:95 | L | Custom TypeScript loader cannot resolve/mock @/routes/path. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 71 - customer read routing passes back metadata to specialized details and not to the root | tests/customer-technician-back-navigation.test.cjs:153 | L | Custom TypeScript loader cannot resolve/mock @/schema/machines.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 72 - customer workflow screen passes navigation to its specialized repair form | tests/customer-technician-back-navigation.test.cjs:190 | L | Custom TypeScript loader cannot resolve/mock @/routes/path. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 73 - technician roots stay clean, while task and history detail get one shared parent heading | tests/customer-technician-back-navigation.test.cjs:221 | L | Custom TypeScript loader cannot resolve/mock ./history/history-screen. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 13 - tests\\customer-technician-mobile-navigation.test.cjs | tests/customer-technician-mobile-navigation.test.cjs:1 | L | Whole test file aborts during module initialization: custom loader cannot resolve relative schema dependency (./termination-cases.schema). Counted as one reported failed entry; internal tests were not enumerated. |
| not ok 75 - current domain APIs preserve HTTP methods, URLs, scope parameters, signals, and file responses | tests/dolores-api-requests.test.cjs:61 | S | Calls listMaintenanceTickets(signal) with old signature. Current machines.api.ts:131 requires (input={}, signal?); all current page callers pass input then signal. The test puts AbortSignal into params; no source caller found using old signature. |
| not ok 76 - repair workflow reads use bounded pagination, request filters, and validated detail identities | tests/dolores-api-requests.test.cjs:162 | L | Schema mock returns only {parse} for every export; current maintenance-requests.api.ts:12 reads MaintenanceRequestSchema.shape.id. Proxy stub has no shape, crashes at import before HTTP/behavior assertions. |
| not ok 77 - domain API modules expose typed methods over the shared client with parsed responses | tests/dolores-api-signatures.test.cjs:81 | S | Exact public-method snapshot omits profilesApi.getCurrent, updateContactInfo, updateCurrentContactInfo. Additions are implemented functionality, not removal of expected methods. |
| not ok 82 - Admin owner contract schema and Moderator tenant contract schema remain separate | tests/dolores-contracts.test.cjs:76 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 83 - Moderator contract reads use only tenant-scoped, canonical GET endpoints | tests/dolores-contracts.test.cjs:86 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 84 - existing Admin contract list and detail methods retain the ownerId contract | tests/dolores-contracts.test.cjs:112 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 100 - Moderator invoice API reads invoices and validates canonical response identity | tests/dolores-phase6.test.cjs:122 | L | Custom TypeScript loader cannot resolve/mock @/schema/contracts.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 102 - reports page isolates query keys by URL date range and passes the range to Dolores | tests/dolores-phase6.test.cjs:159 | P | Reads removed source path src/pages/admin/reports.page.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 117 - admin has no account-management page while implemented pages remain in the route catalog | tests/idaas-admin-users-routing.test.cjs:70 | L | Custom TypeScript loader cannot resolve/mock @/schema/repair-cost-reviews.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 118 - Pages Router login proxy removes refresh_token from JSON and preserves upstream cookie | tests/idaas-auth-cookie.test.cjs:56 | L | Custom TypeScript loader cannot resolve/mock @/lib/server/backend-api-selection. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 119 - auth proxy strips refresh tokens from error JSON and fails closed on malformed successful JSON | tests/idaas-auth-cookie.test.cjs:80 | L | Custom TypeScript loader cannot resolve/mock @/lib/server/backend-api-selection. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 120 - non-auth IDaaS proxy routes preserve their upstream JSON contract | tests/idaas-auth-cookie.test.cjs:101 | L | Custom TypeScript loader cannot resolve/mock @/lib/server/backend-api-selection. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 121 - logout is proxied upstream and does not synthesize local cookie clearing | tests/idaas-auth-cookie.test.cjs:110 | L | Custom TypeScript loader cannot resolve/mock @/lib/server/backend-api-selection. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 122 - proxy rejects invalid path segments before contacting IDaaS | tests/idaas-auth-cookie.test.cjs:127 | L | Custom TypeScript loader cannot resolve/mock @/lib/server/backend-api-selection. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 144 - maintenance request confirmation and preventive work-order creation use linked IDs and documented bodies | tests/maintenance-workflow-phase3.test.cjs:46 | L | Schema mock returns only {parse} for every export; current maintenance-requests.api.ts:12 reads MaintenanceRequestSchema.shape.id. Proxy stub has no shape, crashes at import before HTTP/behavior assertions. |
| not ok 148 - role screens keep installation work orders separate and gate evidence-dependent finish and cost actions | tests/maintenance-workflow-phase3.test.cjs:199 | A | Requires installationWorkOrdersApi.listAssigned string in task page. Tasks now call technicianWorkItemsApi aggregator; src/apis/technician-work-items.api.ts owns assigned installation/repair/maintenance composition. |
| not ok 158 - admin store detail headings and machine detail use shared back control without replacing useful actions | tests/moderator-admin-back-navigation.test.cjs:113 | A | Reads src/pages/admin/machines/[machineId].page.tsx route wrapper; BackButtonHeading and useful actions live in machine-detail-screen.tsx now. Wrapper delegates correctly. |
| not ok 159 - moderator detail screens do not keep duplicate parent-list links | tests/moderator-admin-back-navigation.test.cjs:125 | A | Reads obsolete invoice wrapper for ModeratorPageHeading. Real dedicated [invoiceId].page.tsx calls invoice-detail-screen.tsx, which renders ModeratorPageHeading at196. Must follow routed component. |
| not ok 160 - overview renders only values returned by the operator dashboard API | tests/moderator-dashboard.test.cjs:141 | H | Harness synchronously renders old ModeratorReadScreen dispatcher with renderToStaticMarkup. Dispatcher now uses React.lazy/Suspense (moderator-read-screens.tsx:1-45), so tests get loading fallback and never execute extracted overview/notifications/alerts queries. Must test real extracted screen or await lazy render; underlying assertions remain unexecuted. |
| not ok 161 - notifications offer mark-as-read only for unread records while alerts remain read-only | tests/moderator-dashboard.test.cjs:166 | H | Harness synchronously renders old ModeratorReadScreen dispatcher with renderToStaticMarkup. Dispatcher now uses React.lazy/Suspense (moderator-read-screens.tsx:1-45), so tests get loading fallback and never execute extracted overview/notifications/alerts queries. Must test real extracted screen or await lazy render; underlying assertions remain unexecuted. |
| not ok 162 - mark-as-read submits the clicked notification and refreshes list/count only after a confirmed response | tests/moderator-dashboard.test.cjs:203 | H | Harness synchronously renders old ModeratorReadScreen dispatcher with renderToStaticMarkup. Dispatcher now uses React.lazy/Suspense (moderator-read-screens.tsx:1-45), so tests get loading fallback and never execute extracted overview/notifications/alerts queries. Must test real extracted screen or await lazy render; underlying assertions remain unexecuted. |
| not ok 163 - mark-as-read prevents duplicate submissions and keeps failed records unread | tests/moderator-dashboard.test.cjs:233 | H | Harness synchronously renders old ModeratorReadScreen dispatcher with renderToStaticMarkup. Dispatcher now uses React.lazy/Suspense (moderator-read-screens.tsx:1-45), so tests get loading fallback and never execute extracted overview/notifications/alerts queries. Must test real extracted screen or await lazy render; underlying assertions remain unexecuted. |
| not ok 164 - read screens distinguish loading, empty, 401, 403, and failed requests from empty results | tests/moderator-dashboard.test.cjs:273 | H | Harness synchronously renders old ModeratorReadScreen dispatcher with renderToStaticMarkup. Dispatcher now uses React.lazy/Suspense (moderator-read-screens.tsx:1-45), so tests get loading fallback and never execute extracted overview/notifications/alerts queries. Must test real extracted screen or await lazy render; underlying assertions remain unexecuted. |
| not ok 165 - query functions pass cancellation signals and rendering does not send a write | tests/moderator-dashboard.test.cjs:327 | H | Harness synchronously renders old ModeratorReadScreen dispatcher with renderToStaticMarkup. Dispatcher now uses React.lazy/Suspense (moderator-read-screens.tsx:1-45), so tests get loading fallback and never execute extracted overview/notifications/alerts queries. Must test real extracted screen or await lazy render; underlying assertions remain unexecuted. |
| not ok 166 - Moderator mobile header uses shared navigation with the full role menu and its logout callback | tests/moderator-mobile-navigation.test.cjs:134 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 167 - Moderator keeps mobile notifications and nested-section heading while the shared drawer is mounted | tests/moderator-mobile-navigation.test.cjs:154 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 168 - the old Moderator shortcut list and inline sheet implementation are removed | tests/moderator-mobile-navigation.test.cjs:171 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 169 - Moderator ActionBar overrides its inherited 64px mobile offset after removing the bottom navigation strip | tests/moderator-mobile-navigation.test.cjs:183 | A | Requires literal <ActionBar> renderActions. Shell now uses ActionBarLayout and ActionBarConfig at216-221; regex predates action-bar provider refactor. |
| not ok 170 - Moderator logout remains role-owned and routes to login after the auth logout callback | tests/moderator-mobile-navigation.test.cjs:198 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 171 - tenant list renders API fields and links by canonical UUID without create controls | tests/moderator-phase2.test.cjs:125 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 172 - tenant list distinguishes loading, empty, forbidden, and API-not-found states | tests/moderator-phase2.test.cjs:135 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 173 - tenant detail uses UUID GET and legacy display IDs never enable an API request | tests/moderator-phase2.test.cjs:155 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 174 - contract list renders tenant-scoped API records and partial errors are not empty results | tests/moderator-phase2.test.cjs:167 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 175 - contract fan-out is bounded to five requests and retains failed tenant identity | tests/moderator-phase2.test.cjs:193 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 176 - contract detail renders read-only metadata and handles empty, forbidden, and stale IDs | tests/moderator-phase2.test.cjs:223 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 177 - new and expiry contract routes remain unavailable without write controls | tests/moderator-phase2.test.cjs:247 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 178 - Pages Router detail routes pass only the URL segment into shared screen modules | tests/moderator-phase2.test.cjs:261 | P | Reads removed source path src/pages/moderator/customers/[tenantId].page.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 179 - work-order schema validates canonical IDs, checklist/accessory data, and metadata-only evidence | tests/moderator-phase3.test.cjs:135 | F | Work-order fixture supplies tenantId rather than required ownerId. Current installation-work-orders.schema.ts:28/47 uses Owner scope; schema correctly rejects missing ownerId. |
| not ok 180 - installation work-order API uses shared Dolores client, tenant scope, UUID detail, and response identity guards | tests/moderator-phase3.test.cjs:150 | S | Calls deleted listByTenant; current installation-work-orders.api.ts:43 provides listByOwner and sends ownerId. Test expects obsolete tenant scope and response shape. |
| not ok 181 - machine list renders API UUIDs, and legacy detail IDs do not enable any request | tests/moderator-phase3.test.cjs:184 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 182 - machine empty and forbidden responses stay distinct | tests/moderator-phase3.test.cjs:199 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 183 - machine history filters the global maintenance collection by canonical machine UUID and shows the scope | tests/moderator-phase3.test.cjs:214 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 184 - machine detail loads its schedule, location, and only tickets with the matching machine UUID | tests/moderator-phase3.test.cjs:228 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 185 - tenant-scoped location fan-out is bounded and preserves partial failures without presenting an empty result | tests/moderator-phase3.test.cjs:254 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 186 - work-order fan-out is bounded, passes cancellation, and keeps successful tenant records on partial failure | tests/moderator-phase3.test.cjs:290 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 187 - IoT waits for a selected and API-confirmed Smart IoT machine plus explicit date range, without polling | tests/moderator-phase3.test.cjs:345 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 188 - work-order detail renders read-only checklist and evidence metadata without download links | tests/moderator-phase3.test.cjs:361 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 189 - technical create action stays disabled with an explanation and sends no write request | tests/moderator-phase3.test.cjs:374 | P | Reads removed source path src/pages/moderator/moderator-operational-screens.tsx. Current source is split into domain folders/index.page.tsx or extracted screens. Test must target current route/component before assertions can run. |
| not ok 191 - shared read-screen dispatcher classifies Phase 3 paths for lazy operational screens | tests/moderator-phase3.test.cjs:400 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 192 - Phase 4 schemas validate read records and strip private storage/correlation fields | tests/moderator-phase4.test.cjs:160 | L | Custom TypeScript loader cannot resolve/mock @/schema/machines.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 193 - billing API uses only documented GET routes, checks UUID identity and invoice proof scope | tests/moderator-phase4.test.cjs:180 | L | Custom TypeScript loader cannot resolve/mock @/schema/contracts.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 194 - buyback client has UUID detail only and never invents a collection request | tests/moderator-phase4.test.cjs:236 | L | Custom TypeScript loader cannot resolve/mock @/schema/machines.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 195 - Moderator invoice list renders backend values and keeps a 403 distinct from empty | tests/moderator-phase4.test.cjs:257 | L | Custom TypeScript loader cannot resolve/mock @/schema/machines.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 196 - invoice detail renders proof metadata and never exposes private object keys | tests/moderator-phase4.test.cjs:283 | L | Custom TypeScript loader cannot resolve/mock @/schema/machines.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 197 - Moderator global management shows current list/detail and permits global writes without Owner or device access | tests/moderator-phase4.test.cjs:306 | L | Test loader lacks CSS-module mock/resolution for ./action-bar.module.css after traversing shared ActionBar. Next supports this import; test fails before rendering actual Menu behavior. |
| not ok 198 - buyback list is unavailable and only a valid UUID detail can query Dolores | tests/moderator-phase4.test.cjs:354 | L | Custom TypeScript loader cannot resolve/mock @/schema/machines.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 199 - route read allowlist includes only Phase 4 read paths and leaves write sections pending | tests/moderator-phase4.test.cjs:374 | A | Expects isModeratorReadRoute(invoices) true in catch-all. Invoices now have dedicated /moderator/invoices/index.page.tsx and [invoiceId].page.tsx; catch-all read allowlist need not own those paths. |
| not ok 200 - Moderator route catalog accepts known pages and valid IDs, and rejects unknown paths | tests/moderator-shell-data-label.test.cjs:124 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 201 - Moderator Pages Router entry returns 404 for unsupported sections | tests/moderator-shell-data-label.test.cjs:167 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 202 - Moderator shell shows its navigation and selects the current nested section | tests/moderator-shell-data-label.test.cjs:198 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 203 - Moderator shell keeps other roles out of the Moderator navigation | tests/moderator-shell-data-label.test.cjs:215 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 204 - Moderator shell shows section actions only on root lists and overview | tests/moderator-shell-data-label.test.cjs:231 | L | Custom TypeScript loader cannot resolve/mock ./termination-cases.schema. The dependency exists in source; loader falls through to require() from tests instead of resolving source aliases/relative file dependencies. Assertions after load are blocked; no runtime defect established. |
| not ok 219 - authorized heartbeat cards refresh and Moderator telemetry remains disabled until backend role scope is aligned | tests/operations-workflow-phase8.test.cjs:95 | A | Regex expects refetchInterval: isSmartIot ? 5_000 : false. Current detail uses visibility and auth gating; refetchInterval: isPageVisible ? 5_000 : false at147. Functional polling behavior covered by new E2E. |
| not ok 42 - tests\\owner-technician-routing.test.cjs | tests/owner-technician-routing.test.cjs:1 | L | Whole test file aborts during module initialization: custom loader cannot resolve relative schema dependency (./termination-cases.schema). Counted as one reported failed entry; internal tests were not enumerated. |
| not ok 51 - tests\\shared-role-navigation-cross-role.test.cjs | tests/shared-role-navigation-cross-role.test.cjs:1 | L | Whole test file aborts during module initialization: custom loader cannot resolve relative schema dependency (./billing.schema). Counted as one reported failed entry; internal tests were not enumerated. |

#### Giới hạn review

- The test source contracts are older than several authorized refactors. Their initial blockers are classified here; subsequent masked failures have not been fabricated or counted.
- Signature test75 can fail on later obsolete recipe/device/billing expectations after correcting its first argument mismatch; its92-count contribution is one entry.
- Layout test8 checks missing controls= container usage, while a visible status filter remains implemented. Treat as layout contract drift to review visually, not conclusive application failure.
- The per-test audit is static; authenticated backend evidence is recorded above.

## Bổ sung UX giám sát — 2026-11-07

Người dùng yêu cầu tìm mẫu trực quan hóa và áp dụng, sau phần đánh giá ba role. Tham khảo Grafana Time series (https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/), ThingsBoard Dashboard Building Blocks (https://thingsboard.io/docs/user-guide/data-visualization/) và Carbon Charts (https://charts.carbondesignsystem.com/). Giữ nhận diện Dolores và sửa các file hiện có; không thêm thư viện hoặc file source mới.

- Admin/Moderator IoT mặc định là danh sách Smart IoT và chuyển sang hồ sơ mất kết nối bằng mục riêng. Legacy URL Admin theo Owner vẫn được giữ. Danh sách kế thừa paging của machinesApi.list; chưa triển khai phân trang toàn fleet.
- Màn operations theo máy của Admin/Moderator dùng cùng MachineMonitoringHeader với Owner. Admin xem heartbeat/points và rà soát theo máy; Moderator chỉ xem/xử lý rà soát. Không còn gọi dashboard overview để hiển thị tổng hệ thống dưới ngữ cảnh một máy; báo cáo tổng hợp Admin có liên kết riêng.
- Owner giữ ba tab và các bộ lọc URL hiện có; card có khoảng cách/tiêu đề đồng nhất, recipe breakdown dùng thanh ngang từ số liệu API. Không thêm KPI không có nguồn hoặc tỷ lệ tuân thủ vệ sinh.
- Telemetry dùng trục thời gian thực, trục Y có nhãn, lưới nhẹ, tooltip giá trị gốc và chế độ Biểu đồ/Bảng. Các số gần nhất/thấp nhất/cao nhất chỉ nói về dữ liệu đã tải/được vẽ, không giả định đầy đủ toàn khoảng. Giữ giới hạn 100 điểm/trang, 500 điểm/biểu đồ và explicit load more. Nhãn trục dùng scientific cho số rất nhỏ/lớn.
- Quyền, schema, abort, context validation và quyết định offline có preflight được giữ; query danh sách/chi tiết trong các trang IoT đã thêm subject vào cache key.
- Kiểm tra: Node feature 34/34; Playwright 25/25, trong đó luồng ba role qua 390/768/1023/1024/1440px; thêm kiểm tra chart/table, field URL và operator directory không gọi số liệu aggregate/Owner. Sau thay đổi nhỏ cuối đã chạy lại 6 test route/chart/viewport đạt. TypeScript đạt, lint 0 lỗi/3 cảnh báo cũ. Code review APPROVED sau khi sửa nhãn trục số nhỏ.
- Đã kiểm tra ảnh trình duyệt desktop/mobile và lỗi runtime; biểu đồ có dữ liệu dùng fixture trong context kiểm thử riêng. Server points 503 và grant Technician expiry vẫn là giới hạn đã ghi, không được diễn giải thành dữ liệu số 0.
- Production build kiểm tra trong NEXT_DIST_DIR=.next-cleaning-review đã thành công, gồm TypeScript và 45 trang static. Không commit/push trong lượt chỉnh UX.
