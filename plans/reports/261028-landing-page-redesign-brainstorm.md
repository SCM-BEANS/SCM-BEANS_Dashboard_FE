# Brainstorm: Landing Dolores ít màu, đồng bộ app

**Date:** 2026-10-28
**Spec:** `plans/landing-page-redesign/spec.md`
**Project root:** `E:/Đồ án/SCM-BEANS_Dashboard_FE` (git root; không tìm thấy marker `.skills.json` trong dự án).
**Status:** Hướng thiết kế sẵn sàng cho bước `plan`; chưa viết code triển khai.

## Challenge

Người dùng đánh giá landing hiện tại màu mè và rối mắt. Yêu cầu rà font trong toàn bộ `src`, tham khảo component CAYE và giữ nhận diện từ Figma cùng code Dolores hiện tại trước khi thay đổi landing.

## Font Audit

Đã rà 176 file trong `src`, gồm 169 file văn bản của các loại mã/style. Tìm cả khai báo family, shorthand font, class utility, loader, file font và tham chiếu font trong canvas/3D.

| Vị trí | Family trong source | Bằng chứng |
| --- | --- | --- |
| Cấu hình body Home | `Arial, Helvetica, sans-serif` | `src/text/typography.ts:3`; dùng tại `src/pages/home/index.page.tsx:42` |
| H1/H2/H3 display, metric, quote và CTA heading Home | `Georgia, 'Times New Roman', serif` | `src/text/typography.ts:4`; Home lines 66, 75, 84, 104, 115, 130 |
| Login | `Arial, Helvetica, sans-serif` | `src/pages/auth/login/login-page.tsx:609` |
| Chữ splash đăng nhập | `Arial, Helvetica, sans-serif` qua shorthand | `src/pages/auth/login/liquid-success-splash.module.css:52` |
| Admin | `Arial, sans-serif` | `src/pages/admin/admin-shell.module.css:8`; access screen line 113 |
| Customer | `Arial, sans-serif` | `src/pages/dashboard/customer-shell.module.css:8` |
| Moderator | `Arial, sans-serif` | `src/pages/moderator/moderator-shell.module.css:8`; access screen line 64 |
| Technician | `Arial, sans-serif` | `src/pages/technician/technician-shell.module.css:8` |
| Mã kỹ thuật Moderator | `ui-monospace, SFMono-Regular, Consolas, monospace` | `src/pages/moderator/moderator-shell.module.css:62` |
| Nút/component dùng chung | Chủ yếu `font: inherit` hoặc kế thừa family từ container | `src/components/button/action-button.tsx:42`, CSS sidebar/button/dialog |

### Nạp font và cấu hình không còn khớp

- Không tìm thấy file `.woff`, `.woff2`, `.ttf`, `.otf`, `.eot` trong `src`.
- Không tìm thấy `next/font`, `@font-face`, Google Fonts URL hoặc class family `font-sans`, `font-serif`, `font-mono` trong các file đã rà.
- `tailwind.config.ts:56–58` còn tham chiếu `--font-hanken` và `--font-playfair`; không thấy định nghĩa/loader cho hai biến trong source. Đây là cấu hình cũ, không phải bằng chứng Hanken/Playfair đang được dùng ở UI hiện tại.
- Inter là font được thấy trong Figma đã đọc, không phải font đang được nạp trong source app.
- `TYPOGRAPHY_STYLES` hiện chỉ được Home import. Login và shell các role hardcode family riêng; `_app.page.tsx` không nạp một cấu hình font toàn app.

### Xác nhận trong browser

Ngày 2026-10-28, đọc computed style tại `http://127.0.0.1:3000/` và `/login`:

| Phần tử | Family | Size tại viewport kiểm tra |
| --- | --- | --- |
| Home body/copy | Arial, Helvetica, sans-serif | 16px |
| Home nav | Arial, Helvetica, sans-serif | 13px |
| Home hero h1 | Georgia, Times New Roman, serif | 78px |
| Home section h2 | Georgia, Times New Roman, serif | 54px |
| Login container/input/nút | Arial, Helvetica, sans-serif | 16px |
| Login h1 | Arial, Helvetica, sans-serif | 28px |
| Login wordmark | Arial, Helvetica, sans-serif | 32px |
| Login body bên ngoài container | Times New Roman, fallback trình duyệt | 16px |

Computed style chứng minh stack được áp vào phần tử; không phải phép phân tích font cho từng glyph. Nội dung login vẫn là Arial nhờ container; fallback ở body cho thấy font chưa được tập trung tại root.

## Ideas Explored

