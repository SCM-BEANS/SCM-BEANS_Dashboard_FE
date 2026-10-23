# Kế hoạch chuyển Pages Admin và kết nối API

**Workspace:** `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`  
**Nhánh đích:** `ref` (đã kiểm tra tại `b5927cb`)  
**Nguồn hành vi/giao diện:** nhánh `sơn` (đã kiểm tra tại `57ee0ec`)  
**Nguồn cấu trúc:** `C:\GitHub\QLS\QLS_WEB\src` và `MIGRATION_WORKFLOW.md`  
**Trạng thái:** giai đoạn 1 hoàn tất; giai đoạn 2 partial do Dolores không có API tenant để gán Owner; giai đoạn 3 partial do thiếu browser UI desktop/mobile và live read xác thực; giai đoạn 4 partial do chưa có machine record để xác minh detail/telemetry; giai đoạn 5 partial do thiếu browser visual và live read xác thực. Giai đoạn 6 partial: lint, TypeScript, build và 31/31 test Admin đạt; 11 route smoke trả HTTP 200; full suite 31/101 với 70 test legacy lỗi do còn tham chiếu cấu trúc cũ; UI desktop/mobile khi đăng nhập và live data có xác thực chưa được kiểm chứng.

### Tiến độ thực hiện

- **Giai đoạn 1 — hoàn tất (2026-10-23):** route `/admin`, khung điều hướng desktop/mobile, chuyển hướng login theo role, overview từ Dolores. Các mục chưa triển khai vẫn hiện nhưng vô hiệu hóa với lý do rõ ràng; chưa làm logout.
- **Kiểm chứng:** 8 kiểm thử hợp đồng/luồng chính đạt, gồm loading/empty/error/403; lint, TypeScript, build đạt. Browser mở `/admin` bằng phiên admin và hiển thị phản hồi overview thực (4 chỉ số, 7 ngày dùng ly, tài chính VND); thử desktop và mobile 390×844, menu mở/đóng bằng Escape và trả focus. Route `/api/dolores/v1/dashboard/overview` trả 401 khi không có token, đúng bảo vệ backend. Kiểm thử xác nhận refresh đi IDaaS `/api/v1/auth/refresh`, request Dolores được thử lại ở đúng base URL và 401 lặp dừng sau một lần refresh.
- **Review giai đoạn 1:** file mới đúng danh sách đã được duyệt; UI riêng nằm trong `pages/admin`, API/schema/text/routes đúng ranh giới; không thêm dependency, không commit/push, không đưa `.env` vào Git.
- **Giai đoạn 2 — một phần (2026-10-23):** đã thêm đúng 7 file được duyệt cho `/admin/users`, API/schema IDaaS, API/schema tenant Dolores, chữ giao diện và kiểm thử; đã sửa menu/CSS và `admin-shell.tsx` sau khi được cho phép thêm. Trang IDaaS tải được danh sách/chi tiết thật, lọc owner cập nhật URL, bố cục desktop/mobile hoạt động. Các thao tác tạo/sửa/vô hiệu hóa/kích hoạt/cấp lại mật khẩu mới chỉ kiểm tra bằng mock và xác nhận giao diện; không gửi mutation tới backend thật.
- **Kiểm chứng giai đoạn 2:** tổng 13 kiểm thử của giai đoạn 1–2 đạt; lint, TypeScript và build đạt; route `/admin/users` được Next nhận. OpenAPI của Dolores tại `:8082/v3/api-docs` không khai báo `/api/v1/tenants`; request có phiên admin trả 404. UI báo rõ lỗi và vô hiệu hóa chọn tenant cho owner, nên chưa thể xác minh luồng gán tenant. Backend hiện có `/api/v1/profiles` và `/api/v1/contracts/owner/{ownerId}`, nhưng người dùng đã chọn giữ phương án tenant cũ để đổi sau. **Sau đó người dùng yêu cầu rõ tiếp tục phase 3 dù phase 2 còn partial;** phase 2 vẫn giữ trạng thái partial.
- **Giai đoạn 3 — partial (2026-10-23):** sau khi đối chiếu OpenAPI hiện tại, ba trang chuyển sang dữ liệu `OWNER` (`GET /profiles?role=OWNER`), locations theo `ownerId`, và contracts theo API hiện có; đây là cách dùng owner đã được người dùng duyệt riêng cho phase 3. Trang khách hàng có danh sách/tìm/lọc/phân trang, chi tiết và hợp đồng phân trang; trang cửa hàng lọc theo Owner, danh sách partial khi một Owner lỗi, chi tiết và tạo có xác nhận; trang hợp đồng có chi tiết, trạng thái hết hạn, lịch sử máy và tải Blob tài liệu. File mới đúng danh sách 11 file đã duyệt, không thêm thư mục.
- **Kiểm chứng giai đoạn 3:** 6 kiểm thử mới về profile, locations, contracts, 401/403, partial failure, giới hạn 5 request và hủy giữa chừng, cộng các test giai đoạn trước: tổng 19 đạt. `tsc --noEmit`, lint, production build và `git diff --check` đạt; build nhận `/admin/businesses`, `/admin/stores`, `/admin/contracts`. Không gửi thao tác ghi lên backend. OpenAPI live đã đọc, nhưng chưa có live read với phiên xác thực và chưa làm kiểm tra trực quan desktop/mobile; vì vậy phase 3 còn **partial** và phase 4 chưa bắt đầu. Review source không thấy sai lệch cấu trúc/API bổ sung sau các chỉnh sửa cuối.

