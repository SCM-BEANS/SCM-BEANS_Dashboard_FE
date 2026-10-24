# Kế hoạch chuyển khu Moderator sang cấu trúc `ref`

## Trạng thái và mục tiêu

- **Trạng thái:** Phase 0–1 hoàn tất; Phase 2–4 partial; Phase 5 đã triển khai một thao tác mark-as-read và kiểm tra tự động đạt nhưng vẫn partial do chưa có browser/live Moderator evidence. Theo yêu cầu tiếp tục của người dùng, đã đi qua gate Phase 4 đang partial; dừng tại gate Phase 5 theo Standard. Full suite gần nhất còn 29 lỗi test migration ngoài phạm vi.
- **Workspace:** `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`.
- **Nhánh kiểm tra khi lập kế hoạch:** `sơn`.
- **Nhánh đích của phần sản phẩm:** `ref`. Không đổi nhánh khi lập kế hoạch.
- **Nguồn UI và luồng nghiệp vụ:** nhánh `sơn`.
- **Kế hoạch liên quan:** `plans/moderator-api-integration.md` — kế hoạch này theo dõi tích hợp API Moderator hiện tại, không bị sửa hoặc thay thế bởi tài liệu này.
- **Cách thực hiện:** Standard, theo từng giai đoạn và dừng review sau mỗi giai đoạn. Theo lựa chọn trước cho lần chuyển cấu trúc Admin, TDD tắt; vẫn chạy kiểm thử có ý nghĩa sau mỗi thay đổi.

Mục tiêu là chuyển các trang, điều hướng và luồng Moderator đang có trên `sơn` sang Pages Router của `ref`, viết lại theo trách nhiệm thư mục đã duyệt cùng phần Admin và QLS_WEB. Giữ giao diện và luồng của Sơn ở mức có API/hành vi hỗ trợ. Chỗ nào chỉ là demo, thiếu API, thiếu quyền hoặc thiếu dữ liệu kiểm chứng thì giữ vị trí và giải thích rõ, khóa thao tác để không báo thành công giả.

## Quyết định đã xác nhận

| Quyết định | Lựa chọn | Căn cứ |
|---|---|---|
| Kiến trúc đích | Pages Router trên `ref`; trang ở `src/pages`, API ở `src/apis`, schema ở `src/schema`, URL và route catalog ở `src/routes`; dùng chung `src/lib/http.ts` | Người dùng xác nhận tiếp tục cấu trúc đã duyệt cho Admin và đối chiếu QLS_WEB. `ref` dùng `pageExtensions` chỉ nhận `*.page.tsx`/`*.page.ts`; đã có trang Admin theo kiểu này. |
| Nguồn giao diện | Giữ giao diện, route và luồng hiện có trên `sơn`, chuyển thành mã mới phù hợp kiến trúc đích; không bê nguyên file App Router | Người dùng chọn giữ giao diện/luồng Sơn; nội dung và bố cục sẽ được đối chiếu từng nhóm trong quá trình triển khai. |
| API và data | Dùng module/API/schema đã có ở `ref` nếu hợp đồng tương thích; Dolores đi qua `src/lib/http.ts` và `/api/dolores/v1`; không tạo client Moderator riêng | `ref` đã có Axios chung, Query provider và các API/schema dùng bởi Admin. Moderator dùng Dolores 8082; không gửi Dolores qua IDaaS 4000. |
| Hành vi chưa được backend hỗ trợ | Giữ trang/nút ở đúng ngữ cảnh nhưng vô hiệu hóa, nêu lý do; không lưu demo rồi hiện thành công | Người dùng đã duyệt nguyên tắc này khi chuyển Admin; kế hoạch Moderator API cũng yêu cầu giữ rõ trạng thái unavailable. |
| Thứ tự và mốc duyệt | Chia theo nhóm màn hình; triển khai đọc trước, mutation chỉ sau khi hợp đồng API, vai trò, tác động và dữ liệu kiểm tra đã rõ | Người dùng xác nhận lựa chọn này cho phần Moderator. Dừng sau mỗi phase để báo kiểm thử/review và xin danh sách file chính xác của phase kế tiếp. |
| Thao tác backend khi kiểm thử | Không gửi mutation vào dữ liệu thật. Kiểm thử mutation bằng mock; live write chỉ được cân nhắc sau phê duyệt riêng, trên dữ liệu kiểm thử và theo hợp đồng đã xác minh | Giữ nguyên ranh giới đã chọn trong các phase Admin và kế hoạch Moderator API. |

### Các phương án đã đối chiếu

| Phương án | Tương thích và chi phí | Bảo mật, độ tin cậy và bằng chứng kiểm chứng | Rủi ro, vận hành, khả năng khôi phục | Kết quả |
|---|---|---|---|
| Chuyển Moderator sang Pages Router và các ranh giới của `ref`/QLS_WEB | Có chi phí viết lại view và luồng App Router; tái sử dụng được `src/lib/http.ts`, API/schema sẵn có, Query provider và route catalog của `ref` | Dùng JWT role check ở shell nhưng backend vẫn là nguồn quyết định quyền; query/mutation đi qua client dùng chung. Có thể kiểm tra route, schema, role, UI state và browser từng nhóm | Mỗi nhóm có thể build/test/review riêng; có thể dừng ở route chưa đủ dữ liệu hoặc API. Dễ rollback theo phase | **Chọn** theo cấu trúc người dùng yêu cầu và cách Admin đã chuyển |
| Mang nguyên App Router và các thư mục `hooks`/`schemas` từ Sơn vào `ref` | Có thể giảm sửa JSX ban đầu nhưng làm song song hai kiểu tổ chức; `next.config.js` của `ref` chỉ đăng ký đuôi `*.page.*`, còn `ref` không có Moderator App Router | Dễ phân kỳ guard/cache/API conventions; cần thay đổi cấu hình hoặc thêm router topology và kiểm thử toàn app, chưa có verification path phù hợp với yêu cầu cấu trúc mới | Tăng nguy cơ sai route/build, trùng client/cache, lệch cấu trúc QLS và khó xác định nơi chịu trách nhiệm | **Loại** vì trái với đích Pages Router đã xác nhận |
| Chuyển tất cả màn hình và ghi dữ liệu trong một lần | Ít lần bàn giao nhưng phạm vi lớn, nhiều màn chưa có dữ liệu/quyền xác thực | Khó review mỗi endpoint/role; thiếu dữ liệu browser evidence và dễ bật mutation chưa được xác nhận | Khó cô lập lỗi, có thể bật nhầm thao tác tài chính/pháp lý, khó review/rollback | **Loại** theo lựa chọn chia phase và đọc trước |
| Chuyển theo nhóm màn hình, đọc trước rồi xét mutation riêng | Thêm mốc kiểm thử/review; phù hợp module API hiện có và tiến độ một phần trên Sơn | Có thể kiểm chứng từng DTO, role, lỗi và invalidation; live write giữ sau phê duyệt riêng | Giới hạn blast radius; phase bị chặn có thể giữ nguyên nút unavailable mà không làm dừng phần đọc khác | **Chọn** theo xác nhận của người dùng |

