# Kế hoạch hoàn thiện RepairCase: giao máy thay thế đến đóng hồ sơ

## Trạng thái và ranh giới

- **Loại kế hoạch:** Kế hoạch tiếp nối cho các bước còn lại của luồng sửa chữa có máy thay thế.
- **Trạng thái cook:** Phase 1–3 complete cho triển khai, kiểm tra local và API read-after-write. Phase 4 triển khai/local/API đã qua nhưng browser review còn unverified. Theo chỉ đạo tiếp tục của người dùng, Phase 5 đã triển khai và API/local verification đã qua; build tổng thể và browser review còn unverified. Phase 4 và Phase 5 vẫn ở trạng thái **partial**, chưa đánh dấu complete. Plan chạy Standard mode, TDD off; dừng tại cổng Phase 5.
- **Workspace FE:** `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`.
- **Backend tham chiếu chỉ đọc:** `C:\GitHub\BEANS\dolores_platform`, commit `e3316355b53b8839cfd61aa9664adf4f330fd3ed`.
- **Kế hoạch nền:** `plans/role-based-repair-workflow-ui-api.md`. Plan này tiếp tục các Phase 3–5 còn thiếu, không làm lại các phase danh sách, intake/triage và phân công đã có ghi nhận.
- **Guide nghiệp vụ:** `plans/api-workflow-guide-ui-api.md`.
- **Ranh giới:** Chỉ thay đổi FE trong lần thực hiện sau. Không sửa API, state machine, database hoặc quyền ở BE. API triển khai thực tế có thể khác commit BE tham chiếu; phải đối chiếu môi trường chạy trước khi gửi mutation.
- **Dữ liệu:** Màn hình chỉ dùng dữ liệu API. Không thêm dữ liệu giả, ID mặc định hoặc minh chứng mẫu được gửi ngầm.

## Mục tiêu

Hoàn thiện UI và nối API cho chuỗi nghiệp vụ từ một replacement assignment đã lên kế hoạch đến lúc đóng RepairCase. Mỗi bước chỉ mở sau khi API trả về state và các bước tiền nhiệm đã được Owner xác nhận. UI phân biệt rõ trạng thái nghiệp vụ hiện tại, role đang được chờ, hành động role hiện tại được phép làm và lịch sử sự kiện.

Luồng đích:

1. Điều kiện vào: assignment `PLANNED`, case `PRIMARY_COLLECTED`, event nhận máy chính đã được Owner xác nhận.
2. ADMIN/MODERATOR kích hoạt assignment: assignment `ACTIVE`.
3. Role được BE cho phép ghi event `REPLACEMENT_DELIVERED` cho **máy thay thế B**.
4. OWNER xác nhận event giao máy B.
5. TECHNICIAN được phân công ghi `DIAGNOSIS`.
6. TECHNICIAN bắt đầu sửa: case `REPAIR_IN_PROGRESS`, ticket `IN_PROGRESS`.
7. TECHNICIAN hoàn tất: case `REPAIR_COMPLETED`, ticket `RESOLVED`.
8. Role được BE cho phép ghi event `REPLACEMENT_COLLECTED` cho **máy thay thế B**.
9. OWNER xác nhận đã thu máy B.
10. Role được BE cho phép ghi event `PRIMARY_RETURNED` cho **máy chính A**.
11. OWNER xác nhận đã nhận lại máy A; BE chuyển case sang `OWNER_ACKNOWLEDGED`.
12. Role được BE cho phép release assignment: assignment `RELEASED`, RepairCase `CLOSED`, các trạng thái máy được cập nhật theo backend.

Không tạo endpoint “đóng hồ sơ” riêng. Release assignment là bước cuối và có side effect vòng đời máy.

## Quyết định thiết kế đã được người dùng chọn

- Dùng **workflow feature dùng chung, route và shell riêng theo role**. Đây là quyết định đã chọn trước đó: “A — Workflow dùng chung, route riêng theo role”.
- Dùng **danh sách công việc + chi tiết theo hồ sơ**, mở bước hợp lệ kế tiếp: “1 — Danh sách + chi tiết/timeline, mở bước hợp lệ kế tiếp”.
- Giữ component và style dùng chung hiện có; kiểm tra component phù hợp trước khi tạo mới.
- Trong chi tiết RepairCase, hiển thị **danh sách bước quy trình** riêng, có dấu hiệu hoàn tất/đang chờ/đến lượt/khóa. Form hoặc nút của bước đang hoạt động nằm trong bước đó. **Dòng thời gian là lịch sử chỉ đọc**, tách khỏi danh sách bước và không chứa bản sao của nút thao tác.
- Cho phép nhập mã tham chiếu minh chứng riêng tư dưới dạng chuỗi vì hiện chưa có luồng upload được xác nhận. Chuỗi phải do người dùng nhập; không dùng placeholder làm giá trị, không bỏ trường bắt buộc và không gửi chuỗi rỗng.
- Giữ API người dùng đã có và role/backend authorization. Không gọi dịch vụ nội bộ, scheduler hoặc API thiết bị từ FE.

## Hiện trạng FE/BE đã khảo sát

### FE

- Ứng dụng Next.js Pages Router, React Query, Axios dùng Dolores API client và Zod schema.
- Shared screen: `src/components/features/repair-workflow/repair-case-detail-screen.tsx`; các role route/shell hiện có phải tiếp tục dùng feature này.
- API wrapper `src/apis/repair-cases.api.ts` đã có đọc case/timeline/custody, ghi custody, Owner acknowledge, diagnosis, start work và complete work. Wrapper `startWork` và bước `PRIMARY_COLLECTED` đã được nối trong shared screen; các bước tiếp theo chưa được nối đầy đủ vào UI.
- `src/apis/replacement-assignments.api.ts` đã có wrapper typed `activate` và `release`, nhưng các action này chưa được hoàn thiện trong workflow screen.
- Schema request cho phần lớn operation đã có trong `src/schema/machines.schema.ts`; cần kiểm tra lại response identity, status và validation trước khi mở action, không sao chép schema/wrapper đã tồn tại.
- Shared RepairCase screen hiện đã tải case, ticket, assignment, timeline và custody events; Owner acknowledgment theo event đã được triển khai. Custody/activation/release vẫn có các trạng thái chờ minh chứng hoặc chưa được nối làm mutation.
- Có màn hình công việc Technician cũ ở `src/pages/technician/tasks/work-order-detail-screen.tsx`. Không dùng bản sao thứ hai để triển khai RepairCase workflow; giữ riêng luồng installation work order và chỉ điều hướng đến RepairCase screen theo quan hệ hồ sơ khi phù hợp.
- `ActionItemsPanel` là lối tắt Owner ở dashboard cho action do API trả về. Nếu action bàn giao xuất hiện ở dashboard, nó phải dùng cùng điều kiện và mutation như màn chi tiết; màn chi tiết vẫn là nơi xem đầy đủ ngữ cảnh.
- Worktree đang có thay đổi chưa commit trên một số file workflow/API/messages/tests. Trước khi thực hiện plan, phải đọc diff hiện tại và giữ lại thay đổi người dùng đã có; không ghi đè hoặc dọn file ngoài scope.

