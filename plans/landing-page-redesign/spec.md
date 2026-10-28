# Spec: Thiết kế lại landing Dolores

**Date:** 2026-10-28
**Status:** Ready

## Problem Statement

Landing Dolores đang có nhiều nền màu, lớp trang trí và ảnh không cùng bối cảnh. Tiêu đề dùng Georgia trong khi login và bốn khu vực theo role dùng Arial, khiến trải nghiệm trước và sau đăng nhập thiếu liền mạch. Khách mới cần hiểu rõ Dolores cung cấp máy pha cùng nền tảng quản lý và tìm được thao tác tiếp theo.

## Decisions Confirmed With User

- Landing ít màu; tham khảo cách trưng bày sản phẩm và tổ chức nội dung của CAYE, giữ nhận diện Dolores.
- Điểm nhấn: **máy pha + nền tảng quản lý**.
- Thông điệp hero đề xuất để triển khai: **“Máy pha thông minh. Quản lý cùng Dolores.”** Người dùng đã chọn hướng thông điệp này; có thể tinh chỉnh ngắt dòng theo viewport mà giữ nguyên ý.
- Dùng **Arial cho landing**, đồng bộ với app đang chạy.
- Tạm ẩn tin tức và đánh giá khách hàng mẫu; rút các mục menu tương ứng, gồm liên kết trong footer.
- Hiển thị biểu tượng từ `logo-converted-edited.svg` bên cạnh wordmark `dolores.` màu đỏ; không hiển thị dòng `COFFEE`.
- Khi mở landing, hiển thị lockup Dolores trên nền sáng khoảng 1,4 giây rồi làm mờ lớp intro; bỏ qua intro khi bật giảm chuyển động.
- Hover logo chỉ nâng nhẹ và phóng biểu tượng rất ít, không đổi màu chữ hoặc nền.
- Dùng menu mobile dạng danh sách gọn modeless dưới header; link đăng nhập vẫn hiện trong header.
- Giữ email `hello@dolorescoffee.vn`, số `1800 1234` và địa chỉ TP. Hồ Chí Minh hiện tại để công khai.
- Thêm **Playwright E2E** cho route, CTA, menu, keyboard/focus và responsive; chỉ dùng Chromium ban đầu, không đưa Playwright sang auth hoặc role.

## Sources And Evidence

