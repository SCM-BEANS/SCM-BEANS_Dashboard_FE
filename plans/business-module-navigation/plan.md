# Kế hoạch: Điều hướng theo module nghiệp vụ

Mode: --hard (tự chọn vì thay đổi trải trên bốn role shell và điều hướng dùng chung)
Risk: normal — thay đổi cấu trúc điều hướng nhiều file; không đổi API, quyền truy cập, dữ liệu nghiệp vụ hoặc URL.

## Trạng thái hiện tại

Ngày 2026-11-05, theo yêu cầu người dùng, code triển khai của cả ba phase đã được hoàn tác về trạng thái trước brainstorm. Các kết quả kiểm tra dưới đây là lịch sử của phiên bản đã hoàn tác; hiện tại điều hướng theo module chưa được triển khai. Spec và kế hoạch vẫn được giữ làm tài liệu đề xuất.

## Thử thách phạm vi

- **Đã có:** Bốn role có menu riêng, sidebar desktop và drawer mobile dùng chung `SidebarNavigation`; Admin/Moderator đã có breadcrumb dùng chung. Chưa có nhóm module và breadcrumb ba cấp dùng cho cả bốn role.
- **Tối thiểu đáp ứng:** Gắn metadata module vào các menu route hiện có, render nhóm trong component điều hướng dùng chung, và bổ sung module vào breadcrumb hiện có. Không tạo page hoặc route mới.
- **Độ phức tạp:** Hard — dữ liệu menu được chuyển qua các adapter khác nhau và bốn role có cách hiển thị header khác nhau.

## Kiểm tra chất lượng spec

**Verdict: PASS.** Spec có user stories ưu tiên, ánh xạ route theo role, tiêu chí kiểm tra tải trực tiếp/điều hướng, và xác định rõ các route cùng API nằm ngoài phạm vi.

## Nghiên cứu phương án

Năng lực researcher/planner/plan-reviewer không được cung cấp dưới dạng agent con trong phiên Codex này, nên các vai trò được thực hiện inline theo quy trình skill.

### Researcher A — Metadata gắn vào menu route hiện tại (đề xuất)

Thêm trường module tùy chọn vào từng item trong `src/routes/routes.ts`, chuyển trường đó qua các adapter của từng role, rồi để `SidebarNavigation` hiển thị các item thành nhóm. Breadcrumb lấy active item từ `getActiveNavigationItem`, vốn đã xử lý query/hash, dấu `/` cuối và route detail lồng sâu.

**Kết quả:** Một nguồn dữ liệu duy nhất cho liên kết, nhóm và breadcrumb; giữ nguyên URL và tận dụng component desktop/mobile dùng chung.

### Researcher B — Tự suy ra module trong từng role shell

Giữ các menu phẳng và tạo các bảng prefix/path riêng trong mỗi shell hoặc một resolver độc lập chỉ phục vụ breadcrumb.

**Kết quả:** Ít thay đổi dữ liệu menu ban đầu, nhưng tạo thêm một nguồn ánh xạ route phải đồng bộ với menu; có nguy cơ route detail và mục active chỉ ra module khác nhau giữa desktop, mobile và breadcrumb. Không chọn.

### Red-team review inline

- Dùng matcher hiện có để xác định active route, tránh tự viết luật prefix thứ hai.
- Đưa cả desktop và mobile qua cùng `SidebarNavigation`; không tạo hai cách nhóm riêng.
- Route Technician “Việc được giao” có nhiều loại việc nên không ép toàn bộ vào module bảo trì.
- Lưu ý workspace đang có thay đổi chưa commit trong `routes.ts`, các role shell, component menu và `feature_list.json`; khi cook cần giữ nguyên những thay đổi đó và sửa có chọn lọc.
- Người dùng đã xác nhận menu Admin chỉ hiển thị một entry Hóa đơn; giữ nguyên href/chức năng và bỏ entry trùng khỏi danh sách render.

## Mục tiêu và giới hạn

Triển khai hai ý đã chốt: nhóm menu theo module nghiệp vụ và cho biết module trên breadcrumb. Người dùng tiếp tục dùng các URL, trang, API và quyền hiện tại. Tên nhóm là tiêu đề mở/thu gọn, không điều hướng. Mục con mới điều hướng.

Không đổi route sang `/operations/...` hoặc `/maintenance/...`; không tạo trang tổng quan module; không tách màn hình kỹ thuật thành Bảo trì/Sửa chữa; không thay API, role guard, logout hoặc logic màn hình nghiệp vụ.