### BE/API

| Bước | API backend | Quyền và body chính | Guard/response cần phản ánh trên UI |
|---|---|---|---|
| Đọc workflow | `GET /api/v1/repair-cases/{caseId}`, `/timeline`, `/custody-events`; `GET /api/v1/replacement-assignments/{assignmentId}`; đọc maintenance ticket theo API đang dùng | Bearer theo role; không truyền `role=ADMIN` thay cho token | Dùng state từ server; sau mutation đọc lại case, assignment, ticket, events |
| Kích hoạt assignment | `POST /api/v1/replacement-assignments/{assignmentId}/activate` | ADMIN/MODERATOR; `handoverEvidence`, `approvalReason`, `idempotencyKey`, `correlationId` | Assignment `PLANNED`; trong RepairCase screen chỉ cho kích hoạt sau khi event `PRIMARY_COLLECTED` đã được Owner xác nhận. BE có thể chấp nhận sớm hơn trong một số điều kiện nhưng UI phải theo thứ tự đã thống nhất |
| Giao máy B | `POST /api/v1/repair-cases/{caseId}/custody-events` | Role custody được BE cho phép; `eventType=REPLACEMENT_DELIVERED`, `machineId`, `conditionNotes`, `evidenceReference` | Case `PRIMARY_COLLECTED`, assignment `ACTIVE`, event nhận máy A đã được Owner xác nhận. `machineId` phải là `replacementAssignment.replacementMachineId` |
| Owner xác nhận event | `POST /api/v1/repair-cases/{caseId}/custody-events/{eventId}/acknowledge` | OWNER; `{ acknowledgement }` | Gắn đúng eventId/caseId; chỉ mở event kế tiếp sau khi response/read xác nhận event đã acknowledged |
| Ghi chẩn đoán | `POST /api/v1/repair-cases/{caseId}/diagnosis` | TECHNICIAN được giao; `{ diagnosis, evidenceReference }` | Chỉ sau `REPLACEMENT_DELIVERED` được Owner xác nhận; ticket `ASSIGNED` |
| Bắt đầu sửa | `POST /api/v1/repair-cases/{caseId}/work/start` | TECHNICIAN được giao; `{ workScope, emergencyAuthorizationId? }` | Case `DIAGNOSIS`, ticket `ASSIGNED`, Owner đã xác nhận máy B |
| Hoàn tất sửa | `POST /api/v1/repair-cases/{caseId}/work/complete` | TECHNICIAN được giao; `{ diagnosis, resolutionResult, workScope, evidenceReferences[], notes?, emergencyAuthorizationId? }` | Case `REPAIR_IN_PROGRESS`, ticket `IN_PROGRESS`; cần ít nhất một evidence reference riêng tư |
| Thu máy B | `POST /api/v1/repair-cases/{caseId}/custody-events` | Role custody được BE cho phép; `eventType=REPLACEMENT_COLLECTED`, `machineId`, `conditionNotes`, `evidenceReference` | Case `REPAIR_COMPLETED`, ticket `RESOLVED`, assignment `ACTIVE`, event giao máy B đã được Owner xác nhận; machine ID là máy B |
| Trả máy A | `POST /api/v1/repair-cases/{caseId}/custody-events` | Role custody được BE cho phép; `eventType=PRIMARY_RETURNED`, `machineId`, `conditionNotes`, `evidenceReference` | Case `REPLACEMENT_COLLECTED`, assignment `ACTIVE`, event thu máy B đã được Owner xác nhận; machine ID là `repairCase.primaryMachineId` |
| Release assignment | `POST /api/v1/replacement-assignments/{assignmentId}/release` | ADMIN/MODERATOR/TECHNICIAN theo phạm vi quyền của controller; `releaseEvidence`, `idempotencyKey`, `correlationId` | Case phải `OWNER_ACKNOWLEDGED`; `REPLACEMENT_COLLECTED` và `PRIMARY_RETURNED` đều phải được Owner xác nhận. Response `RELEASED`; BE đóng case và cập nhật machine lifecycle |

Các event custody đều cần `conditionNotes` và private `evidenceReference` (chuỗi 1–512 ký tự). Máy A và máy B phải lấy từ hai nguồn ID riêng như bảng trên; không tái sử dụng primary machine ID cho event của máy thay thế.

## Ngoài phạm vi

- Thay đổi BE hoặc tạo thêm endpoint, migration, state transition hay role policy.
- Tải ảnh lên hoặc tự tạo `evidenceReference`; chỉ nhập chuỗi private reference hiện có.
- Thay thế/ghép luồng installation work order vào RepairCase.
- Tạo thao tác đóng case trực tiếp, sửa/xóa event cũ, bỏ qua Owner acknowledgment hoặc cho phép nhảy bước.
- Làm lại intake, triage, tạo assignment, phân công Technician hoặc các màn Admin khác ngoài việc cập nhật cache/list liên quan sau mutation.
- Thiết kế lại toàn bộ màn hình duyệt chi phí. Giữ `RepairCostReviewScreen` hiện có; xử lý tranh chấp chi phí chỉ ở mức dependency/gate được nêu trong Phase 3.

## Các hướng triển khai đã cân nhắc

