# Phase 01 — API contracts và role scope

Status: passing — adapter/schema đã được kiểm thử và code review APPROVED; người dùng đã duyệt Phase02. Build/full suite còn lỗi baseline bên ngoài feature.
Canonical ID: `phase-01-api-contracts-and-role-scope`.
Stories: CT-01, CT-03, CT-04, CT-05, CT-06.

## Mục tiêu và phạm vi

Chốt nguồn dữ liệu, strict schema, timezone và quyền trước khi thêm UI. Giữ axiosClient/base URL/AbortSignal và auth subject helper hiện có.

1. Đối chiếu OpenAPI/runtime GET có quyền với đặc tả BE fb11d12: Owner cup-count/brew/cleaning PageResponse, heartbeat health/brewState/sequenceNumber và offline DTO/pagination headers. Không coi JSON ví dụ là capture.
2. Xác minh `dailyBreakdown.date` bucket timezone bằng BE source hoặc response đủ căn cứ; chọn nhãn UTC nếu chưa hỗ trợ VN. Chốt max range telemetry theo deployment, limit≤500 và offset≤100000.
3. API Owner không nhận ownerId; optional machineId lấy từ scoped machine context. Validate ownerId response khi có authenticated business Owner mapping tin cậy; không giả định mọi JWT sub luôn là business ownerId. Identity machine/response phải khớp.
4. Chuẩn hóa date-only VN sang bounds UTC `[from,to)`; validate query tab/enum/page/range trước request. Không diễn giải timestamp thiếu offset bằng local timezone âm thầm.
5. Thêm adapter/schema Owner Analytics và Offline Review tại proposed paths sau khi duyệt tạo source. List Owner theo PageResponse; offline list theo headers, phân biệt header thiếu/malformed với hết trang.
6. Tách cache role+authScopedQuerySubject+machine+filter+page; query disabled trước router ready/scoped machine. Cancel response cũ; không retry401/403/mutation; 503 GET backoff hữu hạn.
7. Chốt ngân sách cleaning hôm nay: snapshot page tuần tự có max pages/request budget; nếu còn dữ liệu, không kết luận thiếu. Scoped existence fallback chỉ có giới hạn, ưu tiên detail/visible rows, không tự fanout tất cả máy.

## File/modules

- Sửa `src/apis/telemetry.api.ts`, `src/schema/telemetry.schema.ts`; tái sử dụng `src/lib/query-subject.ts`, `src/lib/http.ts`.
- Đề xuất tạo (chưa được duyệt source): `src/apis/owner-analytics.api.ts`, `src/schema/owner-analytics.schema.ts`, `src/apis/offline-violation-reviews.api.ts`, `src/schema/offline-violation-reviews.schema.ts`.
- Date/query helper chỉ tạo nếu có trách nhiệm dùng chung thực tế và được duyệt exact path; nếu không giữ tại Owner operations page.
- Mở rộng `tests/dolores-telemetry.test.cjs`; đề xuất `tests/owner-analytics.test.cjs`, `tests/offline-violation-reviews.test.cjs` khi test hiện có không phù hợp, duyệt trước tạo.

## Dependencies

Spec/scenarios đã có; source file approval và live GET credentials có thể còn thiếu. Phase02/03 phụ thuộc adapter/date/permission contract phase này.

## Tests và acceptance

- S01/S04: account/machine/filter switch không render response cũ; query keys đầy đủ.
- S02/S03/S21/S26/S29/S34: Moderator zero telemetry requests; Owner không truyền ownerId;403 không gọi fallback rộng; mock scope và live scope báo riêng.
- S07/S08/S11/S16: invalid bounds/page/enum dừng trước request, 0/null phân biệt, PageResponse/headers đúng; ngày06/11 VN đúng UTC bounds.
- S22/S23/S25: machine mismatch bị reject; bucket ngày/timestamp có evidence hoặc đánh dấu chưa xác minh; không permissive parse.
- S28/S30: không thêm log nhạy cảm/ingest/certificate mutations.
- Chạy adapter tests liên quan, lint, tsc baseline/delta và diff check. Chưa có runtime thì ghi contract verification pending, không xác nhận quyền BE từ unit test.

## Risks / gate

Nullability và owner ID mapping phải dựa source/runtime. Cleaning compliance và provisioning/replay ngoài scope; không nối tạm để lấp dữ liệu thiếu. Phase chỉ hoàn tất khi contract có nguồn xác minh hoặc mỗi điểm chưa xác minh được ghi và UI phụ thuộc được gated.

## Evidence — 2026-11-06

- Người dùng đã duyệt đúng4 file source/API/schema và2 file test mới trong phase này; telemetry schema/test sửa tại chỗ. Chưa thay UI.
- TDD red trước code:20 tests,6 pass14 fail (12 adapter/schema chưa có;2 telemetry giới hạn/kiểu dữ liệu fail thật). Green cuối:21/21, gồm case serial khác hoa/thường và UUID-shaped serial không được thay thế danh tính UUID.
- Backend source `fb11d12` ở `.work/dolores-platform-telemetry-api-spec-2026-11-06`; GET live OpenAPI `/v3/api-docs` xác nhận route/enum/DTO. Chưa login GET dữ liệu thật hoặc kiểm tra truy cập chéo.
- Owner date transform giữ ngày VN inclusive thành `[from,to)` UTC; daily breakdown theo ngàyUTC từ query repository. activeMachineCount là tổng ACTIVE fleet ngay cả khi filter máy. Cleaning flags primitive bắt buộc; enumABORTED; receivedAt/finishedAt/notes nullable đúng mapper.
- Offline timestamps là LocalDateTime không offset, chưa biết timezone deployment; schema giữ nguyên, phaseUI chưa được đổi thành giờVN. Evidence phải private://, cảreason/evidence tối đa2000.
- Ngân sách cleaning snapshot:5 trang ×100dòng, tuần tự và có cancel; vượt budget giữ incomplete/unknown. Phase02 chịu trách nhiệm nối query, completeness badge và request-count tests.
- `npm run lint`:0errors,3warnings cũ ở contract activation/coffee-package. `npx tsc --noEmit --incremental false`:4lỗi giống baseline, không có lỗi tại file phase này.
- Baseline Node toàn bộ trước code:269 tests177pass92fail. Lần chạy cuối sau adapter/regression:284tests192pass92fail; targeted21/21. Số lỗi toàn bộ không tăng; không tuyên bố full suite/build đạt.
- Code review APPROVED sau khi sửa2finding nhận diện máy; không còn finding trong phạm vi phase. Không network mutation, không Docker, không provisioning/replay/ingestion.
- UI query keys, router-ready, Moderator zero calls, Technician grant và retry policy được map Phase02/03; adapter Phase01 không chứng minh hành vi cache/UI hoặc quyền backend.