## Hiện trạng đã kiểm tra

### Đích `ref`

- `next.config.js` chỉ đăng ký `page.tsx`/`page.ts` và biến thể `.page.*`; Pages Router hiện hành nằm trong `src/pages`.
- `src/pages/_app.page.tsx` đã cấp `QueryClientProvider`.
- `src/pages/admin` đã có shell, breadcrumb/action bar và các màn hình Admin. Chỉ dùng lại component khi trách nhiệm thực sự chung; thành phần mang nội dung Admin không được nhập vào màn Moderator.
- Trước Phase 0, `src/routes/path.ts` và `src/routes/routes.ts` chưa khai báo URL, navigation hay matcher Moderator. Phase 0 bổ sung `PATH_MODERATOR`, route catalog, danh sách navigation và kiểm tra section; đây là URL/catalog, không thay cơ chế đăng ký trang Next.
- `src/lib/http.ts` dùng Axios chung: IDaaS qua `/api/v1`, Dolores qua `DOLORES_API_BASE_URL = /api/dolores/v1`; interceptor refresh dành cho IDaaS. `next.config.js` rewrite Dolores sang `DOLORES_API_URL` (BE 8082).
- `src/lib/auth-role.ts` hiện nhận diện `ADMIN`; `getPostLoginPath` đưa Admin tới `/admin`, các role khác về Home. Để Moderator dùng được trang đích, cần bổ sung kiểm tra role và đường chuyển sau login mà không đổi token storage/refresh.
- `src/apis` và `src/schema` đã có một số module dùng chung với Admin: dashboard, billing, contracts, locations, machines, notifications, recipes, telemetry và tenants. Không tạo bản sao chỉ vì caller là Moderator.
- `tests` đã có một số test Moderator trên `ref`; tận dụng chúng nếu kiểm thử đúng hành vi Pages Router mới. Không tạo test file mới khi có thể mở rộng file đang tồn tại; nếu cần tạo, báo tên và nhiệm vụ trước từng phase.
- Chưa có route/page `src/pages/moderator` trên `ref`.

### Nguồn `sơn` và kế hoạch API Moderator hiện có

- UI hiện ở `src/app/(moderator)/moderator`; route dùng App Router catch-all, shell dùng DoloresShell, các màn hình gom trong `ModeratorDashboardScreens.tsx`, `ModeratorOperationalScreens.tsx`, `ModeratorBillingRecipeScreens.tsx`.
- API Dolores, hooks và schemas trên Sơn đã có tiến độ từng phần. `plans/moderator-api-integration.md` ghi Phase 1 đã hoàn tất; Phase 2–5 còn partial vì thiếu dữ liệu/phiên live hoặc quyền; Phase 6 chưa bắt đầu; Phase 7–8 chưa có thực hiện hoàn tất. Khi triển khai, phải kiểm tra lại source và backend hiện hành, không coi ghi chép cũ là bằng chứng API hiện vẫn đúng.
- Tập route Moderator gồm tổng quan, khách hàng/tenant, hợp đồng, hóa đơn, máy/kho, IoT, menu/recipe, yêu cầu kỹ thuật/lịch sử máy, buyback, thông báo và cảnh báo. Route chi tiết có cả UUID API và một số mã hiển thị/fixture cũ; chỉ UUID hoặc khóa được backend xác nhận mới được dùng trong request.
- API Moderator dùng Dolores 8082. Không thay đổi địa chỉ `.env`, proxy, đăng nhập, lưu token, refresh hoặc logout trong kế hoạch này.
- Các gap đã ghi nhận cần tái xác minh: không có collection API buyback đã xác nhận; quyền đọc hóa đơn Moderator từng bị từ chối; alert không được API giới hạn theo tenant; nhiều loại record thực chưa có để thử chi tiết/telemetry; một số mutation không rõ quyền hoặc điều kiện tạo.
- **Hợp đồng mới:** `/moderator/contracts/new` trên Sơn hiện hiển thị trạng thái “Tạo hợp đồng chưa khả dụng”; không có form tạo hợp đồng để chuyển. Module hợp đồng trên `ref` hiện tập trung API đọc. Trong kế hoạch này route vẫn unavailable, không tạo một form mới hay suy diễn request body. Yêu cầu form tạo hợp đồng cho trang Admin là phạm vi riêng cần được phân tích với API và trường dữ liệu thực tế.

## Phạm vi

**Bao gồm:** đăng ký route Pages Router cho `/moderator`; shell/điều hướng và kiểm tra role Moderator; chuyển UI theo nhóm route; nối API đọc có hợp đồng tương thích; chuyển các thao tác ghi chỉ khi endpoint, quyền, side effect và trạng thái sau ghi được kiểm chứng; phân biệt loading, empty, partial, error, unauthorized, forbidden, not-found và unavailable; test, build, review và browser verification theo phase.

**Không bao gồm:** sửa backend hoặc OpenAPI; thay đổi auth token, refresh, login protocol, logout hay proxy; đổi Admin screens/flows ngoài phần dùng chung đã xác nhận; tạo API không tồn tại; làm thao tác ghi giả trên local storage; bật create contract trên `/moderator/contracts/new` khi Sơn hiện không có form/API xác nhận; thiết kế lại toàn bộ UI.

## Ranh giới thư mục và phụ thuộc

```text
src/
├── pages/
│   ├── _app.page.tsx                 # Query provider hiện có, giữ nguyên trừ khi có lỗi được chứng minh
│   └── moderator/                    # Route entry, shell và UI chỉ thuộc Moderator
│       ├── [[...sections]].page.tsx  # Entry Pages Router cho /moderator và các section
│       ├── moderator-shell.tsx       # Điều hướng, breadcrumb/header và kiểm tra role Moderator
│       ├── moderator-shell.module.css
│       └── screen modules by domain  # Chỉ tách theo nhóm màn hình thực sự cần; tránh component/layer rỗng
├── apis/                             # HTTP/domain functions; dùng lại module có hợp đồng tương thích
├── schema/                           # Zod request/response; không phụ thuộc UI
├── routes/                           # PATH_MODERATOR và kiểm tra route; không thay đăng ký Next page
├── lib/                              # Axios/role helpers hiện có; không tạo Dolores client riêng
├── text/moderator/                   # Chữ riêng Moderator nếu đủ lý do tách khỏi text Admin
└── components/                       # Chỉ dùng primitive thật sự chung; không đưa màn hình Moderator vào đây
tests/                                # Mở rộng test Moderator hiện có; file mới được duyệt từng phase
```

