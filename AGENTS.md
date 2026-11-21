# AGENTS.md — Quy tắc làm UI cho SCM-BEANS_Dashboard_FE

Áp dụng cho mọi agent (Codex, Claude) khi viết hoặc sửa giao diện. Các quy tắc này do chủ dự án đặt, không tự ý sửa hoặc nới lỏng.

## 1. Ưu tiên dùng component chung trước

- Trước khi viết bất kỳ UI nào, TÌM component dùng chung đã có (`src/components/*`: ButtonBar, TextLinkButton, PageActions, TableFilters, DataTable, ContractTable, BackButtonHeading, SectionHeading, SectionTabList, Panel, FormField, Pagination, StatusBadge, QueryFeedback, shells...) và dùng lại.
- Chỉ tạo component mới khi KHÔNG có component chung nào đáp ứng được. Khi đó phải đặt trong `src/components/`, dùng lại token trong `src/styles/ui-tokens.css`, và nêu rõ lý do trong báo cáo.
- KHÔNG viết CSS riêng cho nút, tab, khung, bảng, tiêu đề, ô nhập, nhãn trạng thái nếu đã có component chung cho chúng.
- KHÔNG tự tạo code mới (hàm, hook, style, markup) khi đã có đoạn tương đương trong codebase: tìm bằng Grep rồi tái sử dụng.

## 2. Tham khảo trang đã thiết kế, không tự sáng tạo

- Trang Admin là chuẩn thiết kế. Owner, Moderator, Technician phải thừa hưởng component và bố cục của Admin; chỉ khác theo quyền (ẩn/khóa hành động, phạm vi dữ liệu).
- Với mỗi tính năng, nếu đã có màn được thiết kế rồi (ở bất kỳ role nào), THAM KHẢO và sao theo màn đó. Không tự sáng tạo bố cục, kiểu nút, kiểu tab, khoảng cách, màu sắc, microcopy mới.
- Tính năng giống nhau giữa các role phải có cùng bố cục, cùng thứ tự khối, cùng tiêu đề, cùng tab, cùng bảng, cùng bộ lọc.
- Không thêm hành động hoặc quyền mới cho role chưa có.

## 3. Chuẩn hình thức đã chốt

- Nút: MỘT kiểu duy nhất, nền trắng, chữ đen, viền xám nhạt chuẩn; không nút đỏ, nút viền đỏ, nút nền hồng. Nút Xóa/Tải cũng cùng kiểu (phân biệt bằng nhãn và hộp thoại xác nhận). Không hiệu ứng hover/active/transition/animation/transform/shadow. Chỉ giữ cursor, focus-visible và trạng thái disabled.
- Tab: dùng SectionTabList. Không gạch chân, không đường kẻ dưới hàng tab. Tab đang chọn nền xám nhạt, chữ đen đậm; tab khác chữ xám.
- Không thêm viền/đường kẻ trang trí thừa dưới tiêu đề, hàng tab, hàng hành động.
- Khung: dùng Panel (padding 22px 24px, radius 16px); các khung cùng hàng phải cân đều chiều cao, khoảng cách, tiêu đề.
- Màu, cỡ chữ, khoảng cách, bo góc: lấy từ `src/styles/ui-tokens.css` và STANDARDS.md, không dùng giá trị rời.

## 4. Chung

- Chuỗi chữ hiển thị đặt trong `src/text/`. Không để mã kỹ thuật/enum/ISO/UUID lộ ra giao diện tiếng Việt.
- Không thay đổi chức năng, API, schema, route, quyền khi chỉ sửa UI.
- Không đụng landing, home, login nếu không được yêu cầu.
## 5. Cấu trúc thư mục (theo mã đang chạy, không theo `rules.md` cũ)

