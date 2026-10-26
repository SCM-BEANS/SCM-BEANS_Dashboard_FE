# Brainstorm: Redesign UX/UI trang đăng nhập

**Date:** 2026-10-26

## Ideas Explored

1. **Product-native centered card — selected.** Bỏ ảnh hero và headline quảng bá; đặt form trong một card trắng trên canvas sáng, dùng wordmark dolores. và token UI chung. Form trở thành trọng tâm và chuyển tốt sang mobile.
2. **Split layout có ảnh thu nhỏ.** Giữ ảnh máy pha ở cột trái nhỏ hơn và làm nhẹ overlay, đồng thời đồng bộ font/màu ở form. Hướng này giữ cảm xúc thương hiệu nhưng vẫn dành diện tích và sự chú ý cho nội dung phụ.
3. **Login tối giản với nhận diện nhẹ.** Dùng một dòng giới thiệu ngắn trên form thay cho ảnh và headline lớn. Đây là biến thể gọn của hướng centered card.
4. **Khung xác thực nhiều bước.** Credentials, MFA, email OTP và đổi mật khẩu dùng cùng một khung; chuyển trạng thái bằng fade ngắn để người dùng hiểu vẫn đang trong cùng quy trình.
5. **Tương tác ưu tiên khả năng thao tác.** Nhãn luôn hiển thị, control có vùng bấm đủ lớn, có nút hiện/ẩn mật khẩu và giữ focus rõ; motion tôn trọng prefers-reduced-motion.
6. **Liquid success splash sau đăng nhập.** Sau khi bước xác thực cuối cùng thành công, sóng lỏng phủ màn hình, hiện dấu tích và “Đăng nhập thành công”, rồi rút để vào dashboard. Ý tưởng gốc dài khoảng 2,3 giây và có tiếng ting; bản phù hợp với ưu tiên thao tác nhanh sẽ rút còn tối đa 1,5 giây, dùng màu Dolores và bỏ âm thanh.

## User's Direction

Người dùng chọn hướng số 1 và yêu cầu ưu tiên thao tác thuận tiện cùng animation nhẹ. Đề xuất cụ thể là form căn giữa, bỏ ảnh hero và headline quảng bá, dùng màu/chữ/wordmark theo ngôn ngữ dashboard; animation nhẹ khi mở trang và đổi bước xác thực. Người dùng bổ sung liquid success splash phủ/rút màn hình sau login thành công và chọn chỉ dùng hình ảnh, không phát tiếng.

## Open Questions

- Không có câu hỏi chặn việc lập kế hoạch. Vị trí căn giữa được lấy theo đề xuất phù hợp với ưu tiên thao tác và mobile.
- Tên font sans-serif chính xác sẽ được xác nhận khi triển khai theo typography/token dùng trong dashboard.
- Liquid splash được giữ trọn ý tưởng phủ/rút toàn màn hình nhưng rút tổng thời lượng từ khoảng 2,3 giây xuống tối đa 1,5 giây để không làm chậm đăng nhập.

## Risks

- Sau khi bỏ ảnh và headline, trang có thể cảm giác trống; giữ một wordmark và một dòng giới thiệu ngắn để tạo ngữ cảnh.
- Nội dung OTP/đổi mật khẩu cao hơn form đăng nhập; card phải cho phép cuộn dọc trên màn hình thấp mà không làm thay đổi trục căn giữa bất thường.
- Motion có thể gây khó chịu với một số người dùng; cần tuân thủ prefers-reduced-motion và không animate layout.
- Splash chỉ chạy sau kết quả xác thực cuối cùng, không chạy khi server trả về yêu cầu OTP/MFA hoặc có lỗi.

## Reference

- Figma file: https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores-%E2%80%94-Product-UX-UI?node-id=3-2&p=f&t=cXCTnqPocohL6Hr1-0
- Login page source: src/pages/auth/login/login-page.tsx
