# Dolores — báo cáo review codebase

Ngày đánh giá: 03/10/2026 (Asia/Bangkok).
Repository thực tế: `L:/capstone prj/fe main/SCM-BEANS_Dashboard_FE`.
Commit: `a2bbe4766d1f3c0430939d498ea3c027f0a8eed9` — `PC dashboard for dolores theme`.
Phương pháp: dolores-start-update, dolores-review, dolores-testing và shared guide trong thư mục này.

## 1. Kết luận

**Needs fixes.** Code đã có khung dashboard PC cho cả bốn vai trò, nhiều màn hình và trạng thái minh họa nghiệp vụ. Tuy nhiên, chưa đủ bằng chứng để nghiệm thu toàn bộ flow Figma. Đã tái hiện lỗi điều hướng Admin, validation Moderator và hydration Technician trên trình duyệt; công thức khách hàng bị mất sau tải lại.

Đây hiện là **frontend prototype sử dụng dữ liệu mẫu và trạng thái cục bộ**. Chưa xác minh tích hợp thật về tài khoản, upload, thanh toán, telemetry hoặc gửi menu. Không nên gọi các thao tác này là đã hoàn thành chức năng backend.

TypeScript pass. Lint không chạy theo script hiện tại. Production build không hoàn thành vì không tải được Google Fonts trong môi trường kiểm tra. Dev server chạy được và đã dùng để kiểm thử trực tiếp; lỗi build nói trên không đồng nghĩa code TypeScript sai.

Chỉ tạo báo cáo và bằng chứng kiểm tra. Không sửa implementation, Figma, dependency manifest; không commit, push hoặc triển khai.

## 2. Bằng chứng và baseline

- Đầu lượt review, `git status --short` sạch.
- Đối chiếu cập nhật dashboard bằng `git diff 6548ff9..HEAD`. Đây là commit ngay trước bản PC dashboard, phù hợp hơn việc gộp các cập nhật giao diện trước đó.
- Trong khoảng này, `src/app/page.tsx`, `src/components/landing/`, `src/app/globals.css`, `src/app/layout.tsx` không có diff. Landing được mở trực tiếp và nội dung hiển thị bình thường. Đây là kiểm tra bảo toàn source và smoke check; chưa phải so sánh ảnh toàn bộ landing với baseline.
- Skill còn ghi đường dẫn D: cũ; review sử dụng checkout L: mà người dùng đang mở.
- Node.js thực tế: v22.15.1; Next.js CLI: 16.2.9.
- Không đọc hoặc ghi thông tin bí mật trong `.env` vào báo cáo.

### Figma đọc trực tiếp trong lượt này

File: [Dolores Product UX/UI](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK).

| Canvas PC | Node | Khung trực tiếp cấp cao đọc được |
| --- | --- | ---: |
| Admin | 3:2 | 63 |
| Moderator | 3:3 | 140 |
| Technician | 3:4 | 40 |
| Customer | 3:5 | 124 |
| Tổng | | 367 |

Các số này được đếm từ metadata trực tiếp của từng canvas, không chỉ sao chép inventory trong skill. Truy vấn danh sách trang từng trả về chỉ Admin và Guide; **truy vấn trực tiếp 3:3, 3:4, 3:5 đều thành công**. Vì vậy kết luận trước đây rằng chỉ xác nhận được hai trang không phản ánh đầy đủ khả năng truy cập file.

367 là số khung gồm màn chính, biến thể, filter, dialog và trạng thái; không phải 367 URL. Sáu khung Customer loại trừ theo D-01 vẫn giữ trong inventory. Còn 361 khung ứng viên sau loại trừ, nhưng chưa có mapping và kiểm thử đầy đủ để tuyên bố 361 khung đã được triển khai.

Đã đọc ảnh Figma A01 ở 1440 × 920 và thuộc tính/reactions thực của A01, A22-CONFIRM, A22-20G-CONFIRM, A27-CONFIRM và bốn xác nhận Customer D-01. Chưa đọc từng prototype edge của toàn bộ 367 khung.

### D-01

Giữ quyết định lưu và gửi cùng một thao tác. Các node sau **excluded by D-01**, không đánh dấu thiếu hoặc pass:

`114:22269`, `114:22615`, `114:22961`, `114:23425`, `114:23443`, `114:23461`.

Các xác nhận đang dùng trong Figma:

| Xác nhận | Đích đọc trực tiếp |
| --- | --- |
| 114:23416 — nước 60 ml | 114:22380 — pending |
| 114:23434 — cà phê 20 g | 114:22726 — pending |
| 114:23452 — sữa 150 ml | 114:23072 — pending |
| 156:5777 — 20 g + 60 ml | 156:5786 — pending |

Các đích pending được xác nhận là tồn tại trong inventory Customer. Không suy ra acknowledgement thật từ prototype.

## 3. Code đã có gì