| Hướng | Ưu điểm | Rủi ro/chi phí | Quyết định |
|---|---|---|---|
| A. Bổ sung các bước còn thiếu trong shared RepairCase workflow feature, route riêng theo role | Khớp lựa chọn trước đó; một nguồn điều kiện state/API; giữ nguyên shell và quyền của từng role | Cần cẩn trọng để không làm màn detail quá tải; phải tách step list khỏi timeline | **Chọn theo quyết định đã có của người dùng** |
| B. Tạo màn hình/feature riêng cho từng role | Có thể tối ưu nội dung riêng từng actor | Nhân đôi state gating, API state và lỗi; các role dễ hiển thị tiến độ khác nhau | Không chọn |
| C. Đưa toàn bộ thao tác vào dashboard action list | Thao tác nhanh từ dashboard | Thiếu ngữ cảnh hồ sơ, máy A/B, event trước đó và điều kiện release; không hợp với chuỗi cần xác nhận tuần tự | Không chọn; dashboard chỉ là lối tắt khi API cung cấp action phù hợp |

## Kế hoạch theo phase

### Phase 1 — Chốt contract và state gate cho phần tiếp nối

**Kết quả:** Bảng điều kiện từ dữ liệu server tới actor, bước, API, body và response được mã hóa nhất quán; không gửi action dựa riêng vào text label hoặc dữ liệu cache cũ.

**Phạm vi:**

- Đọc lại diff chưa commit và xác nhận đúng component/routes/API/schema đang sở hữu từng hành động.
- Đối chiếu request/response của API triển khai với backend source; không giả định Swagger hiện tại giống commit tham chiếu.
- Tái sử dụng wrapper/schema hiện hữu; bổ sung typed wrapper/schema chỉ khi operation chưa được expose ở FE (đặc biệt emergency authorization nếu nhánh tranh chấp được xác nhận khả dụng).
- Centralize predicates hoặc giữ chúng trong workflow feature theo cấu trúc hiện có; tránh tạo lớp rỗng chỉ để bọc hàm.
- Xác định assignment ID, linked ticket ID, máy A, máy B, custody event IDs từ response API. Khi API thiếu dữ liệu quan hệ cần thiết, không suy ra từ text timeline nếu có nguồn ID có cấu trúc.

**Không thuộc phase:** Mutation thật trên hệ thống, thay đổi BE, nhập evidence thay mặt người dùng.

**Phụ thuộc:** Quyền đọc workspace BE; môi trường API và tài khoản role để kiểm chứng runtime có thể chưa sẵn sàng.

**Ranh giới file:** `src/apis/`, `src/schema/`, `src/components/features/repair-workflow/repair-case-detail-screen.tsx`, messages của repair workflow. Chỉ sửa các file cần thiết sau khi review diff.

**Xác minh:** Kiểm tra schema bắt buộc/giới hạn, status enum, response identity, actor role map, machine ID mapping và query key hiện có. Nếu runtime contract hoặc dữ liệu assignment không khớp, dừng mutation bị ảnh hưởng và ghi rõ dependency.

**Tiêu chí chấp nhận:** Không có URL/API/body bị đoán; không nhân đôi wrapper/schema; role và state gate có thể truy nguyên về BE contract.

**Điều kiện vào:** Người dùng duyệt plan để bắt đầu triển khai; diff worktree đã được ghi nhận.

**Điều kiện ra:** Các operation trong luồng có contract và điều kiện cho phép đã xác nhận, hoặc dependency chưa xác nhận được khoanh vùng cụ thể.

**Rủi ro/cổng dừng:** Swagger host `100.75.202.72:8082` và backend checkout có thể lệch phiên bản. Không phát mutation cho tới khi contract được xác nhận trong môi trường dùng để tích hợp.

**Cổng review:** Đọc-only review API payload, quyền theo role, A/B machine ID, query invalidation và phần thay đổi worktree hiện hữu.

#### Phase 1 execution record

- **Kết quả:** Đã đối chiếu API wrappers/schema hiện có với Dolores backend source ở commit ghi trên; xác nhận FE có sẵn typed wrappers cho custody creation, diagnosis, work start/complete, assignment activation/release, và Owner acknowledgment. Không tạo wrapper trùng và không gửi mutation lên môi trường thật.
- **State/role evidence:** Backend cho thấy Admin/Moderator activate; Technician được giao ghi diagnosis/start/complete; Owner acknowledge theo từng custody event; release chỉ sau case `OWNER_ACKNOWLEDGED` và cả hai event trả máy đã được Owner xác nhận. Event giao/thu máy B dùng `replacementAssignment.replacementMachineId`; event trả máy A dùng `repairCase.primaryMachineId`.
- **Acceptance mapping:** Không phát hiện API path/body bị đoán; request/response validation có sẵn được kiểm tra qua test; role/state predicates được truy nguyên về controller/service BE. Swagger/deployment parity chưa xác minh được, được ghi là dependency trước khi gửi mutation tới môi trường tích hợp.
- **Verification:** `node --test tests/repair-workflow-custody.test.cjs tests/repair-workflow-assignment.test.cjs tests/repair-workflow-phase4.test.cjs tests/repair-workflow-closeout.test.cjs` — passed, 15/15. `npm.cmd run lint` — passed, 0 errors; có một warning hook tồn tại ở `src/components/contracts/contract-activation-panel.tsx:96`. `tsc --noEmit --project tsconfig.repair-workflow.phase1.tmp.json` với include các source workflow/API/schema/messages đang đổi — passed; cấu hình tạm đã được xóa. Typecheck tổng `tsc --noEmit` — unavailable for full E2E typing vì workspace thiếu `@playwright/test`; lỗi implicit-any xuất hiện ở các E2E specs do thiếu type đó. Không cài dependency.
- **Review:** Không có finding mới về contract, role mapping hoặc chọn machine ID trong phạm vi Phase 1. UI hiện tại còn đặt “Bước tiếp theo” cùng thao tác `PRIMARY_COLLECTED` bên trong timeline; Phase 2 phải chuyển bước thao tác sang danh sách quy trình riêng và giữ timeline chỉ đọc theo quyết định thiết kế.
- **Environment/capability limits:** Không có file nguồn capability FE nội bộ (`fe-architecture`, `fe-state-data`, `fe-verify`) trong bản plugin đã cài; đã dùng hướng dẫn core `s-run`, `s-test`, `s-verify`, `s-review`, contract BE và convention hiện có trong repo. Không có role session để xác minh runtime API/deployment hoặc giao diện browser.
- **Worktree:** Giữ nguyên các thay đổi chưa commit trước đó. Không sửa product source trong Phase 1; file cấu hình typecheck tạm đã được dọn. Chỉ cập nhật phase record trong plan này.
- **Gate result:** Phase 1 **complete** cho contract/state mapping; kiểm tra runtime parity và toàn bộ E2E typechecking vẫn **unverified** vì giới hạn môi trường. Không có write ngoài workspace.

