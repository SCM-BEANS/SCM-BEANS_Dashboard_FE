# Quy trình chuyển cấu trúc từ nhánh Sơn sang `ref`

## Mục tiêu và nguồn đối chiếu

- **Nhánh Sơn** là nguồn để hiểu giao diện, hành vi và hợp đồng API cần chuyển.
- **`C:\GitHub\QLS\QLS_WEB\src`** là nguồn tham chiếu về cách phân chia trách nhiệm giữa các thư mục.
- **Nhánh `ref`** là nơi viết lại mã theo cấu trúc phù hợp với dự án này. Không chép nguyên cây `src` hoặc bê nguyên file từ nhánh Sơn sang.
- Chuyển từng tính năng có thể chạy và kiểm tra được; không tạo trước file hoặc thư mục trống chỉ để giống cây thư mục tham chiếu.

QLS_WEB dùng React Router, còn `ref` dùng **Next.js Pages Router**. Vì vậy chỉ áp dụng cách tổ chức mã của QLS, không sao chép cơ chế khai báo route. Cấu hình `pageExtensions` trong `next.config.js` quy định các file có hậu tố `.page.tsx`, `.page.ts`, `.page.jsx` hoặc `.page.js` trong `src/pages` trở thành route. `rules.md` mô tả cấu trúc App Router cũ; khi chuyển tính năng vào `ref`, phải đối chiếu với cấu hình và mã đang chạy.

## Vai trò thư mục trong `src`

| Vị trí | Trách nhiệm |
| --- | --- |
| `pages` | Route của Next và mã chỉ phục vụ một trang. Đặt các phần riêng của trang cạnh nhau, như `pages/home` hoặc `pages/auth/login`. |
| `pages/api` | Endpoint chạy phía server của Next. Proxy IDaaS nằm ở đây vì Next yêu cầu API route ở vị trí này; đây không phải nơi đặt hàm gọi API theo nghiệp vụ. |
| `apis` | Hàm gọi API theo nghiệp vụ, ví dụ `auth.api.ts`. Hàm này dùng HTTP client và schema, không chứa giao diện. |
| `schema` | Schema Zod để kiểm tra request/response và suy ra kiểu TypeScript. |
| `lib` | Hạ tầng và hàm dùng chung, như cấu hình Axios, gắn access token và refresh phiên. |
| `routes` | `path.ts` giữ URL/anchor; `routes.ts` giữ dữ liệu liên kết điều hướng. File trong đây không thay thế file route của Next. |
| `text` | Nội dung chữ theo trang/chủ đề và cấu hình typography dùng chung. |
| `assets` | Logo, ảnh và tài nguyên hình ảnh của ứng dụng. |
| `components` | Chỉ chứa thành phần thực sự được dùng lại ở nhiều nơi. Nút hoặc card chỉ thuộc một trang thì để cùng trang đó. |
| `features`, `guards`, `layouts`, `utils` | Chỉ thêm mã khi có nhu cầu tương ứng; không chuyển mã sang đây chỉ vì nhánh nguồn có thư mục cùng tên. |

Ví dụ chuyển trách nhiệm, không chuyển nguyên file:

| Nguồn trên nhánh Sơn | Vị trí phù hợp trên `ref` |
| --- | --- |
| `src/app/(auth)/login/page.tsx` và form đăng nhập chỉ dùng tại trang | `src/pages/login.page.tsx` làm route, giao diện ở `src/pages/auth/login/login-page.tsx` |
| `src/services/auth.service.ts` | Hàm gọi đăng nhập ở `src/apis/auth.api.ts`; kiểm tra dữ liệu ở `src/schema/auth.schema.ts`; xử lý HTTP dùng chung ở `src/lib/http.ts` |
| `src/app/api/v1/[...path]/route.ts` | `src/pages/api/v1/[...path].page.ts`, theo quy tắc API route của Pages Router |
| `src/routes/path.ts` hoặc khai báo React Router của QLS | URL ở `src/routes/path.ts`; dữ liệu điều hướng ở `src/routes/routes.ts`; file route thật ở `src/pages` |

## Quy tắc tạo file và thư mục

