# Spec: Điều hướng quay lại dùng chung

**Date:** 2026-10-27
**Status:** Ready

---

## Problem Statement

Các trang và component hiện dùng nhiều kiểu quay lại khác nhau hoặc thiếu nút quay lại. Người dùng có thể vào trang chi tiết từ danh sách nhưng không dễ trở về đúng màn hình trước đó, đặc biệt khi cần giữ bộ lọc và vị trí danh sách.

## User Stories

- **[P1/US-01]** Là người dùng ở vai trò customer, moderator, admin hoặc technician, tôi muốn quay lại màn hình Dolores vừa thao tác trước đó để tiếp tục công việc.
  Accepted when: đi từ danh sách tới trang chi tiết rồi bấm nút quay lại sẽ trở về đúng entry danh sách trước đó, giữ nguyên query/bộ lọc nếu chúng có trong URL và khôi phục trạng thái cuộn do trình duyệt hỗ trợ.

- **[P1/US-02]** Là người dùng mở trực tiếp URL của trang chi tiết, tôi muốn nút quay lại đưa tôi tới danh sách cha thay vì rời Dolores.
  Accepted when: không có lịch sử nội bộ trước đó thì nút điều hướng tới `fallbackHref` do trang cấu hình; không dùng lịch sử website bên ngoài làm đích.

- **[P1/US-03]** Là người dùng, tôi muốn thấy hành động quay lại nhất quán và dễ hiểu ở các trang chi tiết.
  Accepted when: mỗi trang thuộc phạm vi có đúng một nút dùng chung, nhãn mô tả đích/nhóm phù hợp, và trang gốc không xuất hiện nút back không có ý nghĩa.

- **[P2/US-04]** Là người dùng bàn phím hoặc màn hình nhỏ, tôi muốn thao tác quay lại dễ nhận biết và chạm được.
  Accepted when: nút có focus indicator rõ và vùng thao tác cao tối thiểu 44 px trên mọi breakpoint.

## Functional Requirements

1. **FR-01:** Cung cấp một component `BackButton` dùng chung trong `src/components` với props cho nhãn truy cập được và `fallbackHref`.
2. **FR-02:** Khi có entry điều hướng trước đó thuộc Dolores, nút gọi điều hướng back của Next/browser để trở lại entry đó thay vì dựng URL cha mới.
3. **FR-03:** Khi route chi tiết được mở trực tiếp hoặc không có entry Dolores trước đó, nút điều hướng tới `fallbackHref` cấu hình tại trang; không đưa người dùng sang origin bên ngoài.
4. **FR-04:** Mỗi trang chi tiết/workflow có trang cha rõ ràng khai báo đích fallback; không suy ra fallback chỉ bằng cắt chuỗi URL.
5. **FR-05:** Rà soát các trang trong customer dashboard, moderator, admin và technician; thay thế các nút quay lại riêng lẻ trong phạm vi để mỗi màn chỉ render một nút.
6. **FR-06:** Đặt nút nhất quán ở đầu vùng nội dung, sát phía trên tiêu đề của màn chi tiết/workflow; dành action bar cho thao tác nghiệp vụ.
7. **FR-07:** Không thêm nút quay lại tự động vào route gốc/danh sách nếu không có trang cha trong luồng.

## Non-Functional Requirements

- **Accessibility:** dùng phần tử button/link đúng ngữ nghĩa; nhãn có nghĩa; vùng chạm cao ít nhất 44 px; focus-visible phải rõ.
- **Performance:** thao tác quay lại nội bộ không phát sinh request API mới chỉ để xác định đích; ưu tiên điều hướng client-side.
- **Reliability:** mọi trang chi tiết trong inventory có `fallbackHref` xác định; fallback không trỏ ra ngoài origin của ứng dụng.

## Success Criteria

- [ ] 100% các route chi tiết có trang cha được kiểm kê đều hiển thị đúng một component quay lại dùng chung.
- [ ] 100% ca list → detail → back quay về entry list vừa rời đi; query/bộ lọc trong URL được giữ nguyên.
- [ ] 100% ca mở trực tiếp route chi tiết dùng fallback nội bộ được cấu hình, không điều hướng ra website bên ngoài.
- [ ] Nút có chiều cao tối thiểu 44 px và hiển thị focus-visible trên các trang được rà soát.
- [ ] Các nút quay lại trùng lặp trong shell và trang chi tiết được loại bỏ trong phạm vi triển khai.

## Out of Scope

- Thay đổi quy tắc lịch sử của trình duyệt hoặc giao diện nút Back/Forward trên thanh trình duyệt.
- Thay đổi breadcrumb, sidebar hoặc API nghiệp vụ.
- Thêm điều hướng quay lại cho các trang gốc không có parent screen.

## Assumptions

- Lịch sử nội bộ có thể được xác định trong phạm vi một tab/phiên điều hướng Next.js; direct entry không có entry Dolores trước đó sẽ dùng fallback.
- Chỉ áp dụng cho trang chi tiết/workflow có bước cha rõ ràng; trang gốc hoặc danh sách không có parent screen sẽ không có nút quay lại.
- Mỗi route thuộc phạm vi sẽ khai báo đích fallback trong lúc kiểm kê; route workflow đặc biệt được ánh xạ thủ công thay vì suy luận bằng cách cắt URL.
- Nhãn nút có thể tùy theo ngữ cảnh nhưng dùng chung component và kiểu hiển thị.