| Vai trò | Route / thành phần hiện có | Đánh giá thực tế |
| --- | --- | --- |
| Admin | /admin; users, businesses, stores, contracts, machines, iot, menu, reports, notifications | Có các nhóm chức năng A01–A27 trong component chuyên biệt. Nhiều state dùng query view hoặc useState. Chưa xác nhận toàn bộ 63 khung. |
| Moderator | /moderator và catch-all có allowlist/regex | Có hợp đồng, khách, hóa đơn, máy, IoT, menu, yêu cầu kỹ thuật, lịch sử, thu mua, thông báo. Một số màn gộp vào ActionForm; gộp màn không tự chứng minh flow đúng. |
| Technician | /technician, /technician/tasks/*, history/*, notifications | Có biểu mẫu bàn giao, kích hoạt, sửa chữa, thu hồi, máy thay, tân trang và bảo trì. Có handshake cục bộ với Moderator. |
| Customer | /dashboard; contracts, machines, menu, invoices, support, buyback, notifications | Có phân biệt máy thường/Smart, menu riêng, hỗ trợ, hóa đơn và chứng từ. Lưu/gửi menu là mô phỏng, chưa giữ được đầy đủ dữ liệu qua reload. |
| Shared | DoloresShell, DoloresUI, DoloresDashboardLayout, demoFlowStore | Có sidebar, header, footer hành động, bảng, field, notice. Layout Dolores được giới hạn bằng điều kiện đường dẫn customer; các route dashboard cũ khác dùng layout trước. |

### Mapping đối chiếu cụ thể

Đây là các mapping mẫu đã đọc trong code, không phải chứng nhận coverage đầy đủ.

| Figma node | Route/state trong code | Bằng chứng |
| --- | --- | --- |
| 10:49 A01 | /admin | AdminOverviewPage; đọc UI thật và ảnh 1440 × 920 |
| 10:148 A02 | /admin/users | AdminAccountScreens list |
| 10:247 A03 | /admin/users?view=create-customer | form/account overlay |
| 10:338 A04; 54:723 A06 | /admin/stores | AdminStoreScreens list/detail |
| 10:430 A05 | /admin/reports | AdminReportScreens |
| 80:1374 A11 | /admin/businesses | AdminCustomerScreens |
| 80:1504 A12; 80:1627 A13 | /admin/contracts | list/c204 |
| 80:15438 A14 | /admin/machines | inventory |
| 80:16127 A16 | /admin/iot | AdminIoTScreens |
| 80:17887 A19; 80:17996 A20 | /admin/menu và ?view=items | lỗi stale view tái hiện |
| 81:15078 A22-CONFIRM | overlay AdminMenuScreens | so typography với thuộc tính Figma |
| 81:14870 M51-MISSING | /moderator/menu/add, /add/missing | thiếu sữa không chặn trên đường chính |
| 11:1252 M13 | /moderator/contracts/settlement | runtime guard cục bộ |
| 13:457 T05 | /technician/tasks/retrieval | gửi đánh giá; runtime hydration error |
| 156:5777; 156:5786 | /dashboard/menu/espresso + confirm/pending | thử 20 g + 60 ml |
| 114:23416; 114:23434 | cùng component MenuEditPage | nhánh lưu/gửi chung; chưa kiểm thử riêng từng biến thể |
| 114:23452 | /dashboard/menu/fresh-milk | code có nhánh sữa; chưa chạy riêng |

Không có handoff hoàn chỉnh cho từng khung trong repository được cung cấp. Số route, component hoặc số if/else không được dùng làm tỷ lệ hoàn thành.

## 4. Findings

### F01 — Major: Admin đổi query nhưng màn hình không đổi

- Nguồn: A19 `80:17887`, A20 `80:17996`.
- Code: `src/components/dolores/AdminMenuScreens.tsx:35`; `src/app/(admin)/admin/menu/page.tsx`.
- Tái hiện: mở /admin/menu → bấm “Mở menu & danh sách món”.
- Thực tế: URL thành /admin/menu?view=items; heading vẫn “Global Menu & công thức”, bảng vẫn danh sách menu, nút mở danh sách món vẫn còn.
- Nguyên nhân: `useState(initialView)` chỉ khởi tạo một lần; Next Link giữ component khi query thay đổi. Chưa có đồng bộ state với prop/query.
- Tác động: đường chính A19 → A20 bị kẹt dù route tồn tại. Link HTML thông thường có thể reload và cho kết quả khác, khiến hai cách điều hướng không nhất quán.
- Đề xuất sửa: thống nhất nguồn state với route và quản lý dữ liệu chỉnh sửa độc lập. Kiểm tra lại các component Admin khác có cùng pattern; chưa khẳng định tất cả đều mắc lỗi.
- Bằng chứng: [ảnh query stale](report-evidence/admin-menu-query-stale.png).

### F02 — Major: thiếu sữa vẫn lưu thành công trong Moderator

- Nguồn: quy tắc thành phần trong shared guide; M51-MISSING `81:14870`.
- Code: `ModeratorDashboardScreens.tsx:64` (ActionForm), `:313` (đường thêm món).
- Tái hiện: /moderator/menu/add → xóa “Sữa tươi” → Lưu món → Xác nhận.
- Thực tế: hiển thị dialog “Đã ghi nhận trên bản xem trước”, không báo thiếu thành phần.
- Nguyên nhân: đường ActionForm chỉ đổi dialog và ghi `submitted-demo`; không validate các trường. Nhánh /add/missing riêng không bảo vệ đường nhập chính.
- Đề xuất sửa: đưa cùng validation vào hành động lưu thực tế; trường sai phải dẫn đúng error state, không chỉ có màn lỗi truy cập bằng URL riêng.
- Bằng chứng: [form thiếu sữa báo thành công](report-evidence/moderator-missing-milk-success.png).
- Form upload và các form khác dùng ActionForm có nguy cơ tương tự theo code; chưa kiểm thử từng form.

### F03 — Major: menu Customer mất công thức và pending sau reload

- Nguồn: D-01; `156:5777 → 156:5786`, các trạng thái applied của C41/C28/C17.
- Code: `CustomerDashboardScreens.tsx:261`, `:355`, `:668`, `:679`; `demoFlowStore.ts`.
- Tái hiện: /dashboard/menu/espresso → cà phê 20 g + nước 60 ml → Lưu & gửi → Xác nhận → tải lại.
- Trước reload: pending thể hiện 20 g + 60 ml, đúng nhánh kết hợp.
- Sau reload: quay lại màn edit, cà phê 18 g và nước 40 ml.
- Nguyên nhân: chỉ ghi chuỗi “pending”; không ghi payload công thức và không đọc lại trạng thái. Route /menu/applied cũng khởi tạo pending, không đọc acknowledgement.
- Đề xuất sửa: giữ bản menu đã gửi/đã áp dụng theo chủ sở hữu và máy; trạng thái là một phần của cùng bản ghi. Không tự đổi sang applied để giải quyết lỗi reload.
- Bằng chứng: [pending trước reload](report-evidence/customer-menu-pending.png).
- Phần D-01 một thao tác và pending trước ack đã pass trong phiên demo; persistence/khôi phục trạng thái fail.

### F04 — Major: Technician có hydration error do HTML sai

- Nguồn: T05 `13:457`; thành phần dùng chung.
- Code: `TechnicianDashboardScreens.tsx:36` Timeline truyền div vào DoloresNotice; `DoloresUI.tsx:81` bọc children bằng p.
- Runtime: console báo “div cannot be a descendant of p”, sau đó “Hydration failed ... server rendered HTML didn't match the client”.
- Tác động: React phải tạo lại subtree ở client; render ban đầu và tương tác có thể không ổn định. Đây là lỗi runtime dù tsc pass.
- Đề xuất sửa: dùng phần tử chứa cho phép block content; kiểm tra các nơi gọi Notice với children dạng block.
- Bằng chứng: [browser-errors.json](report-evidence/browser-errors.json).

### F05 — Major: dữ liệu form chưa được giữ như kết quả nghiệp vụ

- Code: `ModeratorDashboardScreens.tsx:64–78`, `TechnicianDashboardScreens.tsx:81–85`, `demoFlowStore.ts:17`.
- ActionForm giữ tên tệp/select trong state nhưng saveDemo chỉ ghi marker. Input text dùng defaultValue, không được đọc khi save. JobForm ghi completed/retrieved-assessed mà không giữ ghi chú, linh kiện hoặc lựa chọn hư hỏng trong payload.
- Technician gửi marker đã mở được guard Moderator trong phiên kiểm tra, nhưng Moderator chưa nhận kết quả đánh giá đầy đủ.
- Đây là hạn chế cả ở mô phỏng xuyên vai trò: marker đủ mở khóa, chưa đủ review nội dung trước quyết toán.
- Đề xuất sửa: biểu diễn payload và trạng thái riêng, gắn đúng hồ sơ; service thật chỉ triển khai khi có contract phù hợp. Chưa có bằng chứng API thật hoạt động.

### F06 — Major: nhánh xử lý ly muộn chọn theo URL, thiếu guard theo bill

- Nguồn: M24 `54:4502`, M41 `80:17624`, invariant số 2.
- Code: `ModeratorDashboardScreens.tsx:123`.
- /invoices/late-cups và /late-cups-final chọn hành động dựa trên hậu tố path. Trạng thái bill là select có thể thay đổi nhưng không dùng để quyết định eligibility.
- Theo static code: người dùng đổi select sang “Đã hoàn tất” trên đường /late-cups vẫn có hành động “Tính lại & gửi bản mới”.
- Không có guard về unfinalized, within term và editable trong saveDemo. Đây là kết luận static; chưa thực thi nhánh này trên trình duyệt.
- Đề xuất sửa: lấy trạng thái bill làm điều kiện hành động; vẫn giữ nhánh carry forward khi paid/reconciled.

### F07 — Major: form Admin chưa kiểm tra dữ liệu trước xác nhận

- Nguồn: A03 và error frame `58:309`.
- Code: `AdminAccountScreens.tsx:91`.
- startSave đặt action và mở confirm trực tiếp; chưa kiểm tra email, tên hoặc trường bắt buộc. “required” trong AccountInput là nhãn hiển thị, không chứng minh validation.
- Có lựa chọn ba vai trò đúng phạm vi và không thấy lựa chọn tạo Admin trong picker.
- Kết luận validation dựa trên code; chưa chạy case email trống/sai trong browser.
- Đề xuất sửa: nối validation với error frame và chặn confirm khi dữ liệu sai.

### F08 — Major: visual fidelity chưa đạt tại màn và modal đã kiểm tra

- A01 `10:49`: ảnh app 1440 × 920 có nền vùng nội dung màu kem, trong khi ảnh Figma vùng đó trắng. Panel doanh thu app bắt đầu khoảng y=309, Figma y=333. Font Inter của Figma không được tải thành công tại môi trường dev, nên khác hình dạng chữ cũng có yếu tố môi trường.
- A22-CONFIRM `81:15078`: Figma heading 26px, nội dung 16px, eyebrow 14px. MenuDialog code dùng 20px, 13px, 11px. Customer ConfirmPanel cũng dùng 20/14/11px; chưa đo toàn bộ modal.
- A01 thông tin chi tiết Figma là giá trị 16px; code dùng text-sm (14px).
- Cần sửa sai lệch thuộc tính đã chứng minh và chụp lại với font nguồn. Chưa có cơ sở gọi dashboard pixel-perfect.
- Bằng chứng: [ảnh app A01](report-evidence/admin-overview.png), Figma node 10:49 và dữ liệu thuộc tính đọc trực tiếp.
- Hai mục Admin cùng tô active tại overview cũng hiện trong ảnh Figma; không đánh dấu lỗi chỉ vì cách đó trông bất thường.

### F09 — Major: pipeline lint hiện không kiểm tra được source

- `package.json`: lint = next lint; Next CLI hiện 16.2.9.
- `npm run lint` ban đầu không tìm được next do executable/dependency không sẵn sàng.
- Gọi CLI trực tiếp sau đó: `node node_modules/next/dist/bin/next lint` exit 1, “Invalid project directory ... /lint”.
- Đây là lỗi command kiểm tra trong repo, chưa phải kết quả ESLint tìm thấy lỗi source.
- Đề xuất sửa: cấu hình script ESLint tương thích toolchain hiện tại; không thay dependency trong lượt review.

### R01 — Rủi ro khi đưa prototype vào sử dụng thật: role và tenant

- `src/proxy.ts` trả NextResponse.next và chỉ matcher /admin; layout các vai trò chỉ render Shell. Runtime đã mở Admin, Moderator, Technician và Customer trong tab kiểm thử mà không đăng nhập.
- demoFlowStore dùng một storage key và mã hồ sơ chung; không có tenant/user scope.
- Đây là prototype ghi rõ dữ liệu minh họa. **Chưa quan sát truy cập dữ liệu production hoặc bypass backend authorization.**
- Kiểm tra git cho thấy Admin guard đã bị comment/disable ở baseline trước bản PC. Không quy lỗi này thành regression mới do commit a2bbe47.
- Nếu nghiệm thu production, thiếu bảo vệ role/tenant là Critical. Đối với preview hiện tại, ghi nhận đây là giới hạn môi trường và kiến trúc cần giải quyết trước khi nối dữ liệu thật.

## 5. Kết quả kiểm thử

Môi trường browser: http://127.0.0.1:3000, Next dev, viewport 1440 × 920, tab kiểm thử riêng. Các thao tác submit chỉ ghi demo localStorage theo code đã đọc; không upload tệp thật, chuyển tiền hoặc gửi lệnh thiết bị.

| Case | Node / route | Kỳ vọng | Thực tế | Kết quả |
| --- | --- | --- | --- | --- |
| T01 TypeScript | toàn repo | compiler thành công | node .../tsc --noEmit --incremental false: exit 0 | Pass |
| T02 Lint | package.json | lint source | npm script không tìm next lúc đầu; CLI trực tiếp hiểu lint là directory | Fail — tooling |
| T03 Production build | root font imports | build thành công | exit 1, không tải được Inter và Playfair Display từ Google Fonts | Blocked — môi trường mạng/font |
| T04 Admin menu navigation | A19 → A20 | URL và view đồng bộ | URL đổi, view vẫn list | Fail |
| T05 Moderator milk validation | M51-MISSING | thiếu sữa phải lỗi | đi tới success | Fail |
| T06 Customer invalid quantity | /dashboard/menu/espresso | 0 g bị chặn | thông báo định lượng > 0, không mở confirm | Pass — demo |
| T07 Customer cancel | 156:5777 equivalent | hủy về edit | dialog đóng, giữ màn edit | Pass — UI; side effect cancel được đối chiếu code |
| T08 D-01 combined submission | 156:5777 → 156:5786 | một confirm rồi pending | 20 g + 60 ml hiển thị pending, không tự applied | Pass — demo |
| T09 Customer reload | menu đã gửi | giữ công thức/trạng thái | edit trở về 18 g + 40 ml | Fail |
| T10 Settlement before retrieval | M13 | bị khóa | button disabled | Pass — demo |
| T11 Technician → Moderator | T05 → M13 | sau kết quả mới mở | sau gửi và hydration, button enabled | Pass — marker cục bộ, chưa chứng minh payload |
| T12 Hydration | T05 | không có hydration error | invalid p/div, React regeneration | Fail |
| T13 Landing preservation | / và git diff | dashboard update không sửa landing | không diff ở baseline 6548ff9; landing render | Pass — source + smoke |
| T14 Visual A01 | 10:49 | khớp bố cục/thuộc tính | khác nền, vị trí panel, typography; font fallback | Fail — có giới hạn font |
| T15 Actual services | upload, billing, IoT/menu | service outcomes thật | chưa có môi trường/contract và code kết nối cho các flow đã đọc | Not run |
| T16 All-frame journeys | 361 khung ứng viên | coverage và edge đầy đủ | chưa có full mapping, chưa chạy mọi nhánh | Not run |

Trong **16 case được liệt kê**: 7 Pass (có phạm vi rõ ràng), 6 Fail, 1 Blocked, 2 Not run. Đây là thống kê của tập kiểm tra, **không phải tỷ lệ hoàn thành 367 khung Figma**.

Lần type-check đầu gặp nhiều missing modules khi dependency/executable chưa sẵn sàng. Lần chạy trực tiếp cuối cùng exit 0; dùng kết quả cuối làm kết luận. Lần build trực tiếp đầu thiếu require-hook; lần cuối đã vào production build và bị Google Fonts chặn. Không cài thêm package để né những lỗi này.

## 6. Phần làm đúng và giới hạn còn lại

- Đã có giao diện role riêng, allowlist catch-all và notFound cho URL không hỗ trợ.
- A01 phân biệt đúng nhãn doanh thu gộp, doanh thu loại cọc và tiền cọc.
- D-01 không xuất hiện đường save draft riêng trong component đã kiểm tra; phần lưu/gửi một lần và pending đúng trong phiên demo.
- Standard handover ghi rõ không GPS/telemetry/menu từ xa; chưa kiểm thử toàn bộ nhánh Smart/standard.
- Moderator guard retrieval trước settlement đã hoạt động cục bộ; đây là điểm tích cực có kiểm tra runtime, chưa phải xác minh nghiệp vụ backend.
- Buyback copy/code thể hiện acknowledgement chứng từ độc lập với điều phối; chưa chạy toàn bộ flow thu gom.
- Nội dung sample khác nhau không được coi là lỗi nếu không đổi hành động/trạng thái. Các phát hiện ở trên tập trung vào hành vi và trạng thái.
- Chưa kiểm thử cross-tenant, backend role enforcement, lỗi API, mất kết nối thật, upload thật, mobile, bàn phím/focus cho mọi modal và toàn bộ button variants.
- Chưa có approved baseline cho mọi commit branding trước 6548ff9; không kết luận các thay đổi landing cũ là vi phạm chỉ từ diff rộng.

## 7. Thứ tự xử lý đề xuất

1. Sửa F01 điều hướng và F04 hydration để các màn hoạt động ổn định.
2. Sửa validation F02/F07 và guard bill F06.
3. Sửa state/payload F03/F05 để menu và kết quả xuyên vai trò giữ đúng nội dung.
4. Sửa F08 theo thuộc tính Figma; xử lý nguồn font và lint để kiểm tra tái lập được.
5. Bổ sung handoff từng frame → route/state → guard/destination/cancel; kiểm thử các nhánh chưa chạy.
6. Trước khi đưa dữ liệu thật vào dashboard, giải quyết role/tenant và service outcomes R01.

Các mục trên là khuyến nghị review. Việc sửa implementation cần được thực hiện ở lượt sửa được người dùng giao; review này không tự áp dụng thay đổi.

## 8. Bằng chứng lưu tại repository

- [Admin overview 1440 × 920](report-evidence/admin-overview.png)
- [Admin query đổi nhưng view không đổi](report-evidence/admin-menu-query-stale.png)
- [Moderator thiếu sữa vẫn success](report-evidence/moderator-missing-milk-success.png)
- [Customer menu pending 20 g + 60 ml](report-evidence/customer-menu-pending.png)
- [Moderator mở khóa sau Technician — demo](report-evidence/settlement-unlocked-demo.png)
- [Runtime hydration logs](report-evidence/browser-errors.json)

Các ảnh là snapshot phiên kiểm thử local. Bản ghi demo trong phiên chỉ phục vụ tái hiện; không phải dữ liệu nghiệp vụ thật.

## 9. Inventory Figma hiện tại

Phụ lục giữ node/name đã đọc trực tiếp để các lượt sửa sau có nguồn đối chiếu. “Discovered” chỉ chứng minh khung tồn tại. Tình trạng implementation/visual/flow của từng khung chưa được chứng nhận bởi phụ lục này.

### Admin

| Node | Tên khung | Evidence status |
| --- | --- | --- |
| 10:49 | A01 · Tổng quan vận hành | Discovered; full verification not claimed |
| 10:148 | A02 · Tài khoản toàn hệ thống | Discovered; full verification not claimed |
| 10:247 | A03 · Tạo tài khoản khách hàng | Discovered; full verification not claimed |
| 10:338 | A04 · Cửa hàng | Discovered; full verification not claimed |
| 10:430 | A05 · Báo cáo doanh thu & vận hành | Discovered; full verification not claimed |
| 54:723 | A06 · Thông tin cửa hàng | Discovered; full verification not claimed |
| 54:800 | A07 · Tài khoản Tenant · quyền & trạng thái | Discovered; full verification not claimed |
| 54:877 | A08 · Chi tiết báo cáo theo khách hàng | Discovered; full verification not claimed |
| 54:965 | A09 · Thông tin vận hành cần chú ý | Discovered; full verification not claimed |
| 54:1034 | A10 · Khách hàng Nguyễn Minh Anh | Discovered; full verification not claimed |
| 58:293 | A03-CONFIRM · Xác nhận · Tạo tài khoản Tenant | Discovered; full verification not claimed |
| 58:302 | A03-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:309 | A03-ERROR · Chưa thể gửi thông tin | Discovered; full verification not claimed |
| 58:321 | A06-CONFIRM · Xác nhận · Thông tin cửa hàng | Discovered; full verification not claimed |
| 58:330 | A06-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:337 | A07-CONFIRM · Xác nhận · Tài khoản Tenant · quyền & trạng thái | Discovered; full verification not claimed |
| 58:346 | A07-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:353 | A05-FILTER · Chọn kỳ báo cáo | Discovered; full verification not claimed |
| 80:1374 | A11 · Khách hàng & cửa hàng | Discovered; full verification not claimed |
| 80:1504 | A12 · Hợp đồng & trạng thái | Discovered; full verification not claimed |
| 80:1627 | A13 · Chi tiết hợp đồng C-204 | Discovered; full verification not claimed |
| 80:1753 | A13-STD · Chi tiết hợp đồng C-205 | Discovered; full verification not claimed |
| 80:15208 | A24 · Lịch sử hợp đồng của khách | Discovered; full verification not claimed |
| 80:15316 | A26 · Quản lý tài khoản nhân sự | Discovered; full verification not claimed |
| 80:15438 | A14 · Máy & tồn kho | Discovered; full verification not claimed |
| 80:15588 | A14-STOCK · Máy trong kho · chưa cho thuê | Discovered; full verification not claimed |
| 80:15730 | A15 · Hồ sơ máy S-022 | Discovered; full verification not claimed |
| 80:15866 | A25 · Máy cho mượn & lịch sử sử dụng | Discovered; full verification not claimed |
| 80:15992 | A23 · Lịch sử sửa chữa, bảo trì & linh kiện | Discovered; full verification not claimed |
| 80:16127 | A16 · Giám sát Smart IoT · theo khách hàng | Discovered; full verification not claimed |
| 80:16266 | A17 · Máy của Nguyễn Minh Anh | Discovered; full verification not claimed |
| 80:17757 | A18 · Máy Smart S-018 · giám sát & hồ sơ | Discovered; full verification not claimed |
| 80:17887 | A19 · Global Menu & công thức | Discovered; full verification not claimed |
| 80:17996 | A20 · Global Menu mùa hè · các món | Discovered; full verification not claimed |
| 80:18115 | A21 · Thêm món · Cà phê sữa tươi | Discovered; full verification not claimed |
| 80:18242 | A22 · Chỉnh công thức Espresso | Discovered; full verification not claimed |
| 80:18364 | A22-60 · Chỉnh Espresso · nước pha 60 ml | Discovered; full verification not claimed |
| 80:18492 | A22-20G · Chỉnh Espresso · cà phê 20 g | Discovered; full verification not claimed |
| 80:18605 | A27 · Gửi menu đến máy Smart | Discovered; full verification not claimed |
| 80:18725 | A15-STD · Hồ sơ máy thường C-031 | Discovered; full verification not claimed |
| 81:1850 | A03-MOD · Tạo tài khoản Moderator | Discovered; full verification not claimed |
| 81:1968 | A03-TECH · Tạo tài khoản Technician | Discovered; full verification not claimed |
| 81:2086 | A21-MISSING · Thêm món · thiếu thành phần bắt buộc | Discovered; full verification not claimed |
| 81:15001 | A03-ROLE · Chọn vai trò tài khoản | Discovered; full verification not claimed |
| 81:15014 | A03-MOD-CONFIRM · Tạo tài khoản Moderator | Discovered; full verification not claimed |
| 81:15023 | A03-MOD-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15030 | A03-TECH-CONFIRM · Tạo tài khoản Technician | Discovered; full verification not claimed |
| 81:15039 | A03-TECH-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15046 | A26-CONFIRM · Lưu quyền và trạng thái tài khoản | Discovered; full verification not claimed |
| 81:15055 | A26-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15062 | A21-CONFIRM · Lưu món Cà phê sữa tươi | Discovered; full verification not claimed |
| 81:15071 | A21-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15078 | A22-CONFIRM · Lưu công thức Espresso | Discovered; full verification not claimed |
| 81:15087 | A22-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15094 | A22-20G-CONFIRM · Lưu thay đổi lượng cà phê | Discovered; full verification not claimed |
| 81:15103 | A22-20G-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15110 | A27-CONFIRM · Gửi menu xuống máy | Discovered; full verification not claimed |
| 81:15119 | A27-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15126 | A21-INGREDIENTS · Thành phần của Cà phê sữa tươi | Discovered; full verification not claimed |
| 81:15137 | A13-PREVIEW · Hợp đồng C-204 | Discovered; full verification not claimed |
| 91:3618 | A23-S018 · Lịch sử máy S-018 | Discovered; full verification not claimed |
| 91:3763 | A15-MB · Hồ sơ máy thu mua MB-017 | Discovered; full verification not claimed |
| 91:3891 | A26-TECH · Quản lý tài khoản Technician | Discovered; full verification not claimed |

### Moderator

| Node | Tên khung | Evidence status |
| --- | --- | --- |
| 11:8 | M01 · Tổng quan hợp đồng & thanh toán | Discovered; full verification not claimed |
| 11:122 | M02 · Đàm phán & lập hợp đồng thuê | Discovered; full verification not claimed |
| 11:232 | M03 · Bàn giao & lắp đặt máy thường | Discovered; full verification not claimed |
| 11:338 | M04 · Bàn giao & kích hoạt Smart IoT | Discovered; full verification not claimed |
| 11:444 | M05 · Hóa đơn tháng đầu | Discovered; full verification not claimed |
| 11:549 | M06 · Hóa đơn định kỳ & đối soát | Discovered; full verification not claimed |
| 11:661 | M07 · PAYG & số ly gửi về muộn | Discovered; full verification not claimed |
| 11:757 | M08 · Máy & tồn kho | Discovered; full verification not claimed |
| 11:858 | M09 · Global Menu & công thức | Discovered; full verification not claimed |
| 11:956 | M10 · Lịch sử bảo trì & sửa chữa | Discovered; full verification not claimed |
| 11:1051 | M11 · Nhắc hợp đồng sắp hết hạn | Discovered; full verification not claimed |
| 11:1156 | M12 · Thu hồi trước quyết toán cọc | Discovered; full verification not claimed |
| 11:1252 | M13 · Quyết toán & hoàn cọc sau đánh giá | Discovered; full verification not claimed |
| 11:1357 | M14 · Chấm dứt sớm & vi phạm | Discovered; full verification not claimed |
| 11:1579 | M16 · Thu mua máy cũ · tân trang & nhập kho | Discovered; full verification not claimed |
| 23:58 | M15 · Thu mua máy cũ · chứng từ mua bán | Discovered; full verification not claimed |
| 35:57 | M17 · Giám sát Smart IoT · theo khách hàng | Discovered; full verification not claimed |
| 39:57 | M18 · Chi tiết dữ liệu & mô hình máy | Discovered; full verification not claimed |
| 54:3817 | M19 · Gửi yêu cầu cho Technician | Discovered; full verification not claimed |
| 54:3957 | M20 · Yêu cầu kỹ thuật & kết quả | Discovered; full verification not claimed |
| 54:4087 | M21 · Đối soát chứng từ thanh toán | Discovered; full verification not claimed |
| 54:4237 | M22 · Yêu cầu thanh toán phần còn thiếu | Discovered; full verification not claimed |
| 54:4363 | M23 · Hoàn khoản thanh toán thừa | Discovered; full verification not claimed |
| 54:4502 | M24 · Xử lý số ly gửi về muộn | Discovered; full verification not claimed |
| 54:4628 | M25 · Chỉnh công thức Espresso | Discovered; full verification not claimed |
| 54:4769 | M26 · Máy thay thế & phân bổ số ly | Discovered; full verification not claimed |
| 54:4917 | M27 · Cảnh báo & nhắc việc | Discovered; full verification not claimed |
| 54:5045 | M28 · Danh sách hợp đồng thuê | Discovered; full verification not claimed |
| 54:5175 | M29 · Hồ sơ hợp đồng C-204 | Discovered; full verification not claimed |
| 54:5313 | M30 · Bồi thường vượt tiền đặt cọc | Discovered; full verification not claimed |
| 54:5440 | M31 · Ghi nhận hoàn cọc | Discovered; full verification not claimed |
| 54:5576 | M32 · Đánh giá máy mua cũ & thương lượng | Discovered; full verification not claimed |
| 54:5705 | M33 · Chi tiết lịch sử bảo trì / sửa chữa | Discovered; full verification not claimed |
| 54:5838 | M34 · Dư nợ quá hạn & phí cộng dồn | Discovered; full verification not claimed |
| 54:5965 | M35 · Hoàn cọc · máy được đánh giá tốt | Discovered; full verification not claimed |
| 54:6085 | M36 · Theo dõi vi phạm hợp đồng | Discovered; full verification not claimed |
| 54:6212 | M37 · Cảnh báo mất kết nối / lỗi menu | Discovered; full verification not claimed |
| 54:6336 | M38 · Kết quả Technician · YC-017 | Discovered; full verification not claimed |
| 54:6465 | M39 · Lịch sử phiên bản hóa đơn | Discovered; full verification not claimed |
| 58:4862 | M02-CONFIRM · Xác nhận · Đàm phán & lập hợp đồng thuê | Discovered; full verification not claimed |
| 58:4871 | M02-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:4878 | M02-ERROR · Chưa thể gửi thông tin | Discovered; full verification not claimed |
| 58:4890 | M05-CONFIRM · Xác nhận · Hóa đơn tháng đầu | Discovered; full verification not claimed |
| 58:4899 | M05-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:4906 | M11-CONFIRM · Xác nhận · Nhắc hợp đồng sắp hết hạn | Discovered; full verification not claimed |
| 58:4915 | M11-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:4922 | M12-CONFIRM · Xác nhận · Thu hồi trước quyết toán cọc | Discovered; full verification not claimed |
| 58:4931 | M12-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:4938 | M13-CONFIRM · Xác nhận · Quyết toán & hoàn cọc sau đánh giá | Discovered; full verification not claimed |
| 58:4947 | M13-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:4954 | M14-CONFIRM · Xác nhận · Chấm dứt sớm & vi phạm | Discovered; full verification not claimed |
| 58:4963 | M14-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:4970 | M15-CONFIRM · Xác nhận · Thu mua máy cũ · chứng từ mua bán | Discovered; full verification not claimed |
| 58:4979 | M15-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:4986 | M16-CONFIRM · Xác nhận · Thu mua máy cũ · tân trang & nhập kho | Discovered; full verification not claimed |
| 58:4995 | M16-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5002 | M19-CONFIRM · Xác nhận · Gửi yêu cầu cho Technician | Discovered; full verification not claimed |
| 58:5011 | M19-SUCCESS · Đã gửi yêu cầu cho Technician | Discovered; full verification not claimed |
| 58:5018 | M19-ERROR · Chưa thể gửi thông tin | Discovered; full verification not claimed |
| 58:5030 | M21-CONFIRM · Xác nhận · Đối soát chứng từ thanh toán | Discovered; full verification not claimed |
| 58:5039 | M21-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5046 | M21-PREVIEW · Đối soát chứng từ thanh toán | Discovered; full verification not claimed |
| 58:5056 | M22-CONFIRM · Xác nhận · Yêu cầu thanh toán phần còn thiếu | Discovered; full verification not claimed |
| 58:5065 | M22-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5072 | M23-CONFIRM · Xác nhận · Hoàn khoản thanh toán thừa | Discovered; full verification not claimed |
| 58:5081 | M23-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5088 | M24-CONFIRM · Xác nhận · Xử lý số ly gửi về muộn | Discovered; full verification not claimed |
| 58:5097 | M24-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5104 | M25-CONFIRM · Lưu công thức Espresso | Discovered; full verification not claimed |
| 58:5113 | M25-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 58:5120 | M26-CONFIRM · Xác nhận · Máy thay thế & phân bổ số ly | Discovered; full verification not claimed |
| 58:5129 | M26-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5136 | M29-PREVIEW · Hồ sơ hợp đồng C-204 | Discovered; full verification not claimed |
| 58:5146 | M30-CONFIRM · Xác nhận · Bồi thường vượt tiền đặt cọc | Discovered; full verification not claimed |
| 58:5155 | M30-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5162 | M31-CONFIRM · Xác nhận · Ghi nhận hoàn cọc | Discovered; full verification not claimed |
| 58:5171 | M31-SUCCESS · Đã ghi nhận hoàn cọc | Discovered; full verification not claimed |
| 58:5178 | M32-CONFIRM · Xác nhận · Đánh giá máy mua cũ & thương lượng | Discovered; full verification not claimed |
| 58:5187 | M32-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5210 | M35-CONFIRM · Xác nhận · Hoàn cọc · máy được đánh giá tốt | Discovered; full verification not claimed |
| 58:5219 | M35-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5226 | M36-CONFIRM · Xác nhận · Theo dõi vi phạm hợp đồng | Discovered; full verification not claimed |
| 58:5235 | M36-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5242 | M19-TYPE · Chọn công việc kỹ thuật | Discovered; full verification not claimed |
| 58:5259 | M24-CARRY · Cộng số ly vào tháng kế tiếp | Discovered; full verification not claimed |
| 58:5268 | M24-CARRY-SUCCESS · Đã ghi nhận 120 ly vào kỳ sau | Discovered; full verification not claimed |
| 58:5275 | M26-RETURN · Xác nhận kết thúc dùng máy thay | Discovered; full verification not claimed |
| 58:5284 | M26-RETURN-SUCCESS · Đã kết thúc máy thay thế | Discovered; full verification not claimed |
| 58:5291 | M35-PAID · Đã ghi nhận hoàn đủ cọc | Discovered; full verification not claimed |
| 59:5108 | M18-FRONT · Mô hình nhìn phía trước | Discovered; full verification not claimed |
| 63:4645 | M06-FILTER-1 · Chờ đối chiếu | Discovered; full verification not claimed |
| 63:4800 | M06-FILTER-2 · Quá hạn | Discovered; full verification not claimed |
| 63:5567 | M10-FILTER-1 · Bảo trì | Discovered; full verification not claimed |
| 63:5708 | M10-FILTER-2 · Sửa chữa | Discovered; full verification not claimed |
| 63:5863 | M11-FILTER-1 · Đã phản hồi | Discovered; full verification not claimed |
| 63:6012 | M11-FILTER-2 · Chưa phản hồi | Discovered; full verification not claimed |
| 64:5762 | M40 · Hợp đồng máy thường C-205 | Discovered; full verification not claimed |
| 64:5900 | M40-PREVIEW · Hợp đồng đã ký C-205 | Discovered; full verification not claimed |
| 70:5860 | M19-INSTALL-STD · Gửi yêu cầu: Lắp đặt máy thường | Discovered; full verification not claimed |
| 70:5998 | M19-INSTALL-STD-CONFIRM · Xác nhận: Lắp đặt máy thường | Discovered; full verification not claimed |
| 70:6007 | M19-INSTALL-STD-SUCCESS · Đã gửi: Lắp đặt máy thường | Discovered; full verification not claimed |
| 70:6018 | M19-INSTALL-SMART · Gửi yêu cầu: Lắp đặt & kích hoạt Smart IoT | Discovered; full verification not claimed |
| 70:6156 | M19-INSTALL-SMART-CONFIRM · Xác nhận: Lắp đặt & kích hoạt Smart IoT | Discovered; full verification not claimed |
| 70:6165 | M19-INSTALL-SMART-SUCCESS · Đã gửi: Lắp đặt & kích hoạt Smart IoT | Discovered; full verification not claimed |
| 70:6176 | M19-REPAIR · Gửi yêu cầu: Sửa chữa / lỗi kết nối | Discovered; full verification not claimed |
| 70:6314 | M19-REPAIR-CONFIRM · Xác nhận: Sửa chữa / lỗi kết nối | Discovered; full verification not claimed |
| 70:6323 | M19-REPAIR-SUCCESS · Đã gửi: Sửa chữa / lỗi kết nối | Discovered; full verification not claimed |
| 70:6334 | M19-BUYBACK · Gửi yêu cầu: Đánh giá máy khách đề nghị bán | Discovered; full verification not claimed |
| 70:6472 | M19-BUYBACK-CONFIRM · Xác nhận: Đánh giá máy khách đề nghị bán | Discovered; full verification not claimed |
| 70:6481 | M19-BUYBACK-SUCCESS · Đã gửi: Đánh giá máy khách đề nghị bán | Discovered; full verification not claimed |
| 70:6492 | M19-COLLECTION · Gửi yêu cầu: Thu gom máy đã thu mua | Discovered; full verification not claimed |
| 70:6630 | M19-COLLECTION-CONFIRM · Xác nhận: Thu gom máy đã thu mua | Discovered; full verification not claimed |
| 70:6639 | M19-COLLECTION-SUCCESS · Đã gửi: Thu gom máy đã thu mua | Discovered; full verification not claimed |
| 80:14044 | M42 · Máy trong kho · chưa cho thuê | Discovered; full verification not claimed |
| 80:14202 | M43 · Hồ sơ máy S-022 | Discovered; full verification not claimed |
| 80:14354 | M44 · Máy cho mượn & lịch sử sử dụng | Discovered; full verification not claimed |
| 80:14498 | M45 · Lịch sử sửa chữa, bảo trì & linh kiện | Discovered; full verification not claimed |
| 80:14803 | M46 · Máy của Nguyễn Minh Anh | Discovered; full verification not claimed |
| 80:15073 | M50 · Global Menu mùa hè · các món | Discovered; full verification not claimed |
| 80:16396 | M51 · Thêm món · Cà phê sữa tươi | Discovered; full verification not claimed |
| 80:16676 | M25-60 · Chỉnh Espresso · nước pha 60 ml | Discovered; full verification not claimed |
| 80:16820 | M25-20G · Chỉnh Espresso · cà phê 20 g | Discovered; full verification not claimed |
| 80:16949 | M52 · Gửi menu đến máy Smart | Discovered; full verification not claimed |
| 80:17085 | M47 · Tài khoản khách hàng | Discovered; full verification not claimed |
| 80:17213 | M48 · Tạo tài khoản khách hàng | Discovered; full verification not claimed |
| 80:17354 | M49 · Hồ sơ khách hàng Nguyễn Minh Anh | Discovered; full verification not claimed |
| 80:17624 | M41 · Ly gửi muộn · hóa đơn đã hoàn tất | Discovered; full verification not claimed |
| 81:14870 | M51-MISSING · Thêm món · thiếu thành phần bắt buộc | Discovered; full verification not claimed |
| 81:15147 | M48-CONFIRM · Tạo tài khoản khách hàng | Discovered; full verification not claimed |
| 81:15156 | M48-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15163 | M41-CONFIRM · Ghi nhận số ly vào tháng sau | Discovered; full verification not claimed |
| 81:15172 | M41-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15179 | M51-CONFIRM · Lưu món Cà phê sữa tươi | Discovered; full verification not claimed |
| 81:15188 | M51-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15209 | M25-20G-CONFIRM · Lưu thay đổi lượng cà phê | Discovered; full verification not claimed |
| 81:15218 | M25-20G-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15225 | M52-CONFIRM · Gửi menu xuống máy | Discovered; full verification not claimed |
| 81:15234 | M52-SUCCESS · Đã lưu thông tin | Discovered; full verification not claimed |
| 81:15241 | M51-INGREDIENTS · Thành phần của Cà phê sữa tươi | Discovered; full verification not claimed |
| 140:8049 | M33-C031 · Chi tiết sửa chữa máy C-031 | Discovered; full verification not claimed |

### Technician

| Node | Tên khung | Evidence status |
| --- | --- | --- |
| 13:49 | T01 · Việc được giao | Discovered; full verification not claimed |
| 13:157 | T02 · Bàn giao máy thường | Discovered; full verification not claimed |
| 13:257 | T03 · Lắp đặt & kích hoạt Smart IoT | Discovered; full verification not claimed |
| 13:357 | T04 · Sửa chữa & thay linh kiện | Discovered; full verification not claimed |
| 13:457 | T05 · Thu hồi & ghi nhận tình trạng | Discovered; full verification not claimed |
| 13:557 | T06 · Bàn giao máy thay thế tạm thời | Discovered; full verification not claimed |
| 13:657 | T07 · Máy thu mua · tân trang & kiểm thử | Discovered; full verification not claimed |
| 13:747 | T08 · Lịch sử máy | Discovered; full verification not claimed |
| 54:7314 | T09 · Chi tiết yêu cầu YC-017 | Discovered; full verification not claimed |
| 54:7385 | T10 · Đánh giá máy khách đề nghị bán | Discovered; full verification not claimed |
| 54:7466 | T11 · Lịch sử xử lý máy S-018 | Discovered; full verification not claimed |
| 54:7528 | T12 · Thông báo công việc | Discovered; full verification not claimed |
| 54:7586 | T13 · Ghi nhận trả máy thay thế | Discovered; full verification not claimed |
| 54:7661 | T14 · Ghi nhận lịch sử bảo trì | Discovered; full verification not claimed |
| 58:5298 | T02-CONFIRM · Xác nhận · Bàn giao máy thường | Discovered; full verification not claimed |
| 58:5307 | T02-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5314 | T03-CONFIRM · Xác nhận · Lắp đặt & kích hoạt Smart IoT | Discovered; full verification not claimed |
| 58:5323 | T03-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5330 | T04-CONFIRM · Xác nhận · Sửa chữa & thay linh kiện | Discovered; full verification not claimed |
| 58:5339 | T04-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5346 | T05-CONFIRM · Xác nhận · Thu hồi & ghi nhận tình trạng | Discovered; full verification not claimed |
| 58:5355 | T05-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5362 | T06-CONFIRM · Xác nhận · Bàn giao máy thay thế tạm thời | Discovered; full verification not claimed |
| 58:5371 | T06-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5378 | T07-CONFIRM · Xác nhận · Máy thu mua · tân trang & kiểm thử | Discovered; full verification not claimed |
| 58:5387 | T07-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5394 | T09-CONFIRM · Xác nhận · Chi tiết yêu cầu YC-017 | Discovered; full verification not claimed |
| 58:5403 | T09-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5410 | T10-CONFIRM · Xác nhận · Đánh giá máy khách đề nghị bán | Discovered; full verification not claimed |
| 58:5419 | T10-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5426 | T13-CONFIRM · Xác nhận · Ghi nhận trả máy thay thế | Discovered; full verification not claimed |
| 58:5435 | T13-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5442 | T14-CONFIRM · Xác nhận · Ghi nhận lịch sử bảo trì | Discovered; full verification not claimed |
| 58:5451 | T14-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5458 | T09-TYPE · Mở biểu mẫu theo công việc | Discovered; full verification not claimed |
| 63:10875 | T01-FILTER-1 · Giao máy | Discovered; full verification not claimed |
| 63:10970 | T01-FILTER-2 · Sửa chữa | Discovered; full verification not claimed |
| 63:11065 | T01-FILTER-3 · Thu hồi | Discovered; full verification not claimed |
| 63:11183 | T08-FILTER-1 · Smart IoT | Discovered; full verification not claimed |
| 63:11278 | T08-FILTER-2 · Máy thường | Discovered; full verification not claimed |

### Customer

| Node | Tên khung | Evidence status |
| --- | --- | --- |
| 14:8 | C01 · Tổng quan của cửa hàng | Discovered; full verification not claimed |
| 14:116 | C02 · Hợp đồng của tôi | Discovered; full verification not claimed |
| 14:204 | C03 · Máy của tôi | Discovered; full verification not claimed |
| 14:300 | C04 · Chi tiết máy Smart IoT | Discovered; full verification not claimed |
| 14:406 | C05 · Chi tiết máy thông thường | Discovered; full verification not claimed |
| 14:510 | C06 · Menu hiện tại trên máy | Discovered; full verification not claimed |
| 14:593 | C07 · Hóa đơn & thanh toán | Discovered; full verification not claimed |
| 14:689 | C08 · Thanh toán tháng đầu tiên | Discovered; full verification not claimed |
| 14:795 | C09 · Chi tiết hóa đơn & đối chiếu | Discovered; full verification not claimed |
| 14:901 | C10 · Báo sự cố máy | Discovered; full verification not claimed |
| 14:1003 | C11 · Sắp hết hạn hợp đồng | Discovered; full verification not claimed |
| 14:1102 | C12 · Đề nghị thu mua máy cũ | Discovered; full verification not claimed |
| 14:1196 | C13 · Thông báo & nhắc nhở | Discovered; full verification not claimed |
| 19:86 | C14 · Kết thúc hợp đồng & hoàn cọc | Discovered; full verification not claimed |
| 24:86 | C15 · Chứng từ thu mua máy cũ | Discovered; full verification not claimed |
| 24:191 | C16 · Đã xác nhận chứng từ thu mua | Discovered; full verification not claimed |
| 44:88 | C17 · Giám sát máy Smart IoT | Discovered; full verification not claimed |
| 44:198 | C18 · Mô hình máy Smart IoT | Discovered; full verification not claimed |
| 57:10087 | C19 · Chi tiết hợp đồng thuê | Discovered; full verification not claimed |
| 57:10208 | C20 · Gửi ảnh chứng từ chuyển khoản | Discovered; full verification not claimed |
| 57:10326 | C21 · Yêu cầu hỗ trợ của tôi | Discovered; full verification not claimed |
| 57:10433 | C22 · Cần thanh toán phần còn thiếu | Discovered; full verification not claimed |
| 57:10543 | C23 · Theo dõi hoàn tiền thanh toán thừa | Discovered; full verification not claimed |
| 57:10653 | C24 · Hoàn cọc đã hoàn tất | Discovered; full verification not claimed |
| 57:10766 | C25 · Đề nghị kết thúc hợp đồng sớm | Discovered; full verification not claimed |
| 57:10875 | C26 · Trao đổi hợp đồng thuê mới | Discovered; full verification not claimed |
| 57:10988 | C27 · Gửi đề nghị bán máy của tôi | Discovered; full verification not claimed |
| 57:11113 | C28 · Menu của tôi · máy S-018 | Discovered; full verification not claimed |
| 57:11220 | C29 · Máy mất kết nối · dữ liệu gần nhất | Discovered; full verification not claimed |
| 57:11333 | C30 · Nhắc thanh toán hóa đơn | Discovered; full verification not claimed |
| 57:11439 | C32 · Máy thay thế trong hợp đồng | Discovered; full verification not claimed |
| 57:11556 | C33 · Lịch sử bảo trì & sửa chữa | Discovered; full verification not claimed |
| 57:11666 | C34 · Tiến trình yêu cầu hỗ trợ | Discovered; full verification not claimed |
| 58:5479 | C10-CONFIRM · Xác nhận · Báo sự cố máy | Discovered; full verification not claimed |
| 58:5488 | C10-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5495 | C10-ERROR · Chưa thể gửi thông tin | Discovered; full verification not claimed |
| 58:5507 | C11-CONFIRM · Xác nhận · Sắp hết hạn hợp đồng | Discovered; full verification not claimed |
| 58:5516 | C11-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5523 | C15-PREVIEW · Chứng từ thu mua máy cũ | Discovered; full verification not claimed |
| 58:5533 | C15-CONFIRM · Xác nhận · Chứng từ thu mua máy cũ | Discovered; full verification not claimed |
| 58:5542 | C15-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5549 | C19-PREVIEW · Chi tiết hợp đồng thuê | Discovered; full verification not claimed |
| 58:5559 | C20-CONFIRM · Xác nhận · Gửi ảnh chứng từ chuyển khoản | Discovered; full verification not claimed |
| 58:5568 | C20-SUCCESS · Đã gửi chứng từ · chờ đối chiếu | Discovered; full verification not claimed |
| 58:5575 | C20-ERROR · Chưa thể gửi thông tin | Discovered; full verification not claimed |
| 58:5587 | C23-PREVIEW · Theo dõi hoàn tiền thanh toán thừa | Discovered; full verification not claimed |
| 58:5597 | C24-PREVIEW · Hoàn cọc đã hoàn tất | Discovered; full verification not claimed |
| 58:5607 | C25-CONFIRM · Xác nhận · Đề nghị kết thúc hợp đồng sớm | Discovered; full verification not claimed |
| 58:5616 | C25-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5623 | C26-CONFIRM · Xác nhận · Trao đổi hợp đồng thuê mới | Discovered; full verification not claimed |
| 58:5632 | C26-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5639 | C27-CONFIRM · Xác nhận · Gửi đề nghị bán máy của tôi | Discovered; full verification not claimed |
| 58:5648 | C27-SUCCESS · Đã ghi nhận thành công | Discovered; full verification not claimed |
| 58:5655 | C15-ISSUE · Trao đổi về chứng từ thu mua | Discovered; full verification not claimed |
| 58:5664 | C15-ISSUE-SUCCESS · Đã gửi thông báo cho Moderator | Discovered; full verification not claimed |
| 59:6053 | C18-FRONT · Mô hình nhìn phía trước | Discovered; full verification not claimed |
| 63:11385 | C02-FILTER-1 · Đang hiệu lực | Discovered; full verification not claimed |
| 63:11507 | C02-FILTER-2 · Sắp hết hạn | Discovered; full verification not claimed |
| 63:11642 | C03-FILTER-1 · Smart IoT | Discovered; full verification not claimed |
| 63:11771 | C03-FILTER-2 · Thông thường | Discovered; full verification not claimed |
| 63:11911 | C06-FILTER-1 · Đã cập nhật | Discovered; full verification not claimed |
| 63:12026 | C06-FILTER-2 · Cần hỗ trợ | Discovered; full verification not claimed |
| 63:12155 | C07-FILTER-1 · Chưa thanh toán | Discovered; full verification not claimed |
| 63:12286 | C07-FILTER-2 · Đã thanh toán | Discovered; full verification not claimed |
| 63:12430 | C13-FILTER-1 · Chưa đọc | Discovered; full verification not claimed |
| 63:12557 | C13-FILTER-2 · Đã xử lý | Discovered; full verification not claimed |
| 64:10074 | C35 · Hợp đồng máy thường C-205 | Discovered; full verification not claimed |
| 64:10195 | C35-PREVIEW · Hợp đồng đã ký C-205 | Discovered; full verification not claimed |
| 64:10205 | C36 · Hóa đơn thuê máy thường | Discovered; full verification not claimed |
| 64:10315 | C37 · Gửi chứng từ thuê máy thường | Discovered; full verification not claimed |
| 64:10431 | C37-CONFIRM · Xác nhận gửi chứng từ C-205 | Discovered; full verification not claimed |
| 64:10440 | C37-SUCCESS · Đã gửi chứng từ C-205 | Discovered; full verification not claimed |
| 114:4566 | C38 · Tinh chỉnh Espresso | Discovered; full verification not claimed |
| 114:4681 | C38-60 · Espresso · nước pha 60 ml | Discovered; full verification not claimed |
| 114:4800 | C38-20G · Espresso · cà phê 20 g | Discovered; full verification not claimed |
| 114:4919 | C42 · Tinh chỉnh cà phê sữa tươi | Discovered; full verification not claimed |
| 114:5032 | C42-150 · Cà phê sữa tươi · 150 ml sữa | Discovered; full verification not claimed |
| 114:5145 | C42-MISSING · Chưa thể lưu công thức | Discovered; full verification not claimed |
| 114:22269 | C39-ALT · Đã lưu menu riêng · chưa gửi máy · Cần chốt lưu nháp riêng | Excluded by D-01 |
| 114:22380 | C40 · Đã gửi · chờ máy cập nhật | Discovered; full verification not claimed |
| 114:22489 | C41 · Menu riêng đã được máy áp dụng | Discovered; full verification not claimed |
| 114:22615 | C39-ALT-20G · Đã lưu menu riêng · chưa gửi máy · Cần chốt lưu nháp riêng | Excluded by D-01 |
| 114:22726 | C40-20G · Đã gửi · chờ máy cập nhật | Discovered; full verification not claimed |
| 114:22835 | C41-20G · Menu riêng đã được máy áp dụng | Discovered; full verification not claimed |
| 114:22961 | C39-ALT-MILK · Đã lưu menu riêng · chưa gửi máy · Cần chốt lưu nháp riêng | Excluded by D-01 |
| 114:23072 | C40-MILK · Đã gửi · chờ máy cập nhật | Discovered; full verification not claimed |
| 114:23181 | C41-MILK · Menu riêng đã được máy áp dụng | Discovered; full verification not claimed |
| 114:23307 | C44 · Cập nhật menu cần hỗ trợ | Discovered; full verification not claimed |
| 114:23416 | C38-CONFIRM · Lưu và gửi menu riêng? | Discovered; full verification not claimed |
| 114:23425 | C39-ALT-CONFIRM · Gửi menu riêng đến S-018? · Cần chốt lưu nháp riêng | Excluded by D-01 |
| 114:23434 | C38-20G-CONFIRM · Lưu và gửi menu riêng? | Discovered; full verification not claimed |
| 114:23443 | C39-ALT-20G-CONFIRM · Gửi menu riêng đến S-018? · Cần chốt lưu nháp riêng | Excluded by D-01 |
| 114:23452 | C42-CONFIRM · Lưu và gửi menu riêng? | Discovered; full verification not claimed |
| 114:23461 | C39-ALT-MILK-CONFIRM · Gửi menu riêng đến S-018? · Cần chốt lưu nháp riêng | Excluded by D-01 |
| 114:23470 | C38-DISCARD · Bỏ bản chỉnh sửa riêng? | Discovered; full verification not claimed |
| 142:5247 | C17-APPLIED-60 · Giám sát menu riêng đã áp dụng | Discovered; full verification not claimed |
| 142:5407 | C28-APPLIED-60 · Menu riêng đã áp dụng | Discovered; full verification not claimed |
| 142:5537 | C17-APPLIED-20G · Giám sát menu riêng đã áp dụng | Discovered; full verification not claimed |
| 142:5697 | C28-APPLIED-20G · Menu riêng đã áp dụng | Discovered; full verification not claimed |
| 142:5827 | C17-APPLIED-MILK · Giám sát menu riêng đã áp dụng | Discovered; full verification not claimed |
| 142:5987 | C28-APPLIED-MILK · Menu riêng đã áp dụng | Discovered; full verification not claimed |
| 156:5658 | C38-BOTH · Espresso · 20 g + 60 ml | Discovered; full verification not claimed |
| 156:5777 | C38-BOTH-CONFIRM · Lưu và gửi menu riêng | Discovered; full verification not claimed |
| 156:5786 | C40-BOTH · Đã gửi · chờ máy cập nhật | Discovered; full verification not claimed |
| 156:5895 | C41-BOTH · Menu riêng đã được máy áp dụng | Discovered; full verification not claimed |
| 156:6020 | C17-APPLIED-BOTH · Giám sát menu riêng đã áp dụng | Discovered; full verification not claimed |
| 156:6091 | C28-APPLIED-BOTH · Menu riêng đã áp dụng | Discovered; full verification not claimed |
| 180:6190 | C38-EDIT-APPLIED-60-TO-20G · Espresso | Discovered; full verification not claimed |
| 180:6252 | C38-EDIT-APPLIED-60-TO-20G · Xác nhận | Discovered; full verification not claimed |
| 180:6259 | C40-EDIT-APPLIED-60-TO-20G · Chờ máy | Discovered; full verification not claimed |
| 183:6186 | C41-EDIT-APPLIED-60-TO-20G · Máy đã xác nhận | Discovered; full verification not claimed |
| 186:6118 | C38-DISCARD-FROM-APPLIED-MENU · Bỏ thay đổi? | Discovered; full verification not claimed |
| 187:6111 | C38-EDIT-APPLIED-MILK-120-TO-150 · Cà phê sữa tươi | Discovered; full verification not claimed |
| 193:6168 | C42-MILK-FROM-APPLIED · Xác nhận | Discovered; full verification not claimed |
| 193:6175 | C40-MILK-FROM-APPLIED · Chờ máy | Discovered; full verification not claimed |
| 193:6235 | C41-MILK-FROM-APPLIED · Máy đã xác nhận | Discovered; full verification not claimed |
| 193:6312 | C17-MILK-FROM-APPLIED · Giám sát | Discovered; full verification not claimed |
| 193:6383 | C28-MILK-FROM-APPLIED · Menu riêng | Discovered; full verification not claimed |
| 211:6404 | C45 · Thêm món riêng từ menu Dolores | Discovered; full verification not claimed |
| 211:6461 | C46 · Món riêng chưa được máy hỗ trợ | Discovered; full verification not claimed |
| 211:6518 | C45-CONFIRM · Gửi món riêng tới máy | Discovered; full verification not claimed |
| 211:6525 | C47 · Món riêng đang chờ máy xác nhận | Discovered; full verification not claimed |
| 211:6582 | C48 · Món riêng đã áp dụng trên máy | Discovered; full verification not claimed |
| 211:6660 | C45-INGREDIENTS · Thành phần cho món riêng | Discovered; full verification not claimed |

