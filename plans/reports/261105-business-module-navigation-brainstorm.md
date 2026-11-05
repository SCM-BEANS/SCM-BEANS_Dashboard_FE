# Brainstorm: Điều hướng theo module nghiệp vụ

**Date:** 2026-11-05

## Ideas Explored

- **Nhóm menu theo module nghiệp vụ:** gom liên kết hiện có dưới tiêu đề mở/thu gọn. Người dùng nhìn thấy cấu trúc lớn mà vẫn đi thẳng tới màn hình đang dùng; cần ánh xạ route theo role.
- **Breadcrumb có module:** hiển thị role, module và trang, ví dụ `Moderator / Bảo trì & Kho máy / Yêu cầu kỹ thuật`. Không đổi URL; cần giải quyết trang detail bằng route cha.
- **Nhãn module cạnh tiêu đề trang:** nhận diện nhanh ở đầu nội dung nhưng không giúp tìm các trang khác trong module.
- **Thanh chọn module ở header:** cho phép đổi khu vực nhanh, nhưng sẽ thêm một cấp điều hướng và phải thiết kế cho header mobile.
- **Trang overview riêng cho từng module:** có thể cung cấp tổng quan, nhưng hiện không có nội dung overview đã được xác nhận; dễ tạo trang giả và mở rộng phạm vi.
- **Tab ngang theo module:** gọn trên desktop nhưng dễ tràn trên mobile và không khớp drawer/sidebar hiện có.

## User's Direction

Người dùng chốt hai ý: nhóm menu theo module và hiển thị breadcrumb cho biết trang thuộc module nào. Điều hướng phải bám cấu trúc role hiện có, tái sử dụng màn hình, không dựng nội dung nghiệp vụ giả.

## Repo Findings

- Ứng dụng dùng Next.js Pages Router; URL tập trung trong `src/routes/path.ts`, dữ liệu menu trong `src/routes/routes.ts`.
- Sidebar desktop dùng `SidebarNavigation` trong `src/components/sidebar/sidebar.tsx`; mobile drawer trong `src/components/sidebar/mobile-navigation.tsx` cũng dùng cùng navigation component.
- Bốn shell role hiện tính mục active riêng; Admin/Moderator đã dùng `AdminBreadcrumb`, Owner/Technician hiển thị role và mục hiện tại theo cách riêng.
- `getActiveNavigationItem` trong `src/components/sidebar/navigation-route.ts` đã chuẩn hóa query/hash/trailing slash và chọn route cha cụ thể nhất, có thể dùng lại để xác định module cho route detail.
- Nhánh đang có thay đổi chưa commit trong `src/routes/routes.ts`, `src/pages/moderator/moderator-shell.tsx` và các file khác. Không sửa/ghi đè các thay đổi này khi triển khai.
- Admin/Moderator hiện có route “Yêu cầu kỹ thuật” và “Máy & tồn kho”; không có menu route Bảo trì độc lập trong navigation config. Không tạo mục Bảo trì/Sửa chữa giả.

## Proposed Direction

Gắn metadata module vào dữ liệu navigation hiện có, rồi render metadata đó như nhóm điều hướng dùng chung cho sidebar desktop và drawer mobile. Khi route con đang active, nhóm tự mở. Breadcrumb lấy role, module và mục điều hướng từ cùng route metadata. Giữ nguyên path, label chức năng và quyền; các mục ngoài hai module giữ nguyên.

Admin/Moderator: Vận hành = Hợp đồng, Hóa đơn, Giám sát Smart IoT; Bảo trì & Kho máy = Yêu cầu kỹ thuật, Máy & tồn kho. Owner: Vận hành = Hợp đồng, Hóa đơn, Máy của tôi; Bảo trì & Kho máy = Lịch bảo trì, Yêu cầu hỗ trợ. Technician: nhóm Bảo trì & Kho máy = Kiểm tra máy, Lịch sử máy; danh sách Việc được giao vẫn độc lập vì bao gồm nhiều loại công việc.

## Open Questions

Không còn câu hỏi chặn plan. Plan dùng các giả định đã nêu trong spec: tiêu đề module chỉ mở/thu gọn, các nhóm không có route ở role nào thì ẩn, và active group tự mở khi vào trang con.

## Decisions Confirmed

Ngày 2026-11-05, người dùng chốt ba điểm triển khai: Admin chỉ hiển thị một entry Hóa đơn cho href đang bị lặp; “Việc được giao” của Technician giữ ngoài nhóm; “Máy của tôi” của Owner nằm trong Vận hành.

## Risks

- Route Yêu cầu kỹ thuật gộp nhiều luồng; breadcrumb chỉ nhận diện module và entrypoint hiện có, không giả vờ tách riêng màn hình bảo trì/sửa chữa.
- Deep link hoặc route detail không khớp với nav item nếu bỏ query, hash hoặc trailing slash; cần tái sử dụng route matcher hiện có.
- Drawer mobile có thể tăng chiều cao khi tiêu đề nhóm được thêm; cần giữ cuộn nội dung và vị trí nút đăng xuất.
