# Phase 05 — Screenshot nền tảng dashboard (tùy chọn P2)

**Phase ID:** phase-05-optional-dashboard-screenshot
**Priority:** P2
**Stories:** US-06
**Depends on:** phase-03-landing-content-imagery; chỉ bắt đầu khi có asset thật từ môi trường Dolores được xác nhận và làm sạch dữ liệu riêng tư.

## Trạng thái

Deferred, không thuộc MVP bắt buộc. Không tạo ảnh giả hoặc khung số liệu giả để thay screenshot. Nếu chưa có nguồn đạt tiêu chí, giữ phần nền tảng mô tả bằng chữ như Phase 03 và không thêm file ảnh.

## File dự kiến nếu được kích hoạt

**Tạo sau khi nhận asset:**

- `src/assets/home-dashboard-screenshot.webp` — bản đã tối ưu từ screenshot runtime được phép sử dụng, không chứa dữ liệu cá nhân, token, thông tin đăng nhập hoặc dữ liệu nhạy cảm.

**Sửa sau khi nhận asset:**

- `src/pages/home/index.page.tsx` hoặc section platform đang sở hữu — thêm hình cạnh mô tả tính năng.
- `src/pages/home/home.module.css` — responsive image frame, không làm giảm tương phản/nội dung.
- `src/text/home/home-messages.ts` — alt và ghi chú nội dung mẫu nếu dữ liệu trong ảnh là mock.
- `tests/landing-page.test.cjs` — xác nhận ảnh chỉ được hiển thị khi asset được thêm và alt không rỗng.
- `tests/e2e/landing-page.spec.ts` — kiểm tra ảnh được tải, có alt và co giãn đúng trên Chromium.

## Điều kiện kích hoạt và công việc

- [ ] Nhận xác nhận của chủ dự án về nguồn screenshot và quyền dùng trên landing công khai.
- [ ] Chụp từ giao diện Dolores đang chạy; ưu tiên tài khoản/demo không có dữ liệu cá nhân; làm sạch tên, email, số điện thoại, token, URL riêng và dữ liệu khách hàng.
- [ ] Chủ dự án duyệt ảnh đã xử lý trước khi thêm vào runtime.
- [ ] Ghi nguồn, môi trường, thời điểm chụp, nội dung mock nếu có và quy trình che dữ liệu.
- [ ] Tối ưu định dạng/kích thước và thêm bằng Next Image với width/height/sizes, alt mô tả thật.
- [ ] Đảm bảo phần giải thích máy, hợp đồng, hóa đơn và yêu cầu hỗ trợ vẫn đầy đủ nếu ảnh không tải hoặc bị ẩn ở viewport nhỏ.

## Kiểm tra và nghiệm thu

- Không có screenshot Figma, stock UI, HTML dựng giả hoặc số liệu không đại diện cho sản phẩm.
- Kiểm tra ảnh trên desktop/mobile và đảm bảo không lộ dữ liệu riêng tư.
- Test markup và Playwright kiểm tra alt, tải ảnh và không gây duplicate H1; browser production kiểm tra sizing, payload và CLS.
- Chỉ đánh dấu phase hoàn tất khi asset có nguồn/duyệt và browser kiểm tra xong. Nếu không có asset, phase vẫn deferred và không cản MVP.

## Rủi ro / ghi chú

- Nguồn và quyền sử dụng hiện chưa có; không dùng phiên đăng nhập chứa thông tin thật nếu chưa xử lý.
- Screenshot có thể lỗi thời hoặc không mô tả tính năng đang hoạt động; xác nhận nội dung với chủ dự án.