## Ánh xạ chức năng theo role

| Role | Vận hành | Bảo trì & Kho máy | Giữ ngoài nhóm |
|---|---|---|---|
| Admin | Hợp đồng, Hóa đơn, Giám sát Smart IoT | Yêu cầu kỹ thuật, Máy & tồn kho | Tổng quan, tài khoản, cửa hàng/doanh nghiệp, menu, thu mua, báo cáo, thông báo và mục hiện có khác |
| Moderator | Hợp đồng, Hóa đơn, Giám sát Smart IoT | Yêu cầu kỹ thuật, Máy & tồn kho | Tổng quan, khách hàng, gói cà phê, địa điểm, menu, lịch sử máy, thu mua, thông báo và mục hiện có khác |
| Owner (Dashboard) | Hợp đồng, Hóa đơn, Máy của tôi | Lịch bảo trì, Yêu cầu hỗ trợ | Tổng quan, địa điểm, menu, gói cà phê, thu hồi, thu mua, thông báo và mục hiện có khác |
| Technician | Không có route hiện tại được xếp vào nhóm | Kiểm tra máy, Lịch sử máy | Việc được giao, thu hồi, đánh giá thu mua và thông báo |

Admin/Moderator tiếp tục dùng entry “Yêu cầu kỹ thuật” hiện tại cho các luồng kỹ thuật đang có; không tạo liên kết riêng giả cho bảo trì hoặc sửa chữa. Các nhóm không có entry sẽ không xuất hiện.

## Phase và phụ thuộc

| ID phase | File | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| `phase-01-route-map-and-module-metadata` | `phase-01-route-map-and-module-metadata.md` | Chuẩn hóa module metadata trên route menu hiện có và bảo toàn URL/label/quyền. | Không |
| `phase-02-grouped-role-navigation` | `phase-02-grouped-role-navigation.md` | Hiển thị các nhóm bằng một component cho sidebar desktop và drawer mobile ở cả bốn role. | Phase 01 |
| `phase-03-module-breadcrumbs-and-validation` | `phase-03-module-breadcrumbs-and-validation.md` | Dùng metadata route để hiển thị breadcrumb Role / Module / Trang và kiểm tra điều hướng. | Phase 01 và 02 |

Thực hiện tuần tự để dữ liệu route ổn định trước khi chuyển giao diện và breadcrumb.

## Checklist triển khai

- [ ] Phase 01 — route map và module metadata
- [ ] Phase 02 — điều hướng nhóm theo role
- [ ] Phase 03 — breadcrumb module và kiểm tra thủ công

## Tiêu chí hoàn tất

- Các `href` hiện có không đổi; không thêm URL, API hoặc quyền truy cập.
- Bốn role lấy nhóm module từ cùng metadata menu; sidebar desktop và drawer mobile có cùng nội dung.
- Nhóm active tự mở khi tải route con; item cha vẫn active ở route detail lồng sâu.
- Breadcrumb cho trang thuộc module có dạng `Role / Module / Mục điều hướng` ở desktop và mobile. Trang ngoài hai nhóm tiếp tục hiện breadcrumb hiện tại.
- Không có nhóm rỗng, liên kết giả hoặc liên kết cùng href bị lặp trong nhóm.
- Tải trực tiếp, refresh, Back/Forward và query string không làm sai mục active hoặc module.
- Ở 360, 768, 1023 và 1024px, drawer/sidebar vẫn cuộn được và nút đăng xuất vẫn dùng được.
- Các mục ngoài hai module giữ nguyên route, quyền và thứ tự tương đối.

## Kiểm tra trong lúc triển khai

Phase 01 đã thêm metadata module vào các liên kết điều hướng hiện có, chuyển metadata qua adapter sidebar của bốn role và bỏ mục Hóa đơn Admin bị trùng. Không đổi URL, API, guard hoặc hành vi màn hình. Kiểm tra phase này dùng bộ test điều hướng hiện có, lint, TypeScript và kiểm tra diff; giao diện nhóm và breadcrumb vẫn chờ các phase tiếp theo.