## Mục tiêu và phạm vi đã xác nhận

Chuyển **toàn bộ khu vực `/admin`** của nhánh Sơn sang Next.js Pages Router trên `ref`, giữ giao diện và luồng hiện có, đồng thời dùng dữ liệu/API thật của hai backend: IDaaS `:4000` cho tài khoản, Dolores `:8082` cho vận hành. Bao gồm `/admin`, `/admin/users`, `/admin/businesses`, `/admin/stores`, `/admin/contracts`, `/admin/machines`, `/admin/machines/[machineId]`, `/admin/iot`, `/admin/menu`, `/admin/reports`, `/admin/notifications`. Không chuyển moderator, technician, customer hay các trang marketing trong kế hoạch này.

Quyết định của người dùng: UI và quy trình theo Sơn; mã mới theo cấu trúc `pages`, `apis`, `schema`, `routes`, `lib`, `text`, `assets` trên `ref`, đối chiếu trách nhiệm với QLS_WEB; chỉ đưa UI vào `components` khi thực sự dùng lại ngoài riêng khu admin. Dùng **chung `src/lib/http.ts`** cho hai backend, không tạo client Axios Dolores riêng. Nếu nút của Sơn chỉ mô phỏng hoặc không có hợp đồng API tương ứng, giữ vị trí/giao diện, vô hiệu hóa và giải thích rõ; không báo thành công giả.

Mỗi file/thư mục mới trong giai đoạn thực hiện phải được báo **đường dẫn chính xác, nhiệm vụ và lý do** rồi chờ người dùng cho phép trước khi tạo. Phê duyệt file kế hoạch này không tự động phê duyệt các file mã được liệt kê dưới đây. Triển khai từng giai đoạn, báo kết quả và hỏi trước khi sang giai đoạn tiếp theo. Đăng xuất vẫn tạm hoãn theo chỉ đạo trước đó.

## Dữ kiện workspace và hạ tầng