### Phase 2 — Kích hoạt assignment, giao máy B và Owner acknowledgment

**Kết quả:** Replacement assignment đi từ `PLANNED` sang `ACTIVE`; event giao máy B được lưu; Owner xác nhận event đó trước khi mở chẩn đoán.

**Phạm vi:**

- Bổ sung bước “Kích hoạt máy thay thế” cho ADMIN/MODERATOR với input private `handoverEvidence` và `approvalReason`.
- Tạo `idempotencyKey` và `correlationId` cho mỗi logical mutation; giữ nguyên key khi retry cùng payload, không gửi POST lặp khi request đang pending.
- Chỉ cho activate khi `PRIMARY_COLLECTED` đã có `ownerAcknowledgedAt`, assignment đang `PLANNED`, case/ticket và assignment còn khớp.
- Sau khi assignment `ACTIVE`, role custody hợp lệ ghi `REPLACEMENT_DELIVERED` cho máy B, cùng tình trạng máy và private reference.
- Owner xác nhận đúng event ID bằng `acknowledgement`; dashboard shortcut (nếu API action list trả action) phải dùng cùng request và invalidate với màn detail.
- Mọi mutation thành công hoặc có kết quả không chắc chắn đều tải lại case, assignment, ticket, timeline, custody và action/list liên quan theo đúng role.

**Không thuộc phase:** Chẩn đoán/sửa chữa và các event thu hồi ở cuối luồng.

**Side effect:** Activate đưa máy thay thế vào trạng thái triển khai theo BE; event giao máy B là bản ghi custody có thể kiểm toán.

**Xác minh:** Case `PRIMARY_COLLECTED` chưa được Owner xác nhận thì không có nút activate/giao máy B. Sau activate, chỉ `ACTIVE` mới cho ghi event. Request giao máy B gửi `assignment.replacementMachineId`; response phải cùng case/event type/machine. Owner acknowledgment chỉ mở chẩn đoán sau khi server xác nhận.

**Tiêu chí chấp nhận:** Không lặp assignment; API báo lỗi/409 được giữ nguyên và UI tải lại trạng thái; không gửi `machineId` của máy A cho giao máy B; Owner acknowledgment không bị xem như diagnosis.

**Điều kiện vào:** Phase 1 qua cổng; case có assignment `PLANNED`, ticket `ASSIGNED`, `PRIMARY_COLLECTED` event Owner-acknowledged.

**Điều kiện ra:** Assignment `ACTIVE`, `REPLACEMENT_DELIVERED` đã được lưu và Owner xác nhận từ API.

**Rủi ro/cổng dừng:** Thiếu private evidence reference hoặc actor không có quyền theo runtime contract thì không tạo mutation giả/placeholder; giữ bước hiện tại và hiện lý do xử lý được.

**Cổng review:** Admin/Moderator permission, custody role, Owner scope, event ordering, idempotency và xác nhận UI step list tách khỏi timeline.

#### Phase 2 execution record

- **Kết quả:** Đã hoàn thiện step list riêng trong shared RepairCase detail cho nhận máy chính, Owner xác nhận máy chính, activate assignment, ghi `REPLACEMENT_DELIVERED`, Owner xác nhận máy thay thế và trạng thái mở bước chẩn đoán. Timeline RepairCase và lịch sử custody chỉ hiển thị sự kiện đã ghi; không còn form thao tác trong hai lịch sử này.
- **API/state:** Tái sử dụng wrapper có sẵn. Chỉ Technician được giao mới ghi `PRIMARY_COLLECTED`, với `repairCase.primaryMachineId` và string `evidenceReference`. Admin/Moderator activate khi case `PRIMARY_COLLECTED`, assignment `PLANNED`, ticket `ASSIGNED`, assignment thuộc đúng case và Owner đã xác nhận máy chính; body dùng private `handoverEvidence`, `approvalReason`, `idempotencyKey`, `correlationId`. Sau khi assignment `ACTIVE`, Admin/Moderator hoặc Technician được giao có thể ghi `REPLACEMENT_DELIVERED` với `assignment.replacementMachineId`, tình trạng máy và string private `evidenceReference`. Owner xác nhận từng event theo đúng event ID; xác nhận giao máy B mới mở bước chẩn đoán.
- **Đồng bộ và phục hồi:** Mutation làm mới query RepairCase/ticket/assignment/timeline/custody, danh sách maintenance request, dashboard action items và Technician work items. Lỗi API giữ input để thử lại; request activation cùng payload giữ nguyên idempotency/correlation key. Owner dashboard shortcut tiếp tục dùng cùng API acknowledgment và invalidates cả action list lẫn workflow detail.
- **Verification:** `node --test tests/repair-workflow*.test.cjs tests/replacement-assignments-api.test.cjs` — passed, 17/17. Targeted `tsc --noEmit` với các file workflow/API/schema/messages và `next-env.d.ts` — passed; config tạm đã được xóa. `npm.cmd run lint` — passed, 0 errors; một warning hook cũ vẫn còn tại `src/components/contracts/contract-activation-panel.tsx:96`. `git diff --check` — passed, chỉ Git in cảnh báo chuyển LF sang CRLF cho các file đang đổi. `npm.cmd run build` — không hoàn tất typecheck vì workspace thiếu module `@playwright/test` được import trong `playwright.config.ts:1`; không cài dependency. Phase 2 API test sau đó được user cho phép và đã xác nhận read-after-write: assignment `e1e8550b-4d00-48a2-82fc-ddeb8b44f7b5` thành `ACTIVE`; RepairCase `255e53c8-8304-4cdd-98ba-0c98243304a7` thành `REPLACEMENT_DELIVERED`; event `6b96484b-1242-4928-a0c2-86e34694c60e` được Owner xác nhận; ticket vẫn `ASSIGNED`.
- **Review:** Không có finding mới về role/state gates, A/B machine ID, thứ tự Owner acknowledgment, retry/idempotency, cache invalidation hoặc việc tách thao tác khỏi timeline. Component có trạng thái waiting/current/complete/locked, nhãn form, thông báo lỗi và trạng thái thành công; browser/keyboard/viewport interaction chưa được quan sát trực tiếp.
- **Environment/evidence gaps:** API runtime của Phase 2 đã được xác minh trên case test đã cấp; UI browser, keyboard/focus và responsive chưa được quan sát trực tiếp. Build/E2E typing còn bị chặn bởi dependency Playwright thiếu trong `node_modules`.
- **Worktree:** Giữ nguyên các thay đổi chưa commit có từ trước. Các sửa đổi Phase 2 nằm trong cùng một số file đã dirty; không dọn hoặc ghi đè thay đổi ngoài scope. Các reference gửi lên chỉ là chuỗi TEST ONLY, không tải ảnh.
- **Gate result:** Phase 2 **complete cho triển khai, kiểm tra local và API read-after-write**. Kiểm tra trực quan browser còn **unverified**; Phase 3 tiếp tục sau cổng này.