1. **Máy pha + nền tảng quản lý:** hero giới thiệu máy; khối nền tảng giải thích vận hành tiếp theo. Kết nối phần cứng và phần mềm trong cùng câu chuyện. Đây là hướng đã chọn.
2. **Ưu tiên thiết bị:** máy/model và tư vấn thuê làm trọng tâm. Hợp với lead bán hàng nhưng phần mềm dễ trở thành nội dung phụ.
3. **Ưu tiên phần mềm:** dashboard làm hình chính, nhấn theo dõi thiết bị. Giúp nói rõ công cụ nhưng có thể làm khách mới khó nhận ra sản phẩm máy pha.
4. **Ưu tiên dịch vụ:** triển khai, bảo trì, hỗ trợ làm trọng tâm. Cần ảnh và bằng chứng thực tế phù hợp; bộ ảnh hiện tại chưa đáp ứng.

### Typography Alternatives

- **Arial cho landing:** đồng bộ với login và bốn role đang chạy; bỏ Georgia khỏi Home, không thêm loader. Người dùng đã chọn phương án này.
- **Inter toàn web:** khớp typography Figma nhưng phạm vi lan sang login, bốn role và splash; cần migration font chung. Không thuộc đợt landing hiện tại.

### Nội dung mẫu

- Đã đưa ra ba cách: tạm ẩn tin tức/đánh giá và menu; thay bằng tình huống sử dụng ngắn; hoặc giữ để bổ sung nội dung thật trước phát hành.
- Người dùng chọn tạm ẩn cả hai section và rút mục menu tương ứng.

## User's Direction

- “landing ít màu, tham khảo cách trưng bày của CAYE và giữ nhận diện Dolores”.
- Chọn **“Máy pha + nền tảng quản lý”**.
- Chọn **“Arial cho landing, đồng bộ với app đang chạy”**.
- Chọn **“Tạm ẩn cả hai phần và rút các mục menu tương ứng”** đối với tin tức/đánh giá mẫu.

## Proposed Design

- Hero: “Máy pha thông minh. Quản lý cùng Dolores.”, ảnh máy tách nền trên nền sáng, mô tả ngắn và CTA rõ.
- CTA khám phá tới phần giải pháp; CTA nền tảng tới phần công nghệ; Đăng nhập ở header tới `/login`.
- Học CAYE ở tỷ lệ hình và trọng tâm từng khối; áp dụng palette Dolores đã xác nhận trong Figma: đỏ `#b81724`, nền `#f8f6f3`, chữ `#302927`/`#706561`, viền `#e9e2dc`.
- Nút cao 48px, bo 10px; Arial cho toàn bộ chữ landing. Hero nhỏ hơn mức 78px hiện tại, hạn chế ngắt dòng và cạnh tranh với hình máy.
- Gỡ hai background hero đỏ, ảnh người/mèo và ba ảnh tin tức. Thay cách trình bày cảnh điện thoại bằng nội dung nền tảng rõ; screenshot thật là P2 khi có asset phù hợp.
- Giảm vòng tròn, grid, badge 360°, sao đánh giá, nhãn chữ hoa nhỏ và các lần đổi nền tối/sáng mạnh.
- Section riêng ở `pages/home`; dùng lại component nút/logo/heading phù hợp. Nội dung, ảnh và route giữ đúng lớp hiện tại.

## Verification Notes For Planning

- CTA chính hiện có class `action-button--primary` nhưng browser áp nền trong suốt, padding 0, min-height auto, chiều cao khoảng 20px. Cần sửa style và kiểm tra đủ variant trong bước triển khai.
- Chỉ thay family trong `typography.ts` không xử lý được nhịp chữ, nhãn/CTA, ảnh và các lớp trang trí. Plan cần bao quát composition và style đang render.
- Không dùng kết quả `rg` chứa “Inter” trong `interface`/`interceptors` làm bằng chứng font. Audit đã tìm theo khai báo và tên font đầy đủ.
- Đây là kiểm tra source và computed style Home/login. Không tuyên bố đã kiểm tra trực quan phiên đăng nhập của cả bốn role.

## Open Questions

Không còn câu hỏi chặn `plan`. Nguồn screenshot nền tảng được xử lý như phụ thuộc P2; MVP có nội dung nền tảng đầy đủ mà không cần ảnh chưa xác thực.

## Risks

1. Phạm vi CSS `ActionButton` và kế thừa font không tập trung có thể gây sai khác giữa source và render; kiểm tra browser phải là gate triển khai.
2. Rút section phải dọn liên kết tương ứng ở cả header/footer để không tạo anchor chết.
3. Hình dashboard và nội dung tiếp thị cần đúng nguồn thực tế; tránh diễn đạt các khả năng API chưa xác nhận hoặc dùng dữ liệu mẫu như bằng chứng khách hàng.

## Handoff

Spec sẵn sàng tại `plans/landing-page-redesign/spec.md`. Bước tiếp theo là `plan` để chia phase, xác định file tạo/sửa, phụ thuộc và tiêu chí kiểm tra; sau đó mới `cook` triển khai. Bước plan phải báo chi tiết từng phase trong chat theo workflow.
