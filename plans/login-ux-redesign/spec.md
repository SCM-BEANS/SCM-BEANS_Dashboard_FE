# Spec: Redesign UX/UI trang đăng nhập

**Date:** 2026-10-26
**Status:** Ready

---

## Problem Statement

Trang đăng nhập hiện tại dùng ảnh hero lớn, tiêu đề serif và bảng màu đỏ rượu nên trông như một trang giới thiệu thương hiệu riêng, chưa hòa với giao diện dashboard trong Figma. Cần chuyển trang này sang giao diện sản phẩm gọn, sáng, ưu tiên thao tác đăng nhập và vẫn giữ các bước xác thực hiện có.

## User Stories

- **[P1]** Là người dùng, tôi muốn thấy form đăng nhập là trọng tâm ngay khi mở trang để vào hệ thống nhanh.
  Accepted when: không còn cột ảnh hero hoặc tiêu đề quảng bá lớn; form nằm trong một thẻ căn giữa, rộng tối đa 420px trên desktop.

- **[P1]** Là người dùng mới, tôi muốn các bước đăng nhập, OTP và đổi mật khẩu tạm có cùng bố cục để dễ theo dõi.
  Accepted when: các bước credentials, MFA, email OTP và password change dùng chung một khung form; chuyển bước không làm form nhảy vị trí.

- **[P1]** Là người dùng, tôi muốn giao diện đăng nhập có cùng nhận diện với dashboard Dolores.
  Accepted when: giao diện dùng wordmark dolores., kiểu chữ sans-serif và các token màu dùng trong thiết kế Figma.

- **[P2]** Là người dùng, tôi muốn xem/ẩn mật khẩu đã nhập để hạn chế lỗi gõ.
  Accepted when: nút hiện/ẩn có tên trợ năng rõ ràng, có thể dùng bằng bàn phím và không làm mất giá trị trường.

- **[P2]** Là người dùng, tôi muốn nhận phản hồi trực quan khi đăng nhập thành công để biết hệ thống đã chấp nhận phiên.
  Accepted when: liquid success splash chỉ bắt đầu sau khi hoàn tất xác thực và nhận access token; hiệu ứng có dấu tích cùng thông điệp rõ ràng, không có âm thanh.

## Functional Requirements

1. **FR-01 — Form sản phẩm:** Bỏ ảnh hero, lớp phủ đỏ rượu và headline quảng bá khỏi trang login. Đặt form trong một thẻ sáng căn giữa trên nền canvas.
2. **FR-02 — Nhận diện chung:** Dùng wordmark dolores. màu đỏ; nền #f8f6f3, surface #ffffff, text #302927, text-secondary #675b57, placeholder #766a65, viền card #e9e2dc, viền input #968781, action-primary #b81724. Form gọn, không có ô biểu tượng ổ khóa hoặc chữ chào viết hoa; liên kết về trang chủ nằm ngoài card.
3. **FR-03 — Kiểu chữ:** Dùng kiểu chữ sans-serif theo giao diện dashboard; tiêu đề và nội dung form không dùng kiểu Georgia serif.
4. **FR-04 — Khung nhiều bước:** Giữ các bước credentials, MFA, email OTP và đổi mật khẩu lần đầu trong cùng một card và cùng trục căn giữa. Chỉ nội dung, tiêu đề và trường nhập được thay đổi.
5. **FR-05 — Chuyển động nhẹ:** Card hiển thị ngay; chỉ nội dung form đổi bước dùng opacity và translateY tối đa 4px trong 180ms. Không animate kích thước card.
6. **FR-06 — Giảm chuyển động:** Khi hệ thống bật prefers-reduced-motion, bỏ chuyển vị và đặt thời lượng transition bằng 0ms.
7. **FR-07 — Trợ giúp nhập mật khẩu:** Có nút hiện/ẩn mật khẩu với accessible name, trạng thái pressed rõ và mục tiêu bấm tối thiểu 44×44px.
8. **FR-08 — Không đổi nghiệp vụ:** Giữ nguyên API đăng nhập, xử lý OTP/MFA, đổi mật khẩu, token và điều hướng sau đăng nhập.
9. **FR-09 — Mobile:** Giữ một cột; thẻ chiếm tối đa chiều rộng màn hình trừ lề tối thiểu 32px; cho phép cuộn dọc ở màn hình thấp.
10. **FR-10 — Liquid success splash:** Sau khi bước xác thực cuối cùng trả về thành công và ứng dụng có access token, một màn nước Dolores rủ từ trên xuống với mép giọt tròn không đều; phần giọt sâu dần thành bụng nước rồi liền thành lớp phủ toàn màn hình. Hiện dấu tích và “Đăng nhập thành công”, sau đó làm mờ splash để chuyển vào dashboard. Không chạy splash khi đang chờ, khi chỉ nhận challenge OTP/MFA, hoặc khi đăng nhập thất bại.
11. **FR-11 — Thời lượng success:** Giữ nhịp tràn → xác nhận → rút gọn trong tối đa 1,5 giây tính từ lúc xác thực hoàn tất; không phát âm thanh.
12. **FR-12 — Màu success:** Dùng màu action-primary #b81724 và các surface/text tương ứng của Dolores; không dùng màu xanh cyan của demo tham khảo.

