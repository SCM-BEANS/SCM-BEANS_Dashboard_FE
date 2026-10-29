# Phase 03 — Chuyển động và phản hồi thao tác

**Phase ID:** `phase-03-interaction-feedback`
**Priority:** P2
**Stories:** US-05 (P2)
**Depends on:** Không có phụ thuộc kỹ thuật; thực hiện sau Phase 02 theo thứ tự ưu tiên đã chốt.

## Mục tiêu

Làm hover, pressed, focus và trạng thái tải có cảm giác thống nhất, ngắn và nhẹ trong Admin. Các chuyển động không làm lu mờ nội dung số liệu.

## File dự kiến

**Sửa:**

- `src/pages/admin/admin-shell.module.css` — thêm/chỉnh transition và trạng thái focus/pressed bằng class Admin-scoped; bổ sung `prefers-reduced-motion` cho các hiệu ứng mới.
- `src/pages/admin/overview/overview-content.tsx` — gắn class riêng cho phần overview nếu cần liên kết với trạng thái giao diện đã có.
- `src/pages/admin/businesses/index.page.tsx` và `src/pages/admin/machines/index.page.tsx` — chỉ gắn class Admin nếu controls được chỉnh cần selector riêng.

Không sửa `src/components/button/button-bar.module.css`, `src/components/action-bar/action-bar.module.css` hoặc animation của drawer/logout.

## Công việc

- [x] Rà các trạng thái hiện có trước; tận dụng focus ring, disabled và loading state đã có thay vì thêm trạng thái hoặc handler mới.
- [x] Chuẩn hóa hover/pressed/focus ở các control trong phạm vi bằng màu và token Dolores đang có; transition tối đa 180 ms.
- [x] Tôn trọng `prefers-reduced-motion` bằng cách bỏ hoặc rút transition không cần thiết.
- [x] Không thêm count-up, reveal-on-scroll, shimmer liên tục hoặc splash mới trên dashboard.
- [x] Không sửa animation logout, mobile drawer, ButtonBar/ActionBar shared defaults.

## Kiểm tra và nghiệm thu

- Các control được chạm tới có hover, pressed và focus nhìn thấy rõ, thống nhất với palette hiện tại.
- Transition ở các trạng thái mới không vượt 180 ms; reduced-motion tắt chuyển động không thiết yếu.
- Loading/disabled vẫn phản ánh đúng state hiện có; không thay thời điểm gọi handler hay hành vi API.
- Kiểm tra lại overview, customer list/detail và machine list ở desktop và 375px; thao tác bàn phím vẫn nhận ra focus.
- Không thay đổi Customer, Technician hoặc Moderator.

## Rủi ro / ghi chú

- `ButtonBar` mặc định đã có transition 120 ms và được dùng ở nhiều role. Chỉnh CSS component có thể đổi cảm giác nút toàn app.
- `ActionBar` dùng chung và fixed trên desktop, static trên mobile. Không đổi vị trí dock global; xử lý vùng Admin bằng layout Admin nếu có bằng chứng overlap.
- Chuyển động không cần thiết có thể khiến người quản lý mất tập trung khi đọc số liệu; giữ lại phản hồi ngắn và giảm motion.

**Implementation status:** Completed; source review only. Fast mode has no automated test or browser evidence.
