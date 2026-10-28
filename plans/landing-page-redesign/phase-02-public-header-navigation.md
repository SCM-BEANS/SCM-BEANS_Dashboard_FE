# Phase 02 — Header công khai và điều hướng

**Phase ID:** phase-02-public-header-navigation
**Priority:** P1
**Stories:** US-03, US-04, US-05
**Depends on:** phase-01-landing-presentation-foundation.

## Mục tiêu

Tạo header website gọn, có thể truy cập khi cuộn, giữ đăng nhập hiển thị trên mobile và đảm bảo nav/footer chỉ liên kết tới phần landing đang tồn tại. Người dùng đã chọn menu mobile gọn dạng disclosure modeless dưới header, không phải drawer của các role đã đăng nhập.

## File dự kiến

**Sửa:**

- `src/pages/home/index.page.tsx` — dùng header riêng và không dựng lại nav cũ.
- `src/pages/home/home.module.css` — header sticky, layout desktop/mobile, disclosure menu và anchor offset.
- `src/routes/routes.ts` — bỏ Customers/News khỏi Home navigation và footer discovery; giữ nguyên các danh sách route role.
- `src/text/home/home-messages.ts` — nhãn menu, aria label, nút mở/đóng, login và copy header/footer.
- `src/routes/path.ts` — chỉ sửa nếu usage audit chứng minh cần bỏ symbol; ưu tiên giữ constants Customers/News để tránh thay đổi export không cần thiết.

**Tạo:**

- `src/pages/home/home-header.tsx` — thành phần header công khai sở hữu state, ref focus và sự kiện menu.
- `tests/e2e/landing-page.spec.ts` — mở rộng Playwright E2E với menu, hash, login và keyboard/focus.

## Công việc

- [x] Giữ ba mục điều hướng hiện có tới giải pháp, sản phẩm và công nghệ; bỏ hai mục Khách hàng/Tin tức. Footer discovery không còn link tới section bị ẩn; giữ những link hiện có có đích đang render.
- [x] Đặt header sticky với lớp bề mặt sáng, nhận diện Dolores, link Đăng nhập dẫn đúng `/login` và luôn nhìn thấy tại 390px.
- [x] Giữ breakpoint mobile/tablet tới 1023px; đổi sang header desktop từ 1024px.
- [x] Tạo nút hamburger tối thiểu 44×44px, `aria-expanded`, `aria-controls`, accessible name rõ và vùng điều khiển có focus-visible.
- [x] Dùng disclosure modeless: không khai báo dialog/modal, không focus trap, không khóa nền trang. Không tái sử dụng MobileNavigation của role vì matcher của nó xử lý pathname và logout, không hash anchors.
- [x] Đóng menu khi chọn link, nhấn Escape hoặc đổi sang desktop breakpoint; sau Escape trả focus về nút mở menu.
- [x] Không ẩn link đăng nhập chỉ vì chiều ngang xuống mobile.
- [x] Đồng bộ nav/footer routes để không còn đường dẫn visible tới Customers/News; mỗi hash link còn lại có phần tử đích.
- [x] Thêm `scroll-margin-top` đủ bù sticky header cho mọi section đích.
- [x] Kiểm tra click liên kết điều hướng có đóng menu và giữ hành vi hash URL dự kiến.
- [x] Mở rộng Playwright spec để kiểm tra menu mở/đóng, Escape trả focus, chọn hash link, link login ở mobile và đóng menu khi qua breakpoint desktop.

## Kiểm tra và nghiệm thu

- `node --test tests/landing-page.test.cjs` và `npm.cmd run test:e2e -- --project=chromium`; E2E phải kiểm tra hành vi thực, không chỉ tên class.
- Browser tại 390px: link đăng nhập thấy được, menu mở/đóng, target ≥44px.
- Browser ở 1023px và 1024px: xác nhận đúng chuyển chế độ mobile/desktop và resize đóng menu đúng cách.
- Dùng Tab/Shift+Tab để xác nhận thứ tự; Escape đóng disclosure và trả focus tới nút hamburger.
- Chọn từng hash link: đích tồn tại duy nhất, tiêu đề không bị header che.
- Kiểm tra `/login` mở đúng route; không thay đổi xử lý authentication hoặc layout login.

## Rủi ro / ghi chú

- Không trộn ngữ nghĩa disclosure với modal. Người dùng đã chọn disclosure modeless gọn; nếu phạm vi sau này đổi sang bottom sheet, phải triển khai modal thật và kiểm tra focus/scroll/background behavior.
- Không sửa các route role khác dù `routes.ts` cùng chứa chúng.
- Header hiện đặt absolute trên ảnh hero. Khi thay sang sticky sáng cần thử offset đầu trang, cuộn và fragment navigation.