## Non-Functional Requirements

- **Performance:** Các chuyển động giao diện thường dùng opacity/transform, tối đa 220ms và không tạo layout shift. Success splash có tổng thời lượng tối đa 1,5 giây.
- **Accessibility:** Nhãn trường luôn hiển thị; các control có vùng bấm tối thiểu 44×44px; giữ thứ tự tab và focus ring rõ; thông báo lỗi/thành công tiếp tục dùng role phù hợp; success text là status có thể đọc bằng screen reader; hỗ trợ prefers-reduced-motion.
- **Security:** Không thay đổi API, lưu trữ token, xử lý mật khẩu hoặc ghi log thông tin đăng nhập.
- **Availability:** Các luồng login và challenge hiện tại tiếp tục hoạt động trên cùng route.

## Success Criteria

- [ ] Ở viewport desktop 1440×900, card nằm giữa canvas và có chiều rộng không quá 440px; không hiển thị ảnh hero.
- [ ] Ở viewport 360×640 và 390×844, không có tràn ngang; tất cả trường và nút gửi đều có thể tiếp cận bằng cuộn dọc.
- [ ] Credentials, MFA, email OTP và password-change giữ nguyên cùng tọa độ card; chuyển bước hoàn tất trong 140–180ms.
- [ ] Card không có animation xuất hiện; chuyển bước dùng opacity/transform tối đa 180ms, với prefers-reduced-motion bỏ chuyển động.
- [ ] Màu chính, nền, chữ và viền của form dùng các giá trị token ở FR-02; tiêu đề sử dụng cùng họ sans-serif của dashboard.
- [ ] Chỉ lần đăng nhập cuối cùng thành công mới chạy liquid splash; challenge hoặc lỗi không hiển thị success.
- [ ] Màn nước rủ giọt từ trên xuống bằng hai đoạn SVG nối tiếp, không tween chồng nhau trên path. Thông báo thành công và fade kết thúc trong tối đa 1,5 giây; không âm thanh. Reduced motion bỏ hiệu ứng; hủy component hoặc hết thời gian đều dọn timeline.
- [ ] Các trường đăng nhập, OTP và đổi mật khẩu vẫn qua lint, type-check và production build.

## Out of Scope

- Thay đổi API đăng nhập, MFA, OTP, đổi mật khẩu, cookie/token hoặc điều hướng theo role.
- Thiết kế lại landing page hoặc các màn dashboard.
- Thêm đăng nhập mạng xã hội, passkey hoặc khôi phục mật khẩu nếu backend chưa hỗ trợ.
- Thêm animation lặp, parallax hoặc hiệu ứng trang trí gây cản trở thao tác.

## Assumptions

- Hướng đã chọn là giao diện sản phẩm căn giữa, bỏ ảnh hero; giữ nhận diện Dolores ở mức gọn.
- Thẻ đăng nhập căn giữa là phương án ưu tiên cho thao tác và responsive.
- Figma không có frame login riêng; dùng page 01 Admin, màn Customer và các token chung làm chuẩn tham chiếu.
- Luồng đăng nhập và các bước xác thực hiện có được giữ nguyên; chỉ thay đổi UX/UI.
- Có thể dùng typography sans-serif đang được dashboard sử dụng, thay cho display serif hiện tại.
- Success splash là phản hồi trực quan sau xác thực cuối cùng, không chặn hoặc thay đổi kết quả API; âm thanh bị loại bỏ theo lựa chọn của người dùng.