1. Trước **mỗi file hoặc thư mục mới**, báo đường dẫn chính xác, nhiệm vụ của nó và lý do chọn vị trí đó sau khi đối chiếu Sơn với QLS_WEB.
2. Chỉ tạo sau khi người dùng cho phép. Nếu đã cho phép một danh sách đường dẫn cụ thể, thực hiện đúng danh sách đó, không xin phép lại cho cùng việc.
3. Viết file mới và đặt tên theo trách nhiệm trong `ref`; không copy cả file từ nhánh Sơn rồi đổi vị trí.
4. Không chia nhỏ một trang thành nhiều `components` nếu các phần đó chỉ dùng tại trang ấy. Chỉ tách khi có trách nhiệm rõ hoặc khả năng tái sử dụng thật.
5. Nếu phát hiện cần thêm file/thư mục ngoài phạm vi đã duyệt, báo mục đích và chờ duyệt trước khi thêm.

## Trình tự chuyển một tính năng

1. **Đọc nguồn và môi trường:** xác định hành vi, trạng thái UI, endpoint, dữ liệu, ảnh và luồng lỗi của tính năng trên nhánh Sơn. Đọc phần tương đương trong QLS_WEB để hiểu cách phân lớp; kiểm tra `package.json`, cấu hình Next, biến môi trường mẫu và mã đang có ở `ref` trước khi chọn cách chuyển.
2. **Đề xuất vị trí:** liệt kê file/thư mục cần tạo hoặc sửa và nhiệm vụ từng file. Giữ số file ở mức cần thiết; xin phép trước khi tạo mới.
3. **Viết theo lớp:** đặt giao diện riêng tại `pages/<tính-năng>`, chữ tại `text`, ảnh tại `assets`, schema tại `schema`, hàm nghiệp vụ tại `apis`, hạ tầng dùng chung tại `lib`. Đưa vào `components` khi đã có nhu cầu dùng lại.
4. **Nối route đúng với Next:** tạo file `*.page.tsx` cho URL công khai. Có thể dùng một file route mỏng để hiển thị trang đặt sâu hơn theo cấu trúc QLS, ví dụ `pages/login.page.tsx` hiển thị `pages/auth/login/login-page.tsx`.
5. **Kiểm tra:** chạy lint và TypeScript; mở URL thật để kiểm tra giao diện desktop/mobile và các trạng thái chính. Với API, kiểm tra request, cookie, mã lỗi và dữ liệu trả về bằng dịch vụ thật hoặc máy chủ giả lập cục bộ. Nêu rõ nếu chưa thử được với backend thật.
6. **Báo kết quả rồi chuyển bước:** ghi rõ đã tạo/sửa gì, đã kiểm tra gì và phần nào còn chờ. Hỏi trước khi bắt đầu phạm vi mới theo cách làm từng bước đã thống nhất.

Các lệnh kiểm tra trong PowerShell:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit --incremental false
git status --short
```

Khi kiểm tra TypeScript, phân biệt lỗi của phần vừa chuyển với lỗi có sẵn. Hiện `tests/dolores-api-types.contract.ts` còn import các module Dolores đã bị xóa nên lệnh TypeScript toàn dự án chưa đạt.

## Mốc đã thực hiện trên `ref`

- **Home:** mã riêng tại `src/pages/home`; route `/` và `/home` qua file `*.page.tsx`; ảnh trong `assets`, chữ trong `text/home`, các phần dùng lại thực sự trong `components`.
- **Điều hướng:** `src/routes/path.ts` giữ đường dẫn; `src/routes/routes.ts` giữ dữ liệu liên kết Home. Route thực tế do Next nhận từ `src/pages`.
- **Đăng nhập và MFA:** giao diện riêng tại `src/pages/auth/login/login-page.tsx`, URL `/login` qua `src/pages/login.page.tsx`; thông điệp tại `src/text/auth/login-messages.ts`; schema tại `src/schema/auth.schema.ts`; hàm gọi API tại `src/apis/auth.api.ts`.
- **IDaaS:** Axios và tự động refresh access token ở `src/lib/http.ts`; proxy server ở `src/pages/api/v1/[...path].page.ts`. Proxy chuyển tiếp cookie refresh `HttpOnly` từ IDaaS và loại refresh token khỏi JSON của các phản hồi đăng nhập, MFA và refresh.
- **Chưa làm:** đăng xuất theo chỉ đạo hiện tại. Chưa kiểm tra xác thực với IDaaS thật khi dịch vụ chưa chạy; chưa có trang dashboard sau đăng nhập, nên đăng nhập thành công tạm chuyển về `/`.