- `ref` dùng Next.js 16, React 19, TypeScript, Pages Router; `next.config.js` chỉ nhận file `*.page.tsx`/`*.page.ts` làm route. `src/pages/api/v1/[...path].page.ts` proxy IDaaS; `src/lib/http.ts` có Axios `/api/v1`, bearer token và refresh 401. Login/MFA hiện thành công thì chuyển `/`, chưa đưa admin tới `/admin`.
- `next.config.js` đã có rewrite `/api/dolores/v1/:path*` tới `DOLORES_API_URL/api/v1/:path*`. `.env` cục bộ hiện cấu hình `IDAAS_API_IP_URL` cho IDaaS cổng 4000, fallback `IDAAS_API_LOCAL_URL`, và `DOLORES_API_URL` cho Dolores cổng 8082; `.env` bị Git bỏ qua. Không chép địa chỉ hạ tầng vào mã hoặc public env. Từ môi trường kiểm tra hiện chưa kết nối được hai cổng; cần xác nhận kết nối từ runtime Next trước khi kiểm thử live. Vercel trong `vercel.json` chỉ cấu hình build Next; chưa có bằng chứng môi trường triển khai truy cập được IP riêng này.
- `ref` hiện có `src/pages/home`, `src/pages/auth/login`, `src/apis/auth.api.ts`, `src/schema/auth.schema.ts`, `src/routes/path.ts`, `src/routes/routes.ts`, `src/text`, `src/assets`, `src/components`. Chưa có admin shell hoặc Query provider. TanStack Query, Axios, Zod đã cài sẵn; không dự kiến thêm dependency.
- Nhánh Sơn dùng App Router `src/app/(admin)`, các màn hình `_components`, query hooks, API modules và schema dưới `schemas`. Không bê nguyên file hoặc App Router sang `ref`. QLS_WEB dùng các domain API trong `src/apis`, schema trong `src/schema`, URL trong `src/routes/path.ts`; QLS dùng React Router nên không chép `routes.tsx` hay cơ chế guard của QLS.
- Nguồn hợp đồng: `C:\GitHub\BEANS\mein-idaas\docs\swagger.yaml` cho `/api/v1/admin/users*`; `C:\GitHub\BEANS\dolores_platform\docs\API_REFERENCE.md` và OpenAPI `/v3/api-docs` của đúng deployment cho Dolores. Một số API Dolores cần `tenantId` và có role riêng. IDaaS là nguồn tài khoản; không dùng endpoint `PROFILE_SYNC` nội bộ của Dolores. Không gửi DEVICE/TeleParser credential từ trình duyệt.
- Baseline: `npm.cmd run lint` đạt. `npx.cmd tsc --noEmit --incremental false` hiện lỗi do `tests/dolores-api-types.contract.ts` còn import schema/types đã xóa trong lần chuyển cấu trúc trước; cần sửa kiểm thử cũ theo schema mới, không coi lỗi này là thành công của migration.

## Quyết định kỹ thuật và lựa chọn đã so sánh

| Quyết định | Các cách khả thi và đánh đổi | Kết luận |
| --- | --- | --- |
| Route và mã UI | Chép App Router Sơn: ít viết lại ban đầu nhưng xung đột Pages Router và kiến trúc `ref`. Viết route `*.page.tsx` và UI admin cùng `src/pages/admin`: thêm công chuyển đổi nhưng tương thích QLS-style và dễ kiểm tra từng trang. | Viết lại theo Pages Router, theo lựa chọn kiến trúc người dùng. |
| HTTP hai backend | Axios riêng cho Dolores: cô lập lỗi/cấu hình tốt hơn nhưng thêm client. Dùng chung `src/lib/http.ts` với `baseURL` riêng cho mỗi request Dolores: ít hạ tầng hơn nhưng rủi ro gửi nhầm đích hoặc mất `baseURL` khi retry. | **Dùng chung**, do người dùng chọn. Thêm hằng đích Dolores trong `src/lib/http.ts`; mọi API Dolores phải chỉ rõ `baseURL: '/api/dolores/v1'`, giữ `/api/v1` cho IDaaS. Kiểm thử cả đường request và retry refresh. |
| Server data | `useEffect` riêng từng trang: ít thiết lập nhưng lặp cache/retry, khó fan-out tenant và invalidation. TanStack Query đã có dependency và Sơn đã dùng: thêm một provider, đổi lại quản lý query identity, cancellation và partial failure. | Dùng TanStack Query, collocate hook với trang; chỉ tách helper query/fan-out khi nhiều trang thực sự dùng chung. |
| Chuyển trang | Chuyển cả admin một lượt: ít mốc bàn giao nhưng khó đối chiếu file và rủi ro hồi quy. Chuyển theo nhóm màn hình/API: mỗi giai đoạn chạy và review được. | Chuyển theo giai đoạn, đúng cách làm từng bước người dùng yêu cầu. |
| Hành động không có API | Giữ mô phỏng: tạo cảm giác đã lưu sai thực tế. Ẩn: thay đổi mạnh giao diện Sơn. Vô hiệu hóa có lý do: giữ vị trí và trung thực về trạng thái. | Vô hiệu hóa kèm giải thích, do người dùng chọn. |

## Ranh giới mã dự kiến

