# Kế hoạch triển khai: Tinh chỉnh UX/UI Admin

Mode: --fast
Risk: normal — đây là polish giao diện nhiều màn hình Admin, không đổi API hoặc nghiệp vụ. Rủi ro tập trung ở component/style/text được tái sử dụng; từng thay đổi được giới hạn bằng class và callsite Admin.

## Scope Challenge

- **Exists?** KPI, trạng thái tải/lỗi, bảng và bộ lọc hiện đã có. Phần cần cải thiện là ngữ cảnh số liệu, cách trình bày một số giá trị và phản hồi giao diện.
- **Minimum?** Chỉnh các trang Admin và stylesheet hiện có; không tạo component, thư mục source, dependency, API hoặc logic nghiệp vụ mới.
- **Complexity?** --fast. Phạm vi đã được brainstorm và đối chiếu code; các thay đổi là trình bày giao diện trong cấu trúc quen thuộc.

## Spec Quality Check

- [x] Không còn mục NEEDS CLARIFICATION; mapping hiện có cho trạng thái Owner và loại máy đã được xác nhận từ code.
- [x] User stories có mức ưu tiên P1/P2.
- [x] Tiêu chí chấp nhận đo được: kỳ số liệu, khác biệt 0/trống, mapping nhãn, viewport 375px và giới hạn transition.

**Verdict: PASS.**

## Nguồn và phạm vi

Spec nguồn: `plans/admin-uxui-polish/spec.md` (Ready, 2026-10-29).

Thực hiện theo thứ tự người dùng đã chốt: (1) số liệu rõ, (2) bảng dễ đọc, (3) animation và phản hồi thao tác. Giữ nền kem, bề mặt trắng, đỏ Dolores, chữ nâu đậm và font Arial. Giữ bố cục chính, API, query, route, handler và logic tính toán.

Kế hoạch chỉ sửa các file source hiện có trong Admin. Không thêm file source, component, test tự động hoặc dependency. Chưa commit/push/deploy.

## Traceability

| Story | Ưu tiên | Phase | Kết quả |
| --- | --- | --- | --- |
| US-01, US-02: số liệu có kỳ và trạng thái dữ liệu dễ phân biệt | P1 | 01 | KPI thể hiện kỳ phù hợp; 0, thiếu dữ liệu, loading và lỗi không nhập nhằng |
| US-03: nhãn bảng dễ hiểu, không lộ mã backend | P1 | 02 | Trạng thái khách hàng dễ đọc ở danh sách/chi tiết; mã chủ sở hữu và loại máy có nhãn tiếng Việt |
| US-04: bảng và thao tác cuối trang dùng được ở màn hẹp | P1 | 02 | Cuộn ngang có dấu hiệu; hàng cuối và phân trang vẫn truy cập được |
| US-05: phản hồi thao tác nhẹ và hỗ trợ reduced motion | P2 | 03 | Hover, pressed, focus rõ nhưng ngắn; tôn trọng cài đặt giảm chuyển động |

## Thứ tự phase

| Phase ID | File | Mục tiêu |
| --- | --- | --- |
| `phase-01-data-clarity` | `plans/admin-uxui-polish/phase-01-data-clarity.md` | Làm rõ kỳ, đơn vị và trạng thái số liệu trên tổng quan |
| `phase-02-table-readability` | `plans/admin-uxui-polish/phase-02-table-readability.md` | Việt hóa giá trị hiển thị và cải thiện khả năng quét/ cuộn bảng |
| `phase-03-interaction-feedback` | `plans/admin-uxui-polish/phase-03-interaction-feedback.md` | Tinh chỉnh phản hồi và chuyển động trong phạm vi Admin |

Thực hiện tuần tự theo ưu tiên đã chốt. Các phase không phụ thuộc kỹ thuật vào output của phase trước; giữ thứ tự để review theo đúng ưu tiên dữ liệu, bảng, rồi phản hồi thao tác.

## Ranh giới ảnh hưởng giữa role

