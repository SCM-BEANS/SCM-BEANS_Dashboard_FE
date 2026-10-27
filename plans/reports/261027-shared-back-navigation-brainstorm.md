# Brainstorm: Nút quay lại dùng chung cho các màn hình chi tiết

**Date:** 2026-10-27

## Ideas Explored

- **Mỗi trang tự gắn link về danh sách cha:** đích rõ ràng và ổn định, nhưng không trở lại đúng màn hình vừa xem hoặc giữ trạng thái bộ lọc, phân trang và vị trí cuộn.
- **Dùng chung nút quay lại theo lịch sử, có đích dự phòng theo trang:** phù hợp với luồng danh sách → chi tiết; khi có trang Dolores trước đó thì quay về đúng lịch sử, khi mở thẳng đường dẫn thì về danh sách cha.
- **Tự suy ra trang cha từ URL và tự hiện nút trên mọi route lồng nhau:** ít cấu hình trang hơn, nhưng cấu trúc URL không phải lúc nào cũng khớp với luồng thao tác; dễ hiện nút sai hoặc trùng nút từ layout.
- **Giữ các nút thủ công hiện tại:** ít thay đổi ban đầu, nhưng giao diện, nhãn và hành vi tiếp tục không đồng nhất.

## Repo Findings

- Dự án dùng Next.js Pages Router; cấu hình QueryClient nằm trong `src/pages/_app.page.tsx`.
- `src/components/button/button-bar.tsx` là component nút dùng chung hiện có; `AdminBreadcrumb` chỉ hiển thị breadcrumb, không xử lý hành động quay lại.
- Hành vi hiện tại chưa nhất quán: `moderator-shell.tsx` có hành động quay về section cho route con; một số trang chi tiết có link riêng về danh sách; một số luồng dùng `ButtonBar` trong action bar.
- URL tập trung trong `src/routes/path.ts`; route list/chi tiết trải qua customer dashboard, moderator và admin. Vì vậy component dùng chung nên nhận đích dự phòng rõ ràng từ trang gọi, không tự suy đoán trang cha chỉ từ URL.

## User's Direction

Người dùng muốn áp dụng một cách quay lại thống nhất cho tất cả các luồng có trang cha. Ví dụ: mở danh sách khách hàng, chọn một khách hàng để xem chi tiết, rồi quay về đúng màn hình danh sách khách hàng trước đó. Hành vi chính là quay về thao tác trước trong lịch sử trình duyệt.

Đề xuất thiết kế cho trường hợp mở thẳng URL chi tiết: quay về danh sách cha thay vì rời ứng dụng. Đây là fallback được đề xuất để tránh nút quay lại dẫn người dùng ra website trước đó.

## Proposed Direction

Tạo một `BackButton` dùng chung trong nhóm component điều hướng/nút. Nút hiển thị nhãn theo ngữ cảnh (ví dụ “Danh sách khách hàng”), dùng lịch sử điều hướng nội bộ khi có màn trước trong ứng dụng, và dùng `fallbackHref` do trang chi tiết cung cấp khi không có. Đặt nút nhất quán ở đầu vùng nội dung, sát phía trên tiêu đề; dành action bar cho thao tác nghiệp vụ và thay thế các nút quay lại thủ công để không hiển thị lặp.

Chỉ thêm nút vào màn có trang cha hoặc bước trước có nghĩa. Không tự động thêm vào trang chủ/danh sách gốc chỉ vì URL có nhiều đoạn.

## Open Questions

- Không còn quyết định sản phẩm cần người dùng trả lời. Kế hoạch vẫn cần kiểm kê route và ánh xạ thủ công fallback cho các workflow không biểu diễn parent rõ trong URL.

## Risks

- Nếu lịch sử của ứng dụng không được phân biệt với lịch sử ngoài ứng dụng, hành động back ở URL mở trực tiếp có thể đưa người dùng rời Dolores.
- Nếu layout và trang chi tiết cùng render nút, người dùng có thể thấy hai nút quay lại.
- Nếu luôn dùng link cha thay cho lịch sử, danh sách có thể mất bộ lọc, phân trang hoặc vị trí cuộn vừa thao tác.

## Handoff

Spec: `plans/shared-back-navigation/spec.md`.
