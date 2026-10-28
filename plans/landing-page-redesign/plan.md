# Kế hoạch triển khai: Thiết kế lại landing Dolores

Mode: --hard
Risk: normal — phạm vi là giao diện landing và thiết lập Playwright E2E cho landing; không thay API, xác thực hoặc màn hình role. Rủi ro tập trung ở CSS legacy, menu mobile và cấu hình browser test.

## Nguồn và phạm vi

Spec nguồn: plans/landing-page-redesign/spec.md (Ready, 2026-10-28).

Kế hoạch giữ route `/` và `/home` qua các file Pages Router hiện tại, giữ `/login`, hình ảnh sản phẩm đã chọn và phân lớp nội dung hiện có. MVP thực hiện bốn phase đầu. Phase 05 chỉ là phần bổ sung P2 nếu có ảnh chụp dashboard thật, đã được làm sạch dữ liệu riêng tư và được xác nhận nguồn. Không tạo dữ liệu mẫu mới, không dùng screenshot Figma, không xóa các file ảnh hoặc component cũ trong đợt đầu, không thay đổi auth/role, không commit/push/deploy.

## Traceability

| Story trong spec | Mức | Phase bao phủ | Kết quả kiểm chứng chính |
| --- | --- | --- | --- |
| US-01: nhận ra máy pha và nền tảng từ hero | P1 | 01, 03, 04 | H1, mô tả, ảnh và hai CTA đúng đích; phần tiếp theo giải thích lợi ích thiết bị/nền tảng |
| US-02: giao diện ít màu, dễ quét, dùng Arial | P1 | 01, 03, 04 | computed style Arial; token Dolores; không còn nền tối/đỏ lớn hoặc trang trí bị loại |
| US-03: người có tài khoản tìm được Đăng nhập trên desktop/mobile | P1 | 02, 04 | liên kết hiện tại 390px và 1440px, dẫn `/login`, header sticky còn truy cập được |
| US-04: nhãn liên kết trỏ tới nội dung đang hiển thị | P1 | 02, 03, 04 | mọi hash link có đích duy nhất; nav/footer không dẫn tới Customers/News đã ẩn |
| US-05: menu, CTA và bàn phím dùng được trên màn nhỏ | P1 | 01, 02, 04 | target/focus đạt tiêu chí; Escape đóng menu và trả focus; giảm chuyển động được hỗ trợ |
| US-06: xem screenshot nền tảng thật | P2 | 05 (tùy chọn) | chỉ hiển thị asset thật có nguồn và đã kiểm tra riêng tư; không chặn MVP |

## Thứ tự phase

| ID phase | File phase | Mục tiêu |
| --- | --- | --- |
| phase-01-landing-presentation-foundation | plans/landing-page-redesign/phase-01-landing-presentation-foundation.md | Tạo nền style giới hạn trong Home và sửa ActionButton |
| phase-02-public-header-navigation | plans/landing-page-redesign/phase-02-public-header-navigation.md | Điều hướng công khai, đăng nhập, menu mobile và các link còn hiệu lực |
| phase-03-landing-content-imagery | plans/landing-page-redesign/phase-03-landing-content-imagery.md | Dựng hero, sản phẩm, nền tảng, dịch vụ, liên hệ và footer theo spec |
| phase-04-rendered-validation | plans/landing-page-redesign/phase-04-rendered-validation.md | Kiểm tra route, browser, accessibility, responsive, hiệu năng và hồi quy |
| phase-05-optional-dashboard-screenshot | plans/landing-page-redesign/phase-05-optional-dashboard-screenshot.md | Thêm ảnh dashboard P2 nếu nhận được nguồn đạt yêu cầu |

Phase 01 là nền cho các phase UI sau. Phase 02 và 03 có thể làm lần lượt sau Phase 01; Phase 04 phụ thuộc cả ba MVP phase. Phase 05 không phải dependency của Phase 04 hay MVP.

