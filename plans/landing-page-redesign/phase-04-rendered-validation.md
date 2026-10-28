# Phase 04 — Kiểm tra giao diện chạy thật

**Phase ID:** phase-04-rendered-validation
**Priority:** P1
**Stories:** US-01, US-02, US-03, US-04, US-05
**Depends on:** phases 01, 02 và 03.

## Mục tiêu

Chứng minh landing cuối đáp ứng spec ở route, browser, responsive, keyboard, typography, hình ảnh và hiệu năng; tách rõ bằng chứng test tự động với kiểm tra chỉ có thể xác nhận trên giao diện thật.

## File dự kiến

**Sửa nếu phát hiện lỗi:**

- `src/pages/home/index.page.tsx`
- `src/pages/home/home-header.tsx`
- `src/pages/home/hero-section.tsx`
- `src/pages/home/product-section.tsx`
- `src/pages/home/home.module.css`
- `src/components/button/action-button.tsx`
- `src/components/button/action-button.module.css`
- `src/routes/routes.ts` và `src/text/home/home-messages.ts`
- `package.json`, `package-lock.json`, `playwright.config.ts` và `tests/e2e/landing-page.spec.ts` nếu cần sửa cấu hình/test trong lúc xác nhận.

**Tạo hoặc hoàn thiện:**

- `tests/landing-page.test.cjs` — contract của markup, anchor, route exports và nội dung visible.
- `tests/e2e/landing-page.spec.ts` — E2E Chromium kiểm tra route, CTA, menu, keyboard/focus, reduced motion và viewport matrix.
- `plans/landing-page-redesign/` — cập nhật checklist/evidence của phase, không ghi pass nếu browser gate còn thiếu.

## Công việc

- [x] Chạy test mới cùng test liên quan, lint, TypeScript và production build; lưu lệnh/kết quả và phân biệt baseline lỗi với lỗi do landing.
- [x] Chạy landing E2E bằng `npm.cmd run test:e2e -- --project=chromium`; ghi kết quả riêng với test Node.
- [x] Kiểm tra `/` và `/home` cùng hiển thị Home; click login đi `/login`; quay lại Home không phá route.
- [x] Dùng browser đo kích thước 320, 390, 768, 1023, 1024, 1440 và 1920px; không tràn ngang, H1/CTA không cắt, target không bị ảnh che.
- [x] Xác nhận disclosure mobile còn ở 1023px và desktop header xuất hiện ở 1024px.
- [x] Đo computed font family trên H1, H2, body, nav, action button và footer; xác nhận Arial, không phát request font ngoài.
- [x] Đo CTA anchor bằng computed style/geometry: primary có nền Dolores, padding thật, min-height ≥48px và focus ring thấy được.
- [x] Kiểm tra hash navigation và scroll offset; tiêu đề không bị sticky header che.
- [x] Dùng bàn phím kiểm tra thứ tự Tab, mở menu, Escape, trả focus về trigger, chọn link và trạng thái focus-visible.
- [x] Bật `prefers-reduced-motion`; xác nhận hover/scroll không tạo chuyển động bắt buộc và toàn bộ nội dung/điều hướng vẫn dùng được.
- [x] Kiểm tra contrast chữ thường ≥4.5:1, chữ lớn ≥3:1 và hit target ≥44×44px.
- [x] Trên production build, ghi profile đo và byte ảnh hero thực truyền; kiểm tra mục tiêu ≤250 KB và CLS ≤0.1. Nếu vượt, tối ưu nguồn/sizing rồi đo lại.
- [x] So sánh ảnh chụp trước/sau tại 1440×900 và 390×844 để rà bố cục, không dùng số liệu build như chỉ báo UX.
- [x] Kiểm tra diff chỉ chạm phạm vi landing/component CTA; login và shell các role không đổi.

## Kiểm tra tự động và browser

Test Node/React chứng minh cấu trúc render và hợp đồng nhỏ. Playwright trên Chromium kiểm tra browser thật cho computed style, focus, sticky scrolling, overflow, tỷ lệ chữ, tải ảnh, liên kết và menu. Ảnh chụp trước/sau và số đo ảnh/CLS production đã được xem, ghi lại trong session notes của plan; lượt review này là điểm duyệt phase cuối theo `cook --hard`.

## Rủi ro / ghi chú

- Không dùng count lỗi test lịch sử thay baseline mới.
- Dev mode có thể đổi kích thước và thời gian ảnh; đánh giá payload/CLS trên production profile ghi rõ.
- Playwright cần browser binary Chromium được cài và webServer trên cổng riêng hoạt động ổn định; lỗi setup cần phân biệt với lỗi giao diện.
- Chỉ tuyên bố đạt sau khi browser gates có bằng chứng thực tế; không suy ra từ build/lint.
