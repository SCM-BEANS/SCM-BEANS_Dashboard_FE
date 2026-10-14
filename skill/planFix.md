# Dolores — kế hoạch sửa lỗi frontend

Ngày: 03/10/2026 (Asia/Bangkok). Trạng thái: **Đã được người dùng duyệt và đã triển khai các phần rõ yêu cầu; xem kết quả và phần còn chờ tại mục 8**.

Đã review lại theo xác nhận mới: **hiện tại dự án chỉ có frontend, dùng dữ liệu ảo và chưa cần phân quyền**. Yêu cầu này thay thế các tiêu chí production/authorization trong kế hoạch trước.

Nguồn: [report.md](report.md), `dolores-start-update`, `dolores-review`, `dolores-testing`, quyết định D-01 và yêu cầu mới về menu Cửa hàng.

Checkout: `L:/capstone prj/fe main/SCM-BEANS_Dashboard_FE`.
Baseline hiện tại: `a2bbe4766d1f3c0430939d498ea3c027f0a8eed9`.

## 1. Phạm vi và điều kiện bắt đầu

- Sửa các lỗi frontend F01–F09: điều hướng, trạng thái, validation, HTML/hydration, dữ liệu mô phỏng, điều kiện thao tác, thuộc tính giao diện và công cụ lint.
- Thêm N01: Admin chỉ sáng mục điều hướng tương ứng với trang đang xem; Cửa hàng không được cố định sáng khi đang ở mục khác.
- Lượt lập kế hoạch trước đã đọc code, kiểm thử localhost và tạo bằng chứng. Lượt review lại này chỉ chỉnh `planFix.md`; chưa sửa code ứng dụng, dependency, Figma hoặc cấu hình.
- Chỉ bắt đầu implementation sau khi người dùng xác nhận kế hoạch. Không tự commit, push hoặc deploy.
- Giới hạn thay đổi giao diện ở dashboard PC. Giữ landing/public/auth và dashboard cũ ngoài phạm vi; kiểm tra cả ảnh hưởng gián tiếp của shared component, CSS và font.
- D-01 đã chốt: lưu và gửi menu riêng trong một thao tác với một xác nhận; trong bản frontend, thao tác này ghi dữ liệu ảo ở trạng thái pending, chỉ applied sau mô phỏng xác nhận từ máy. Không mở lại lựa chọn draft riêng.
- Sáu node Customer `114:22269`, `114:22615`, `114:22961`, `114:23425`, `114:23443`, `114:23461` tiếp tục excluded by D-01.
- Toàn bộ dữ liệu là fixture/dữ liệu ảo; thay đổi trong demo dùng React state và localStorage khi cần giữ qua reload. Không yêu cầu backend, API, đăng nhập, phân quyền hoặc tenant isolation để nghiệm thu đợt này.
- Các màn Admin/Moderator/Technician/Customer là các luồng giao diện để xem và test trực tiếp. Giữ các route truy cập được; không thêm middleware, permission guard, auth redirect hoặc chặn chuyển vai trò.
- Điều kiện thao tác như hóa đơn còn chỉnh sửa, đủ nguyên liệu, kết quả thu hồi đã có và pending/applied là logic UI trên dữ liệu ảo theo Figma; vẫn cần hoạt động đúng dù chưa có phân quyền.
- ID khách hàng/cửa hàng/máy/hợp đồng chỉ dùng để chọn và liên kết đúng bản ghi ảo. Không xây session, owner authorization hoặc hệ thống multi-tenant.

### Kết quả review lại phạm vi

F01–F09 và N01 vẫn có giá trị ở bản frontend: URL phải khớp màn, input lỗi phải bị chặn, dữ liệu đã nhập phải hiển thị đúng, reload phải giữ trạng thái demo cần thiết và menu phải sáng đúng mục. F03/F05 được giới hạn ở persistence và trao đổi dữ liệu cục bộ giữa các màn, không phải gửi máy hoặc xử lý nghiệp vụ thật. R01 trong report **không phải lỗi cần sửa hoặc blocker của bản frontend hiện tại**. Các bằng chứng browser bên dưới được giữ nguyên từ lượt trước; lượt chỉnh kế hoạch này không chạy lại browser và không thay code ứng dụng.

## 2. Kiểm thử browser bổ sung trước khi lập kế hoạch

Đã mở browser thật và thao tác trên `http://127.0.0.1:3000`, Next dev, tab kiểm thử riêng. Không dùng production, không gửi lệnh máy hoặc thực hiện khoản thanh toán. Hai thao tác xác nhận Moderator/Customer chỉ ghi demo localStorage theo code đã đọc. Các dialog Admin và hóa đơn chỉ mở để kiểm tra, chưa xác nhận tạo tài khoản hoặc xử lý bill.