Dự án dùng **Next.js Pages Router** (không phải App Router), CSS Modules (`*.module.css`), React Query, Zod. `rules.md` mô tả App Router/Tailwind cũ và đã lỗi thời; khi mâu thuẫn, tin mã đang chạy và `MIGRATION_WORKFLOW.md`.

| Vị trí | Trách nhiệm |
| --- | --- |
| `src/pages` | Route (`*.page.tsx`) và mã chỉ phục vụ một trang. Có theo role: `admin`, `dashboard` (Owner), `moderator`, `technician`. Moderator dùng catch-all `[[...sections]].page.tsx` |
| `src/pages/api` | Endpoint server của Next (proxy IDaaS/Dolores), không phải nơi viết hàm gọi API nghiệp vụ |
| `src/apis` | Hàm gọi API theo nghiệp vụ (`*.api.ts`), không chứa giao diện |
| `src/schema` | Schema Zod kiểm tra request/response và suy ra kiểu |
| `src/lib` | Hạ tầng dùng chung (axios, xử lý lỗi, auth role, idempotency key...) |
| `src/routes` | `path.ts` (URL) và `routes.ts` (điều hướng, kiểm tra route hợp lệ theo role) |
| `src/text` | Toàn bộ chuỗi chữ hiển thị theo trang/chủ đề |
| `src/components` | Chỉ phần thực sự dùng lại ở nhiều nơi; component một trang thì để cạnh trang đó |
| `src/styles/ui-tokens.css` | Token thiết kế dùng chung (màu, cỡ chữ, khoảng cách, bo góc) |

- Quy tắc tạo file/thư mục mới: theo `MIGRATION_WORKFLOW.md` (báo đường dẫn chính xác và lý do, chờ người dùng duyệt). Không tạo file/thư mục trống hoặc "cho giống" cấu trúc khác.
- Một route nhiều role cùng tính năng: logic giao diện nằm ở component dùng chung, file của từng role chỉ nối quyền/điều hướng.
- Thêm route mới phải cập nhật `src/routes/path.ts` và `src/routes/routes.ts`, đồng thời kiểm tra route không bị 404 với ID hợp lệ theo schema.

## 6. Ngữ cảnh dự án

- Sản phẩm: dashboard quản lý máy pha cà phê IoT (Dolores). Bốn role: **Admin** (chuẩn thiết kế), **Owner** (`/dashboard`), **Moderator**, **Technician**. Mỗi role có shell riêng (`admin-shell`, `customer-shell`, `moderator-shell`, `technician-shell`); shell và breadcrumb là phần đã thống nhất, không phá.
- Backend: IDaaS (:4000) và Dolores (:8082). `BACKEND_API_MODE=remote` luôn dùng backend remote (không rơi về localhost). Trên backend thật chỉ gửi request đọc (GET/HEAD) khi kiểm tra, không bấm hành động ghi.
- Ngôn ngữ: giao diện tiếng Việt; trao đổi với người dùng bằng tiếng Việt; code và comment bằng tiếng Anh.
- Landing/home/login là phần riêng, không sửa khi chỉ chỉnh dashboard.
- Dev server của người dùng chạy cổng 3000, không dùng và không dừng; kiểm tra tự động dùng cổng 3105 với `NEXT_DIST_DIR` riêng.

## 7. Ràng buộc và an toàn

