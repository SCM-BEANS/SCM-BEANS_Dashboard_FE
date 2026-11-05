# Phase 02 — Điều hướng nhóm theo role

## Mục tiêu

Hiển thị “Vận hành” và “Bảo trì & Kho máy” như các nhóm menu mở/thu gọn, dùng cùng cách render cho desktop và mobile.

## Phạm vi

- Cập nhật `SidebarNavigation` để gom item theo module metadata; tiêu đề nhóm là điều khiển mở/thu gọn, còn item con giữ Link và href hiện có.
- Không chuyển nguyên menu sang thứ tự hoặc cấu trúc khác ngoài việc gom các item cùng module; các item không nhóm giữ thứ tự tương đối.
- Tự mở nhóm có route active, bao gồm khi pathname là route detail lồng sâu.
- Ẩn module không có item cho role đó; không dựng nhóm rỗng.
- Áp dụng đồng nhất cho `Sidebar` desktop và `MobileNavigation` bottom sheet thông qua component navigation dùng chung.
- Giữ hành vi hiện tại của drawer: cuộn nội dung, đóng sau khi điều hướng, điều khiển bàn phím/accessible state và nút logout.
- Bổ sung kiểu chữ, khoảng cách, trạng thái mở/đóng và focus theo màu sắc, typography, active state và breakpoint hiện tại của Dolores.

## Files/modules

- `src/components/sidebar/sidebar.tsx`
- `src/components/sidebar/sidebar.module.css`
- `src/components/sidebar/mobile-navigation.tsx`
- `src/components/sidebar/mobile-navigation.module.css` — chỉ khi cần bảo toàn bố cục drawer sau khi có nhóm.
- Adapter trong bốn role shell đã cập nhật ở Phase 01.

## Phụ thuộc

Phase 01 phải cung cấp metadata đã được chuyển thành `SidebarItem`.

## Tiêu chí nghiệm thu

- Admin, Moderator, Owner và Technician thấy đúng nhóm và đúng item theo bảng route map.
- Sidebar và drawer hiển thị cùng cấu trúc module cho cùng role.
- Chọn item con vẫn đổi tới URL hiện tại; tiêu đề nhóm không điều hướng.
- Khi vào route detail, nhóm cha tự mở và item route cha active theo matcher hiện có.
- Không có nhóm rỗng, item giả hoặc route trùng trong nhóm.
- Tương tác mở/đóng dùng được bằng chuột và bàn phím, có nhãn trạng thái phù hợp cho công nghệ hỗ trợ.
- Drawer vẫn cuộn được ở 360–1023px, logout không bị che; desktop sidebar không tràn ngang từ 1024px.

## Rủi ro và lưu ý

Nhóm tăng chiều cao menu mobile. Dùng vùng nội dung cuộn hiện có, không thay bottom sheet thành kiểu điều hướng khác và không thay đổi breakpoint 1023px.

## Kết quả triển khai

- `SidebarNavigation` gom item theo `module` thành nhóm có thể mở/thu gọn; item không có module tiếp tục đứng độc lập.
- Nhóm chứa route active được mở tự động, kể cả URL chi tiết lồng sâu; link con vẫn giữ nguyên `href` và trạng thái `aria-current`.
- Sidebar desktop và drawer mobile dùng cùng cấu trúc; drawer giữ vùng cuộn, nút nhóm có vùng bấm 48px và các hành vi đóng drawer/logout hiện tại.
- Kiểm tra: `node --test tests/shared-role-navigation.test.cjs tests/shared-role-navigation-cross-role.test.cjs` (17/17); `npm.cmd run lint` (0 lỗi, 3 cảnh báo có sẵn ở file ngoài phạm vi); `npx.cmd tsc --noEmit --incremental false` (pass); `git diff --check` (pass).
- Chưa kiểm tra trực tiếp giao diện browser ở các breakpoint 360–1024px; đây vẫn là phần cần review thủ công.
- Inline review không phát hiện thay đổi route, API, quyền hoặc nghiệp vụ ngoài phạm vi Phase 02. Chờ người dùng review trước khi chuyển sang Phase 03 theo `cook --hard`.