Ảnh mới dùng kích thước browser mặc định, không dùng để đo sai lệch pixel so với Figma. Kết quả visual 1440 × 920 trong report là bằng chứng từ lượt review trước; chưa làm mới toàn bộ Figma hoặc kiểm thử toàn bộ các khung trong lượt này.

| Case mới | Thao tác | Kết quả quan sát | Trạng thái |
| --- | --- | --- | --- |
| B01 — N01 | Từ /admin bấm Tài khoản, đợi nội dung Tài khoản xuất hiện | Tài khoản và Cửa hàng đều có nền `rgb(249,233,234)`; chỉ Tài khoản có aria-current=page | Fail |
| B02 — F07 | Tạo tài khoản → Khách hàng → xóa họ tên, email `khong-phai-email` → Tạo tài khoản khách hàng | Vẫn mở dialog xác nhận với email sai và tên trống | Fail |
| B03 — F06 | /moderator/invoices/late-cups → chọn Đã hoàn tất → Tính lại & gửi bản mới | Vẫn mở xác nhận tính lại; không chuyển sang nhánh cộng kỳ sau | Fail — UI guard |
| B04 — F01 | /admin/menu → Mở menu & danh sách món | URL đổi sang ?view=items; nội dung vẫn Global Menu & công thức và bảng menu | Fail |
| B05 — F04 | Mở /technician/tasks/retrieval; đọc console | div nằm trong p và Hydration failed, React tạo lại subtree | Fail |
| B06 — F02 | /moderator/menu/add → xóa Sữa tươi → Lưu món → Xác nhận | Dialog Đã ghi nhận trên bản xem trước; không chặn thiếu sữa | Fail — demo |
| B07 — D-01 | /dashboard/menu/espresso → 20 g + 60 ml → Lưu & gửi → Xác nhận | Hiển thị Đã gửi · chờ máy cập nhật, chưa applied | Pass — demo submission |
| B08 — F03 | Tải lại sau B07 | Trở lại edit 18 g + 40 ml; mất pending và công thức vừa gửi trên UI | Fail |
| B09 — N01 phụ | Mở /admin/notifications | Sidebar Tổng quan + Cửa hàng sáng; breadcrumb Admin / Tổng quan dù là trang Thông báo | Quan sát xác nhận; đề xuất thay đổi cần duyệt |

Tổng bổ sung: **1 pass, 7 fail và 1 quan sát cần duyệt**. Không phải tổng test coverage của dashboard. F05 vẫn dựa trên static code và kiểm thử marker xuyên vai trò ở report; F08/F09 dựa trên bằng chứng review trước, chưa chạy lại lint/build trong lượt lập kế hoạch.

### Bằng chứng mới

- [Tài khoản nhưng Cửa hàng vẫn sáng](planFix-evidence/admin-users-store-active.png).
- [Tên trống/email sai vẫn mở xác nhận](planFix-evidence/admin-invalid-account-confirm.png).
- [Bill hoàn tất vẫn mở tính lại](planFix-evidence/moderator-final-bill-recalculate.png).
- [URL query đổi nhưng màn không đổi](planFix-evidence/admin-query-stale.png).
- [Lỗi console/hydration](planFix-evidence/browser-errors.json).
- [Thiếu sữa vẫn success](planFix-evidence/moderator-missing-milk-success.png).
- [Customer pending](planFix-evidence/customer-pending.png) và [reset sau reload](planFix-evidence/customer-reload-reset.png).

## 3. Thứ tự triển khai đề xuất

| Đợt | Công việc | Phụ thuộc | Điều kiện đóng đợt |
| --- | --- | --- | --- |
| 1 | N01 sidebar, F01 route/view, F04 hydration | Người dùng duyệt | Điều hướng chính đúng, không còn hydration error tại màn bị ảnh hưởng |
| 2 | F07 Admin validation; mô hình dữ liệu chung F05; F02 Moderator validation | Đợt 1, schema form/fixture | Dữ liệu lỗi bị chặn; confirm/cancel và kết quả demo dùng đúng payload |
| 3 | F03 Customer persistence/xác nhận máy mô phỏng; F05 Technician → Moderator; F06 late cups | Demo store và form của đợt 2 | Khôi phục trạng thái đúng, điều kiện UI theo hồ sơ ảo, không nhầm pending/applied |
| 4 | F08 visual theo node đã chứng minh; F09 lint tương thích | Các state ổn định; font và dependency được xác minh | So ảnh/thuộc tính đạt phạm vi đã sửa; lint chạy thật trên source |
| 5 | Browser regression, typecheck/lint/build, review cuối | Các đợt được duyệt hoàn thành | Mỗi finding có kết quả riêng và bằng chứng; ghi rõ blocked/not run |