Phase 02 đã cập nhật `SidebarNavigation` để nhóm các route theo metadata thành “Vận hành” và “Bảo trì & Kho máy” trên sidebar desktop lẫn drawer mobile. Nhóm có route hiện tại tự mở, có thể thu gọn bằng chuột hoặc bàn phím; route ngoài nhóm vẫn độc lập và giữ thứ tự tương đối. Không đổi URL, API, quyền, shell hay xử lý logout. Kiểm tra: hai bộ test điều hướng (17/17), lint (0 lỗi, 3 cảnh báo có sẵn), TypeScript và `git diff --check` đều đạt. Chưa chạy kiểm tra giao diện thủ công ở browser; cần review Phase 02 trước khi bắt đầu Phase 03.

Phase 03 đã dùng kết quả match route nhiều phần nhất để hiển thị breadcrumb `Vai trò / Module / Mục điều hướng` cho Admin, Moderator, Owner và Technician ở desktop lẫn mobile. Query/hash và route chi tiết vẫn lấy nhãn module từ item cha khớp cụ thể nhất; route không thuộc module không nhận nhãn module. Kiểm tra: hai bộ test điều hướng (19/19), lint (0 lỗi, 3 cảnh báo có sẵn), TypeScript và `git diff --check` đều đạt. Inline review xác nhận không thêm URL/API hoặc đổi quyền. Chưa xác minh trực tiếp trên browser: CUA báo browser access host không khả dụng, nên các thao tác tải trực tiếp, refresh, Back/Forward và viewport 360/768/1023/1024 còn chờ kiểm tra thủ công.

## Quyết định đã chốt

Ngày 2026-11-05, người dùng xác nhận:

1. Menu Admin chỉ hiển thị một mục “Hóa đơn”; route và chức năng hiện tại được giữ nguyên.
2. “Việc được giao” của Technician đứng riêng; “Kiểm tra máy” và “Lịch sử máy” thuộc Bảo trì & Kho máy.
3. “Máy của tôi” của Owner thuộc Vận hành.

## Session Notes

- 2026-11-05 — Phase 01 hoàn tất: route mapping và SidebarItem metadata đã được cập nhật cho Admin, Moderator, Owner và Technician. Admin chỉ còn một mục Hóa đơn. Kiểm tra: `node --test tests/shared-role-navigation-cross-role.test.cjs` (7/7), `npm.cmd run lint` (0 lỗi, 3 cảnh báo có sẵn ở các màn khác), `npx.cmd tsc --noEmit --incremental false` (pass), `git diff --check` (pass). Inline review không phát hiện thay đổi ngoài phạm vi Phase 01.
- 2026-11-05 — Phase 02 hoàn tất: sidebar desktop và drawer mobile dùng cùng `SidebarNavigation`, render các nhóm dựa trên module metadata, tự mở nhóm có route active và giữ link con hiện tại. Kiểm tra: hai bộ test điều hướng (17/17), lint (0 lỗi, 3 cảnh báo có sẵn), TypeScript và `git diff --check` đều đạt. Inline review không phát hiện thay đổi route/API/quyền ngoài phạm vi. Kiểm tra giao diện thủ công trên browser còn chờ. Dừng tại review gate `cook --hard`; chờ người dùng duyệt trước Phase 03.
- 2026-11-05 — Phase 03 hoàn tất phần code và kiểm tra tự động: breadcrumb module dùng chung ở header desktop/mobile cho cả bốn role; nested detail dùng route cha khớp cụ thể nhất. Điều hướng tests 19/19, lint (0 lỗi, 3 cảnh báo có sẵn), TypeScript và `git diff --check` đạt. Browser walkthrough chưa xác minh vì browser access host không khả dụng; feature status là `passing-unverified`. Inline review không thấy thay đổi API/quyền hoặc route URL. Dừng tại review gate `cook --hard` để người dùng xem xét Phase 03.
- 2026-11-05 — Người dùng duyệt Phase 03; đóng đợt triển khai. Giữ `passing-unverified` trong feature tracker vì browser walkthrough chưa chạy được.
- 2026-11-05 — Người dùng yêu cầu hoàn tác code về trước brainstorm. Đã gỡ phần module metadata, nhóm điều hướng desktop/mobile, breadcrumb module và các test riêng của thay đổi này; giữ nguyên các sửa đổi code không liên quan. Các phase được đánh dấu chưa triển khai; kết quả test phía trên chỉ mô tả phiên bản đã bị hoàn tác.

## Handoff

Code triển khai ba phase đã được hoàn tác theo yêu cầu ngày 2026-11-05. Điều hướng theo module hiện chưa có trong working tree. Spec, kế hoạch và báo cáo brainstorm vẫn được giữ để tham khảo nếu muốn triển khai lại sau này.
