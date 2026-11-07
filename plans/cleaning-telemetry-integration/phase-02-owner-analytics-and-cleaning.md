# Phase 02 — Owner analytics và lịch sử vệ sinh

Status: passing; người dùng đã duyệt chuyển Phase 03.
Canonical ID: `phase-02-owner-analytics-and-cleaning`.
Stories: CT-01, CT-02, CT-03, CT-04, CT-07.

## Mục tiêu và tasks

Owner mở máy và hiểu số ly/vệ sinh đúng máy, rồi đi vào operations có ba tab và bộ lọc URL.

1. Giữ dispatch operations tại `src/pages/dashboard/read/customer-read-screen.tsx`; không thêm file route trùng. Đưa Owner operations từ dashboard aggregate sang Owner Analytics theo machineId.
2. URL source of truth sau router.isReady: tab, calendar range, brewPage/recipeName, cleaningPage/type/status; telemetry query độc lập được dành chỗ. User action push shallow; Back/Forward/refresh khôi phục. Đổi filter reset page liên quan; giữ query ngoài feature.
3. Pha chế: totalCups trường chính thức, machine/day/recipe breakdown đúng context; lịch sử brew paged. Không gán revenue/fee; không lấy tổng từ một trang lịch sử. Daily chart timezone theo kết quả phase01.
4. Vệ sinh: bảng thời gian bắt đầu/loại/kết quả/nội dung; nhấp dòng mở chi tiết flags và finishedAt/notes. Theo audit Phase01, flags là boolean bắt buộc (null báo lỗi schema); FAILED/ABORTED/COMPLETED có nhãn Việt rõ, không suy compliance.
5. Hồ sơ: summary số ly hôm nay, vệ sinh đầu/cuối ngày; giữ contract/location/maintenance schedule, liên kết operations/Báo sự cố hiện tại. Không thay shared aggregate OperationalOverview cho Admin/Moderator.
6. Danh sách: giữ existing machine list; badge connection và cleaning summary có state chưa kiểm tra/đang tải/lỗi. Today snapshot đọc tuần tự có budget, không kết luận thiếu từ partial pages; button refresh có pending. Không polling analytics/cleaning theo heartbeat.
7. ACTIVE-only analytics: không có dữ liệu hợp lệ khác request error; khi máy inactive, nêu phạm vi API thay vì số0 khẳng định không có lịch sử. Conventional/unknown type không tự query IoT; giữ các tính năng hồ sơ khác.

## File/modules

- `src/pages/dashboard/machines/machines-screen.tsx` — list/detail role queries và summary.
- `src/pages/dashboard/machines/machine-operational-overview-screen.tsx` — Owner tabs/filter/query orchestration.
- `src/pages/dashboard/read/customer-read-screen.tsx`, `customer-read-descriptor.ts` — chỉ sửa title/action bar/dispatch nếu cần.
- Active shared `src/components/machines/machine-detail-view.tsx`, `machine-list-view.tsx`, `machines.module.css`, `smart-iot-panel.tsx` — slots/presentation; không Owner API query trong shared component.
- `src/text/customer/customer-messages.ts` — copy theo convention.
- Đề xuất source mới, cần duyệt: `src/pages/dashboard/machines/machine-brew-history-panel.tsx`, `src/pages/dashboard/machines/machine-cleaning-history-panel.tsx`; Owner-only nên đặt cạnh page, không tạo universal dashboard component.
- Tests: mở rộng `tests/e2e/machine-operational-overview.spec.ts`, adapter test phase01; source/test path mới duyệt trước.

## Dependencies

Phase01 strict API/date/scope/paging và ngân sách cleaning. Connection tab tận dụng active shared panels và hoàn thiện ở Phase03. Không chặn pha chế/vệ sinh chỉ vì telemetry503.

## Tests / acceptance

- CT-01/03: chọn hai máy có count khác nhau, đúng query machineId và total; không còn nhãn/giá trị tổng Owner dưới tên một máy.
- S01/S04/S07/S15/S16/S29: scoped keys, cancel, URL invalid, direct load/refresh/back/forward, timezone browser khác VN.
- S08/S10/S11/S12/S20:0/empty/null/error tách biệt; COMPLETED trang2 và snapshot budget exhaustion không false negative; metadata paging; request count không tăng theo5s.
- S13/S14/S23/S34: ACTIVE-only, unknown/conventional type, daily bucket thật, zero machine states.
- E2E keyboard và mobile: tab selected/focus đúng, table scroll trong card, summary không đè action bar.
- Chạy test tập trung sau thay đổi, lint/tsc baseline delta; không tự chạy server mutation.

## Risks / quyết định

Ngày VN vệ sinh không phải compliance UTC. Dữ liệu summary đã đủ bằng chứng được hiển thị; summary thiếu do budget giữ unknown và có lối mở detail, không quét lịch sử vô hạn. Giữ API/logic tài chính đang chạy ngoài phạm vi trang này.

## Evidence — 2026-11-07

- Hai panel Owner đã được duyệt và tạo đúng đường dẫn; query ở page, panel chỉ hiển thị/pagination. Giữ dispatch Pages Router hiện có.
- Owner list/detail dùng Owner Analytics, snapshot vệ sinh tối đa 5×100, không polling theo heartbeat. Lịch sử ACTIVE kiểm tra qua `/contracts/machine/{id}/history?status=ACTIVE`, không gọi `/contracts` chỉ dành operator. Full history vẫn được giữ ở hồ sơ.
- Ba tab, ngày VN, recipe/cleaning filters và phân trang trong URL; thay ngày reset cả hai trang; daily chart ghi rõ UTC. Conventional/unknown và ngoài ACTIVE có trạng thái riêng; lỗi không thành số0.
- TDD: ba E2E Owner đỏ trước triển khai; snapshot adapter đỏ trước triển khai. Node liên quan 25/25 đạt. Playwright 6/6 đạt, walkthrough ba role ở390/768/1023/1024/1440px, deep-link/refresh/Back/Forward và filter/paging. Mock Owner `/contracts` trả403; assert FE không gọi và gửi bộ lọc ACTIVE ở endpoint đúng.
- Review độc lập: APPROVED sau sửa endpoint quyền Owner và invalid-machine feedback; đồng bộ thông báo phạm vi với query ACTIVE để tránh nháy sai.
- Toàn repo: Node196/288 đạt,92 lỗi bằng baseline; lint0errors/3warnings cũ; TypeScript4lỗi cũ (`validator` businesses và3TS2367 recipe-menu). Không tuyên bố build/full-suite đạt.
- Chưa kiểm tra quyền/scope bằng phiên Owner thật trên API server; mọi E2E dùng mock, không mutation, không Docker. Phase03/04 chưa triển khai. Chưa commit/push.