Không sửa toàn bộ 367 frame chỉ vì đã có inventory. Với từng đợt, bổ sung mapping node → route → component → state/đích liên quan, đọc lại source Figma cho phần sửa trước implementation. Nếu source mâu thuẫn hoặc thiếu flow, dừng quyết định đó và hỏi người dùng.

## 4. Kế hoạch sửa chi tiết

### N01 — Trạng thái sáng của menu Admin

**File chính:** `src/components/dolores/DoloresShell.tsx`.

Nguyên nhân đã xác định: `isPinned = role === "admin" && item.label === "Cửa hàng"`; `isActive = isCurrent || isPinned`. Ngoài ra selectedItem dùng prefix cho breadcrumb nhưng isCurrent chỉ so exact, nên trang con có thể không sáng mục cha.

Đề xuất:

1. Bỏ quy tắc luôn sáng Cửa hàng. Dùng một selectedItem chung cho nền active, màu chữ và aria-current.
2. Match route exact trước; trang con match prefix có ranh giới `/`, chọn nhánh dài nhất; route Tổng quan chỉ match exact. Query không làm thay đổi mục cha.
3. Cửa hàng chỉ sáng trong phạm vi /admin/stores. Kiểm tra tất cả 10 mục Admin, chuyển giữa các mục, reload, Back/Forward và query view.
4. **Đề xuất bổ sung cần người dùng duyệt:** bỏ alias /admin/notifications → /admin, để Thông báo sáng và breadcrumb là Thông báo. Đây là thay đổi hành vi rõ ràng, không tự xem là Figma đã yêu cầu.
5. Không tự thay alias Customer /dashboard/support/menu → Menu của tôi. Nếu chỉnh resolver dùng chung thì kiểm tra cả ba vai trò còn lại để giữ mapping đã chốt.

**Nghiệm thu:** mỗi route Admin hợp lệ có đúng một mục active; visual active và aria-current thống nhất; Cửa hàng không sáng tại Tài khoản/Menu/Báo cáo/Thông báo. Route con giữ mục cha tương ứng; không match nhầm prefix gần giống.

Lưu ý: report ghi hai mục sáng tại A01 cũng có trong ảnh Figma. N01 là yêu cầu sửa tương tác mới của người dùng; cần lưu lại ngoại lệ này trong mapping, không chỉnh file Figma.

### F01 — Đồng bộ URL và màn Admin

**Files:** `AdminMenuScreens.tsx`, route `src/app/(admin)/admin/menu/page.tsx`; audit `AdminStoreScreens.tsx`, `AdminContractScreens.tsx`, `AdminMachineScreens.tsx`, `AdminReportScreens.tsx`, `AdminAccountScreens.tsx` và route tương ứng.

1. Chọn route/query làm nguồn của view có địa chỉ; UI nội bộ như dialog và dữ liệu đang edit quản lý riêng. Không sửa bằng cách ép remount toàn component rồi vô tình mất form.
2. Xác định view nào là route, view nào là overlay; mọi đường Next Link, nút nội bộ và query trực tiếp phải render cùng state tương ứng.
3. Đồng bộ coffee/water và ID hồ sơ theo entry view/record đúng lúc, không reset trên mỗi render. Kiểm tra query không hợp lệ bằng allowlist hiện có, không invent route.
4. Các component khác cùng `useState(initialView)` chỉ là đối tượng audit; chỉ sửa khi chứng minh đường chuyển bị lỗi.

**Nghiệm thu:** A19 `80:17887` → A20 `80:17996` đổi cả URL và bảng/heading; reload, direct link, Back/Forward đúng; cancel edit giữ dữ liệu theo flow; chuyển hồ sơ không dùng nhầm draft.

### F04 — HTML hợp lệ và hydration

**Files:** `DoloresUI.tsx` (DoloresNotice), `TechnicianDashboardScreens.tsx` (Timeline), các nơi dùng Notice.

1. Container children của Notice phải hỗ trợ ReactNode dạng block; giữ typography, spacing và accessible semantics phù hợp.
2. Audit children và nested markup tại tất cả call sites. Giữ thay đổi trong Dolores component.
3. Đọc console trong lần mở trực tiếp và lần reload để tránh chỉ kiểm tra client navigation.

**Nghiệm thu:** T05 `13:457` và các Timeline liên quan không còn p/div nesting hoặc hydration mismatch; giao diện và thao tác không lệch sau đổi markup.

### F07 — Validation tài khoản Admin

**File:** `AdminAccountScreens.tsx`; node A03 `10:247`, error `58:309`.