## Cách kiểm tra

Repo hiện có Node `node:test` dùng TypeScript transpile và React static rendering, nhưng chưa có Playwright hay script test riêng. Theo lựa chọn đã xác nhận, Phase 01 thêm `@playwright/test`, cấu hình Playwright chạy Next dev trên cổng riêng, script `test:e2e` và browser Chromium; test Node hiện có vẫn dùng cho hợp đồng render nhỏ. E2E kiểm tra route, CTA, CSS thực tế, menu, bàn phím và responsive. Browser walkthrough thủ công vẫn dùng để đánh giá thẩm mỹ/contrast và đo payload ảnh/CLS trong production.

Khuyến nghị TDD cho hợp đồng CTA/header: viết test component hoặc E2E tái hiện hành vi trước, sửa UI rồi chạy lại. Không viết test chỉ để khẳng định literal CSS/class name. Trước khi thay style, ghi ảnh và baseline đang chạy. Sau khi cài browser theo hướng dẫn Playwright, kiểm tra bằng `node --test tests/landing-page.test.cjs`, `npm.cmd run test:e2e -- --project=chromium`, `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false` và `npm.cmd run build`. Nếu baseline có lỗi, ghi lệnh, lỗi, file và phân biệt lỗi mới với lỗi có sẵn.

Playwright kiểm tra cả `/` và `/home`; thử chuyển sang `/login`; đo computed style cho Arial và CTA; kiểm tra menu, keyboard/focus, reduced motion và ảnh được tải. Kiểm tra chiều rộng 320, 390, 768, 1023, 1024, 1440 và 1920px. Đo kích thước ảnh hero và CLS trên bản production đã build, ghi rõ profile thiết bị/network; không dùng thời gian compile dev để kết luận hiệu năng.

## Checklist triển khai

- [x] Phase 01 — nền presentation, typography và ActionButton
- [x] Phase 02 — public header, menu mobile và liên kết
- [x] Phase 03 — hero, các section chính, liên hệ và footer
- [x] Phase 04 — browser, accessibility, responsive, performance và hồi quy
- [ ] Phase 05 — ảnh dashboard P2; chỉ thực hiện khi có asset được xác minh

## Rủi ro và quyết định triển khai

1. **ActionButton không nhận CSS scoped trên thẻ Link.** Styled JSX tạo selector có scope, nhưng class đặt trên Next Link không nhận scope class đó. Module CSS phải gắn class đã map trực tiếp lên Link; browser cần xác nhận nền, padding, min-height và focus.
2. **Style Home hiện là chuỗi CSS global.** Nhiều selector tác động `body`, `a`, `button` và class chung. Khi chuyển sang Home CSS Module, giữ các hook con dưới class root Home bằng selector giới hạn có chủ đích; không bỏ style của BrandLogo hoặc SectionHeading.
3. **Header sticky và hash anchor.** Cần bù chiều cao header bằng `scroll-margin-top`, để nhấp CTA không che tiêu đề. Login phải nhìn thấy ở 390px.
4. **Menu công khai khác menu role.** Người dùng đã chọn menu gọn dạng modeless disclosure dưới header; không tái dùng MobileNavigation của dashboard vì component kia phụ thuộc route/role/logout và xử lý pathname, không phù hợp hash navigation. Không tạo focus trap hoặc khai báo modal giả.
5. **Thông tin liên hệ.** Người dùng xác nhận giữ email `hello@dolorescoffee.vn`, số `1800 1234` và địa chỉ TP. Hồ Chí Minh hiện tại để công khai.
6. **Cách trình bày thương hiệu.** Ban đầu người dùng chọn giữ asset logo DOLORES COFFEE hiện có; sau đó chốt lockup landing gồm biểu tượng từ `logo-converted-edited.svg` cạnh wordmark `dolores.` màu đỏ, không có dòng `COFFEE`.
7. **Playwright E2E.** Repo chưa có cấu hình Playwright. Phase 01 thêm package, script, cấu hình và cài Chromium; dùng port riêng cho webServer để không tranh cổng với dev server đang chạy.
8. **Ảnh hero nặng.** PNG gốc khoảng 1.35 MB. Dùng Next Image với responsive sizing/format được cấu hình; đo byte thực tế được truyền. Nếu chưa đạt ≤250 KB, cần tối ưu nguồn/định dạng và kiểm tra chất lượng trước khi chốt.
9. **Test lịch sử.** Không giả định số lỗi cũ còn đúng. Thu baseline mới trong lúc triển khai, không gán lỗi của landing cho module không liên quan khi chưa có bằng chứng.
10. **Screenshot P2 chưa có nguồn.** MVP mô tả nền tảng bằng chữ, không render khung giả; Phase 05 để deferred nếu chưa có screenshot thật đã làm sạch.