- [CAYE](https://www.caye.com/en/): đã xem trực tiếp header, hero, khu vực máy, Cloud và case study trong browser ngày 2026-10-28.
- [Figma Dolores · Customer](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=14-8), [Admin](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=10-49): đã đọc design context và screenshot. Nguồn chuẩn cho màu, hình dạng nút và nhận diện.
- Source đang chạy: Next.js Pages Router, route `*.page.tsx`; quy tắc tổ chức tại `MIGRATION_WORKFLOW.md`.
- Kiểm tra 176 file trong `src`, gồm 169 file văn bản thuộc các loại mã/style; không thấy file font, `next/font`, `@font-face`, Google Fonts URL hoặc class family `font-sans`/`font-serif`/`font-mono`.
- Font UI chính trong source là Arial; Georgia dùng cho display của Home; monospace dùng ở phần mã kỹ thuật Moderator. Splash đăng nhập cũng khai báo Arial qua shorthand `font`.
- Runtime Home: body/copy Arial; hero h1 Georgia 78px; section h2 Georgia 54px tại viewport kiểm tra. Runtime login: nội dung, input và nút đều Arial. `body` login có fallback Times New Roman do font được đặt ở container, không ở root.
- Runtime CTA “Khám phá giải pháp” có nền trong suốt, padding 0, min-height auto, cao khoảng 20px dù có class `action-button--primary`. Đây là lỗi style phải xử lý trong phạm vi landing.

## User Stories

- **[P1]** Là khách mới, tôi muốn nhận ra máy pha và nền tảng Dolores ngay tại hero để hiểu sản phẩm đang được giới thiệu.
  Accepted when: hero có một h1, mô tả ngắn, ảnh máy rõ và CTA; khối tiếp theo giải thích giá trị vận hành của thiết bị và nền tảng.
- **[P1]** Là khách truy cập, tôi muốn đọc một giao diện ít màu, dễ quét để tìm được thông tin chính.
  Accepted when: dùng nền trắng/nền trang theo token, Arial cho toàn bộ chữ landing; gỡ các nền đỏ/đen lớn và các lớp trang trí đã chỉ ra.
- **[P1]** Là người dùng đã có tài khoản, tôi muốn thấy Đăng nhập trên desktop và mobile để vào app nhanh.
  Accepted when: liên kết Đăng nhập nhìn thấy ở header tại 390px và 1440px, dẫn đúng `/login`; header còn tiếp cận được khi cuộn.
- **[P1]** Là khách truy cập, tôi muốn nhãn liên kết khớp nội dung đích để thao tác đúng kỳ vọng.
  Accepted when: CTA khám phá dẫn tới phần giải pháp/sản phẩm; CTA nền tảng dẫn tới phần công nghệ; không còn liên kết tới hai section đã tạm ẩn.
- **[P1]** Là người sử dụng bàn phím hoặc màn hình nhỏ, tôi muốn mở/đóng điều hướng và kích hoạt CTA thuận tiện.
  Accepted when: vùng chạm ít nhất 44 × 44px, focus rõ, menu đóng được bằng Escape hoặc chạm ngoài và trả focus về nút mở khi đóng bằng Escape.
- **[P2]** Là khách mới, tôi muốn xem giao diện Dolores thực tế để hiểu phần mềm trước khi đăng nhập.
  Accepted when: có screenshot lấy từ giao diện chạy thật, lưu cục bộ, đã kiểm tra nội dung và ẩn dữ liệu riêng tư; dữ liệu mẫu được ghi rõ. Phần mô tả nền tảng vẫn đầy đủ nếu chưa có asset đạt yêu cầu.
- **[P3]** _(ngoài phạm vi hiện tại)_ Case study, tin tức, video sản phẩm và catalog nhiều model được bổ sung khi có nội dung, ảnh và đường dẫn thực tế phù hợp.

## Functional Requirements

1. **FR-01 · Cấu trúc nội dung:** thứ tự chính là header → hero → sản phẩm/lợi ích → nền tảng → dịch vụ → liên hệ và footer. Mỗi section có một trọng tâm; không tạo các section mới chỉ để chứa thêm ảnh.
2. **FR-02 · Route và anchor:** giữ route `/`, `/home`, `/login` và anchor của các phần được giữ lại. Liên kết header/footer/CTA phải trỏ tới nội dung đang hiển thị. Hai mục tin tức và đánh giá khách hàng mẫu được tạm ẩn cùng liên kết tương ứng theo lựa chọn của người dùng.
3. **FR-03 · Hero:** dùng thông điệp máy pha cùng nền tảng, mô tả khoảng 18–24 từ và tối đa hai CTA. CTA chính “Khám phá giải pháp” dẫn tới `#solutions`; CTA phụ “Xem nền tảng” dẫn tới `#technology`. Header giữ lối vào `/login`.
4. **FR-04 · Hình ảnh:** dùng `coffee-machine-float.png` làm hình sản phẩm chính, đặt trên nền sáng, giữ tỉ lệ. Không lặp lại ảnh máy lớn ở nhiều section liền nhau. Gỡ hai background `landing-hero-desktop.jpg`/`landing-hero-mobile.jpg`, cảnh `investment-savings.png` và ba thumbnail tin tức khỏi giao diện landing.
5. **FR-05 · Nền tảng:** thay cách minh họa bằng `coffee-live-monitoring-20260928.png` bằng nội dung rõ về máy, hợp đồng, hóa đơn và yêu cầu hỗ trợ. Screenshot thật là phần bổ sung P2; không dùng hình điện thoại hoặc số liệu không đại diện cho app. Không dùng screenshot Figma làm asset runtime của sản phẩm.
6. **FR-06 · Nội dung mẫu:** gỡ trích dẫn khách hàng, sao đánh giá, bài tin tức và các liên kết “Đọc thêm” mẫu khỏi phần đang hiển thị. Không thay bằng số liệu hoặc khách hàng tự tạo.
7. **FR-07 · Dịch vụ:** trình bày nội dung chọn máy, triển khai và hỗ trợ bằng chữ ngắn. Gỡ badge `360°` nổi và ảnh người/mèo không cùng bối cảnh.
8. **FR-08 · Typography:** dùng `Arial, Helvetica, sans-serif` cho heading, body, nav, nút và footer của landing. Loại Georgia khỏi các style display của landing. Không thêm bộ font hoặc nguồn tải font mới trong phạm vi này.
9. **FR-09 · Token màu:** nền trang `#f8f6f3`, bề mặt `#ffffff`, chữ chính `#302927`, chữ phụ `#706561`, viền `#e9e2dc`, hành động chính `#b81724`, nền trạng thái nhạt `#f9e9ea`. Đỏ tập trung ở nhận diện và thao tác chính. Không còn các section nền đỏ/đen phủ diện tích lớn hoặc gradient trang trí nhiều lớp.
10. **FR-10 · Hình dạng và mật độ:** nút cao ít nhất 48px, bo 10px; khung nội dung dùng khoảng trắng và viền mảnh. Gỡ vòng tròn sau máy, nền lưới công nghệ, badge nổi và nhãn chữ hoa nhỏ lặp ở mọi section.
11. **FR-11 · Tỉ lệ chữ đề xuất:** hero 48–56px ở desktop, 32–36px ở mobile; section heading 28–36px; body 16px; nav/nút 14–16px; chữ phụ ít nhất 12px, ưu tiên 14px khi có đủ chỗ. H1 tối đa hai dòng tại 1440px và ba dòng tại 390px. Cho phép chỉnh giá trị trong khoảng để đáp ứng tiếng Việt và chiều dài thực tế.
12. **FR-12 · Layout:** chiều rộng nội dung tối đa khoảng 1200px; khoảng cách section khởi điểm 80px desktop và 48px mobile. Desktop từ 1024px; mobile/tablet tới 1023px dùng menu thu gọn. Mobile xếp chữ và ảnh theo một cột, CTA không bị ảnh che hoặc đẩy ra khỏi vùng nội dung.
13. **FR-13 · Component:** tái sử dụng `BrandLogo`, `ActionButton`, `SectionHeading` khi phù hợp; `eyebrow` cần có thể bỏ ở những section không cần. Sửa phạm vi CSS của `ActionButton` để variant primary/secondary/text render đúng. Khối riêng của landing nằm cạnh trang Home, không đưa mọi section vào thư mục component dùng chung.
14. **FR-14 · Chuyển động:** hover/focus/chuyển trạng thái khoảng 160–220ms. Không cần video tự phát hoặc chuyển cảnh lớn theo cuộn cho MVP. Có `prefers-reduced-motion`; nội dung phải đọc và điều hướng được khi giảm/tắt chuyển động.
15. **FR-15 · Metadata:** giữ title, description và một h1 phù hợp nội dung Dolores; ảnh có alt mô tả đúng sản phẩm. Không đổi thương hiệu, thông tin liên hệ hoặc tuyên bố tính năng ngoài dữ liệu đã có mà không xác nhận nguồn.

## Non-Functional Requirements

- **Accessibility:** chữ thường có contrast ít nhất 4.5:1; chữ lớn ít nhất 3:1; vùng chạm ít nhất 44 × 44px; keyboard focus nhìn thấy; menu hỗ trợ Escape và trả focus.
- **Responsive:** kiểm tra 320, 390, 768, 1024, 1440 và 1920px; không tràn ngang; tiêu đề/nút không bị cắt. Nút không xuống dòng trên desktop; tiếng Việt có dấu phải hiển thị đúng.
- **Performance:** ghi baseline trước khi tối ưu; dùng ảnh responsive và kích thước rõ để hạn chế layout shift. Mục tiêu ảnh hero tải thực tế không quá 250KB ở viewport desktop kiểm tra sau tối ưu định dạng. CLS mục tiêu ≤ 0.1; ghi rõ profile đo khi kiểm tra.
- **Security/privacy:** screenshot công khai không chứa thông tin riêng tư, token hay thông tin tài khoản thực. Không thêm thu thập dữ liệu hoặc gửi form mới trong phạm vi redesign.
- **Maintainability:** giữ phân lớp hiện tại: UI trang ở `pages/home`, chữ ở `text/home`, asset ở `assets`, đường dẫn ở `routes`; chỉ tách phần dùng chung khi có nhu cầu thực.

## Success Criteria

- [x] Tất cả chữ giao diện landing dùng cùng family Arial; h1/h2/body/nav/nút xác nhận qua computed style.
- [x] Không thêm font loader, file font hoặc request font bên ngoài.
- [x] Hero diễn đạt máy pha cùng nền tảng; ngắt dòng đạt FR-11 ở các viewport mục tiêu.
- [x] Đăng nhập tiếp cận được ở header desktop/mobile và dẫn đúng `/login`.
- [x] CTA chính/phụ có nhãn khớp đích; primary có nền đỏ, padding và chiều cao thực ít nhất 48px.
- [x] Không hiển thị tin tức, trích dẫn khách hàng mẫu hoặc mục menu/footer dẫn tới chúng.
- [x] Không dùng sáu file ảnh đã đề xuất bỏ trong giao diện landing; cảnh điện thoại cũng được thay cách trình bày.
- [x] Không có section nền đỏ/đen lớn, vòng tròn, grid trang trí hay badge `360°` nổi.
- [x] Trang `/` và `/home` cùng hiển thị nội dung đúng, không gây lỗi điều hướng sang login/app.
- [x] Không tràn ngang ở sáu chiều rộng kiểm tra; focus, menu và giảm chuyển động hoạt động đúng.
- [x] Screenshot nền tảng chỉ xuất hiện sau khi có asset P2 đạt tiêu chí nguồn, dữ liệu và quyền riêng tư.

## Out Of Scope

- Chuyển login, bốn role hoặc toàn bộ dự án sang Inter.
- Thay luồng xác thực, OTP, API hoặc quyền truy cập.
- Tạo blog/CMS, form liên hệ gửi dữ liệu mới, catalog giả hoặc case study chưa có nguồn.
- Tạo ảnh lifestyle mới, video hero hoặc hiệu ứng 3D cho landing.
- Commit, push hoặc triển khai production trong bước brainstorm.

## Assumptions

- Thông tin liên hệ hiện có được giữ theo source; tính hợp lệ nội dung cần được kiểm tra khi chuẩn bị phát hành.
- `coffee-machine-float.png` là asset sản phẩm được tiếp tục dùng theo hướng đánh giá đã trao đổi; không công bố thông số kỹ thuật chưa được xác nhận.
- Screenshot nền tảng là P2, không chặn phần mô tả nền tảng của MVP. Kế hoạch triển khai phải nêu rõ nguồn ảnh trước khi thêm vào runtime.
- Các ngưỡng typography/layout ở trên là ràng buộc thiết kế đề xuất để plan kiểm tra bằng nội dung thật.

## Risks

- CSS scoped hiện tại của `ActionButton` không áp vào link thực tế; cần xác nhận mọi variant khi sửa để tránh làm hỏng CTA ở section khác.
- Typography chưa được tập trung ở root. Scope này sửa landing theo Arial; việc dọn hệ thống font toàn app cần tránh làm phát sinh thay đổi ở các màn khác.
- Rút section phải đồng bộ header, footer và dữ liệu route để tránh liên kết không có đích; tài sản ảnh P2 có thể chưa sẵn sàng.

## Clarification Status

Không còn câu hỏi chặn lập kế hoạch. Các lựa chọn về điểm nhấn, font, nội dung mẫu, logo, menu mobile, thông tin liên hệ và kiểm thử E2E đã được người dùng trả lời trong bước brainstorm/lập kế hoạch ngày 2026-10-28. Nguồn screenshot P2 là phụ thuộc triển khai có phương án nội dung không ảnh.
