# Phase 02 — Bảng dễ đọc và dễ quét

**Phase ID:** `phase-02-table-readability`
**Priority:** P1
**Stories:** US-03 (P1), US-04 (P1)
**Depends on:** Không có phụ thuộc kỹ thuật; thực hiện sau Phase 01 theo thứ tự ưu tiên đã chốt.

## Mục tiêu

Làm rõ các trạng thái và loại máy ở nơi Admin đọc danh sách, đồng thời giúp nhận biết cuộn ngang và vị trí phân trang mà không thay đổi filter, route hoặc dữ liệu.

## File dự kiến

**Sửa:**

- `src/pages/admin/businesses/index.page.tsx` — render trạng thái khách hàng bằng nhãn tiếng Việt trong danh sách và chi tiết; hiển thị khoảng item/tổng khi response đã có total/page_size.
- `src/pages/admin/machines/index.page.tsx` — bỏ hậu tố mã enum khỏi nhãn loại máy tại danh sách model; giữ fallback hiện có.
- `src/pages/admin/overview/overview-content.tsx` — gắn cue cuộn ngang vào bảng số liệu ly ở màn hẹp.
- `src/text/admin/admin-operations-messages.ts` — Việt hóa key MACHINES.OWNER_ID đang chỉ được dùng ở các trang máy/IoT Admin; không đổi các key chung đang được Moderator contract creation sử dụng.
- `src/pages/admin/admin-shell.module.css` — bổ sung style class table riêng cho Admin, gắn cue hover/row divider/scroll nếu cần; không đổi CSS base của DataTable.

Không sửa `src/components/table/data-table.tsx` hoặc `data-table.module.css`.

## Công việc

- [x] Hiển thị `ACTIVE` là “Đang hoạt động”, `DISABLED` là “Đã vô hiệu hóa”; giá trị không nhận diện hiển thị “Chưa xác định”. Áp dụng cùng mapping cho trường status ở danh sách và chi tiết khách hàng.
- [x] Trong bảng loại máy, hiện “Smart IoT” hoặc “Máy thường” mà không kèm `SMART_IOT`/`CONVENTIONAL`; giữ fallback dễ hiểu.
- [x] Hiển thị nhãn mã chủ sở hữu bằng tiếng Việt trong bảng máy và các màn Admin đang dùng cùng key; giữ nguyên giá trị ID.
- [x] Không đổi status query/filter, payload, role hay hành động mở chi tiết.
- [x] Với danh sách khách hàng, dùng các giá trị `page`, `page_size` và `total` sẵn có để trình bày khoảng item đang xem; không tạo pagination cho endpoint chưa phân trang.
- [x] Gắn className riêng vào các bảng Admin trong phạm vi; CSS chỉ định kiểu table con qua class scope đó.
- [x] Thêm dấu hiệu cuộn ngang vừa đủ trên màn hẹp; giữ nguyên bảng dạng bảng, không chuyển thành card list.
- [x] Đảm bảo hàng cuối/phân trang còn truy cập được ở viewport 375px; chỉ sửa bố cục Admin nếu xác nhận có che khuất.

## Kiểm tra và nghiệm thu

- Danh sách và chi tiết khách hàng không hiển thị raw status code; filter/query vẫn dùng nguyên `ACTIVE`/`DISABLED`.
- Danh sách loại máy giữ nhãn tiếng Việt, không hiển thị mã kỹ thuật trong ngoặc.
- Khoảng item/tổng hiển thị khi dữ liệu phân trang đã cung cấp; empty list không tạo range sai.
- Ở 375px có thể nhận ra vùng bảng cuộn ngang, xem được cột còn lại, hàng cuối và pagination.
- Bảng Moderator, Customer và Technician không bị đổi style mặc định.
- Soát nhanh các text key dùng trong Moderator contract creation sau khi chỉnh dictionary; giữ nguyên nhãn dùng chung.

## Rủi ro / ghi chú

- DataTable dùng chung cho bốn role. Thay CSS base hoặc variant shared sẽ làm thay đổi bảng khác; chỉ gắn class riêng tại callsite Admin.
- `ADMIN_OPERATIONS_MESSAGES` được import ở Moderator contract creation. Không thay các key `COMMON`, `CONTRACTS` hay các nhãn machine type đang hiển thị trong form đó.

**Implementation status:** Completed. Targeted Playwright verified the daily cup column heading and values are physically centered at 375px and 1440px on the isolated E2E server and local app on port 3000. Other table and pagination acceptance criteria remain unverified.
- Endpoint danh sách máy hiện không có pagination theo cấu trúc đang dùng; không suy ra range/tổng trang cho bảng này.