## Handoff

Lệnh bắt đầu triển khai theo kế hoạch đã chốt: `cook --hard plans/landing-page-redesign/plan.md`.
## Session Notes

- Phase 01, Phase 02, Phase 03, and Phase 04 implementation/validation are complete. The user approved the Phase 04 results on 2026-10-28; MVP is complete. Optional Phase 05 remains deferred until an authentic, verified dashboard screenshot is supplied.
- Baseline was captured before CSS changes at 1440x900 and 390x844. The primary CTA changed from 20px high with transparent background and zero padding to 48px high, Dolores red, and 10px radius. Final computed typography is Arial at body, h1, and h2 in both viewports.
- Verification: Node component contract tests 3/3; Playwright Chromium smoke and computed-style test 1/1 using an isolated Next dev server on port 3100; ESLint passes. Chromium was installed with npx.cmd playwright install chromium.
- The TypeScript check is blocked by errors outside the landing changes: a stale generated route reference in .next/types/validator.ts and missing Moderator message keys LOADING_REPAIR_CASES and TECHNICAL_LAST_ACTOR in technical-screen.tsx. The Next dev server compiled the changed Home and component code for the passing E2E.
- The E2E server uses .next-playwright so it can run while the existing local app stays on port 3000. No commit or push was performed.
- Phase 02 implementation: extracted the public header into `src/pages/home/home-header.tsx`, made it sticky with a light surface, retained a visible `/login` link on mobile, and added an accessible modeless disclosure that closes on navigation, Escape (returning focus), or resize to 1024px. Public navigation now has the three supported section links, footer discovery points only to rendered content, and fragment targets account for the sticky header.
- Phase 02 verification: `node --test tests/landing-page.test.cjs` passed 3/3; `npm.cmd run test:e2e -- --project=chromium` passed 4/4; `npm.cmd run lint` passed; `git diff --check` passed with line-ending warnings only. Browser checks at 390, 1023, 1024, and 1440px confirmed sticky position, responsive nav mode, visible mobile login, 44×44px toggle, and no horizontal overflow. E2E printed Next Image sizing warnings from legacy content that is scheduled for Phase 03.
- TypeScript remains blocked by three unrelated errors: `.next/types/validator.ts` references a missing generated Technician route, and `src/pages/moderator/technical/technical-screen.tsx` references missing `LOADING_REPAIR_CASES` and `TECHNICAL_LAST_ACTOR` message keys. No TypeScript error points to Phase 02 or Phase 03 files.
- Phase 03 red test evidence: expanded Chromium E2E to require the approved hero headline and real machine/platform content; the focused run failed against the old headline as expected. Baseline screenshot at 1440×960 is saved to the local temp directory.
- Phase 03 implementation: moved the single transparent coffee machine image into the hero; added the approved one-H1 message, two correct anchor CTAs, real text descriptions for machine/contracts/invoices/support, and a compact three-step service section. Removed rendered sample testimonials/news, stock image requests, mock stats, and decorative backgrounds. Kept confirmed contact details, DOLORES COFFEE logo, and a light palette.
- Phase 03 verification: `node --test tests/landing-page.test.cjs` passed 3/3; Playwright Chromium E2E passed 5/5; ESLint passed; `git diff --check` passed with line-ending warnings only. Browser inspection at 1440, 390, and 320px confirmed two H1 lines at desktop/mobile 390, one machine image, visible non-overlapping CTAs, and no horizontal overflow. The local Next dev optimizer served the machine image at about 30 KB desktop and 13 KB mobile; this is not a production performance measurement. E2E made no stock/background image requests and emitted no image sizing warnings.
- Phase 03 was approved by the user on 2026-10-28. Phase 04 was approved by the user on 2026-10-28 and the MVP is complete. The local project at port 3000 is still running; E2E used and stopped its isolated server. No commit or push was performed.
- Phase 04 verification: focused Node contracts passed 3/3; landing Chromium E2E passed 9/9 with two workers; ESLint and `git diff --check` passed. Browser coverage includes `/`, `/home`, `/login`, back navigation, the 320/390/768/1023/1024/1440/1920px viewport matrix, keyboard order, mobile disclosure, Escape/focus return, reduced motion, hash offset, Arial/no external fonts, representative text contrast, CTA styling and touch sizes. Playwright E2E at two workers completed without the transient Windows manifest rename warning seen in an earlier higher-concurrency run.
- Phase 04 production measurement: an isolated copy built successfully with Next TypeScript validation skipped in that copy only; the local source and config were not changed for the bypass. Headless Chromium production profile at 1440×900 and 390×844 measured hero AVIF payloads of 30,063 bytes and 13,121 bytes, with CLS 0.0424 and 0.0122. Both are below the 250 KB and 0.1 targets. Before/after screenshots were reviewed at both sizes. The normal workspace TypeScript check reports the stale generated `.next/types/validator.ts` Technician route and two missing Moderator message keys; a clean copy removes the stale-route error but still reports the Moderator keys. No error points to landing files. No auth or role shell was changed in Phase 04.
- Phase 04 was approved by the user on 2026-10-28; MVP is complete. Optional Phase 05 remains deferred until an authentic, verified dashboard screenshot is supplied. The production validation copy was removed. The local project at port 3000 remains running; ports 3100 and 3200 are stopped. No commit or push was performed.
- After MVP approval, the user requested another UX/UI review and subtle interaction motion. The latest logo lockup places the mark from `logo-converted-edited.svg` beside the red `dolores.` wordmark in the landing header/footer, without the `COFFEE` tagline. The mobile disclosure animates, dismisses on Escape/outside pointer and stays inaccessible to keyboard while closed; links and CTAs have brief hover/press feedback with reduced-motion support. The logo lifts/scales slightly on pointer hover without color/background changes. A centered Dolores intro covers the landing with a white background for 1.4 seconds before fading away, with a CSS fallback and reduced-motion support. User said the dashboard screenshot will be added later, so optional Phase 05 remains deferred.
- Post-approval browser audit found the existing hierarchy and responsive content clear, with the machine product image still the main visual focus. The supplied square lockup needed a mark crop for the horizontal header; the mobile menu was the most abrupt interaction. Manual Chromium inspection after polish: no overflow at 320/390/768/1023/1024/1440px, menu transition rendered and closed on Escape/outside pointer, focus returned to the trigger, reduced-motion transition was 0s, and there were no browser console errors. ESLint passed; no automated test suite was added or run for this follow-up.
- Intro/hover verification: Chromium showed the centered lockup on white for about 1.4 seconds, then exposed the landing and restored body scrolling. Reduced-motion mode skips the intro. With JavaScript disabled, CSS hides the splash and reveals the page after the same interval. Logo hover changes only transform (no text color or background change). ESLint and `git diff --check` passed. TypeScript still reports only the three pre-existing errors recorded above; none point to the landing changes.