### Phase 3 — Technician chẩn đoán, bắt đầu và hoàn tất sửa

**Kết quả:** TECHNICIAN được phân công đưa RepairCase từ `REPLACEMENT_DELIVERED` qua `DIAGNOSIS`, `REPAIR_IN_PROGRESS` tới `REPAIR_COMPLETED`; ticket chuyển `ASSIGNED` → `IN_PROGRESS` → `RESOLVED`.

**Phạm vi:**

- Nối form chẩn đoán vào shared RepairCase step list: `diagnosis` và chuỗi `evidenceReference` riêng tư; chỉ mở khi Owner đã xác nhận nhận máy B, ticket `ASSIGNED`, actor đúng Technician ID được phân công.
- Nối bước bắt đầu sửa với `workScope`; response phải khớp ticket/case và `IN_PROGRESS`.
- Nối bước hoàn tất với `diagnosis`, `resolutionResult`, `workScope`, ít nhất một private `evidenceReferences` và `notes` tùy chọn.
- Refresh case, ticket, timeline, custody nếu liên quan, task list Technician và Owner/operator actions sau mỗi kết quả.
- Giữ lại component tài chính `RepairCostReviewScreen` đang có. Tranh chấp chi phí là nhánh chặn: chỉ tích hợp emergency authorization khi có cách đọc đúng trạng thái review hiện tại và truyền authorization ID server trả về. Không đoán endpoint latest-review hoặc chấp nhận authorization ID do người dùng gõ tùy ý.

**Không thuộc phase:** Thay đổi quy tắc tài chính, invoice, amount, hoặc backend dispute policy.

**Side effect:** Diagnosis, scope và evidence được lưu; start/complete thay đổi cả case lẫn maintenance ticket.

**Xác minh:** Người khác Technician được giao không thấy form; form không mở trước Owner acknowledgment hoặc sai trạng thái ticket; completion chặn thiếu evidence; mutation conflict làm mới server data chứ không báo thành công. Thử đường không tranh chấp; nếu API không cho xác định trạng thái tranh chấp mới nhất, dừng nhánh bị ảnh hưởng và ghi rõ dependency trước khi cho Tech tiếp tục trong trường hợp tranh chấp.

**Tiêu chí chấp nhận:** Case/ticket chỉ hiển thị hoàn tất theo response server; không suy ra từ việc người dùng submit; data không được hiển thị như khoản nợ khi chỉ là estimate.

**Điều kiện vào:** Phase 2 kết thúc với event giao máy B được Owner xác nhận và ticket `ASSIGNED`.

**Điều kiện ra:** Case `REPAIR_COMPLETED`, ticket `RESOLVED`; nhánh tranh chấp nếu có được xử lý theo contract hoặc bước bị khóa với dependency rõ ràng.

**Rủi ro/cổng dừng:** API BE bắt buộc private evidence. Hiện không có upload flow được xác nhận; dùng string người thao tác nhập, không bỏ qua bắt buộc. Hiện chưa xác nhận latest repair-cost review read contract, vì vậy không mở đường emergency tùy đoán.

**Cổng review:** Technician assignment, acknowledgment prerequisite, evidence privacy, đồng bộ status case/ticket và tranh chấp chi phí.

#### Phase 3 execution record