- Không sửa `src/apis`, `src/schema`, `src/routes` khi chỉ sửa giao diện, trừ khi nhiệm vụ yêu cầu rõ (ví dụ sửa 404).
- Không đổi props công khai của component dùng chung nếu không cần; nếu đổi phải cập nhật hết nơi gọi.
- Không thêm package mới, không thêm dark mode, không đổi cấu hình build nếu không được yêu cầu.
- Không in mật khẩu, token, nội dung `.env*` ra log hoặc báo cáo.
- Không commit/push, không `reset`, `stash`, `checkout`, force push nếu người dùng chưa yêu cầu rõ. Không xóa đệ quy; xóa hàng loạt phải hỏi trước.
- Các thư mục build `.next*`, `test-results`, `.playwright-cli` là sản phẩm sinh ra, không commit; mỗi lần kiểm tra dùng một `NEXT_DIST_DIR` và dọn khi xong.
- Không đụng file chưa theo dõi của người dùng (anomaly, `plans/reports`, test e2e của luồng khác) khi không liên quan.
- Mỗi thay đổi UI phải chạy `npx tsc --noEmit --incremental false` và `npm run lint`; test e2e liên quan chạy ở cổng 3105. Báo cáo trung thực: nêu rõ phần chưa kiểm tra, không báo "xong" khi chưa mở/đo trang thật.
## 8. Rà soát cấu trúc trước khi viết, tránh component trùng và bị đè

- **Rà soát cấu trúc TRƯỚC khi viết hoặc sửa bất cứ gì:** đọc cây thư mục liên quan, tìm component/hook/hàm/CSS đã có (Grep tên, vai trò, class), xem trang tương đương ở role khác, xác định ai sở hữu phần giao diện đó (shell, trang, hay component dùng chung). Chỉ bắt đầu viết khi đã biết mình sẽ tái sử dụng cái nào và sửa ở đâu. Ghi kết quả rà soát ngắn trong báo cáo.
- **Mỗi phần tử giao diện chỉ có MỘT chủ sở hữu.** Breadcrumb, nút quay lại, tiêu đề h1, hàng hành động, hàng tab, bộ lọc, phân trang, thông báo trạng thái: chỉ render ở một nơi (shell HOẶC trang HOẶC component dùng chung), không render lặp ở hai tầng. Trước khi thêm một phần tử vào trang, kiểm tra shell và component cha có đã render nó chưa.
- **Không gọi nhiều component giống nhau chồng lên nhau:** không bọc component dùng chung trong component dùng chung khác đã render sẵn chính nó (ví dụ Panel lồng Panel, hai thanh tab, hai nút quay lại, hai tiêu đề cùng chữ trong cùng một khối). Không tạo biến thể gần giống của component có sẵn (`FooTabs`, `NewTabs`, `SmallButton`...); cần khác biệt thì thêm prop vào component gốc.
- **Không đè style của component dùng chung:** không ghi đè kích thước/màu/viền/khoảng cách/hiệu ứng của component dùng chung bằng CSS riêng của trang (override theo class, `!important`, selector dài hơn). Cần đổi hình thức thì sửa token hoặc component gốc để mọi nơi cùng đổi. Một thuộc tính hình thức chỉ do MỘT nơi quyết định (ví dụ cỡ h1 do `ui-tokens.css`, không để module CSS khác đặt lại).
- **Phát hiện trùng thì gộp:** nếu rà soát thấy hai component làm cùng một việc, báo cho người dùng và gộp về một, không thêm cái thứ ba.
- Sau khi sửa, kiểm tra trang thật (hoặc ảnh chụp): không có hai phần tử cùng loại hiện chồng/trùng, không có phần tử bị che hoặc lệch do hai quy tắc CSS tranh nhau.
## 9. Tổng quan dự án

Dashboard quản lý máy pha cà phê IoT Dolores cho 4 role (Admin, Owner, Moderator, Technician), kèm landing/home/login. Stack: Next.js 16 Pages Router, React 19, TypeScript, CSS Modules, TanStack React Query, Zod, Axios, recharts, react-three-fiber (mô hình 3D máy). Cấu trúc thư mục quan trọng xem mục 5.

## 10. Lệnh thường dùng (PowerShell, chạy tại thư mục FE)

```powershell
npm.cmd run dev                                  # dev server (next dev --webpack), cổng 3000 là của người dùng
npm.cmd run lint                                 # ESLint cho src
npx.cmd tsc --noEmit --incremental false         # kiểm tra kiểu toàn dự án
npm.cmd run build                                # build production
node --test tests/<ten>.test.cjs                 # chạy MỘT test Node đơn lẻ
npx.cmd playwright test tests/e2e/<ten>.spec.ts  # chạy MỘT test e2e
```

