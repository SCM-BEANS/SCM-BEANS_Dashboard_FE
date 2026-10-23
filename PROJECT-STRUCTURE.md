# Cấu trúc dự án

Tài liệu này mô tả cấu trúc đang có trên nhánh `ref`. Ứng dụng dùng Next.js Pages Router, TypeScript và đặt mã nguồn ứng dụng trong `src/`.

## Cấu trúc cấp gốc

```text
.
├── plans/                  # Kế hoạch triển khai và ghi chú kỹ thuật theo chủ đề
├── public/                 # Tài nguyên tĩnh được Next.js phục vụ trực tiếp
├── scripts/                # Script hỗ trợ phát triển hoặc kiểm tra
├── src/                    # Mã nguồn ứng dụng
├── tests/                  # Kiểm thử hợp đồng API và hành vi các phần chính
├── .env                    # Cấu hình môi trường cục bộ
├── .env.example            # Mẫu tên biến môi trường cần thiết
├── next.config.js          # Cấu hình Next.js, route extension và proxy Dolores
├── package.json            # Thư viện và lệnh của dự án
├── tsconfig.json           # Cấu hình TypeScript và alias @/* tới src/*
└── README.md               # Hướng dẫn tổng quan của dự án
```

`.next/` là đầu ra được Next.js tạo khi chạy hoặc build; `node_modules/` chứa thư viện đã cài. Đây là thư mục phát sinh, không phải nơi đặt mã nguồn tính năng.

## Cấu trúc `src/`

```text
src/
├── apis/                   # Hàm gọi API theo domain
├── assets/                 # Ảnh, logo và tài nguyên được import trong mã nguồn
├── components/             # Thành phần giao diện dùng lại ở nhiều nơi
├── features/               # Hiện chưa có mã nguồn; dành cho tính năng độc lập nếu cần
├── guards/                 # Hiện chưa có mã nguồn; dành cho kiểm tra quyền/truy cập nếu tách riêng
├── layouts/                # Hiện chưa có mã nguồn; dành cho layout dùng chung nếu tách riêng
├── lib/                    # Hạ tầng dùng chung như HTTP client và xử lý vai trò
├── pages/                  # Các trang và API route của Next.js Pages Router
├── routes/                 # Hằng số đường dẫn và cấu hình điều hướng
├── schema/                 # Kiểm tra dữ liệu vào/ra bằng Zod và kiểu suy ra
├── text/                   # Nội dung chữ, nhãn và thông báo tập trung
└── utils/                  # Hiện chưa có mã nguồn; dành cho hàm tiện ích thuần nếu cần
```

### Nhiệm vụ từng thư mục

| Thư mục | Nhiệm vụ | Ví dụ hiện có |
| --- | --- | --- |
| `apis/` | Gom các hàm giao tiếp backend theo domain; trang gọi qua các hàm này thay vì tự viết request rải rác. | `auth.api.ts`, `admin-users.api.ts`, `locations.api.ts`, `machines.api.ts`, `billing.api.ts` |
| `assets/` | Chứa ảnh và logo được import từ component/page. | Logo, ảnh landing page, ảnh máy cà phê |
| `components/` | Chứa UI thực sự tái sử dụng, không gắn riêng với một trang. | `button/`, `heading/`, `brand/`, `action-bar/` |
| `features/` | Chưa có file hiện tại. Có thể dùng sau này khi một nghiệp vụ đủ lớn và cần gom UI, logic, dữ liệu của riêng nghiệp vụ đó. | — |
| `guards/` | Chưa có file hiện tại. Dành cho logic bảo vệ trang/đường dẫn nếu tách khỏi page hoặc layout. | — |
| `layouts/` | Chưa có file hiện tại. Dành cho khung giao diện dùng chung giữa nhiều nhóm trang. | — |
| `lib/` | Hạ tầng nền dùng xuyên ứng dụng. | `http.ts` cấu hình Axios; `auth-role.ts` đọc vai trò xác thực |
| `pages/` | Tạo trang web và API route theo quy ước Pages Router. | `home/`, `admin/`, `login.page.tsx`, `api/` |
| `routes/` | Tập trung URL, section ID và liên kết điều hướng để tránh viết path trực tiếp ở nhiều nơi. | `path.ts`, `routes.ts` |
| `schema/` | Xác thực cấu trúc request/response; nhiều API parse dữ liệu nhận được trước khi trả cho UI. | `auth.schema.ts`, `locations.schema.ts`, `dashboard.schema.ts` |
| `text/` | Tập trung nội dung chữ theo khu vực và cấu hình kiểu chữ chung. | `admin/`, `home/`, `auth/`, `typography.ts` |
| `utils/` | Chưa có file hiện tại; chỉ nên đặt các hàm tiện ích thuần, dùng chung ở đây khi phát sinh nhu cầu. | — |