- **Kết quả:** Đã nối ba bước Technician theo thứ tự trong danh sách quy trình dùng chung: ghi chẩn đoán, bắt đầu sửa, hoàn tất sửa. Timeline tiếp tục chỉ đọc. Form chỉ xuất hiện cho Technician được gán, đúng case/ticket, assignment còn `ACTIVE`, event giao máy thay thế đã được Owner xác nhận và trạng thái server đáp ứng bước hiện tại.
- **API/state:** `POST /repair-cases/{caseId}/diagnosis` gửi `diagnosis` và private string `evidenceReference`, chỉ chấp nhận response ticket khớp case/ticket, `ASSIGNED` và diagnosis. `POST /work/start` gửi `workScope`, chỉ báo hoàn tất sau response ticket `IN_PROGRESS`. `POST /work/complete` gửi diagnosis server đã lưu, `resolutionResult`, `workScope`, ít nhất một private string trong `evidenceReferences` và `notes` tùy chọn; không tự truyền emergency authorization. Chỉ trạng thái đọc lại từ RepairCase và ticket mới đánh dấu bước hoàn tất. Khi `replacementAssignmentId` thiếu trên MaintenanceRequest, detail screen lấy ID từ event `REPLACEMENT_PLANNED` trong timeline; đây là dữ liệu RepairCase assignment được BE ghi nhận.
- **Đồng bộ và lỗi:** Sau từng mutation làm mới RepairCase, ticket, timeline, custody, work items Technician và action items. Nếu response mutation thành công nhưng dữ liệu đọc lại chưa đồng bộ, giao diện hiện trạng thái chờ đồng bộ thay vì giả báo hoàn tất. API wrapper kiểm tra response thuộc đúng case/ticket và đúng trạng thái cuối mong đợi.
- **Verification:** Bộ hồi quy liên quan — passed, 23/23 (`repair-workflow-technician-work`, custody, assignment, Phase 4 contract, closeout và replacement assignment). Targeted TypeScript check — passed; cấu hình tạm đã được xóa. `npm.cmd run lint` — passed, 0 errors và một warning hook có trước tại `src/components/contracts/contract-activation-panel.tsx:96`. `git diff --check` — passed. `npm.cmd run build` bị chặn vì thiếu `@playwright/test` trong `node_modules`. Browser review không khởi chạy được vì `node_repl` báo `failed to write kernel assets`; không thực hiện login qua UI. Runner đăng nhập mới mỗi lượt đã được thêm ở `scripts/manual/repair-phase3-api-test.ps1`; PowerShell parser xác nhận cú pháp hợp lệ.
- **Review:** Runtime preflight do user chạy xác nhận login mới thành công nhưng MaintenanceRequest không trả non-null `replacementAssignmentId`. BE gắn assignment trực tiếp với RepairCase, còn assignment ID có thể lấy từ `relatedSteps` của Technician work-items; runner được sửa để dùng nguồn này làm fallback. Shared detail screen cũng được sửa để lấy ID từ event `REPLACEMENT_PLANNED` nếu request không có ID. Regression sau sửa đạt. API runtime xác nhận toàn bộ ba bước; response đọc lại khớp trạng thái mong đợi. Cost-dispute branch vẫn không có endpoint đã xác nhận để đọc latest review theo ticket; không đoán endpoint và UI không gửi authorization ID nhập tay.
- **Environment/evidence gaps:** API runtime Phase 3 được xác minh bằng TECH login mới trong PowerShell dưới user profile; browser review còn unverified. Build/browser review còn các giới hạn nêu trên. Không đọc/in mật khẩu hoặc token.
- **Worktree:** Giữ nguyên các thay đổi chưa commit có từ trước. Không cài dependency, không dừng dev server có sẵn, và không tạo file credential hoặc config tạm mới.
- **Live API evidence:** Case `255e53c8-8304-4cdd-98ba-0c98243304a7`; ticket `6a2fd194-14a4-49fc-be67-d2828ea58fbe`; assignment `e1e8550b-4d00-48a2-82fc-ddeb8b44f7b5`. TECH login mới thành công. Read-after-write: diagnosis → case `DIAGNOSIS`, ticket `ASSIGNED`; start → `REPAIR_IN_PROGRESS`/`IN_PROGRESS`; completion → `REPAIR_COMPLETED`/`RESOLVED`. Runner ID `31a6db6ced764fc6ac93c6a9a6449eef`. Backend ghi synthetic TEST ONLY evidence references; không upload ảnh.
- **Gate result:** Phase 3 **complete cho triển khai, kiểm tra local và API runtime/read-after-write**. Browser review còn **unverified**; Phase 4 API đã xác minh, browser review vẫn ở cổng.

### Phase 4 — Thu máy B, trả máy A và Owner xác nhận

**Kết quả:** Hai return custody events được ghi theo đúng thứ tự và máy; Owner xác nhận từng event trước khi bước sau mở.

**Phạm vi:**

- Tạo event `REPLACEMENT_COLLECTED` sau khi repair hoàn tất, ticket `RESOLVED`, assignment `ACTIVE`, và giao máy B đã Owner-acknowledged; gửi machine ID của máy B.
- Owner acknowledge đúng event; sau server confirmation mới mở trả máy A.
- Tạo event `PRIMARY_RETURNED` với `repairCase.primaryMachineId` (máy A), tình trạng máy và private evidence reference.
- Owner acknowledge event trả máy A; tải lại trạng thái cho tới khi RepairCase thành `OWNER_ACKNOWLEDGED`.
- Hiển thị các trạng thái đang chờ role khác trong danh sách quy trình; lịch sử custody/timeline vẫn là phần chỉ đọc riêng.

**Không thuộc phase:** Release assignment hoặc đóng hồ sơ trước Owner xác nhận máy A.

**Side effect:** Lưu hai event custody và các Owner acknowledgment; status/asset lifecycle do BE điều khiển.

**Xác minh:** API trả lỗi nếu đảo thứ tự; UI cũng không mở `PRIMARY_RETURNED` trước khi máy B được Owner xác nhận đã thu. Đối chiếu từng body machine ID với assignment/case; refresh qua GET sau submit.

**Tiêu chí chấp nhận:** Cả hai event có acknowledgment timestamp từ server; event thứ hai không thể thay event thứ nhất; case chỉ sang `OWNER_ACKNOWLEDGED` sau event cuối được xác nhận.

**Điều kiện vào:** Phase 3 kết thúc ở `REPAIR_COMPLETED`, ticket `RESOLVED`, assignment `ACTIVE`.

**Điều kiện ra:** `REPLACEMENT_COLLECTED` và `PRIMARY_RETURNED` được Owner xác nhận; case `OWNER_ACKNOWLEDGED`.

**Rủi ro/cổng dừng:** Event đã tồn tại nhưng UI đang hiển thị cache cũ; khi mutation xung đột, tải lại API và cho phép tiếp tục từ trạng thái server, không tạo event trùng.

**Cổng review:** A/B machine IDs, ordering, owner scope, idempotent acknowledgment và trạng thái waiting/complete.

#### Phase 4 execution record