1. Quản lý giá trị form thực; kiểm tra required và email trước mở confirm, kiểm tra lại payload khi xác nhận.
2. Map lỗi về state và copy Figma. Liên kết lỗi với field, đưa focus đến lỗi; chỉ kiểm tra required/định dạng cần cho flow, không kiểm tra tài khoản thật, mật khẩu hoặc email trên server.
3. Preview confirm hiển thị đúng dữ liệu vừa nhập. Hủy không tạo/lưu; hợp lệ mới tạo/cập nhật bản ghi tài khoản ảo và hiển thị kết quả demo ở màn liên quan. Không tạo tài khoản đăng nhập thật.
4. Áp dụng form Customer/Moderator/Technician theo schema tương ứng; không thêm lựa chọn tạo Admin.

**Nghiệm thu:** blank, whitespace, email sai bị chặn; dữ liệu hợp lệ được confirm đúng; sửa lỗi và gửi lại được; loại tài khoản/cửa hàng đã chọn không đổi ngoài ý muốn. Không test quyền truy cập của tài khoản.

### F05 + F02 — Payload form và validation Moderator

**Files:** `ModeratorDashboardScreens.tsx` (ActionForm), `TechnicianDashboardScreens.tsx` (JobForm), `demoFlowStore.ts`; có thể tách module schema/data trong `src/components/dolores/` nếu cần.

1. Bổ sung field ID ổn định, giá trị, validation và options đúng form vào cấu trúc hiện có. Chỉ tách schema/component khi cần cho các màn bị lỗi, không xây lại toàn bộ framework form.
2. Theo dõi cả text/select/file; payload confirm/success lấy từ dữ liệu thực. Loại bỏ options trạng thái chung không thuộc từng form.
3. Tạo cấu trúc dữ liệu ảo có kiểu, record ID, status và payload; chỉ thêm ID liên quan mà flow thực sự dùng. Chọn bản ghi theo máy/hợp đồng/task để tránh lẫn dữ liệu giữa các màn. Technician và Moderator cùng đọc kết quả của một hồ sơ demo; không chia storage theo quyền/người đăng nhập.
4. Marker v1 cũ không chứng minh payload hợp lệ hoặc acknowledgement. Không xóa storage người dùng tự động; xử lý tương thích an toàn, không mở guard chỉ từ marker thiếu kết quả.
5. Đọc/ghi storage có xử lý JSON sai, schema không hợp lệ và không ghi được. Không hiện success nếu thực tế lưu thất bại. Nếu Figma chưa có nhánh lỗi tương ứng, hỏi trước khi thiết kế UI mới.
6. F02: món cà phê sữa tươi phải có sữa theo M51-MISSING `81:14870`; validation nối vào Lưu món và Xác nhận. Chặn empty/whitespace/giá trị không hợp lệ theo quy tắc nguồn, không tự đặt giới hạn phần cứng.
7. Chọn tệp chỉ mô phỏng đính kèm: giữ tên/loại/kích thước để hiển thị và kiểm tra required. Không gửi tệp lên server, không lưu binary vào localStorage, không yêu cầu endpoint upload. Nếu dùng preview trong phiên thì quản lý và giải phóng object URL phù hợp.
8. Technician lưu lựa chọn tình trạng, ghi chú/linh kiện và đánh giá; Moderator hiển thị đúng kết quả liên quan trước khi mở quyết toán. Guard kiểm tra kết quả hợp lệ của đúng task/máy/hợp đồng.
9. Dùng demo store hiện có cho cập nhật cùng tab và khi chuyển màn/reload; dữ liệu không đọc từ window trong render SSR gây mismatch. Đồng bộ tab khác chỉ dùng storage event nếu cần để test luồng demo; không thêm server, realtime service hoặc đồng bộ nhiều người dùng.

**Nghiệm thu:** thiếu sữa không confirm/success; text/select được giữ và hiển thị đúng sau reload; cancel không ghi; trạng thái form này không làm đổi hồ sơ ảo khác; trước kết quả Technician thì nút quyết toán chưa mở, sau kết quả hợp lệ mới mở và có nội dung để đọc. Nút quyết toán chỉ cập nhật trạng thái/số liệu ảo, không thực hiện thanh toán.

### F03 — Menu riêng Customer và trạng thái bất đồng bộ

**Files:** `CustomerDashboardScreens.tsx` (MenuEditPage và các màn pending/applied), typed demo store của F05.