- **Chiều phụ thuộc:** Pages/screen modules gọi API hoặc query adapter; API gọi `src/lib/http.ts` và parse schema; schema độc lập với UI. UI dùng `routes/path.ts` để dựng URL. API/schema không import page/component. Component dùng chung không phụ thuộc role-specific workflow.
- **Đăng ký route:** dùng optional catch-all Pages Router `[[...sections]].page.tsx` vì cần `/moderator` và nhiều section lồng nhau; `PATH_MODERATOR` và `isSupportedModeratorSection` trong route catalog được bổ sung ở Phase 0 làm nguồn URL/section được chấp nhận.
- **State:** server data sở hữu bởi Dolores/React Query dưới provider sẵn có; tái sử dụng key/cache của domain khi cùng một tài nguyên và cùng scope. Query/mutation orchestration chỉ tách khỏi screen khi có tái sử dụng thật. URL/router sở hữu section và bộ lọc cần Back/Forward; form draft giữ local, không lưu nhạy cảm bền vững.
- **Giao diện:** giữ thứ bậc thông tin, route, bố cục, màu sắc và thao tác Sơn. Dùng loading/empty/error/forbidden/unavailable đúng dữ liệu trả về; empty không được thay cho lỗi. Giữ keyboard/focus semantics, xác nhận hành động có side effect và bố cục responsive desktop/mobile.
- **API scope:** đọc theo dữ liệu và role contract. Mutation phản ánh server sau response hợp lệ, chặn double-submit, hiển thị lỗi và invalidate query nhỏ nhất. Không optimistic success cho dữ liệu tài chính/pháp lý/toàn cục.

## Các giai đoạn

Mỗi giai đoạn là một increment riêng. Trước khi triển khai, báo rõ **tên chính xác và nhiệm vụ của từng file/thư mục mới**, các file cũ sẽ sửa và lý do; chỉ bắt đầu sau khi người dùng duyệt danh sách phase đó. Sau kiểm thử/review, dừng và chờ duyệt trước phase sau. Danh sách dưới đây là ranh giới dự kiến, không phải quyền tự thêm các file mã khi thực thi.

### Phase 0 — Pages Router, role shell và route entry

- **Kết quả:** `/moderator` và các section mở bằng Pages Router; shell theo Sơn; role Moderator được điều hướng đúng sau login và không thể dùng nhầm trang Admin.
- **Phạm vi:** optional catch-all entry, shell desktop/mobile, active navigation, breadcrumb/header, trạng thái kiểm tra quyền; nối role `MODERATOR` vào `getPostLoginPath`; tạo route catalog Moderator trong `src/routes` vì `ref` chưa có khai báo này.
- **Ngoài phạm vi:** nội dung đọc/ghi của các domain; thay đổi refresh/token/logout; thay đổi shell Admin trừ khi có primitive chung được duyệt.
- **Phụ thuộc:** claim roles trong JWT và Next Pages Router hiện tại; route path/catalog Moderator được thêm trong phase này.
- **Ranh giới/file:** đã duyệt và triển khai `src/pages/moderator/[[...sections]].page.tsx`, `src/pages/moderator/moderator-shell.tsx`, `src/pages/moderator/moderator-shell.module.css`, `src/text/moderator/moderator-messages.ts`; sửa `src/lib/auth-role.ts`, `src/routes/path.ts`, `src/routes/routes.ts`, `tests/admin-overview.test.cjs`, `tests/moderator-shell-data-label.test.cjs` và kế hoạch này. Không sửa trang login vì đã gọi `getPostLoginPath`.
- **Side effects:** đọc token đang có ở client và điều hướng; không gửi request ghi.
- **Kiểm chứng:** route `/moderator` và section nested, unknown section, UUID/mã sai; redirect login theo ADMIN/MODERATOR/role khác; loading/forbidden; desktop/mobile; menu keyboard/Escape/focus; lint, TypeScript, build, route smoke.
- **Chấp nhận:** chỉ token có role Moderator mới qua shell; role khác không nhìn nhầm dữ liệu; Admin redirect/shell còn đúng; các URL hợp lệ do route catalog xác định.
- **Điều kiện vào:** làm trên checkout đích `ref`, xác nhận trạng thái làm việc và route conventions hiện hành.
- **Điều kiện ra:** route được Next nhận, đăng nhập Moderator đi đúng trang, guard và layout được review; production build và route smoke phải có bằng chứng thành công.
- **Rủi ro/dừng:** payload role có alias/format chưa rõ; route catch-all va chạm; UI shell Sơn phụ thuộc App Router. Dừng nếu phải thay đổi auth protocol hoặc Next config ngoài `pageExtensions` đã có. Build lần đầu gặp generated App Router type cũ trong `.next/dev/types`; sau khi xác nhận `.next` bị Git ignore và không có Node listener, đã xóa cache sinh tự động và build lại thành công.
- **Gate:** người dùng duyệt danh sách file trước khi code; sau kiểm thử/review phase 0 báo lại và dừng.

### Phase 1 — Overview, thông báo và cảnh báo (đọc)

- **Kết quả:** dashboard, notifications, unread count và alerts dùng Dolores; loading/empty/error thể hiện đúng.
- **Phạm vi:** chuyển các screen đọc; dùng lại `dashboard.api.ts`, `notifications.api.ts`, schema và API alerts hiện có hoặc bổ sung có căn cứ; giữ rõ phạm vi alert và dữ liệu trả về.
- **Ngoài phạm vi:** mark-read, ack, bulk action, lọc alert không được API hỗ trợ.
- **Phụ thuộc:** phase 0; current endpoint/role/payload được kiểm tra lại theo OpenAPI/hợp đồng backend.
- **Ranh giới/file dự kiến:** page-owned screen cho nhóm dashboard/notifications; sửa các API/schema/test hiện có khi cần. Không tạo client hoặc hooks dùng riêng Moderator khi domain API dùng chung được.
- **Side effects:** GET và cache.
- **Kiểm chứng:** schema/API/query test cho dữ liệu, 401/403, lỗi mạng, loading/empty; browser bằng phiên Moderator nếu có; xác nhận Admin dùng chung API không hồi quy.
- **Chấp nhận:** không còn số liệu demo hiển thị như dữ liệu thật; alert scope được mô tả đúng; lỗi không đổi thành empty; chưa có mutation.
- **Điều kiện vào/ra:** vào khi phase 0 đạt; ra khi ba màn đọc qua tests và browser/route evidence, shared Admin behavior được review.
- **Rủi ro/dừng:** API cảnh báo không scoped tenant; không đủ dữ liệu hoặc auth 401; dừng yêu cầu live evidence nếu phiên không hợp lệ, không tự sửa auth.
- **Gate:** chỉ tiếp phase 2 sau khi review phase 1.

#### Kết quả thực hiện Phase 1 (2026-10-23)

