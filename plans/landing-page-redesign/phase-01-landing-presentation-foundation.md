# Phase 01 — Nền presentation của landing

**Phase ID:** phase-01-landing-presentation-foundation
**Priority:** P1
**Stories:** US-02, US-05; nền cho US-01 và các phase sau
**Depends on:** spec Ready; không phụ thuộc phase khác.

## Mục tiêu

Đặt nền màu và typography Dolores trong phạm vi Home, làm CSS dễ kiểm soát, đồng thời sửa lỗi CTA hiện không nhận style trên thẻ Link thực tế. Sau phase này, mọi variant cần dùng trên nền sáng có hình thức và trạng thái focus đọc được.

## File dự kiến

**Sửa:**

- `src/pages/home/index.page.tsx` — gắn class root và import stylesheet của trang.
- `src/components/button/action-button.tsx` — chuyển variant sang class map từ CSS Module, giữ API tối thiểu tương thích với các callsite Home hiện có.
- `src/components/heading/section-heading.tsx` — cho phép bỏ eyebrow và không render wrapper rỗng.
- `src/text/typography.ts` — đổi display stack riêng Home sang Arial; giữ nguyên font role/login.
- `src/pages/home/hero-section.tsx` và `src/pages/home/product-section.tsx` — đổi cách gọi variant chỉ khi cần để giữ trang đang dùng hoạt động qua phase nền.

**Tạo:**

- `src/pages/home/home.module.css` — token, nhịp chữ/layout và style con Home dưới root cục bộ; không tạo reset toàn cục cho mọi `body`, `a` hoặc `button`.
- `src/components/button/action-button.module.css` — style variant primary, secondary/light, outline tương thích callsite còn dùng, text, hover, focus-visible và reduced-motion.
- `tests/landing-page.test.cjs` — test hợp đồng render/link/heading cơ bản theo cách Node test hiện có, không xác nhận CSS bằng cách so chuỗi.
- `package.json` và `package-lock.json` — thêm `@playwright/test` và script `test:e2e`.
- next.config.js và .gitignore — cấp distDir riêng cho E2E và bỏ qua cache/report được tạo khi chạy test.
- `playwright.config.ts` — cấu hình `tests/e2e`, project Chromium, base URL `http://127.0.0.1:3100` và Next dev webServer trên cổng đó.
- `tests/e2e/landing-page.spec.ts` — smoke test ban đầu; các phase sau mở rộng file này cho navigation, nội dung và responsive.
- tests/e2e/README.md — lệnh cài Chromium và chạy kiểm tra E2E.

Giữ `BrandLogo` hiện tại và asset ảnh DOLORES COFFEE; không đổi sang wordmark `dolores.` hoặc đổi mặc định của component đang dùng ở login.

## Công việc

- [x] Chụp baseline Home trước khi sửa ở 1440×900 và 390×844; ghi các giá trị computed style hiện tại của body, h1/h2 và CTA primary.
- [x] Tạo `home.module.css` với root Home và các selector con được giới hạn dưới root. Giữ style cho các class hiện tại của `BrandLogo`, `SectionHeading`, hero, product và footer cho tới khi phase nội dung thay chúng.
- [x] Đặt Arial, màu nền #f8f6f3, bề mặt #ffffff, chữ #302927/#706561, viền #e9e2dc, đỏ #b81724 và hồng nhạt #f9e9ea thành token trang; không sửa root CSS toàn app.
- [x] Áp dụng nhịp chữ cơ sở theo spec, gồm body 16px, section heading 28–36px và trạng thái focus nhìn thấy.
- [x] Đổi `ActionButton` sang CSS Module để class thực sự có trên anchor Next Link; giữ các variant đang có hoặc thay đổi callsite trong cùng bước; cung cấp variant dùng trên nền sáng.
- [x] Đảm bảo target tương tác tối thiểu 44px; button CTA thông thường cao tối thiểu 48px, radius 10px; text variant vẫn có hit area phù hợp hoặc không dùng làm thao tác độc lập.
- [x] Thêm focus-visible, transition trong khoảng 160–220ms và media query reduced-motion cho transform/transition.
- [x] Cho SectionHeading bỏ eyebrow mà không để lại khoảng trắng hoặc nhãn trống.
- [x] Ban đầu, test chỉ kiểm tra hợp đồng component ActionButton (nhãn, href) và SectionHeading khi bỏ eyebrow; chưa kiểm tra H1 hoặc đích CTA cuối cùng trước khi nội dung Phase 03 được triển khai. Mở rộng cùng test file ở Phase 03 để xác nhận một H1, nội dung và CTA cuối cùng. Dùng CSS Module mock chỉ để dựng markup, không xem class mock là kiểm chứng style.
- [x] Cài `@playwright/test` dưới dạng dev dependency để cập nhật `package.json`/lockfile; thêm script `test:e2e` và cấu hình Chromium/webServer Next dev trên cổng 3100 để không tranh cổng với dev server đang chạy.
- [x] Tạo smoke E2E kiểm tra Home mở được và đo style thực của CTA sau khi chuyển sang CSS Module; thêm `npx.cmd playwright install chromium` vào hướng dẫn khởi tạo.

## Kiểm tra và nghiệm thu

- `node --test tests/landing-page.test.cjs` chạy test mới.
- Cài Chromium bằng `npx.cmd playwright install chromium`; `npm.cmd run test:e2e -- --project=chromium` chạy smoke test route và style.
- Mở Home trong Next dev và kiểm tra computed style trực tiếp trên anchor Link: variant primary có nền đỏ, padding khác 0, min-height thực ≥48px, radius 10px và focus-visible nhận ra được.
- Kiểm tra secondary trên nền sáng đạt contrast; không dùng nguyên outline chữ trắng trên nền trắng.
- Xác nhận chữ Home dùng Arial qua computed style; login và shell role không đổi typography.
- Xác nhận reduced-motion loại transform/scroll motion của các control hiện có.
- Chạy lint và TypeScript để phát hiện lỗi tên module/import; ghi lỗi baseline nếu có.

## Rủi ro / ghi chú

- CSS Home hiện được chèn dưới dạng CSS global trong JSX. Chuyển qua CSS Module có thể làm mất style của BrandLogo/SectionHeading nếu selector con không còn nằm dưới root.
- Styled JSX của ActionButton đã được chứng minh tạo scope class không có trên anchor Link; kiểm tra browser là gate bắt buộc, SSR test không đủ.
- Cấu hình Playwright cần dùng cổng riêng và đóng webServer do test khởi chạy; browser binary phải được cài trước khi chạy E2E.
- Các variants `light` và `outline` có thể không còn hợp với bảng màu mới. Giữ tương thích tới lúc mọi callsite được migrate, không làm hỏng CTA cũ giữa các phase.