1. Lưu bản mô phỏng đã gửi gồm công thức/đơn vị, máy/món, version và pending trong cùng record; không chỉ lưu chuỗi status. Khách hàng/cửa hàng là thông tin fixture để hiển thị và chọn đúng công thức, không dùng làm kiểm tra quyền.
2. Hydrate record sau mount một cách ổn định, tránh flash về default edit khi đã pending. Hiển thị state khôi phục phù hợp source; không tự thêm spinner/trang mới khi chưa duyệt.
3. Pending và applied dùng cùng bản đã gửi; acknowledgement là dữ liệu ảo match đúng máy và version. Giữ nút Mô phỏng xác nhận từ máy hiện có để chuyển trạng thái cục bộ; không đợi máy thật hoặc API.
4. Không tự applied bởi reload, route /menu/applied hoặc timeout. Nếu chưa bấm mô phỏng xác nhận thì vẫn pending; không thay Global Menu bằng dữ liệu private menu.
5. Giữ một confirm lưu & gửi theo D-01. Hủy/bỏ thay đổi không gửi và không ghi đè bản đã gửi; invalid không tạo record pending.
6. Kiểm thử riêng nước 60 ml, cà phê 20 g, sữa 150 ml và kết hợp 20 g + 60 ml; giữ units, ingredients và máy được chọn. Máy thường không có remote menu.

**Nghiệm thu:** 20 g + 60 ml còn nguyên sau reload/navigation; pending trước mô phỏng xác nhận và applied sau mô phỏng đúng phiên bản; reload lần nữa giữ applied; chọn hai máy/hồ sơ fixture không lấy nhầm công thức. Không test tenant isolation hay lệnh máy thật. Các node `114:23416 → 114:22380`, `114:23434 → 114:22726`, `114:23452 → 114:23072`, `156:5777 → 156:5786` được map và thử riêng.

### F06 — Guard xử lý số ly muộn

**File:** `ModeratorDashboardScreens.tsx` (nhánh invoice); M24 `54:4502`, M41 `80:17624`.

1. Tách bill fixture thành dữ liệu có ID, kỳ, payment/reconciliation status, hạn và editable; URL chọn entry scene, không quyết định điều kiện tính lại. Không truy vấn hoặc cập nhật hóa đơn thật.
2. Dùng predicate chung từ dữ liệu bill để chọn hành động và kiểm tra lại tại confirm. Tính lại chỉ khi chưa thanh toán/chưa đối soát, còn hạn, còn chỉnh sửa theo shared guide.
3. Paid/reconciled/finalized hoặc không đủ điều kiện đi nhánh cộng kỳ sau. Không thêm công thức phí, giá/ly hoặc hạn thanh toán mới.
4. Confirm không được giữ hành động cũ khi dữ liệu bill thay đổi; lưu payload/version demo vào đúng hóa đơn. Giữ lịch sử và không ghi đè bản đã chốt.

**Nghiệm thu:** ma trận dữ liệu ảo eligible / paid / reconciled / hết hạn / không editable; B03 không còn mở xác nhận tính lại khi chọn Đã hoàn tất; direct link nhánh cũ vẫn chọn đúng hành động theo fixture. Kết quả chỉ tạo phiên bản hóa đơn/cộng kỳ sau mô phỏng và cập nhật UI.

### F08 — Sửa sai lệch visual đã chứng minh

**Files dự kiến:** `DoloresOverviewPages.tsx`, `DoloresShell.tsx`, `AdminMenuScreens.tsx`, `CustomerDashboardScreens.tsx` và Dolores UI cần thiết; chỉ sửa nơi mapping nguồn xác nhận.

1. Đọc lại screenshot/properties nguồn A01 `10:49`, A22-CONFIRM `81:15078` và exact Customer modal trước sửa. Không lấy typography Admin áp cho mọi modal khi chưa đối chiếu source riêng.
2. Sửa fill vùng nội dung A01, khoảng cách/panel geometry, chi tiết 16px theo nguồn; điều chỉnh layout theo cấu trúc, không đặt offset y cố định để che nguyên nhân.
3. Admin A22: title 26px, body 16px, eyebrow 14px theo report, xác minh lại trước áp dụng; so cả line-height, width, wrapping, spacing, buttons và overlay.
4. Chụp app/Figma cùng viewport 1440 × 920 và cùng state với font nguồn đã tải. Nếu font vẫn fallback, ghi visual blocked/qualified; không tuyên bố pixel-perfect.
5. Không đổi global CSS hoặc font root để sửa riêng dashboard. Việc vendoring/font root là đề xuất ngoài core cần duyệt riêng nếu cần; lỗi Google Fonts trong build ở report hiện là blocker môi trường, chưa đủ cơ sở kết luận cần đổi mã.

**Nghiệm thu:** các sai lệch có số đo/node nguồn được xử lý, có ảnh trước/sau; landing và các dashboard không thuộc phạm vi không bị đổi bởi shared styles. Không dùng một ảnh để chứng nhận toàn bộ 361 khung ứng viên.

### F09 — Lint chạy thật trên source