```text
src/
  pages/
    _app.page.tsx                 # Mới: Query provider dùng cho admin
    admin/
      admin-shell.tsx             # Mới: khung/sidebar/header chỉ của admin
      admin-shell.module.css      # Mới: style khung admin khi CSS hiện tại không đủ
      admin-queries.ts            # Mới khi cần: query keys, fan-out tenant dùng chung
      index.page.tsx              # /admin
      users.page.tsx              # /admin/users
      businesses.page.tsx         # /admin/businesses
      stores.page.tsx             # /admin/stores
      contracts.page.tsx          # /admin/contracts
      machines/
        index.page.tsx            # /admin/machines
        [machineId].page.tsx      # /admin/machines/:machineId
      iot.page.tsx                # /admin/iot
      menu.page.tsx               # /admin/menu
      reports.page.tsx            # /admin/reports
      notifications.page.tsx      # /admin/notifications
  apis/                            # Mới theo domain thực dùng: users, dashboard,
                                   # tenants, locations, contracts, machines,
                                   # telemetry, recipes, billing, notifications/alerts
  schema/                          # Zod request/response theo cùng domain API
  lib/http.ts                      # Có sẵn: chung Axios, hai base URL rõ ràng
  routes/path.ts                   # Có sẵn: PATH_ADMIN
  routes/routes.ts                 # Có sẵn: dữ liệu navigation admin
  text/admin/admin-messages.ts     # Mới: nhãn/menu/trạng thái/lỗi admin
```

Các route file `*.page.tsx` là entrypoint Next; page-specific JSX, form và hook ở cạnh route. `admin-shell` và query helper chỉ dùng trong admin nên ở `pages/admin`, không đưa vào `components`. API domain ở `apis` chỉ biết HTTP và schema; schema không biết UI; page gọi API qua query/mutation và ánh xạ DTO sang view model. `routes` chỉ giữ URL và navigation, không thay Next route. `assets` chỉ nhận hình mới khi nguồn Sơn thực sự cần; không tạo thư mục mới nếu không có tài sản. Kiểm thử dùng `tests` hiện có; chỉ thêm file test sau khi báo và được duyệt. Danh sách trên là đề xuất theo trách nhiệm, mỗi phase sẽ chốt file thực cần dùng và xin phép từng file/thư mục mới trước khi tạo, không tạo lớp rỗng.

## Ma trận trang và hợp đồng API cần khóa

| Trang | Backend/endpoint gốc cần đối chiếu | Hành vi chính |
| --- | --- | --- |
| `/admin` | Dolores `GET /api/v1/dashboard/overview` | Tổng quan, chu kỳ dữ liệu, không dựng số liệu/charts giả. |
| `/admin/users` | IDaaS `/api/v1/admin/users`, `/{id}`, `/{id}/temporary-password/reissue` | Danh sách, chi tiết, tạo/sửa/vô hiệu hóa/cấp lại mật khẩu theo Swagger và quyền thực. Không hiển thị mật khẩu tạm ngoài luồng được backend định nghĩa. |
| `/admin/businesses` | Dolores `GET /profiles?role=OWNER`, `/profiles/{idaasUserId}`, `/profiles/{idaasUserId}/contracts` | Danh sách, lọc/phân trang và chi tiết owner; hợp đồng owner lấy theo trang. |
| `/admin/stores` | Dolores `/locations?ownerId={ownerId}`, `/locations/{id}`, `POST /locations?ownerId={ownerId}` | Danh sách theo Owner, chi tiết, tạo sau xác nhận; đối chiếu Owner trả về, chặn gửi lại khi kết quả ghi chưa rõ. |
| `/admin/contracts` | Dolores `GET /contracts`, `/contracts/{id}`, expiry-status, machine history, documents | Danh sách theo phạm vi JWT, chi tiết, lịch sử máy và download Blob; chỉ mở write khi đúng API và quyền. |
| `/admin/machines`, detail | Dolores `/machines`, `/{id}`, `/inventory/summary`, maintenance | UUID làm identity API; serial chỉ để hiển thị. |
| `/admin/iot` | Dolores `/telemetry-query/machines/{id}/heartbeats/latest`, `/points` | Dữ liệu gần nhất/điểm theo khoảng; không ngụ ý stream realtime. |
| `/admin/menu` | Dolores `/recipes/global`, `/{id}` | Danh sách/chi tiết/publish/delete nếu API và quyền cho phép; không dùng local recipe thiếu scope. |
| `/admin/reports` | Dolores `/dashboard/overview`, billing invoices | Chỉ tổng hợp số liệu thực; kiểm tra phân trang và đủ dữ liệu trước khi tính tổng. |
| `/admin/notifications` | Dolores notifications và alerts | Danh sách, trạng thái, mark-read/ack chỉ khi đúng quyền/hợp đồng. |

