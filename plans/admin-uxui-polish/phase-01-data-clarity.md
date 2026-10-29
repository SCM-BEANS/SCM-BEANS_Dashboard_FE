# Phase 01 — Làm rõ số liệu tổng quan

**Phase ID:** `phase-01-data-clarity`
**Priority:** P1
**Stories:** US-01 (P1), US-02 (P1)
**Depends on:** Spec Ready; không phụ thuộc phase khác.

## Mục tiêu

Giúp Admin đọc đúng KPI và số tài chính ngay trên trang tổng quan, giữ nguyên nguồn dữ liệu, thứ tự thẻ và bố cục hiện tại.

## File dự kiến

**Sửa:**

- `src/pages/admin/overview/overview-content.tsx` — trình bày kỳ dùng cho KPI ly hợp lệ, định dạng ngày và phân biệt số 0 với dữ liệu thiếu; gỡ riêng dòng migration notice trên trang này.
- `src/text/admin/admin-messages.ts` — chỉnh nhãn/microcopy cho trạng thái trống hoặc chưa có dữ liệu trong OVERVIEW nếu cần; giữ nguyên `NAVIGATION.PENDING` vì Admin menu/sidebar còn dùng.
- `src/pages/admin/admin-shell.module.css` — chỉ thêm/chỉnh selector riêng cho overview nếu cần khoảng cách hoặc dòng ngữ cảnh mới; tránh thay `metricCard`/`metricsGrid` dùng ở máy và IoT.

Không tạo file source mới.

## Công việc

- [ ] Đặt khoảng thời gian đã có trong response gần KPI “Ly hợp lệ trong kỳ”; không gắn thời gian cho chỉ số không có kỳ dữ liệu.
- [ ] Định dạng ngày theo `vi-VN`, giữ đúng date-only value và xử lý giá trị không hợp lệ bằng fallback hiện có.
- [ ] Làm rõ 0, null/thiếu, loading, empty và error bằng các trạng thái/copy hiện có; không suy ra hoặc tính thêm số liệu.
- [ ] Giữ nguyên số liệu VND, response và query; chỉ thay cách trình bày.
- [ ] Bỏ paragraph migration notice chỉ trong `overview-content.tsx`; không xóa message key hoặc nội dung footer/menu.
- [ ] Nếu cần style cho dòng kỳ mới, dùng class riêng của overview để không đổi metric cards của inventory, IoT hay chi tiết máy.

## Kiểm tra và nghiệm thu

- Bốn KPI vẫn giữ nguyên ý nghĩa và API value; KPI ly thể hiện kỳ dữ liệu bên cạnh nhãn/giá trị.
- `0` hiển thị là 0; dữ liệu thiếu không giả thành 0; loading, empty, error vẫn phân biệt được.
- Số tiền vẫn định dạng VND; không thêm phép tính hoặc request.
- Chỉ dòng migration notice ở nội dung overview biến mất; trạng thái pending trong menu/sidebar Admin còn nguyên.
- So sánh trang tổng quan desktop và màn hẹp; số liệu không làm vỡ thứ tự/thẻ hiện có.

## Rủi ro / ghi chú

- Chuỗi ngày chỉ có ngày không được parse qua timezone theo cách làm lệch ngày.
- Một thay đổi ở `.metricCard` hoặc `.metricsGrid` sẽ lan sang các trang Admin khác; dùng selector overview riêng.
- Không thay đổi nội dung chung được render ở Admin navigation.