## Các nhóm trang

`next.config.js` khai báo phần mở rộng trang là `*.page.tsx` và `*.page.ts`. Vì vậy các file trang có hậu tố `.page`, ví dụ `index.page.tsx`; route động dùng cú pháp ngoặc vuông như `machines/[machineId].page.tsx`.

```text
src/pages/
├── _app.page.tsx           # Khởi tạo QueryClientProvider dùng toàn ứng dụng
├── index.page.tsx          # Trang tại /
├── login.page.tsx          # Trang đăng nhập tại /login
├── auth/login/             # UI đăng nhập được tách riêng khỏi file route
├── home/                   # Các phần của trang chủ
├── admin/                  # Khung và các trang quản trị
└── api/v1/[...path].page.ts # API route proxy tới IDaaS
```

Trong `pages/admin/`, mỗi file `.page.tsx` tương ứng một trang quản trị như tổng quan, tài khoản, khách hàng, cửa hàng, hợp đồng, máy, IoT, menu, báo cáo và thông báo. `admin-shell.tsx` là khung điều hướng của nhóm trang admin; phần chi tiết máy nhận `machineId` từ URL.

## Luồng giao tiếp dữ liệu

```text
Page / Component
      ↓
    apis/  ─────→  lib/http.ts
      ↓                ├── IDaaS: /api/v1 → Next API proxy → backend IDaaS
    schema/            └── Dolores: /api/dolores/v1 → rewrite → backend Dolores
      ↓
    UI hiển thị dữ liệu đã kiểm tra
```

- `src/lib/http.ts` cấu hình Axios dùng chung. IDaaS dùng `axiosClient` với base URL `/api/v1`; API route `src/pages/api/v1/[...path].page.ts` chuyển tiếp request tới backend IDaaS.
- Dolores dùng chung Axios client nhưng chỉ định `DOLORES_API_BASE_URL` là `/api/dolores/v1`. `next.config.js` rewrite đường dẫn này tới `DOLORES_API_URL` để trình duyệt gọi cùng origin của ứng dụng.
- Mỗi domain có module trong `apis/` và schema tương ứng trong `schema/`. Schema giúp phát hiện dữ liệu không đúng hợp đồng trước khi giao cho giao diện.
- `routes/path.ts` chứa path; `routes/routes.ts` tập hợp các liên kết điều hướng và nhãn tương ứng lấy từ `text/`.

## Thành phần giao diện dùng chung

- `components/button/`: nút thao tác và thanh nút điều hướng có kích thước theo nội dung.
- `components/action-bar/`: thanh thao tác cố định ở cuối trang, ví dụ nút tạo tài khoản/cửa hàng.
- `components/heading/`: tiêu đề khu vực và breadcrumb admin.
- `components/brand/`: thành phần nhận diện thương hiệu như logo.

Các thành phần chỉ phục vụ một trang nên ở gần page tương ứng; chỉ đưa vào `components/` khi có nhu cầu dùng lại thực sự.

## Nơi đặt thay đổi mới

- Trang mới: `src/pages/` theo nhóm trang và quy ước `.page.tsx`.
- Request backend mới: `src/apis/`; schema request/response tương ứng: `src/schema/`.
- UI có thể tái sử dụng: `src/components/` theo loại thành phần.
- Nhãn/thông báo: `src/text/` theo khu vực; path và điều hướng: `src/routes/`.
- Kiểm thử và kế hoạch: đặt ở `tests/` và `plans/` tại gốc dự án.