Trước khi gọi mỗi endpoint: đối chiếu method/path, tham số, request/response, phân trang, role, lỗi 401/403/404/422/429/5xx từ Swagger/OpenAPI của deployment; ghi rõ thao tác không hỗ trợ. `tenantId` chỉ lọc dữ liệu, backend vẫn quyết định quyền. Với fan-out locations/contracts, giới hạn tối đa 5 request tenant cùng lúc, query key theo tenant, giữ kết quả thành công khi tenant khác lỗi và cho retry phần lỗi. Với mutation, không optimistic success nếu backend chưa xác nhận; invalidate query liên quan sau thành công. Mọi màn hình có loading/empty/error/forbidden/retry, hỗ trợ bàn phím/focus và desktop/mobile theo Sơn.

## Các giai đoạn

### Giai đoạn 1 — Nền admin và tổng quan

- **Kết quả/phạm vi:** tạo route `/admin`, khung điều hướng admin, role landing sau login và dashboard overview dùng API Dolores. Giữ Home/Login hiện có; chưa tạo các trang admin còn lại. Không thực hiện logout hay đổi backend.
- **Phụ thuộc và ranh giới:** cần xác nhận endpoint overview và vai trò admin; `src/pages/_app.page.tsx` cấp Query provider, `pages/admin` sở hữu shell/UI, `routes` sở hữu URL/navigation, `text/admin` sở hữu chữ. `src/lib/http.ts` dùng chung Axios với base URL Dolores chỉ định, refresh vẫn gọi IDaaS. Chỉ render `/admin` sau khi có session; client guard là UX, quyền thật ở BE.
- **Tác động:** request GET overview qua `/api/dolores/v1`; login admin từ `/` chuyển `/admin`; có file/thư mục mới chỉ sau khi được duyệt. Không ghi dữ liệu backend.
- **Kiểm tra/chấp nhận:** URL `/admin` và menu/desktop/mobile tương ứng Sơn; overview hiển thị dữ liệu thật hoặc trạng thái loading/empty/error/403; request đi 8082, refresh đi 4000 và retry trở lại 8082; lint, typecheck và kiểm thử routing/proxy. 401 không lặp refresh, token không gửi sai đích. Xóa kiểm thử type-contract cũ `tests/dolores-api-types.contract.ts` vì toàn bộ import của nó trỏ tới module đã xóa và không thuộc hợp đồng mới; thay bằng kiểm thử hợp đồng mới theo từng phase khi có mã thật, không để typecheck đỏ kéo dài.
- **Điều kiện vào/ra, rủi ro và gate:** vào khi được duyệt danh sách file phase và có hợp đồng overview; ra khi route và API được kiểm tra độc lập. Dừng nếu rewrite không hoạt động, BE không truy cập được để xác nhận, hoặc role token khác giả định. Review shell thuộc admin, route Pages Router, phân tách 4000/8082 và giao diện Sơn trước phase 2.

### Giai đoạn 2 — Tài khoản admin (IDaaS)

- **Kết quả/phạm vi:** `/admin/users` với list/detail/create/update/disable/reissue đúng Swagger IDaaS; chỉ những action source Sơn và backend cùng hỗ trợ. Không chạm Dolores user internal sync hay logout.
- **Phụ thuộc/ranh giới:** phase 1 đạt; thêm route page, API domain users và schema Zod trong `src/apis`, `src/schema`; dùng `src/lib/http.ts` mặc định `/api/v1`. Query/mutation collocate với trang; tenant options nếu cần lấy từ Dolores qua API đã định nghĩa.
- **Tác động:** các POST/PATCH/DELETE có thể thay đổi tài khoản thật trong kiểm thử live; chỉ thử mutation bằng tài khoản/bản ghi test được phê duyệt, các bước còn lại dùng mock. UI xác nhận hành động và không hiển thị secret ở log.
- **Kiểm tra/chấp nhận:** request/response/error khớp Swagger, phân trang và query URL tồn tại qua refresh/back, trạng thái đang lưu/thành công/lỗi rõ, 403 không giả là empty, mutation thành công mới invalidate list/detail. Kiểm thử mock mọi method và UI desktop/mobile; live read bằng role phù hợp nếu BE sẵn sàng.
- **Điều kiện vào/ra, rủi ro và gate:** vào khi phase 1 được review và Swagger xác nhận role/payload; ra khi mọi luồng trang tài khoản có kết quả thật hoặc nút không hỗ trợ bị vô hiệu hóa có lý do. Dừng nếu API tài khoản triển khai khác Swagger hoặc quyền không rõ. Review đặc biệt chuyện mật khẩu tạm, role, tenant scope và hành động phá hủy.

