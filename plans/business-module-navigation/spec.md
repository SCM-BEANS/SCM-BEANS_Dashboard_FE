# Spec: Điều hướng theo module nghiệp vụ

**Date:** 2026-11-05
**Status:** Ready

## Problem Statement

Các trang thuộc cùng một nghiệp vụ hiện nằm rải rác trong danh sách điều hướng theo role, và tiêu đề hiện tại thường chỉ cho biết role cùng trang. Người dùng cần nhận ra trang đang thuộc module nào mà vẫn giữ nguyên các màn hình, URL, quyền và cách dùng hiện tại.

## User Stories

- **[P1]** Là Admin hoặc Moderator, tôi muốn mở các nhóm “Vận hành” và “Bảo trì & Kho máy” để tìm nhanh hợp đồng, hóa đơn, giám sát Smart IoT, yêu cầu kỹ thuật và kho máy.
  Accepted when: các mục hiện có được đặt trong đúng nhóm theo role; chọn một mục con vẫn mở đúng route hiện tại.

- **[P1]** Là người dùng ở bất kỳ role nào, tôi muốn thấy role, module và trang hiện tại trên breadcrumb để biết mình đang thao tác trong khu vực nào.
  Accepted when: trang có ánh xạ module hiển thị đủ ba cấp ở header desktop và breadcrumb mobile; URL lồng sâu vẫn nhận đúng module của trang cha.

- **[P1]** Là người dùng mobile, tôi muốn tìm cùng các nhóm nghiệp vụ trong drawer hiện có.
  Accepted when: drawer hiển thị cùng menu role-specific như desktop, nhóm chứa route hiện tại tự mở, và chọn mục con điều hướng đến route hiện có.

- **[P2]** Là người dùng của role không có một chức năng, tôi muốn không thấy nhóm rỗng hoặc liên kết giả.
  Accepted when: module chỉ xuất hiện nếu role đó có ít nhất một route thật đã tồn tại; các mục ngoài hai module được giữ nguyên.

## Functional Requirements

1. **FR-01:** Dùng hai nhóm nghiệp vụ đã chốt: “Vận hành” và “Bảo trì & Kho máy”. Nhóm là tiêu đề mở/thu gọn, không phải route.
2. **FR-02:** Giữ nguyên toàn bộ URL/path hiện có; không thêm route module, trang overview giả, API hay thay đổi quyền.
3. **FR-03:** Dùng cùng dữ liệu nhóm cho sidebar desktop và drawer mobile của Admin, Moderator, Owner và Technician.
4. **FR-04:** Khi route hiện tại thuộc một nhóm, nhóm đó tự mở và mục con phù hợp tiếp tục được đánh dấu active, gồm cả các trang detail lồng dưới route cha.
5. **FR-05:** Breadcrumb hiển thị `Role / Module / Mục điều hướng` trên trang thuộc module, cả desktop lẫn mobile. Breadcrumb không tạo route mới.
6. **FR-06:** Chỉ nhóm route đã có màn hình cho role đó; không render nhóm rỗng. Giữ nguyên các mục ngoài hai module và thứ tự tương đối của chúng.
7. **FR-07:** Ánh xạ theo route hiện có: Admin/Moderator đưa Hợp đồng, Hóa đơn, Giám sát Smart IoT vào Vận hành; đưa Yêu cầu kỹ thuật và Máy & tồn kho vào Bảo trì & Kho máy. Owner đưa Hợp đồng, Hóa đơn, Máy của tôi vào Vận hành; Lịch bảo trì và Yêu cầu hỗ trợ vào Bảo trì & Kho máy. Technician đưa Kiểm tra máy và Lịch sử máy vào Bảo trì & Kho máy; các công việc hỗn hợp và mục ngoài phạm vi tiếp tục ở ngoài nhóm.
8. **FR-08:** Với Admin/Moderator, “Yêu cầu kỹ thuật” là route hiện có bao gồm các luồng kỹ thuật liên quan; không tạo mục Bảo trì hoặc Sửa chữa riêng nếu chưa có route/màn hình độc lập.
9. **FR-09:** Giữ kiểu chữ, màu đỏ/kem, trạng thái active, kích thước và breakpoint của sidebar/drawer hiện có. Chỉ thêm kiểu trình bày cần thiết cho tiêu đề nhóm và breadcrumb.
10. **FR-10:** Menu Admin chỉ render một entry Hóa đơn khi các entry hiện có trỏ cùng href; giữ nguyên route và chức năng Hóa đơn.

## Non-Functional Requirements

- **Performance:** Không thêm dependency; nhóm và breadcrumb được suy ra đồng bộ từ dữ liệu navigation hiện tại, không phát sinh API/query.
- **Security:** Không thay đổi authorization, role guards, route access hoặc logout.
- **Availability:** Trực tiếp mở và refresh URL hiện có tiếp tục hoạt động; Back/Forward cập nhật active item và nhóm mở theo pathname.
- **Compatibility:** Giữ drawer đến breakpoint hiện tại (1023px); giữ giao diện desktop từ 1024px.

## Success Criteria

- [ ] Cả 4 role giữ nguyên toàn bộ `href` hiện có; không có route/API mới trong thay đổi.
- [ ] Mỗi role chỉ hiện module có tối thiểu một route thật; không có nhóm rỗng hoặc route trùng trong nhóm.
- [ ] Với mỗi role, route list và route detail đã ánh xạ hiển thị cùng module trên header desktop và breadcrumb mobile.
- [ ] Tải trực tiếp, refresh, Back và Forward trên các route được ánh xạ giữ đúng breadcrumb, mục active và nhóm mở.
- [ ] Drawer ở chiều rộng 360px, 768px và 1023px vẫn cuộn được, không che nút đăng xuất; layout sidebar desktop tại 1024px không tràn ngang.
- [ ] Các route và mục điều hướng ngoài hai module vẫn hoạt động, không bị xóa hoặc đổi đích.

## Out of Scope

- Thay đổi cấu trúc URL sang `/operations/...` hoặc `/maintenance/...`.
- Tạo landing page/overview page mới cho từng module.
- Tách nghiệp vụ “Bảo trì” và “Sửa chữa” thành màn hình hoặc route mới.
- Thay đổi API, query, quyền role, nội dung nghiệp vụ, action bar hoặc giao diện trang nghiệp vụ.
- Sắp xếp lại hoặc đổi tên các mục ngoài phạm vi điều hướng module.

## Assumptions

- Các tiêu đề module mở/thu gọn; chọn tiêu đề không điều hướng. Chọn mục con mới đổi URL.
- Cùng tên module được dùng ở các role; danh sách mục con vẫn tùy theo route và quyền của từng role.
- Nhóm hoạt động hiện tại tự mở khi người dùng vào route con; trạng thái thu gọn thủ công không cần lưu qua lần tải trang.
- `Máy của tôi` là điểm vào hiện có cho trạng thái/giám sát máy của Owner; Admin và Moderator dùng route IoT hiện có.
- Mục `Việc được giao` của Technician gồm nhiều loại công việc nên không xếp toàn bộ vào module Bảo trì & Kho máy.
- Người dùng đã xác nhận: Hóa đơn trùng href của Admin chỉ hiện một mục; Việc được giao của Technician giữ riêng; Máy của tôi của Owner thuộc Vận hành.
http://localhost:3000/admin/contracts?view=detail&id=912abc99-2bb9-4608-afde-ad54a24b3752