**Files dự kiến:** `package.json`, ESLint config hiện có hoặc config tối thiểu nếu chưa có; lockfile chỉ khi thay dependency được duyệt.

1. Kiểm tra dependency thực tế và cấu hình ESLint. Repo manifest hiện Next 16.2.9, ESLint 8, eslint-config-next 14.2.3: cần xác minh tương thích trước chọn config.
2. Thay `next lint` bằng ESLint CLI phù hợp, scope/ignore đúng (node_modules, .next, generated files). Không tắt hàng loạt rules hoặc dùng ignore để che lỗi source.
3. Ưu tiên dependency đang có nếu chạy tương thích. Nếu cần đổi phiên bản/config package, trình bày exact diff và xin xác nhận trước cài; không mặc định nâng framework/testing stack.
4. Phân biệt lỗi tooling, lỗi source mới và lỗi có sẵn. Không auto-fix cả repo ngoài phạm vi.

**Nghiệm thu:** `npm run lint` thực sự lint source và exit code phản ánh kết quả; typecheck không regress. Production build chỉ pass khi chạy thành công; nếu font/network còn chặn thì ghi blocked riêng.

## 5. Test và review sau implementation được duyệt

Không cài stack kiểm thử mới mặc định. Dùng môi trường local và browser; nếu có framework sẵn thì thêm case nhỏ phù hợp sau khi kiểm tra cấu hình. Mỗi case ghi Expected/Actual/Pass/Fail/Blocked/Not run và evidence.

| Nhóm | Kiểm tra bắt buộc |
| --- | --- |
| Sidebar | 10 mục Admin, Cửa hàng, Notifications nếu được duyệt; exact/nested/query, Back/Forward, reload; smoke ba vai trò còn lại |
| View | A19 → A20 bằng click, direct URL, reload và history; các Admin initialView có đường chuyển bị ảnh hưởng |
| Form | Empty/whitespace/email sai/thiếu sữa; sửa lỗi → hợp lệ; confirm payload; cancel/back; không có success khi chưa ghi được |
| Persistence | Reload pending/applied/form result; JSON hỏng/record sai version; chọn hồ sơ ảo khác không kế thừa nhầm trạng thái; liên kết đúng giữa các màn |
| Customer D-01 | 4 biến thể; một confirm, invalid/cancel không ghi bản gửi ảo; pending trước mô phỏng ack; ack đúng version mới applied; máy thường không có remote menu |
| Technician/Moderator | Direct load + reload không hydration; payload đánh giá ảo thấy ở Moderator; điều kiện nút trước/sau kết quả và record sai |
| Late cups | Eligible, paid, reconciled, hết hạn, không editable; đổi trạng thái khi confirm; carry-forward đúng hồ sơ/kỳ |
| Visual | A01/A22 và exact states bị sửa, matching viewport/font; screenshot source/app và thuộc tính |
| Tooling | `node node_modules/typescript/bin/tsc --noEmit --incremental false`; `npm run lint` sau sửa; `npm run build` với ghi nhận font/network |
| Preservation | Git diff với baseline lượt sửa; smoke landing/public/auth và các route dashboard cũ; không global CSS/font/redirect side effect |

Tất cả case nghiệp vụ dùng dữ liệu ảo trong browser. Không có case yêu cầu đăng nhập, từ chối truy cập khác vai trò, cách ly tenant, gọi API hoặc xác minh giao dịch/thiết bị thật. Truy cập trực tiếp cả bốn nhóm màn là hành vi mong muốn ở giai đoạn này; chỉ kiểm tra nội dung và liên kết đúng theo nhóm màn đang xem.

Review cuối chạy theo `dolores-review`: chỉ đóng finding khi có bằng chứng tương ứng; thống kê phạm vi thực tế đã sửa và đã test, không suy tỷ lệ hoàn thành từ số component/route.

## 6. Ngoài phạm vi, không phải điều kiện nghiệm thu

- R01 phân quyền/tenant trong report được loại khỏi danh sách fix hiện tại theo xác nhận người dùng. Không thêm đăng nhập, permission guard, tenant isolation, session hoặc chỉnh auth/proxy để hạn chế route. Không yêu cầu giải quyết R01 để hoàn thành bản frontend dữ liệu ảo.
- Backend/API thật cho account/upload/billing/IoT/menu/machine acknowledgement và giao dịch thật không được triển khai, không nằm trong test, không là blocker. Các flow tương ứng chỉ mô phỏng trên fixture/state/localStorage.
- Các flow chưa map hết, toàn bộ 367 raw frames, mobile, landing redesign.
- Sửa font/root layout để build offline hoặc thay dependency vượt cấu hình lint tối thiểu: cần duyệt phương án cụ thể trước thực hiện.