### Giai đoạn 3 — Khách hàng, cửa hàng và hợp đồng

- **Kết quả/phạm vi:** `/admin/businesses`, `/admin/stores`, `/admin/contracts` dùng Owner profile, locations và contracts của Dolores. Giữ các view/query của Sơn phù hợp với endpoint thật; không tạo giao dịch giả.
- **Phụ thuộc/ranh giới:** shell và HTTP phase 1 đạt; phase 2 không là phụ thuộc dữ liệu bắt buộc. API/schema theo domain profiles, locations, contracts trong `apis`/`schema`; helper fan-out ở `pages/admin` và giới hạn tối đa 5 request Owner cùng lúc.
- **Tác động:** chỉ POST location khi endpoint xác nhận request/role; xác nhận trước khi gửi. Tệp hợp đồng tải dạng Blob với filename an toàn. Kết quả POST không rõ hoặc Owner response lệch sẽ khóa gửi lại và yêu cầu kiểm tra danh sách.
- **Kiểm tra/chấp nhận:** danh sách partial failure giữ dữ liệu Owner thành công và cho retry; query nhận AbortSignal; Owner ID đối chiếu response; phân trang/tổng số dựa response; chỉ báo tạo sau response hợp lệ; tải tài liệu đúng Blob. Cần bổ sung browser desktop/mobile và live read có xác thực để qua gate.
- **Trạng thái/gate:** code và kiểm thử API đã đạt, nhưng thiếu browser desktop/mobile và live read có xác thực nên phase 3 vẫn **partial**. Theo yêu cầu của người dùng, phase 4 được tiếp tục riêng; điều này không đánh dấu phase 3 hoàn tất.

### Giai đoạn 4 — Máy, tồn kho và IoT

- **Kết quả/phạm vi:** `/admin/machines`, `/admin/machines/[machineId]`, `/admin/iot` với inventory, maintenance và latest telemetry thực. Không tạo stream realtime hay dùng device credential.
- **Phụ thuộc/ranh giới:** phase 1 và schema/contract machine được khóa; route động Next nhận UUID, API/schema machines/telemetry thuộc `apis`/`schema`, view riêng ở `pages/admin/machines` và `iot.page.tsx`.
- **Tác động:** chỉ GET và refresh thủ công trừ action khác được backend xác nhận; telemetry query theo khoảng hợp lệ, timeout/cancel khi đổi máy. Model/ảnh chỉ chuyển nếu có asset thật cần cho màn hình, báo tên trước khi tạo.
- **Kiểm tra/chấp nhận:** danh sách mở đúng UUID detail, nhập ID sai ra 404/invalid state, không gắn telemetry của máy khác, hiển thị thời điểm lấy dữ liệu, empty/loading/error/forbidden và retry rõ. Kiểm thử mapping serial-vs-UUID, query interval, responsive và kết nối live read khi có. Lịch sử vé bảo trì giữ trên UI nhưng khóa vì chỉ có GET toàn hệ thống không phân trang/lọc theo máy.
- **Điều kiện vào/ra, rủi ro và gate:** vào khi OpenAPI xác nhận máy/telemetry; ra khi ba route dùng dữ liệu thật và không ám chỉ dữ liệu realtime. Dừng nếu quyền telemetry hoặc identity máy không khớp. Review payload lớn, tần suất fetch và phân quyền trước phase 5.
- **Trạng thái/gate hiện tại:** API/schema, ba route và menu đã triển khai; TypeScript, lint, build và 25 test Admin mục tiêu đạt. Sau khi đăng nhập, `/admin/machines` và `/admin/iot` tải được trạng thái rỗng (0 máy, 0 Owner); không có bản ghi để mở chi tiết máy hoặc kiểm tra lịch bảo trì/heartbeat/telemetry thật. UUID sai hiển thị thông báo hợp lệ và đường quay lại kho máy. Browser desktop/mobile hiển thị tốt; menu mobile mở được và đóng bằng Escape, viewport được khôi phục sau kiểm tra. Phase 4 vẫn **partial** vì thiếu machine record cho live detail/telemetry. Bộ test toàn repo hiện 25 đạt/70 lỗi; nhiều test cũ tham chiếu cấu trúc đã bỏ khỏi nhánh, chưa gán các lỗi đó cho phase 4.

