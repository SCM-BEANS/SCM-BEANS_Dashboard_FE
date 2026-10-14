# Báo cáo triển khai mobile Dolores — 2026-10-08

Phạm vi của đợt này là triển khai nền giao diện mobile cho bốn vai trò và sửa riêng popup hợp đồng C-205 theo quyết định Q05. Đây là **bản triển khai một phần, chưa nghiệm thu UX/UI**: Figma đã được đối chiếu với bốn màn hình bắt đầu và popup M40, nhưng không có browser surface để mở ứng dụng localhost và so sánh ảnh thực tế.

## Phạm vi và quyết định

- Mobile dưới 1024 CSS px; PC từ 1024 px và landing page giữ ngoài phạm vi.
- Dữ liệu và luồng hiện có được mô phỏng trong frontend; không thêm API thật.
- Figma nguồn: Admin `88:134`, Moderator `90:19060`, Technician `89:19705`, Customer `90:24427`; action menu M40 `90:22957`; preview M40 `90:22977`.
- Q05 cho phép sửa nội dung **popup mobile** từ C-204 thành C-205. Q06 loại hai panel Customer cũ `115:22640`, `115:22696` khỏi phạm vi triển khai; inventory vẫn giữ chúng.
- Không sửa Figma, không commit, push hay deploy.

## Tiến độ theo vai trò

| Vai trò | Frame được duyệt trong inventory | Đã viết cho mobile trong đợt này | Kiểm thử ứng dụng |
| --- | ---: | --- | --- |
| Admin | 97 | Nền shell và bố cục tổng quan A01 | NOT_RUN |
| Moderator | 204 | Nền shell, biểu đồ M01 và trang/popup mobile C-205 theo Q05 | NOT_RUN |
| Technician | 50 | Nền shell, danh sách và bộ lọc T01 | NOT_RUN |
| Customer | 190 | Nền shell, KPI và biểu đồ C01 | NOT_RUN |
| **Tổng** | **541** | Chưa hoàn tất các hành trình/trạng thái còn lại | Chưa frame nào được xác nhận bằng browser |

541 là số frame hiện hành sau Q06; đây không phải số test đã chạy. Việc khung mobile được áp dụng cho nhiều route hiện có không chứng minh mọi frame, overlay, biến thể hay luồng đã khớp Figma. Các inventory vẫn để trạng thái ban đầu cho tới khi có kiểm thử theo từng frame.

## Findings

| ID | Mức | Loại | Bằng chứng và tác động | Xử lý / trạng thái |
| --- | --- | --- | --- | --- |
| F-M40-01 | High | Lỗi nội dung Figma | M40 `90:22920` là hợp đồng C-205/C-031, nhưng preview `90:22977` ghi “Hồ sơ hợp đồng C-204” và `C-204-signed.pdf`. Khách có thể đối chiếu nhầm tài liệu. | Người dùng đã duyệt Q05: đổi popup mobile thành C-205 và `C-205-signed.pdf`. Đã áp dụng ở mobile; **Figma vẫn chưa được sửa**. Đề xuất sửa title và tên file trong `90:22977`. PC giữ kết quả route cũ. |
| I-M40-02 | Medium | Lỗi triển khai phát hiện khi đối chiếu | Action menu `90:22957` có hai hàng viền trắng: “Xem bản ký”, “Bàn giao máy thường”. Bản dựng ban đầu bị lặp “Xem bản ký” và ẩn hàng này trong menu. | Đã bỏ mục trùng và giữ đủ hai lựa chọn đúng style trong menu. Cần browser kiểm tra lại vì không có browser surface. |
| I-M01-03 | Medium | Lỗi bố cục phát hiện khi đối chiếu | M01 có tám tháng trong biểu đồ; selector mobile trước đó tạo sáu cột khiến hai tháng có thể xuống hàng. | Đã sửa thành tám cột và giữ chiều cao biểu đồ theo frame. Cần browser kiểm tra lại. |

## Kiểm tra đã chạy

- `npm run lint` — PASS, 0 lỗi; có một warning sẵn có tại `src/components/mfa/MfaSetupForm.tsx:154` về `<img>`.
- `npx tsc --noEmit` — PASS.
- `npm run build` — PASS.
- Figma `get_design_context` đã đọc bốn màn hình bắt đầu, action menu `90:22957` và preview `90:22977`. Đây là kiểm tra **nguồn thiết kế**, không phải kiểm tra ứng dụng.

## Chưa chạy / bị chặn

- Kiểm tra ảnh và tương tác ở 390×844, các viewport 320–1023, và ranh giới 1024 — BLOCKED. CUA trả về không có app/browser (`apps: []`, `browsers: []`); do đó không chụp được màn hình localhost. Dev server đã khởi động thành công tại `http://localhost:3000` rồi được dừng lại.
- So sánh PC ở 1024/1280/1440 và landing/public pages — NOT_RUN. Mã CSS mobile nằm trong media query dưới 1024px; hành vi chọn menu desktop đã được giữ theo logic gốc, và route fallback desktop của C-205 vẫn là kết quả cũ, nhưng chưa có ảnh để xác nhận.
- Luồng nhập liệu, bàn giao, đối soát, thông báo, focus/keyboard, safe-area và regression tenant/role — NOT_RUN.
- Không có ảnh screenshot ứng dụng hoặc log browser để đính kèm.

## Thay đổi chính

- [DoloresShell.tsx](../src/components/dolores/DoloresShell.tsx) và [DoloresShell.module.css](../src/components/dolores/DoloresShell.module.css): shell mobile riêng dưới breakpoint; header, bottom nav, overlay “Khác”, action dock/menu, bố cục form, bảng và dialog theo mobile. CSS được scope bằng CSS module.
- [DoloresUI.tsx](../src/components/dolores/DoloresUI.tsx): thêm dấu nhãn cột cho card bảng và marker cho KPI/field để áp dụng responsive.
- [DoloresOverviewPages.tsx](../src/components/dolores/DoloresOverviewPages.tsx), [ModeratorDashboardScreens.tsx](../src/components/dolores/ModeratorDashboardScreens.tsx), [TechnicianDashboardScreens.tsx](../src/components/dolores/TechnicianDashboardScreens.tsx): đánh dấu bố cục mobile cho bốn màn hình bắt đầu, action menu M40 và hành động T01/M01 theo frame.
- [decisions.md](decisions.md) ghi lại các quyết định Q05/Q06 và ranh giới mobile đã được xác nhận.

## Bước tiếp theo

Hoàn thành route/state/edge mapping cho frame trước khi mở rộng từng hành trình; sau đó chạy các package theo thứ tự trong [planMobile.md](planMobile.md). Khi browser surface có sẵn, kiểm tra bốn màn hình bắt đầu, action menu M40, preview C-205, kích thước 1023/1024 và các regression PC/public. Hiện chưa thể kết luận UX/UI mobile đã hoàn tất.