- `DataTable` được dùng bởi Admin, Customer, Technician và Moderator. Chỉ truyền class riêng vào các bảng Admin được chọn, rồi style class đó trong CSS Admin; không đổi `.container`, `.table`, `.operations`, `.moderator`, `.customer` hoặc style nền của DataTable.
- `ButtonBar` và `ActionBar` có stylesheet dùng chung. Không đổi transition, vị trí dock hoặc kích thước mặc định của chúng. Nếu một control Admin cần thêm trạng thái, dùng selector/class thuộc Admin.
- `admin-shell.module.css` chỉ được import trực tiếp trong các màn Admin, nhưng nhiều class như `metricCard`, `metricsGrid`, `operationsGrid` được tái sử dụng giữa overview, máy, IoT và form. Thêm class riêng cho hiệu ứng chỉ thuộc overview/bảng; tránh thay class cơ sở nếu không muốn thay toàn bộ trang Admin dùng nó.
- `ADMIN_OPERATIONS_MESSAGES` được Moderator contract creation dùng. Giữ nguyên các nhãn chung mà luồng đó tiêu thụ, đặc biệt `COMMON`, `CONTRACTS`, `MACHINES.SMART`, `MACHINES.CONVENTIONAL` và `MACHINES.UNCLASSIFIED`. Key `MACHINES.OWNER_ID` hiện chỉ được dùng trong trang máy/IoT Admin, nên có thể Việt hóa riêng mà không đổi nhãn của Moderator.
- Dòng migration notice chỉ được gỡ khỏi nội dung trang tổng quan; giữ nguyên message key đang được Admin menu/sidebar dùng.
- ActionBar trên mobile hiện nằm trong luồng bố cục; nếu xác nhận có vùng bị che, xử lý trong shell Admin. Không thay CSS dock toàn cục.

## Cách kiểm chứng

Không thêm hoặc chạy test tự động trong đợt này. Khi người dùng duyệt implementation, kiểm tra trực quan các màn `/admin`, `/admin/businesses` và `/admin/machines` trên desktop và viewport rộng 375px; đối chiếu loading, dữ liệu trống/lỗi, phân trang, bàn phím và reduced motion. Kiểm tra lại các route Moderator có contract creation sau khi thay text/style có dùng chung. Giữ nguyên hành vi filter, query và gọi API.

## Checklist triển khai

- [x] Phase 01 — ngữ cảnh số liệu và trạng thái dữ liệu
- [x] Phase 02 — nhãn và khả năng đọc bảng
- [x] Phase 03 — chuyển động và phản hồi thao tác

## Rủi ro và quyết định

1. **CSS Admin dùng chung giữa nhiều trang Admin.** Selector sửa class cơ sở có thể làm thay đổi KPI máy, chi tiết máy, IoT hoặc form. Ưu tiên class có tên theo vùng được chỉnh.
2. **CSS bảng/nút/action bar dùng chung giữa role.** Sửa stylesheet component có thể ảnh hưởng hàng loạt. Giữ các mặc định nguyên trạng và dùng lớp Admin tại callsite.
3. **Enum mới từ backend.** Giá trị lạ không được đưa nguyên mã vào giao diện; dùng nhãn dự phòng dễ hiểu, không thay giá trị filter/API.
4. **Định dạng ngày ISO.** Tránh timezone shift đối với date-only string; giữ giá trị không hợp lệ ở trạng thái dự phòng thay vì hiển thị ngày sai.
5. **Kỳ chỉ áp dụng cho một số KPI.** Không gắn kỳ cho chỉ số không có khoảng thời gian tương ứng trong response.

## Handoff

Sau khi review kế hoạch, implementation có thể bắt đầu theo thứ tự `phase-01-data-clarity`, `phase-02-table-readability`, `phase-03-interaction-feedback`. Lệnh handoff: `cook --fast plans/admin-uxui-polish/plan.md`.

## Session Notes
<!-- Updated by cook automatically — do not edit manually -->

**Last active:** 2026-10-29 08:42 UTC
**Phase in progress:** complete
**Status:** All three phases implemented. Source inspection confirms changes stay in Admin callsites/styles and preserve API, route, query, and action behavior. A focused Playwright check confirms the overview daily-cup heading and values are centered at 375px and 1440px on both the isolated E2E server and local app on port 3000; broader phase acceptance remains unverified.

### Decisions made this session
- Date-only API values are formatted with UTC to avoid shifting the calendar day.
- Missing metric and financial values include an explicit “Chưa có dữ liệu” label; API values and calculations are unchanged.
- The shared Admin navigation pending message remains intact.
- Customer status, machine labels, pagination context, and mobile table cues are display-only and use existing response values.
- Interaction feedback is scoped to Admin page content; transitions are at most 140 ms and are disabled for reduced-motion preference.
- The daily cup value column needs a table-specific class because browser defaults center header cells while body cells inherit left alignment; the regression check covers both heading and values.

### Handoff
Implementation is complete. The focused alignment behavior is browser-verified; the broader visual acceptance remains unverified and the working tree is left uncommitted.