### Giai đoạn 5 — Menu, báo cáo và thông báo

- **Kết quả/phạm vi:** đã tạo `/admin/menu`, `/admin/reports`, `/admin/notifications` và nối recipe toàn cục, dashboard/billing, notifications/alerts. Recipe chỉ có đọc và phát hành sau hộp xác nhận; chi tiết vẫn chỉ xem. Không thêm xóa recipe, gửi menu riêng xuống máy hoặc xác nhận cảnh báo. Danh sách invoice chỉ hiển thị hóa đơn Rental do API trả về, không lọc theo ngày và không tự cộng tổng.
- **Phụ thuộc/ranh giới:** dùng chung HTTP Dolores `src/lib/http.ts`; domain API/schema nằm trong `src/apis` và `src/schema`; page riêng nằm trong `src/pages/admin`; dùng lại `src/text/admin/admin-messages.ts`, không tạo thư mục mới.
- **Tác động:** Dashboard nhận `fromDate`/`toDate` cùng nhau, ngày hợp lệ, tối đa 90 ngày và không vượt hôm nay; hai ngày được ghi vào query URL để Back/Forward khôi phục trạng thái. Invoice và alert chỉ GET. Mark-read gọi `POST /notifications/{id}/read`, chỉ cập nhật cache sau khi response xác nhận `read: true`. Publish `POST /recipes/global` có hiệu lực toàn cục, chỉ được gửi sau xác nhận rõ ràng; không gửi mutation trong kiểm thử hoặc kiểm tra live.
- **Kiểm tra/chấp nhận:** 6 kiểm thử Phase 5 cùng các test Admin phase 1–4 đạt, tổng 31/31; schema kiểm tra recipe, invoice `ownerId`, notification/alert, và ngày; kiểm thử lỗi/response xác nhận mark-read không đổi cache trước response thành công. TypeScript, lint, build production và `git diff --check` đạt; build nhận ba route mới. Không kiểm tra trực quan browser được vì Computer Use không xác định URL tab an toàn, và không có live read mới bằng phiên admin trong phase này; do đó phase 5 vẫn **partial**.
- **Review/gate:** cấu trúc và danh sách file đúng phần đã duyệt; query invalidation recipe dùng đúng query family; không có invoice total suy diễn hay thao tác alert acknowledgement; mutation bị chặn khi đang pending để tránh gửi lặp. Trước phase 6 cần kiểm tra ba trang trên desktop/mobile và xác minh live GET bằng phiên có quyền nếu Dolores sẵn sàng. Dừng nếu response thực khác schema hoặc quyền publish không phải ADMIN.

### Giai đoạn 6 — Kiểm chứng tích hợp và bàn giao

- **Kết quả/phạm vi:** toàn bộ 11 URL admin, điều hướng và các API đã nối được kiểm tra liên thông; rà soát rằng mọi kiểm thử hợp đồng mới thay thế phạm vi cần thiết của kiểm thử cũ đã xóa ở phase 1. Không thêm tính năng mới hoặc triển khai production.
- **Phụ thuộc/ranh giới:** phases 1–5 đạt review; giữ các test trong `tests`, không copy test Sơn máy móc. Không sửa backend ngoài workspace.
- **Tác động:** chỉ test/read trên backend thật; mọi mutation live phải dùng dữ liệu thử nghiệm và có phép riêng. Không commit/push/deploy trong kế hoạch này.
- **Kiểm tra/chấp nhận:** `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false`, `npm.cmd run build` đạt; kiểm thử route, API target 4000/8082, schema/error/auth refresh, và mở từng URL desktop/mobile. Không còn fixture báo thành công giả. Nếu backend thật vẫn không truy cập được, chỉ xác nhận bằng mock và ghi **live integration chưa được xác minh**, không tuyên bố hoàn tất kết nối thực tế.
- **Điều kiện vào/ra, rủi ro và gate:** vào khi toàn bộ phase chức năng đã qua review; ra khi ma trận trên có bằng chứng test, các lỗi baseline được xử lý hoặc được nêu rõ, và người dùng review bàn giao. Dừng nếu test bảo mật/routing trượt hoặc live contract sai; review cuối kiểm tra diff, file thêm đúng phê duyệt, không lộ `.env`/token.

**Bằng chứng Phase 6 (2026-10-23):**

