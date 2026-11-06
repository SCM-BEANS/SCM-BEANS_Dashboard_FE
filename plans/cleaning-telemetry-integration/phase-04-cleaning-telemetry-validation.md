# Phase 04 — Cross-role validation

Status: not_started.
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
