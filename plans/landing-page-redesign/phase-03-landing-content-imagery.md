# Phase 03 — Nội dung và hình ảnh landing

**Phase ID:** phase-03-landing-content-imagery
**Priority:** P1
**Stories:** US-01, US-02, US-04
**Depends on:** phase-01-landing-presentation-foundation; nên tích hợp sau phase-02-public-header-navigation để menu và anchor được kiểm tra cùng cấu trúc nội dung cuối.

## Mục tiêu

Thay landing nhiều màu và nhiều minh họa rời rạc bằng một câu chuyện ngắn theo thứ tự header → hero → sản phẩm/lợi ích → nền tảng → dịch vụ → liên hệ/footer. Máy pha và nền tảng quản lý cùng được thể hiện ngay trong nội dung đầu tiên.

## File dự kiến

**Sửa:**

- `src/pages/home/index.page.tsx` — composition các section giữ lại; bỏ render section mẫu và hình không cùng bối cảnh.
- `src/pages/home/hero-section.tsx` — headline, supporting copy, ảnh máy một lần và tối đa hai CTA.
- `src/pages/home/product-section.tsx` — lợi ích/thiết bị, giữ anchor `#solutions` và `#products`, bỏ ảnh máy trùng.
- `src/pages/home/home.module.css` — bố cục sáng, responsive sections, không dùng section đỏ/đen lớn, grid hoặc vòng trang trí bị loại.
- `src/text/home/home-messages.ts` — copy hero, nền tảng, dịch vụ, liên hệ và nhãn link theo nội dung thật có sẵn.
- `src/routes/routes.ts` — nếu thứ tự nhãn/link cuối khác với Phase 02; chỉ sửa mảng Home.
- `src/components/heading/section-heading.tsx` — chỉ khi cần render section đơn giản không eyebrow.
- `tests/e2e/landing-page.spec.ts` — mở rộng E2E kiểm tra H1, CTA, nội dung hiển thị/ẩn, ảnh và các anchor.

**Tài nguyên:** giữ `src/assets/coffee-machine-float.png` dùng một lần ở hero. Gỡ import/use khỏi JSX nhưng không xóa file `landing-hero-desktop.jpg`, `landing-hero-mobile.jpg`, `investment-savings.png`, ảnh monitoring hay thumbnail remote; không xóa `news-card.tsx`/`testimonial-card.tsx` chỉ vì tạm ẩn.

## Công việc

- [x] Đưa thông điệp “Máy pha thông minh. Quản lý cùng Dolores.” vào một H1 duy nhất; điều chỉnh ngắt dòng theo viewport mà không đổi ý chính.
- [x] Viết mô tả 18–24 từ không thêm thông số kỹ thuật, khách hàng, tiết kiệm hoặc khả năng chưa xác nhận.
- [x] Dùng ảnh máy cutout đã chọn trên nền sáng, giữ tỷ lệ và alt chính xác; không lặp ảnh lớn trong product section.
- [x] Đặt CTA chính “Khám phá giải pháp” tới `#solutions`, CTA phụ “Xem nền tảng” tới `#technology`; bỏ scroll cue thứ ba để tuân thủ giới hạn hai CTA.
- [x] Giữ nội dung sản phẩm/lợi ích đủ cho người mới hiểu vai trò thiết bị và mô hình vận hành.
- [x] Thay khu minh họa monitoring bằng mô tả văn bản thật về máy, hợp đồng, hóa đơn và yêu cầu hỗ trợ; không tạo UI giả, số liệu hoặc screenshot Figma.
- [x] Giữ dịch vụ chọn thiết bị, triển khai và hỗ trợ bằng nội dung ngắn; bỏ ảnh người/mèo và badge `360°`.
- [x] Bỏ render testimonials và news, các hình stock, sao đánh giá và liên kết “Đọc thêm”; không tạo khách hàng/số liệu thay thế.
- [x] Dùng bề mặt sáng, token trang; loại gradient nhiều lớp, vòng tròn sau máy, nền lưới và badge nổi.
- [x] Dùng contact/footer rõ và cùng hệ màu. Giữ email `hello@dolorescoffee.vn`, số `1800 1234` và địa chỉ TP. Hồ Chí Minh theo xác nhận của người dùng.
- [x] Cập nhật alt, title/description và đảm bảo chỉ có một H1.
- [x] Dùng Next Image với sizes phù hợp và ảnh sản phẩm không che CTA ở mobile.

## Kiểm tra và nghiệm thu

- Test render kiểm tra một H1, nội dung máy + nền tảng, alt ảnh, hai CTA đúng đích, các ID đích duy nhất, không có testimonial/news/stock URL trong cây hiển thị.
- Playwright E2E xác nhận CTA và link visible trỏ tới đúng ID duy nhất; tin tức, đánh giá và nội dung mẫu không được render.
- Browser tại 390px: H1 tối đa ba dòng; CTA hiển thị đầy đủ, không bị ảnh che; tại 1440px H1 tối đa hai dòng.
- Browser tại 320px: không tràn ngang và không cắt dấu tiếng Việt.
- Kiểm tra màu, font Arial, nút, focus và reduced motion trên giao diện hoàn chỉnh.
- Kiểm tra không có request ảnh news/hero background cũ do section đã bỏ; ảnh máy chỉ tải một lần.
- Không coi screenshot P2 là điều kiện hoàn tất nội dung platform của MVP.

## Rủi ro / ghi chú

- Email/điện thoại/địa chỉ được giữ theo xác nhận của người dùng trong bước lập kế hoạch.
- Bỏ section mẫu phải đồng bộ nav/footer và không để anchor visible trỏ tới section không render.
- Việc giữ hai anchor trong cùng khối sản phẩm cần cấu trúc hợp lý để CTA vẫn tới đúng tiêu đề/khối.
- PNG gốc lớn; Next Image cần được đo trên production trước khi kết luận đạt ngưỡng 250 KB.