- **Đạt — build và chất lượng mã:** `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false`, `npm.cmd run build` và `git diff --check` đều đạt. Build liệt kê đủ 11 route Admin, gồm `/admin/machines/[machineId]`.
- **Đạt — kiểm thử Admin:** `node --test tests/admin-overview.test.cjs tests/admin-operations.test.cjs tests/admin-users.test.cjs tests/admin-machines-iot.test.cjs tests/admin-menu-reports-notifications.test.cjs` đạt 31/31. Bộ này kiểm tra schema/API, phân tách IDaaS và Dolores, refresh một lần, quyền/role, UUID/identity, trạng thái lỗi và các luồng UI chính bằng mock.
- **Đạt — route smoke:** GET cả 11 URL Admin qua Next local trả HTTP 200. Đây là xác nhận route được phục vụ; không xác nhận trạng thái giao diện sau đăng nhập.
- **Đạt có giới hạn — backend proxy:** GET không token tới `/api/v1/admin/users` và `/api/dolores/v1/dashboard/overview` qua Next local trả 401. Dolores trả challenge bearer tại host cấu hình 8082; không đọc dữ liệu vì request không có phiên xác thực. GET trực tiếp từ shell không tới được hai host; không gửi mutation.
- **Chưa xác minh — browser/live UI:** tab hiện tại mở `/admin` bị guard chuyển về `/login`. Không nhập lại credential. Vì vậy chưa kiểm tra từng trang khi đăng nhập hoặc desktop/mobile ở Phase 6; live authenticated GET chưa được xác minh.
- **Không đạt — suite toàn repo:** chạy toàn bộ `*.test.cjs` được 31/101, 70 lỗi. Đã triage đại diện: test auth proxy mở `src/app/api/v1/[...path]/route.ts`, test IDaaS tìm `src/apis/idaas/*`/`src/routes/query.ts`, test Dolores tìm `src/apis/dolores/*`; các đường dẫn đó không thuộc cấu trúc Pages Router/shared `src/lib/http.ts` hiện tại. Nhóm logout đang được hoãn theo quyết định trước; nhóm Moderator nằm ngoài phạm vi Admin. Những test legacy này cần được chuyển/đánh lại phạm vi trước khi suite toàn repo xanh; không sửa chúng trong Phase 6.
- **Đối chiếu contract đã xóa:** `tests/dolores-api-types.contract.ts` cũ gồm assertion compile-time `Equal<DTO, z.infer<Schema>>` cho các domain invoice, contracts, dashboard, locations, machines, notifications, recipes, telemetry, tenants cùng payment proof, buyback và installation work orders. Test Admin hiện tại kiểm tra runtime schema/API của các domain Admin liên quan và TypeScript build đạt; assertion compile-time cũ không có bản thay thế trực tiếp. Payment proof, buyback và installation work orders ngoài phạm vi Admin nên chưa được chuyển. Đây là giới hạn cần nêu trong bàn giao.
- **Review cuối:** không có thay đổi source trong Phase 6 và không tạo file mới. HTTP dùng `/api/v1` cho IDaaS, `/api/dolores/v1` cho Dolores qua rewrite cấu hình; refresh gọi IDaaS và chỉ retry request một lần. `.env` còn tồn tại, bị Git ignore; chỉ kiểm tra tên ba biến cấu hình, không in giá trị. File kế hoạch là file duy nhất được cập nhật ở bước bàn giao này.
- **Trạng thái Phase 6: partial/unverified.** Cần phiên Admin đang đăng nhập để kiểm tra authenticated live GET và UI desktop/mobile; suite toàn repo còn 70 test legacy lỗi, và assertion type-only của test cũ chưa được thay thế trực tiếp. Không đánh dấu Phase 6 hoặc toàn kế hoạch hoàn tất.

## Điều kiện dừng chung và thứ tự triển khai

Mỗi phase là một increment có thể kiểm tra riêng; thứ tự 1 → 2 → 3 → 4 → 5 → 6 để người dùng duyệt từng bước. Sau phase 1, các phase 2 và 3 độc lập về dữ liệu nhưng vẫn thực hiện tuần tự theo yêu cầu; phases 4–5 tận dụng shell và schema đã ổn định. Khi phát hiện API thật khác tài liệu, quyền không đủ, endpoint không hiện diện hoặc cần file ngoài danh sách đã duyệt: dừng phần phụ thuộc, báo sự khác biệt và đề xuất phạm vi/file sửa trước khi tiếp tục. Không tự mở rộng sang logout, moderator hoặc triển khai hạ tầng mạng.