- E2E mặc định cổng 3100 và `NEXT_DIST_DIR=.next-playwright`. Khi agent tự chạy, đặt cổng và thư mục build riêng, ví dụ `$env:PLAYWRIGHT_PORT="3105"; $env:NEXT_DIST_DIR=".next-ten-rieng"`, rồi dọn thư mục build đó khi xong. Không dùng cổng 3000.
- Các test Node `tests/*.test.cjs` đọc mã nguồn bằng loader; một số lỗi có sẵn do loader không nạp được CSS module hoặc đường dẫn cũ. Trước khi kết luận "lỗi mới", đối chiếu với trạng thái trước thay đổi.
- E2E mock mọi API ghi; không để test gọi POST/PUT/DELETE lên backend thật.

## 11. Quy ước code không hiển nhiên

- Route chỉ là file có hậu tố `.page.tsx`/`.page.ts` trong `src/pages` (cấu hình `pageExtensions`); file `.tsx` khác trong `src/pages` không thành route.
- Mỗi màn có `*-screen.tsx` + `*.module.css` cạnh nhau; file route chỉ mỏng, hiển thị screen.
- Chuỗi giao diện trong `src/text/<chủ đề>`; không viết chuỗi cứng trong JSX (trừ nhãn kỹ thuật không hiển thị).
- ID thực thể (máy, hợp đồng, menu, mẫu máy...) kiểm tra bằng schema Zod có sẵn trong `src/schema` (ví dụ `MachineIdSchema`, `MachineModelIdSchema`), không viết regex UUID tự chế.
- Gọi API chỉ qua `src/apis/*.api.ts` + `src/lib/http.ts`; không `fetch`/axios trực tiếp trong component. Mutation dùng idempotency key (`src/lib/idempotency-key.ts`).
- Không dùng `any`; không inline-style cho hình thức, dùng token trong `ui-tokens.css`.

## 12. Quy trình làm việc

- Nhánh làm việc chính hiện tại: `ref` (đồng đội cùng đẩy lên `origin/ref`). Trước khi push phải `git fetch`; nếu `origin/ref` có commit mới thì báo người dùng, không tự merge/rebase, không force push.
- Thông điệp commit theo dạng `type(scope): mô tả ngắn` (ví dụ `feat(ui): ...`, `fix(buyback): ...`, `refactor(dashboard): ...`). Thêm dòng `Co-Authored-By` cho agent khi agent là người tạo commit.
- Chỉ commit khi người dùng yêu cầu. Chỉ stage file đã theo dõi liên quan (`git add -u` hoặc liệt kê file), không `git add -A`; không đưa `.next*`, `.env*`, `test-results`, `.playwright-cli`, ảnh chụp, báo cáo QA vào commit.
- Trước khi báo xong: `tsc` đạt, `npm run lint` không lỗi, test e2e/Node liên quan đạt hoặc ghi rõ lỗi có sẵn, và nêu phần chưa kiểm tra.

## 13. Những điều không được làm

- Không sửa file sinh tự động (`next-env.d.ts`, `package-lock.json` bằng tay, thư mục `.next*`, `tsconfig.tsbuildinfo`).
- Không commit `.env`, `.env.local`, token, mật khẩu; không in chúng ra log/báo cáo.
- Không thêm dependency khi chưa hỏi; không nâng cấp phiên bản Next/React.
- Không "cải thiện" kiến trúc ngoài phạm vi yêu cầu (không đổi Pages Router sang App Router, không bỏ CSS Modules, không thay React Query bằng thư viện khác).
- Không xóa file/thư mục đã commit (`docs`, `plans`, `scripts`, `public`...) khi chưa được người dùng đồng ý.
- Không đụng `src/pages/dev/anomaly-*`, `src/lib/anomaly/*`, `public/anomaly-demo/*` nếu nhiệm vụ không nhắc tới.