## 7. Xác nhận cần có trước khi sửa

1. **Duyệt kế hoạch core:** N01 bỏ Cửa hàng cố định sáng; F01–F09 cho frontend dữ liệu ảo theo các bước và giới hạn trên. Việc người dùng xác nhận chưa cần phân quyền là chốt phạm vi, chưa phải cho phép sửa implementation.
2. **Duyệt riêng N01 phụ:** trang Admin Thông báo sáng mục Thông báo và breadcrumb Thông báo, thay alias hiện tại về Tổng quan. Nếu chưa duyệt, chỉ sửa phần Cửa hàng và giữ alias.
3. Dependency/font ngoài core: chỉ hỏi khi có phương án exact và ảnh hưởng được xác định. Không hỏi thêm về API/auth trong đợt này vì người dùng đã xác nhận frontend dữ liệu ảo và chưa cần phân quyền.

Sau khi được duyệt: thực hiện từng đợt, báo file/state đã thay đổi, chạy test liên quan và trả review thực tế. Nếu phát hiện quyết định Figma chưa rõ, tiếp tục phần độc lập và hỏi phần bị ảnh hưởng trước thay đổi.

## 8. Kết quả triển khai sau khi người dùng duyệt

Người dùng đã trả lời **“duyệt”** và yêu cầu tiếp tục. Lượt triển khai này sửa frontend dữ liệu ảo, gồm core và Thông báo Admin. Các mục 1–7 giữ lại nội dung kế hoạch/bằng chứng trước sửa để đối chiếu; trạng thái “chờ duyệt” trong các mục cũ không còn áp dụng cho core.

### Thay đổi đã làm

| Finding | Implementation | Kết quả kiểm tra |
| --- | --- | --- |
| N01 | Một resolver cho nền active, chữ và aria-current; bỏ Cửa hàng cố định sáng; Notifications có breadcrumb đúng; giữ alias Customer support/menu | 10 mục Admin được bấm và kiểm tra trên browser; đúng một mục sáng |
| F01 | View Admin dùng query làm nguồn; Back/Forward đồng bộ; đóng overlay khi đổi entry view; query account giữ hồ sơ đang chọn khi reload | Menu, Store, Contract, Machine, Report và hồ sơ tài khoản đã thử trên browser |
| F02 | Validation định lượng, chặn sữa thiếu/0/giá trị không hợp lệ trước confirm và trước ghi; giữ payload sau reload | Thiếu sữa bị chặn; nhập 150 ml lưu và khôi phục được |
| F03 | Record riêng cho Espresso/sữa của S-018; giữ payload/version/pending/applied và bản đã được xác nhận trước đó; acknowledgement phải match phiên bản/payload; bảng menu đọc trạng thái thực | 4 biến thể định lượng, cancel, invalid, pending reload, applied reload và bảng tổng hợp đã thử |
| F04 | Notice chứa nội dung bằng div, không bọc Timeline div trong p | Console trong browser kiểm thử không ghi nhận hydration error; còn warning scroll-behavior ở root ngoài phạm vi |
| F05 | Store schema v2, đọc JSON/schema lỗi an toàn, hook đồng bộ cùng tab; form giữ text/select và metadata tệp; kết quả/ghi chú/linh kiện Technician có payload; Moderator đọc đúng dữ liệu trước quyết toán | Thu hồi S-018 → Moderator → nút quyết toán; sửa chữa CF-STD-026 → lịch sử/Moderator đã thử. Marker v1 và sai máy không mở guard trong kiểm tra logic |
| F06 | Điều kiện từ trạng thái/editable/hạn của bill fixture; confirm cũ đóng khi status đổi; lưu payload và lịch sử; carry-forward giữ phiên bản hóa đơn đã chốt | 6 trạng thái trên UI; reload giữ 145 ly; lịch sử chứa payload; predicate kiểm tra riêng quá hạn/không editable |
| F07 | Schema/validation tên và email; modal thiếu thông tin theo 58:309; confirm/cancel và account payload; query giữ lựa chọn hồ sơ | Invalid bị chặn; tài khoản Demo Review được lưu/reload và mở đúng hồ sơ |
| F08 | A01 main trắng, title/description gap 20, metrics 110, panel gap 16, detail 16px; A22-CONFIRM và Customer combined confirm 26/16/14, width 580, padding 32, gap 20; style mới chỉ áp cho dialog đã đối chiếu | Thuộc tính CSS và ảnh 1440 × 920 đã kiểm tra. **Visual qualified: font fallback**, không tuyên bố pixel-perfect |
| F09 | ESLint CLI thay next lint; config dùng dependency đã có, không thay lockfile | Lint exit 0: 0 error, 1 warning MFA có sẵn; typecheck exit 0 |