- **Trạng thái:** hoàn tất trong phạm vi file đã duyệt; dừng tại gate Standard, không bắt đầu Phase 2.
- **Triển khai:** thêm moderator-read-screens.tsx; route Moderator đưa /moderator tới dashboard Dolores, /moderator/notifications tới danh sách thông báo và /moderator/notifications/alerts tới danh sách cảnh báo. Notifications dùng GET /notifications và GET /notifications/unread-count; alerts dùng GET /alerts; dashboard tái sử dụng dashboard.api.ts. Các query dùng chung cache key với Admin ở dashboard, notifications và alerts. Không thêm thao tác mark-read hoặc acknowledge.
- **Contract/schema:** unread count yêu cầu object unreadCount là số nguyên không âm; createdAt của thông báo chấp nhận null hoặc thiếu theo payload đã ghi nhận. Không lọc cảnh báo phía client; trang cảnh báo nói rõ API trả danh sách không giới hạn theo Owner/tenant.
- **Trạng thái giao diện:** có loading, empty, retryable error, 401, 403 và lỗi mạng; lỗi có dữ liệu cache không bị thay thành trạng thái empty. Dữ liệu dashboard hiển thị theo các trường Dolores trả về, không tạo số liệu demo.
- **Kiểm thử focused:** node --test tests/moderator-dashboard.test.cjs tests/dolores-notifications.test.cjs — 7/7 đạt; node --test tests/moderator-shell-data-label.test.cjs — 4/4 đạt; node --test tests/admin-overview.test.cjs tests/admin-menu-reports-notifications.test.cjs — 14/14 đạt, gồm regression cho dashboard, notification schema và thao tác Admin hiện có.
- **Kiểm tra kỹ thuật:** tsc --noEmit đạt; npm run lint đạt; npm run build đạt. Production route smoke: /moderator, /moderator/notifications và /moderator/notifications/alerts trả 200; /moderator/unknown trả 404. Server smoke đã được dừng sau kiểm tra.
- **Toàn bộ test suite:** node --test tests/*.test.cjs có 105 test, 45 đạt và 60 lỗi. Lỗi được in ra chủ yếu là test/harness cũ nạp các đường dẫn đã bị chuyển khỏi cấu trúc cũ như src/schemas/dolores, src/apis/dolores và src/services; một số test route cũ còn tham chiếu alias Home không resolve được. Không sửa các test ngoài danh sách Phase 1 đã duyệt; suite toàn repo vẫn là giới hạn kiểm chứng và cần một phạm vi dọn test riêng.
- **Browser/live evidence:** cua.getState trả danh sách apps và browsers rỗng, nên không có phiên Moderator để xác nhận dữ liệu Dolores trực tiếp. Smoke HTTP chỉ xác nhận Next đăng ký route, không khẳng định quyền hoặc dữ liệu backend live. Không có request ghi backend nào được gửi.
- **Review:** kiểm tra read-only không thấy lỗi mới trong đường đi API, cache key, route, trạng thái lỗi/empty hay ranh giới không mutation. Admin tiếp tục dùng cùng các API/schema; các test hồi quy nêu trên đều đạt.
- **Quyết định gate:** dừng sau Phase 1 theo Standard. Cần duyệt danh sách file riêng trước khi triển khai Phase 2.

### Phase 2 — Tenant/khách hàng và hợp đồng (đọc)

- **Kết quả:** danh sách/chi tiết tổ chức và hợp đồng chỉ hiển thị bản ghi backend, dùng canonical ID.
- **Phạm vi:** chuyển danh sách/chi tiết, phân trang/query theo contract, document metadata nếu endpoint/role cho phép; ánh xạ ID route rõ ràng.
- **Ngoài phạm vi:** tạo/sửa tài khoản, tạo hợp đồng, quyết định hết hạn, kích hoạt/chấm dứt/thay thế, upload tài liệu.
- **Phụ thuộc:** phase 0–1 và endpoint/role/ID đã xác minh. Cần record thật hoặc test fixture an toàn để xác nhận detail.
- **Ranh giới/file dự kiến:** màn hình thuộc `pages/moderator`; dùng `tenants.api.ts`/`contracts.api.ts` và schemas đang có khi phù hợp; sửa tests hiện tại. `PATH_MODERATOR.newContract` giữ unavailable vì trên Sơn hiện chỉ có placeholder, không có form.
- **Side effects:** GET/cache; không có POST/PUT/DELETE.
- **Kiểm chứng:** pagination/schema, ID UUID so với mã hiển thị cũ, detail not-found, empty/error/403, document metadata; xác nhận Admin contract API/schema tương thích.
- **Chấp nhận:** không dùng tenant label, mã fixture hoặc serial làm API ID; route không ánh xạ an toàn hiện trạng thái unavailable/not-found; không có form tạo hợp đồng giả.
- **Điều kiện vào/ra:** vào khi phase 1 review đạt; ra khi reads và ID mapping có test/review; thiếu record thật được ghi partial, không tự suy luận.
- **Rủi ro/dừng:** không có tenant/contract record, endpoint/role đổi, list pagination khác. Dừng từng màn có ID hoặc quyền chưa chắc chắn.
- **Gate:** người dùng duyệt file phase 2; dừng review trước phase 3.

#### Kết quả thực hiện Phase 2 (2026-10-23)

- **Trạng thái:** triển khai và kiểm tra kỹ thuật đạt; live verification còn partial. Không bắt đầu Phase 3.
- **Tạo:** `src/pages/moderator/customers/` với `index.page.tsx` và `[tenantId].page.tsx`; `src/pages/moderator/contracts/` với `index.page.tsx` và `[contractId].page.tsx`.
- **Sửa theo danh sách được duyệt:** `src/pages/moderator/moderator-read-screens.tsx`, `src/pages/moderator/moderator-shell.module.css`, `src/apis/tenants.api.ts`, `src/schema/tenants.schema.ts`, `src/apis/contracts.api.ts`, `src/schema/contracts.schema.ts`, `src/text/moderator/moderator-messages.ts`, `tests/moderator-phase2.test.cjs`, `tests/dolores-contracts.test.cjs`. Cập nhật mock API/schema trong `tests/moderator-dashboard.test.cjs` (file regression đã được duyệt ở Phase 1) vì màn đọc dùng chung nay import thêm domain tenants/contracts.
- **API và identity:** tenant detail gọi `GET /tenants/{id}` sau khi kiểm tra UUID và xác nhận ID trả về; Moderator contract list gọi `GET /contracts/tenant/{tenantId}` theo từng tenant (tối đa 5 request đồng thời), detail gọi `GET /contracts/{id}`, tài liệu chỉ đọc metadata bằng `GET /contracts/{contractId}/documents`. Lỗi của từng tenant được giữ lại và thông báo riêng, không bị biến thành danh sách rỗng. Schema `ModeratorContract` dùng `tenantId`; schema/Admin API `Contract` tiếp tục giữ `ownerId`.
- **Hành vi không ghi:** route tạo tenant/hợp đồng và route quyết định hết hạn chỉ hiện unavailable, không có form hoặc request mutation. ID cũ hoặc sai định dạng không được gửi tới API. Chi tiết tài liệu không bật tải file.
- **Kiểm thử:** `node --test tests/moderator-phase2.test.cjs tests/dolores-contracts.test.cjs tests/moderator-dashboard.test.cjs tests/dolores-notifications.test.cjs tests/admin-overview.test.cjs` — 27/27 pass; `node_modules/.bin/tsc.cmd --noEmit` — pass; `npm.cmd run lint` — pass; `git diff --check` — pass (có cảnh báo chuẩn hóa LF/CRLF của Git).
- **Build/route smoke:** `npm.cmd run build` — pass; Next đăng ký `/moderator/customers`, `/moderator/customers/[tenantId]`, `/moderator/contracts`, `/moderator/contracts/[contractId]`. Production server cục bộ trả HTTP 200 cho danh sách, hai detail UUID hợp lệ và detail ID sai định dạng; server được dừng sau smoke test. Smoke test chỉ xác nhận route SSR, không xác nhận đăng nhập hay dữ liệu backend.
- **Contract evidence/giới hạn:** `plans/moderator-api-integration.md` có ghi đối chiếu OpenAPI/backend cho 5 GET trên vào 2026-10-22 và xác nhận không có `GET /contracts` collection hay pagination hợp đồng theo tenant. Lượt thực hiện này không có phiên trình duyệt Moderator và không tái xác nhận OpenAPI live, nên quyền/dữ liệu thật của lượt hiện tại chưa được chứng minh. Không gửi request ghi lên backend.
- **Review:** không thấy thay đổi Admin contract ownerId, truy vấn detail không chạy với UUID không hợp lệ, list contracts giữ tenant lỗi một phần, trạng thái loading/empty/401/403/404/API error có kiểm thử. Phase dừng ở đây; cần live read bằng phiên Moderator trước khi coi Phase 2 hoàn toàn verified hoặc chuyển tiếp.

### Phase 3 — Máy, cửa hàng/địa điểm, IoT và yêu cầu kỹ thuật (đọc)

- **Kết quả:** Moderator xem dữ liệu máy, inventory/location, telemetry và work-order/maintenance read mà API hiện hỗ trợ.
- **Phạm vi:** màn hình list/detail; machine/location IDs; telemetry theo khoảng ngày hợp lệ, không poll vô hạn; work-order/ticket chỉ từ collection/detail endpoint được xác minh.
- **Ngoài phạm vi:** phân công, dispatch, sửa inventory, tạo/chuyển trạng thái ticket/work order, machine loan/substitute nếu không có contract.
- **Phụ thuộc:** phases 0–2; API role, query scope và date bounds xác nhận; record thật để live test.
- **Ranh giới/file dự kiến:** dùng `machines.api.ts`, `locations.api.ts`, `telemetry.api.ts`; target hiện chưa có module riêng installation work orders/buybacks, chỉ thêm API/schema installation work orders khi endpoint thật còn được hỗ trợ; UI nằm cạnh module Moderator. Không tạo `src/hooks`/`components` layer mới khi chưa có trách nhiệm dùng chung.
- **Side effects:** GET; không gửi telemetry/device command; không stream/poll nền.
- **Kiểm chứng:** UUID vs serial, date range, pagination, cancellation khi đổi route/máy, schema, query error/empty/partial, desktop/mobile; không gắn telemetry máy khác.
- **Chấp nhận:** dữ liệu là từ API, thời gian/lọc được nêu rõ; route legacy không ánh xạ không giả lập; module Admin/technician không bị thay đổi ngoài dùng chung đã duyệt.
- **Điều kiện vào/ra:** vào sau review phase 2; ra khi từng nhóm endpoint có test và trạng thái unsupported được trình bày đúng.
- **Rủi ro/dừng:** chưa có dữ liệu máy/tenant, backend thiếu endpoint hay scope; telemetry payload lớn/stale; dừng nhóm bị thiếu bằng chứng, tiếp tục nhóm đọc độc lập nếu không phụ thuộc.
- **Gate:** review API/state/cancellation và danh sách file trước phase 4.

### Phase 4 — Hóa đơn, recipe và buyback (đọc)

- **Kết quả:** hóa đơn/proof, global recipe và buyback chỉ dùng dữ liệu có endpoint/role thật.
- **Phạm vi:** invoice list/detail/proof read, global recipe list/detail; buyback detail theo ID nếu API cho phép. Buyback list chỉ hiện khi có endpoint collection được xác minh.
- **Ngoài phạm vi:** thanh toán, đối soát, refund/deposit, publish/delete/sync recipe, buyback lifecycle writes; không tự cộng tổng hóa đơn nếu API không định nghĩa phép tổng.
- **Phụ thuộc:** phases 0–3; cập nhật backend contract và quyền Moderator; amount/currency/status semantics.
- **Ranh giới/file dự kiến:** dùng `billing.api.ts`, `recipes.api.ts`; bổ sung buybacks API/schema trên `ref` chỉ nếu OpenAPI hiện tại xác nhận; màn hình page-owned; tests hiện tại được mở rộng.
- **Side effects:** GET/cache.
- **Kiểm chứng:** schema, canonical IDs, amount/currency/status hiển thị nguyên nghĩa, pagination, proof download nếu có; test lỗi API và unavailable buyback list; browser live read bằng phiên Moderator.
- **Chấp nhận:** invoice không bị biến thành dữ liệu tổng hợp do FE tự tính; recipe scope được chỉ ra; buyback list không hiện demo; mọi route có empty/error/unavailable chính xác.
- **Điều kiện vào/ra:** vào sau phase 3; ra khi dữ liệu và API mapping review đạt, các route thiếu endpoint được khóa.
- **Rủi ro/dừng:** Moderator bị 403 khi đọc invoice; buyback không có collection; dữ liệu tài chính không đầy đủ. Dừng phần tương ứng, không đổi role backend.
- **Gate:** xác nhận các màn đọc trước khi xem xét mutation phase 5.

### Phase 5 — Mutation vận hành có hợp đồng rõ, theo từng action

- **Kết quả:** chỉ các thao tác có endpoint, quyền và tác động đã định nghĩa rõ mới được bật; không mặc định mọi thao tác trong nhóm là rủi ro thấp.
- **Phạm vi ứng viên:** mark-as-read thông báo; ack alert, tạo/gán maintenance ticket, tạo installation work order, upload tài liệu chỉ nếu hợp đồng endpoint thật cho Moderator và đúng luồng UI hiện tại. Mỗi action được duyệt độc lập.
- **Ngoài phạm vi:** recipe/global catalog, billing, contract lifecycle/buyback, các thao tác đa bước chưa rõ idempotency hoặc role.
- **Phụ thuộc:** reads cùng domain đã được review; exact method/path/schema/role/state transition; authenticated Moderator session và test fixture an toàn.
- **Ranh giới/file dự kiến:** dùng API/query mutation domain hiện có; sửa action handlers đúng màn và test. Không bật một nhóm candidate chỉ vì đã nằm trong source API plan.
- **Side effects:** thay server state. Không gửi live mutation nếu chưa có phê duyệt riêng cho danh sách file và hành động/test environment.
- **Kiểm chứng:** mock payload/error/cache invalidation/double-submit; lỗi không báo thành công; live verified only when explicitly approved and safe test record exists; valid role/403 distinction.
- **Chấp nhận:** mutation chỉ sau response hợp lệ; list/detail/unread state refresh; không dùng localStorage demo write; các action chưa qua gate vẫn có lý do khóa.
- **Điều kiện vào/ra:** vào sau phase 4; ra khi mọi action bật được kiểm thử và review, hoặc được ghi unavailable theo contract.
- **Rủi ro/dừng:** backend docs và code khác nhau, thiếu điều kiện trước, thao tác có nhiều bước hoặc không idempotent; dừng riêng action đó.
- **Gate:** action matrix và từng file mới được trình duyệt trước khi thêm; dừng sau phase.

### Phase 6 — Global recipe/catalog lifecycle

- **Kết quả:** publish/delete/sync chỉ bật nếu hợp đồng và tác động toàn cục được hiểu, phù hợp chính xác với UI Moderator.
- **Phạm vi:** từng action global recipe được contract cho phép, xác nhận theo tên/recipe, state server và audit.
- **Ngoài phạm vi:** gửi menu riêng xuống máy hoặc bất kỳ local/demo sync nào; tự suy đoán quyền hoặc rollback.
- **Phụ thuộc:** phase 4 read đạt; quyền Moderator, side effects, reversibility/audit, safe test recipe và confirmation text được xác minh; phê duyệt người dùng cho action có phạm vi toàn hệ thống.
- **Ranh giới/file dự kiến:** mở rộng `recipes.api.ts`/schema và handler màn hình hiện tại, không tạo Moderator recipe client.
- **Side effects:** có thể làm thay đổi catalog toàn hệ thống. Kiểm thử tự động chỉ mock; live write không thực hiện trên dữ liệu thật.
- **Kiểm chứng:** schema/error/cache tests, double-submit, authenticated test fixture và server state trước/sau nếu được duyệt.
- **Chấp nhận:** chỉ action được duyệt mới active; server response là nguồn trạng thái; cancel không gửi request.
- **Điều kiện vào/ra:** vào khi toàn bộ gate đã có; nếu thiếu một mục, phase giữ disabled và dừng.
- **Rủi ro/dừng:** publish ảnh hưởng nhiều Owner; delete có thể không khôi phục. Dừng nếu không rõ scope, audit hoặc rollback.
- **Gate:** phê duyệt riêng trước khi bật bất kỳ action toàn cục nào.

### Phase 7 — Mutation hóa đơn/tài chính

- **Kết quả:** thao tác billing chỉ hiện khi vai trò, điều kiện giao dịch và phản hồi server đã rõ.
- **Phạm vi:** từng payment/proof review/reconcile/refund/deposit action được API cho Moderator và có cùng ngữ nghĩa với UI.
- **Ngoài phạm vi:** FE tự tính số tiền/số dư/trạng thái; thực hiện giao dịch thật để kiểm thử; suy luận từ label.
- **Phụ thuộc:** phase 4 reads, authoritative contract, idempotency, amount/currency, trạng thái trước/sau, safe backend test environment và duyệt nghiệp vụ.
- **Ranh giới/file dự kiến:** mở rộng billing APIs/schemas và handler liên quan; sửa đúng test files.
- **Side effects:** có thể đổi dữ liệu hoặc trạng thái thanh toán. Phải hiển thị đúng invoice, amount, currency và kết quả trước xác nhận.
- **Kiểm chứng:** request/schema, lỗi và idempotency; kiểm tra state trước/sau trên fixture được duyệt; review tài chính và security.
- **Chấp nhận:** không có button ghi hoạt động nếu bất kỳ hợp đồng/role/amount nào không rõ; server xác nhận trước khi báo thành công.
- **Điều kiện vào/ra:** vào chỉ khi API và test environment sẵn sàng; ra theo từng action đã review hoặc khóa rõ.
- **Rủi ro/dừng:** thanh toán trùng/sai amount hoặc sai trạng thái. Dừng toàn bộ action có semantics nhập nhằng.
- **Gate:** duyệt riêng danh sách action và môi trường kiểm thử trước khi code.

### Phase 8 — Contract/buyback lifecycle và bàn giao hoàn tất

- **Kết quả:** lifecycle action chỉ bật khi endpoint, chuỗi bước, role và audit của từng transition được xác nhận; nếu không, route vẫn unavailable có giải thích.
- **Phạm vi:** action hợp đồng/buyback hiện có trên UI khi API thực cho Moderator hỗ trợ. Đánh giá lại collection buyback nếu backend đã có endpoint mới.
- **Ngoài phạm vi:** owner-only expiry decision; tạo hợp đồng mới/form mới; chuyển legal/financial state theo chuỗi đoán; thay đổi backend.
- **Phụ thuộc:** read contracts/buyback đã xác minh; state transition matrix, valid role và test data; xác nhận người dùng cho thao tác pháp lý/thu hồi/tài chính.
- **Ranh giới/file dự kiến:** mở rộng `contracts.api.ts`/`buybacks.api.ts` và schema tương ứng; chỉ sửa screens/actions cần thiết. `/moderator/contracts/new` tiếp tục unavailable nếu chưa có endpoint và yêu cầu form riêng.
- **Side effects:** thay đổi hợp đồng, quy trình thu hồi, tài chính hoặc kho. Live write không nằm trong automated tests; cần phê duyệt riêng và fixture an toàn.
- **Kiểm chứng:** transition-specific tests, role denial, duplicate prevention, audit fields, browser evidence và state server sau mỗi action được duyệt.
- **Chấp nhận:** không còn hành động demo báo thành công; owner-only và thiếu endpoint được khóa; tất cả route trong scope có trạng thái rõ và có test/verification evidence.
- **Điều kiện vào/ra:** vào nếu hợp đồng/phê duyệt đã đủ; ra khi từng action được review hoặc ghi rõ unavailable, toàn bộ Moderator route matrix và regressions được kiểm tra.
- **Rủi ro/dừng:** legal state, multi-service workflow, rollback/audit chưa xác định. Dừng action liên quan và giữ dữ liệu đọc.
- **Gate:** review cuối toàn bộ Moderator; kết thúc ở action cuối đã xác minh, không mặc định phải bật mọi nút Sơn.

## Kiểm tra xuyên suốt và tiêu chí hoàn tất

- Mỗi endpoint trước khi nối phải được kiểm tra lại method, path, query/body, response, lỗi, role `MODERATOR`, identity và side effect bằng OpenAPI hoặc mã/hợp đồng backend hiện hành. 401 là lỗi phiên; 403 chỉ được gọi là lỗi quyền khi phiên hợp lệ.
- Không gửi `ownerId`, `tenantId`, `machineId`, contract UUID hoặc file ID từ label/serial/fixture nếu contract yêu cầu canonical UUID khác.
- Query có `AbortSignal` khi chuyển route/tham số; không biến lỗi thành empty; không thêm polling mặc định. Mutation invalidate đúng query family và không hiện optimistic success cho tác động nghiêm trọng.
- Phase phù hợp chạy `node --test` cho Moderator và test domain dùng chung, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`; không lặp full suite không cần thiết sau khi cùng code không đổi.
- Route smoke cho `/moderator` và route nested; browser verification bằng phiên role Moderator nếu sẵn sàng, gồm responsive desktop/mobile và loading/empty/error/forbidden. Thiếu dữ liệu thật được ghi `partial`, không được tuyên bố live verify.
- Full-suite legacy failures phải phân biệt với lỗi phase và đối chiếu trên chính `ref`; không xóa test legacy như một phần tự động của migration nếu chưa duyệt file.
- Hoàn tất khi toàn bộ route Moderator đang được giữ lại có mapping API hoặc trạng thái unavailable rõ; không còn demo success; các page thuộc Pages Router và ranh giới đúng cấu trúc; test/build/review đạt; evidence live read được ghi hoặc giới hạn môi trường được báo chính xác.

## Rủi ro và điểm dừng tổng thể

1. Kế hoạch API Moderator cũ có thể chậm hơn OpenAPI/backend: contract live mới nhất thắng; dừng endpoint khác nhau.
2. Bản ghi thật có thể chưa có, nên detail/telemetry/live writes chưa đủ evidence: giữ phase/domain ở partial, không fake fixtures thành server data.
3. Đổi App Router sang Pages Router có thể lộ route alias/ID fixture: giữ URL theo `PATH_MODERATOR`, chỉ đổi phần hiển thị dựa trên canonical ID.
4. Schema/API dùng chung Admin có thể cần thêm trường: chỉ thay additive, test cả Moderator và Admin; dừng nếu một schema contract không thể tương thích an toàn.
5. Mutation invoice/recipe/contract/buyback có tác động đáng kể: mỗi hành động có gate riêng; không coi việc người dùng duyệt plan là duyệt gửi request ghi thật.
6. Yêu cầu form “Tạo hợp đồng” trên Admin chưa được giải quyết bởi kế hoạch này. Sơn không có form Moderator để chuyển; hợp đồng hiện ghi `/moderator/contracts/new` unavailable. Cần scope/spec và API contract riêng nếu vẫn muốn tạo form.

## Nhật ký thực hiện

### Phase 0 — complete

- **Files:** tạo `src/pages/moderator/[[...sections]].page.tsx`, `moderator-shell.tsx`, `moderator-shell.module.css`, `src/text/moderator/moderator-messages.ts`; sửa `src/lib/auth-role.ts`, `src/routes/path.ts`, `src/routes/routes.ts`, `tests/admin-overview.test.cjs` và `tests/moderator-shell-data-label.test.cjs`.
- **Kết quả:** thêm `/moderator` optional catch-all; nhận diện role `MODERATOR` và điều hướng sau đăng nhập; kiểm tra role tại shell; thêm điều hướng desktop/mobile; trả 404 cho section không hỗ trợ; giữ màn hình nghiệp vụ ở trạng thái chờ chuyển, không gọi API.
- **Kiểm thử:** `node --test tests/admin-overview.test.cjs tests/moderator-shell-data-label.test.cjs` — 12/12 pass; `npm.cmd run lint` — pass; `npx.cmd tsc --noEmit` — pass; `git diff --check` — pass.
- **Build/route smoke:** sau khi xóa riêng cache Next bị Git ignore và xác nhận không có Node listener dùng cache, `npm.cmd run build` pass; build liệt kê route `ƒ /moderator/[[...sections]]`. Server production cục bộ trả 200 cho `/moderator`, `/moderator/contracts/C-204`, `/moderator/machines/S-018` và 404 cho `/moderator/contracts/not-a-record`; server đã được dừng sau kiểm tra.
- **Test legacy bổ sung:** các test route được chọn từ `tests/moderator-phase3.test.cjs` và `tests/moderator-phase4.test.cjs` dừng trước assertion vì loader cũ không resolve alias có sẵn `@/text/home/home-messages` trong `src/routes/routes.ts`; loader chỉ mock `./path`. Các route test mới của Phase 0 chạy độc lập và pass; chưa sửa test files ngoài danh sách Phase 0.
- **Review:** route matcher giới hạn route động theo UUID/mã đã dùng trên Sơn, từ chối section/mã sai; shell không render điều hướng cho role khác; login, token storage, refresh và API không đổi. Build, route smoke, kiểm thử và review đạt; phase hoàn tất.

### Phase 3 — partial (2026-10-23)

- **Files:** tạo `src/pages/moderator/moderator-operational-screens.tsx`, `src/apis/installation-work-orders.api.ts`, `src/schema/installation-work-orders.schema.ts`; sửa `src/pages/moderator/moderator-read-screens.tsx`, `src/pages/moderator/[[...sections]].page.tsx`, `src/pages/moderator/moderator-shell.module.css`, `src/apis/machines.api.ts`, `src/apis/locations.api.ts`, `src/schema/machines.schema.ts`, `src/schema/locations.schema.ts`, `src/text/moderator/moderator-messages.ts`, `tests/moderator-phase3.test.cjs`, `tests/dolores-locations.test.cjs` và `tests/dolores-telemetry.test.cjs`.
- **Kết quả:** thêm màn đọc inventory/detail máy, lịch bảo trì và ticket; địa điểm theo `tenantId`; IoT chờ chọn máy Smart IoT và khoảng ngày, tải heartbeat/telemetry theo trang thủ công; danh sách installation work order đọc theo tenant và chi tiết chỉ hiển thị metadata checklist/phụ kiện/chứng cứ. ID legacy không gửi API. Tạo yêu cầu, phân công, điều phối và chuyển trạng thái vẫn khóa. Ticket maintenance được lọc theo machine UUID ở FE vì collection endpoint không có query machine filter; phạm vi này được nêu trên UI. Đối chiếu tenant/Owner của location với machine trước khi hiển thị tên địa điểm.
- **API guard:** dùng `src/lib/http.ts`/`DOLORES_API_BASE_URL`; API installation work order kiểm tra UUID, identity chi tiết và tenant của từng record. Location Owner list/query hiện có tiếp tục gửi `ownerId`; Moderator dùng riêng `tenantId`. Telemetry không polling; offset dừng tại giới hạn schema. Không gửi POST/PUT/PATCH/DELETE.
- **Kiểm thử mục tiêu:** `node --test tests/moderator-phase3.test.cjs tests/dolores-locations.test.cjs tests/dolores-telemetry.test.cjs` — 20/20 pass; gồm scope/identity, UUID, khoảng ngày, phân trang, tối đa 5 truy vấn tenant đồng thời, hủy truy vấn, partial failure, empty/403, không poll và không ghi.
- **Hồi quy:** `node --test tests/moderator-phase2.test.cjs tests/admin-machines-iot.test.cjs tests/moderator-dashboard.test.cjs tests/dolores-contracts.test.cjs` — 22/22 pass. `node_modules/.bin/tsc.cmd --noEmit`, `npm.cmd run lint`, `npm.cmd run build` và `git diff --check` — pass.
- **Production route smoke:** production server cục bộ trả 200 cho `/moderator`, `/moderator/machines`, chi tiết máy UUID, `/moderator/iot/customer`, `/moderator/technical-requests`, `/moderator/machine-history/{UUID}`; section lạ trả 404. Server đã dừng và port 3100 được xác nhận trống.
- **Full suite:** `node --test tests/*.test.cjs` — 75/113 pass, 38 fail. Các failure ghi nhận gồm test còn trỏ tới đường dẫn đã chuyển/xóa như `src/apis/dolores/*`, `src/schemas/dolores/*`, `src/services/auth.service.ts`, `src/lib/axios/axiosClient.ts`, App Router `src/app/api/*`, cùng loader cũ chưa mock alias schema. Không sửa test ngoài danh sách được duyệt; cần xử lý migration debt riêng trước khi suite toàn dự án xanh.
- **Browser/backend evidence:** không thu được screenshot desktop/mobile vì Computer Use native pipe không kết nối được sau hai lần thử. Không có phiên Moderator/browser và bản ghi backend thật để kiểm tra quyền, dữ liệu live hoặc phản hồi endpoint. Vì vậy không tuyên bố responsive/live verification.
- **Review:** read-only review xác nhận các request trong phase đều GET, identity/scope được kiểm tra khi contract có trường, errors không đổi thành empty, partial fan-out được báo, thao tác chưa được duyệt bị khóa và evidence không lộ URL tải file. Không còn finding Phase 3 cần sửa trong phạm vi đã duyệt.
- **Gate decision:** **partial**. Các test mục tiêu, hồi quy, typecheck, lint, build và route smoke đạt; browser responsive/live Moderator evidence và full-suite green còn thiếu. Dừng ở Phase 3 theo Standard; không bắt đầu Phase 4 cho đến khi các giới hạn này được xử lý hoặc được chấp nhận rõ.


### Phase 4 — partial (2026-10-24)

- **Files:** tạo `src/pages/moderator/moderator-finance-catalog-screens.tsx`, `src/apis/buybacks.api.ts`, `src/schema/buybacks.schema.ts`; sửa `src/apis/billing.api.ts`, `src/schema/billing.schema.ts`, `src/pages/moderator/moderator-read-screens.tsx`, `src/pages/moderator/[[...sections]].page.tsx`, `src/text/moderator/moderator-messages.ts`, `tests/moderator-phase4.test.cjs`, `plans/moderator-pages-api-migration.md`. Cập nhật thêm một assertion đã lỗi thời trong `tests/moderator-phase3.test.cjs` theo duyệt riêng.
- **Kết quả:** route hóa đơn có danh sách/chi tiết và chứng từ; recipe có danh sách/chi tiết global dùng GET hiện hữu; buyback chỉ có chi tiết theo UUID. Danh sách buyback nêu rõ chưa có API, và mã mẫu `MB-*` không được gửi lên backend. Các route ghi như đối soát hóa đơn, thêm menu, tài liệu buyback vẫn pending.
- **API/schema:** bổ sung GET hóa đơn chi tiết, payment proof list và tải nội dung proof qua client Dolores dùng chung; schema Moderator chấp nhận `ownerId` hoặc `tenantId` để giữ schema Admin nguyên trạng. Kiểm tra UUID và đối chiếu ID trả về; danh sách proof phải thuộc invoice đang mở. `objectKey`, `idempotencyKey`, `correlationId` không được hiển thị. Màn hình không cộng tổng hóa đơn, phát hành recipe hay thực hiện bất kỳ request ghi nào.
- **Backend evidence:** tài liệu contract đã ghi nhận quyền đọc hóa đơn toàn hệ thống có thể trả 403 cho Moderator; giao diện phân biệt 401/403/404/lỗi mạng với danh sách rỗng. Lượt này không có token/browser Moderator để kiểm tra live, nên quyền và dữ liệu thật của invoice/proof/recipe/buyback vẫn chưa xác minh.
- **Automated evidence:** `node --test tests/moderator-phase4.test.cjs` — 8/8 pass; regression Moderator/Admin đã chọn — 45/45 pass; `node_modules/.bin/tsc.cmd --noEmit`, `npm.cmd run lint`, `npm.cmd run build -- --experimental-build-mode compile`, `git diff --check` — pass.
- **Full suite:** 83/112 pass, 29 fail. Các lỗi còn lại thuộc test migration ngoài phạm vi Phase 4, gồm loader Admin thiếu alias `@/schema/tenants.schema` và test logout/proxy còn mở đường dẫn `src/services/auth.service.ts` hoặc App Router `src/app/api/*` đã chuyển/xóa. Không sửa các test này trong Phase 4.
- **Review/gate:** route read allowlist chỉ nhận đúng list/detail; ID sai không gọi API; amount/currency/status hiển thị từ response, không tự tổng hợp; các thao tác write còn khóa. **Trạng thái partial:** automated/build checks đạt, dừng tại gate Phase 4; cần phiên Moderator đã đăng nhập để kiểm tra live và xử lý migration debt của full suite. Không bắt đầu Phase 5.

### Phase 5 — partial (2026-10-24)

- **Files:** sửa `src/pages/moderator/moderator-read-screens.tsx`, `src/text/moderator/moderator-messages.ts`, `tests/moderator-dashboard.test.cjs`, `tests/dolores-notifications.test.cjs` và tài liệu kế hoạch này. Không tạo file/thư mục mới; tái sử dụng `notificationsApi.markAsRead` đã có.
- **Action matrix đã duyệt:** bật đúng một thao tác: đánh dấu từng thông báo chưa đọc thành đã đọc qua `POST /notifications/{id}/read`. Không bật bulk read, alert acknowledgement, tạo/gán maintenance ticket, tạo installation work order hay upload tài liệu.
- **Contract/UI:** API client kiểm tra UUID và chỉ chấp nhận response khớp ID cùng `read: true`. Nút chỉ hiện ở hàng unread, khóa khi mutation pending; lỗi hiện alert và không cập nhật lạc quan. Chỉ sau response hợp lệ mới invalidate query family thông báo để tải lại danh sách và unread count. Hợp đồng Moderator-specific đã được ghi trong `plans/moderator-api-integration.md`; lượt này không gọi mutation thật.
- **Kiểm thử:** `node --test tests/moderator-dashboard.test.cjs tests/dolores-notifications.test.cjs tests/admin-menu-reports-notifications.test.cjs` — 15/15 pass. Bao phủ ID/path/response, nút theo trạng thái, pending/double-submit, refresh chỉ sau success, lỗi giữ unread và alert vẫn read-only.
- **Kiểm tra kỹ thuật:** `node_modules/.bin/tsc.cmd --noEmit`, `npm.cmd run lint`, `npm.cmd run build -- --experimental-build-mode compile`, `git diff --check` — pass. Build compile liệt kê route Pages Router `/moderator/[[...sections]]`.
- **Browser/backend evidence:** browser inventory rỗng; chưa có phiên Moderator và record unread để kiểm tra live. Không gửi POST thật. Người dùng sẽ kiểm tra giao diện sau khi nhận bàn giao.
- **Review/gate:** thao tác chỉ đổi sau phản hồi backend đã parse và xác nhận; UUID sai hoặc response không xác nhận bị từ chối; errors không invalidate cache. **Trạng thái partial:** code và kiểm tra tự động đạt, live Moderator verification còn chờ người dùng kiểm tra/phiên có unread record. Phase 4 vẫn partial như trước; dừng tại gate Phase 5, không bắt đầu Phase 6.

Sau mỗi phase, cập nhật trạng thái, danh sách file đúng như đã được duyệt, lệnh kiểm thử, kết quả, browser/backend evidence, review và lý do nếu phase partial/blocked; không tự chuyển phase kế tiếp.