## 14. Bẫy và quirk môi trường

- **Backend remote:** IDaaS và Dolores chạy trên máy từ xa qua mạng nội bộ (NetBird/WireGuard). Khi mạng đổi (Wi-Fi/VPN chập chờn) request sẽ lỗi 502/504 và `ERR_NETWORK_CHANGED`; đây thường không phải lỗi mã. Đăng nhập dev quick-login (`/api/dev-quick-login`, mật khẩu ở `.env.local`) có thể trả 502 khi IDaaS timeout; khi đó dùng fixture/mock GET để kiểm tra giao diện và ghi rõ là chưa kiểm chứng với dữ liệu thật.
- **Biến môi trường chính:** `BACKEND_API_MODE`, `IDAAS_API_LOCAL_URL`/`IDAAS_API_IP_URL`, `DOLORES_API_LOCAL_URL`/`DOLORES_API_IP_URL`, `NEXT_PUBLIC_API_URL`, `DEV_QUICK_LOGIN_PASSWORD`, `ENABLE_ANOMALY_DEMO`. Đọc tên biến từ mã, không đọc giá trị trong `.env*`.
- **Dev server ngốn RAM:** `.next*` có thể phình rất lớn (từng 90GB+). Dùng `NEXT_DIST_DIR` riêng cho mỗi lần kiểm tra và xóa khi xong; không chạy nhiều dev server song song; dev server phải tắt trước khi xóa `.next`.
- **Moderator:** dùng một catch-all `src/pages/moderator/[[...sections]].page.tsx`; route mới của Moderator PHẢI được `isSupportedModeratorSection` (trong `src/routes/routes.ts`) chấp nhận, nếu không sẽ 404. Tám route `/moderator/invoices/{reconcile,shortfall,excess,late-cups,late-cups-final,overdue,history,payg}` đang 404 từ trước, chưa có màn; không tự "sửa" trừ khi được yêu cầu.
- **Fixture rỗng gây hiểu lầm:** ảnh/đo trên dữ liệu rỗng không đại diện trang chi tiết; khi kiểm tra UI phải có dữ liệu giả đủ nội dung và UUID hợp lệ.
- **File CRLF/LF:** Git cảnh báo LF→CRLF trên Windows; không chạy lệnh đổi toàn bộ line ending.

## 15. Quyết định kiến trúc quan trọng (đừng "cải thiện" sai hướng)

- **Remote không rơi về localhost:** `BACKEND_API_MODE=remote` luôn dùng backend remote. Proxy `src/pages/api/v1/[...path].page.ts` thử lại GET một lần, trả 504 khi timeout và 502 với lỗi khác; không thử lại mutation. Lý do: tránh gọi nhầm backend local và tránh ghi trùng.
- **Refresh token là cookie HttpOnly** do IDaaS đặt; proxy loại refresh token khỏi JSON. Không đưa refresh token vào JS hoặc localStorage.
- **Admin làm chuẩn thiết kế**, role khác thừa hưởng component và chỉ khác theo quyền; shell (`*-shell`) và breadcrumb do shell sở hữu. Lý do: hiện trạng cũ mỗi role một thiết kế, người dùng yêu cầu thống nhất.
- **Component dùng chung + token** (`ButtonBar`, `Panel`, `FormField`, `SectionTabList`, `DataTable`...) là nơi duy nhất quyết định hình thức; không override ở trang.
- **Quyền hiển thị theo role, không theo ẩn CSS:** hành động không được phép phải không render hoặc bị khóa kèm lý do; không mở rộng quyền khi chỉ sửa giao diện.
- **Telemetry/digital twin:** dữ liệu thời gian thực giữ trong state của hook, không đẩy liên tục vào cache React Query; có backoff khi mất kết nối.