- **Kết quả triển khai:** Shared RepairCase step list có bốn bước theo thứ tự: thu máy B, Owner xác nhận thu máy B, trả máy A, Owner xác nhận nhận lại máy A. Timeline và lịch sử custody vẫn chỉ đọc; form không đặt trong hai lịch sử này.
- **API/state:** Dùng `POST /repair-cases/{caseId}/custody-events` với `eventType=REPLACEMENT_COLLECTED`, `machineId=assignment.replacementMachineId`, `conditionNotes` và private string `evidenceReference`. Bước chỉ mở ở case `REPAIR_COMPLETED`, ticket `RESOLVED`, assignment `ACTIVE`, sau Owner acknowledgment event `REPLACEMENT_DELIVERED` đúng máy B. Owner xác nhận qua `POST /repair-cases/{caseId}/custody-events/{eventId}/acknowledge`; sau khi dữ liệu đọc lại có acknowledgment mới mở bước kế.
- **API/state tiếp:** `PRIMARY_RETURNED` dùng `repairCase.primaryMachineId` (máy A), chỉ mở khi case `REPLACEMENT_COLLECTED`, ticket `RESOLVED`, assignment `ACTIVE`, event thu máy B đã được Owner xác nhận và assignment/case cùng chỉ tới máy A. Owner xác nhận đúng event ID. Bước cuối chỉ hiển thị hoàn tất khi GET custody có acknowledgment và GET RepairCase xác nhận `OWNER_ACKNOWLEDGED` (hoặc `CLOSED` sau Phase 5). Không gọi release assignment.
- **Role, lỗi và dữ liệu:** Chỉ Admin/Moderator hoặc Technician được giao có thể ghi event; Owner chỉ xác nhận. Kiểm tra machine ID A/B, trạng thái, liên kết case/ticket/assignment, query đang tải và event trùng trước mutation. Error từ API được hiển thị; form giữ dữ liệu để thử lại. Evidence nhận chuỗi riêng tư, không tải ảnh; không hiển thị reference trong lịch sử. Query workflow, maintenance requests, action items và Technician work items được invalidate sau mutation.
- **Verification local:** `node --test tests/repair-workflow-closeout.test.cjs tests/repair-workflow-custody.test.cjs tests/repair-workflow-assignment.test.cjs tests/repair-workflow-phase4.test.cjs tests/repair-workflow-technician-work.test.cjs tests/replacement-assignments-api.test.cjs` — passed, 23/23. Targeted TypeScript check — passed; config tạm đã xóa. `npm.cmd run lint` — passed, 0 errors; còn một warning hook có trước tại `src/components/contracts/contract-activation-panel.tsx:96`. `git diff --check` — passed; chỉ có thông báo quy tắc LF/CRLF. PowerShell parser xác nhận `scripts/manual/repair-phase4-api-test.ps1` hợp lệ.
- **Build:** `npm.cmd run build` thất bại ở typecheck vì `playwright.config.ts` import `@playwright/test` nhưng module không có trong `node_modules`; không cài dependency. Targeted TypeScript check của các file workflow đã qua.
- **Review:** Rà soát phát hiện trạng thái bước Owner xác nhận máy A có thể báo hoàn tất theo acknowledgment timestamp khi RepairCase GET chưa đồng bộ. Đã sửa: giữ bước ở trạng thái chờ và thông báo đồng bộ cho tới khi server trả `OWNER_ACKNOWLEDGED`; regression được thêm và passed. Không còn finding về role gate, event ordering, machine IDs hoặc thứ tự mở bước.
- **API live:** Runner đăng nhập TECH mới và tìm assignment từ event `REPLACEMENT_PLANNED` trong RepairCase timeline; preflight xác nhận case `REPAIR_COMPLETED`, ticket `RESOLVED`, assignment `ACTIVE`. Event `REPLACEMENT_COLLECTED` với máy B được POST và GET đọc lại đúng; Owner acknowledge được GET xác nhận. Lần chạy đầu dừng trước khi trả máy A do runner đăng nhập TECH thừa lần nữa và gặp HTTP 429. Runner được sửa để dùng lại token trong cùng role; lượt tiếp tục tìm thấy event B đã Owner-acknowledged, không tạo trùng, sau đó POST `PRIMARY_RETURNED` bằng máy A; Owner acknowledge; GET cuối xác nhận case `OWNER_ACKNOWLEDGED` và cả hai event có acknowledgment timestamp. Run ID lượt tiếp tục: `2bc240161d774c578fcfd54be776b496` (dùng cho event trả máy A; event thu máy B được ghi ở lượt trước). Dùng chuỗi TEST ONLY; không upload ảnh; assignment còn `ACTIVE`; Phase 5 release không được gọi.
- **Browser/UI:** Browser, keyboard/focus và responsive review còn **unverified**; không có bằng chứng thao tác UI cho các bước mới.
- **Gate result:** Phase 4 **partial — implementation, local checks và API runtime/read-after-write complete; browser review unverified**. Giữ Phase 5 pending và dừng tại cổng Phase 4.

### Phase 5 — Release, đóng case và kiểm tra xuyên role

**Kết quả:** Người có quyền release assignment thực hiện bước cuối; server xác nhận assignment `RELEASED` và case `CLOSED`.

**Phạm vi:**

- Mở bước release khi case `OWNER_ACKNOWLEDGED`, assignment `ACTIVE`, cả hai return events đã Owner-acknowledged.
- Hiển thị xác nhận trước submit vì release thay đổi trạng thái hai máy và đóng case.
- Gửi chuỗi private `releaseEvidence`, `idempotencyKey`, `correlationId`; cho phép role đúng theo controller và owner/contract scope.
- Kiểm tra response assignment là `RELEASED`, sau đó tải lại assignment và RepairCase để xác nhận `CLOSED`; nếu API trả thành công nhưng read-after-write chưa đồng bộ, hiển thị trạng thái đang đồng bộ thay vì tự kết luận.
- Làm mới technical-request list, Technician work items, Owner dashboard/action items và detail cache tương ứng.

**Không thuộc phase:** Reopen, sửa lịch sử, hủy assignment đã active hoặc bỏ qua prerequisite.

**Side effect:** BE đưa máy thay thế về kho/luồng được quy định, cập nhật máy chính theo contract và đóng RepairCase. Đây là mutation có tác động vòng đời máy, không phải thao tác chỉ hiển thị.

**Xác minh:** Release không thể gửi trước `OWNER_ACKNOWLEDGED` hoặc thiếu một acknowledgment; chỉ actor được controller chấp nhận thấy action. Sau release, các role view đọc lại cùng trạng thái; không còn step mở.

**Tiêu chí chấp nhận:** API response xác nhận `RELEASED`; API case read xác nhận `CLOSED`; timeline giữ sự kiện cuối; action list không tiếp tục hiển thị case như đang mở.

**Điều kiện vào:** Các GET mới nhất đáp ứng guard release. Phase 4 browser review chưa xong; người dùng đã chỉ đạo tiếp tục Phase 5 sau khi trạng thái API Phase 4 và toàn bộ prerequisite được xác nhận lại bằng GET.

**Điều kiện ra:** Assignment và case ở trạng thái cuối nhất quán trên mọi role route được phép.

**Rủi ro/cổng dừng:** Nếu role/contract scope hoặc response read-after-write khác backend source, dừng release UI; không tự suy ra đóng case từ response assignment đơn lẻ.

**Cổng review:** Irreversible side effects, authorization, privacy evidence, idempotency/retry, consistency giữa assignment/case/ticket/action list và responsive/accessibility.