F01/F05 còn bổ sung ID account trong query và cho fixture máy CF-STD-026 mở template lịch sử hiện có tại /technician/history/CF-STD-026. Lý do: reload không quay sang tài khoản mặc định, và kết quả sửa chữa không mở nhầm hồ sơ S-018. Không thêm page layout mới.

### Bằng chứng và phạm vi kiểm tra thực tế

- [44 kiểm tra browser, có cả các lần recheck](planFix-evidence/post-fix-browser-tests.json): kết quả cuối đều Pass. Đây là các kiểm tra trong phạm vi sửa, không phải 44 frame độc lập hoặc toàn bộ dashboard.
- [16 kiểm tra store/guard](planFix-evidence/store-guard-tests.json): Pass. Chạy mã TypeScript thật sau transpile với localStorage mô phỏng; bao gồm lỗi ghi, JSON hỏng, schema version sai, marker cũ, sai máy và điều kiện bill. Không coi đây là browser test của lỗi storage.
- [Console browser](planFix-evidence/post-fix-browser-logs.json): không error trong phiên đã lưu; warning root scroll-behavior còn có sẵn.
- [Smoke preservation](planFix-evidence/preservation-smoke.json): /, /products, /login, /inventory đều render nội dung. Diff không sửa landing/public/auth, root layout, global CSS, middleware/proxy hoặc lockfile. Đây là smoke và kiểm tra diff, không phải full regression các trang này.
- [A01 sau sửa 1440 × 920](planFix-evidence/fixed-admin-overview-1440.png): chart panel y≈332.34, main trắng, panel gap 16px; detail 16px. Font nguồn chưa tải được.
- [A22 confirm](planFix-evidence/fixed-admin-a22-confirm-1440.png), [Customer combined confirm](planFix-evidence/fixed-customer-confirm-1440.png): heading/body/eyebrow 26/16/14px, width 580px.
- [Notifications active đúng](planFix-evidence/fixed-admin-notifications-1440.png), [Customer pending sau reload](planFix-evidence/fixed-customer-pending-reload.png), [Technician payload tại Moderator](planFix-evidence/fixed-technician-moderator-payload.png).

Figma được đọc lại, không chỉnh sửa: A01 10:49; A19/A20 80:17887/80:17996; A22-CONFIRM 81:15078; error 58:309; Moderator missing ingredient 81:14870, late-cups 54:4502 và 80:17624; Technician retrieval 13:457; Customer combined/pending 156:5777 → 156:5786 cùng các biến thể D-01. Sáu node excluded của D-01 giữ nguyên.

### Tooling và các giới hạn còn lại

- node node_modules/typescript/bin/tsc --noEmit --incremental false: **Pass, exit 0**.
- npm run lint: **Pass, exit 0**, còn warning next/no-img-element tại src/components/mfa/MfaSetupForm.tsx:154 ngoài phạm vi.
- npm run build: **Blocked, exit 1** do next/font không fetch được Inter và Playfair Display từ Google Fonts. Root/font không bị sửa. Không khẳng định build thành công hoặc compilation production đã hoàn tất.
- Nhánh **thông báo lỗi localStorage: Blocked on decision**. Đã hỏi duyệt Notice “Chưa thể lưu dữ liệu demo trong trình duyệt. Vui lòng thử lại.”; chưa nhận xác nhận cụ thể nên chưa thêm UI mới. Các thao tác typed record không chuyển success/pending/applied khi ghi thất bại; giữ màn/confirm hiện tại. Kiểm tra lỗi ghi bằng storage mô phỏng đã Pass; UX thông báo lỗi chưa nghiệm thu.
- Chưa chạy hết mọi form/file-picker, cross-tab hoặc toàn bộ inventory Figma. Không có kiểm thử API, giao dịch, upload hoặc acknowledgement máy thật, vì dự án hiện chỉ frontend dữ liệu ảo.
- Chưa commit, push, deploy hoặc cài/nâng dependency. Dev server do agent mở đã dừng sau kiểm thử.

**Review thực tế:** các lỗi tương tác chính trong phạm vi đã có bằng chứng sửa và recheck. Còn chờ quyết định cho UI lỗi storage và môi trường font để đóng toàn bộ nghiệm thu visual/build. Không đánh dấu toàn bộ dashboard hoàn thành.

### Đề xuất cải thiện chưa áp dụng

1. Duyệt Notice lỗi lưu trữ nêu trên để người dùng biết lý do thao tác chưa hoàn tất.
2. Nếu cần build không phụ thuộc Google Fonts, xem xét font local đúng bản Inter/Playfair Display sau một phương án riêng được duyệt; việc này ảnh hưởng root/public nên chưa sửa.