#### Phase 5 execution record

- **Triển khai FE:** Thêm bước release vào danh sách workflow dùng chung. Chỉ actor role được hỗ trợ và khi case `OWNER_ACKNOWLEDGED`, assignment `ACTIVE`, ID máy A/B khớp, cùng hai custody event đã Owner xác nhận đúng máy mới được mở action. Người dùng nhập `releaseEvidence` dạng private-reference string; trước POST có `NotificationDialog` xác nhận thay đổi vòng đời máy và đóng hồ sơ. Gửi `idempotencyKey` và `correlationId`; lỗi giữ form để retry cùng key cho cùng payload. Sau mutation invalidate RepairCase/maintenance requests, Technician work items và dashboard action items.
- **Review code:** Đã rà soát authorization gate, machine/case linkage, hai Owner acknowledgment, xác nhận destructive action, keyboard/focus của `NotificationDialog`, retry/idempotency, read-after-write state và query invalidation. Không thấy finding chặn trong code. Review bằng code; chưa có bằng chứng thao tác trực tiếp trên browser.
- **Local verification:** Regression set liên quan passed **24/24**; typecheck riêng `src` passed; `npm.cmd run lint -- --no-fix` passed với 0 lỗi và một warning hook có trước tại `src/components/contracts/contract-activation-panel.tsx:96`; PowerShell parser của API runner passed; `git diff --check` passed. Typecheck toàn repo và `npm.cmd run build` không qua vì workspace thiếu module `@playwright/test` được tham chiếu từ `playwright.config.ts` và E2E specs. Không cài dependency.
- **Preflight live:** TECH GET xác nhận case `OWNER_ACKNOWLEDGED`, ticket `RESOLVED`, assignment `ACTIVE`, assignment ID `e1e8550b-4d00-48a2-82fc-ddeb8b44f7b5`; custody `REPLACEMENT_COLLECTED` của máy B và `PRIMARY_RETURNED` của máy A đều được Owner xác nhận. Preflight không gửi mutation.
- **API live:** Đã gửi một lần `POST /api/v1/replacement-assignments/e1e8550b-4d00-48a2-82fc-ddeb8b44f7b5/release` với `releaseEvidence` TEST ONLY, `idempotencyKey` và `correlationId`; không upload ảnh. Run ID: `be773cf1d0b04b3aaba1592bef7ca2a3`. POST response xác nhận assignment `RELEASED`; GET xác nhận assignment `RELEASED`, RepairCase `CLOSED`, timeline `CASE_CLOSED` và hai acknowledgment còn nguyên. Không retry POST.
- **Side effect/read-after-write:** GET máy B xác nhận `IN_WAREHOUSE`, Owner đã được xóa. Hợp đồng đang `ACTIVE`; GET máy A xác nhận `DEPLOYED_CONTRACT_OWNER`. Vé vẫn `RESOLVED`.
- **Re-verification:** 2026-11-02 chạy lại Phase 5 runner ở chế độ GET-only. Kết quả lặp lại `assignment=RELEASED`, `case=CLOSED`, `timeline=CASE_CLOSED`, máy B `IN_WAREHOUSE` không Owner, máy A `DEPLOYED_CONTRACT_OWNER`; runner nhận diện trạng thái cuối và không gửi mutation lần hai.
- **Cross-role action lists:** TECH `/technician/work-items` không còn RepairCase đã đóng. OWNER GET thấy cùng case `CLOSED`, và `/dashboard/action-items?resourceType=REPAIR_CASE` không còn action cho case này.
- **Browser/UI:** Không xác minh trực tiếp form/dialog, trạng thái disabled/error, focus/keyboard hoặc viewport responsive. `@playwright/test` thiếu khiến build/E2E setup không dùng được; Computer Use `node_repl` cũng không khởi tạo được sau một lần reset (`failed to write kernel assets: The system cannot find the path specified`). Vì vậy các tiêu chí browser/accessibility/responsive vẫn **chưa được xác minh**.
- **Gate result:** Phase 5 **partial — implementation, targeted local checks, review, live API POST/GET read-after-write, machine lifecycle và cross-role action-list verification passed; build tổng thể và browser/accessibility/responsive review unverified**. Không đánh dấu plan/Phase 4/Phase 5 complete.

## Điều kiện xác minh tổng thể khi plan được thực hiện

- Chỉ gọi endpoint theo API client/proxy hiện có; JWT role hiện tại là nguồn authorization, không truyền role key giả trong query/body.
- Kiểm tra từng transition bằng API response và GET mới sau mutation; xử lý lỗi 400/403/404/409/422 theo server và giữ lại form input an toàn để retry.
- Dùng regression checks hiện có cho request schema/API wrapper/workflow predicates; kiểm tra typecheck/lint/build theo trạng thái dependency của workspace; kiểm tra tương tác role và responsive tại màn 360 CSS px/zoom 200% khi môi trường cho phép.
- Không gửi write đến backend thật trong phase lập kế hoạch. Khi bắt đầu thực hiện, cần tài khoản role và môi trường dữ liệu có thể kiểm soát; nếu không có thì giới hạn ở contract/mock verification và ghi rõ thiếu runtime evidence.
- Không chạy hoặc thêm kiểm thử trong lần lập kế hoạch này.

## Quyết định còn phụ thuộc môi trường

1. **Parity API:** Backend source đã xác nhận tại commit nêu trên, nhưng Swagger/deployment đang chạy có thể khác. Phase 1 phải phát hiện mismatch trước khi nối mutation.
2. **Private evidence:** Backend yêu cầu chuỗi private reference; không tìm thấy contract upload cho RepairCase trong FE khảo sát. Giao diện cho phép nhập mã chuỗi, không biến placeholder thành dữ liệu thật.
3. **Cost dispute:** Backend có thể chặn start/complete khi review bị dispute và yêu cầu emergency authorization hợp scope, chưa sử dụng. FE chưa có contract đã xác nhận để đọc latest review an toàn; nếu môi trường cũng không cung cấp quan hệ đó thì nhánh dispute là dependency cần backend bổ sung, không tự tạo endpoint.
4. **Worktree changes:** Có nhiều file workflow đã chỉnh nhưng chưa commit. Thực hiện plan cần review diff đầu tiên và bảo toàn các sửa đổi này.
