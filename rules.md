# Quy định & Cấu trúc Dự án (Enterprise Architecture Rules)

Dự án Next.js IoT Espresso Machine Dashboard được thiết lập theo cấu trúc doanh nghiệp (Feature-Sliced Design / Component-Driven Architecture) kết hợp với **TypeScript** và **Tailwind CSS**.

---

## 1. Cấu trúc Thư mục (Directory Structure)

Mọi tệp tin ứng dụng phải nằm bên trong thư mục `src/`.

```text
src/
├── app/               # 🚀 Thư mục cốt lõi của Next.js (Pages, Layouts, API Routes)
│   ├── globals.css    # Chứa Design Tokens từ Zenith Brew (Tailwind variables)
│   ├── layout.tsx     # Root Layout (Sidebar, Header bọc toàn bộ trang)
│   └── page.tsx       # Trang Dashboard lắp ghép các Widgets
├── components/        # 🧩 Thư viện Components (Không chứa logic gọi API trực tiếp)
│   ├── features/      # Các module độc lập (Inventory, Thermodynamics, Production, v.v.)
│   ├── layout/        # Cấu trúc giao diện chung (Sidebar, Header)
│   └── ui/            # UI cơ bản (Button, Card, Input) - Tương tự shadcn/ui
├── store/             # 🗄️ Quản lý State toàn cục (Zustand)
├── types/             # 🏷️ Định nghĩa TypeScript (Interfaces)
└── lib/               # 🛠️ Các hàm tiện ích (utilities, formatters, twMerge)
```

## 2. Quy tắc Viết mã (Coding Guidelines)

### 2.1. React Components
- **Client Components:** Phải khai báo `"use client";` ở dòng đầu tiên nếu Component có sử dụng Hooks (useState, useEffect, Zustand). Các Component trong `src/components/features` và `src/components/layout` hiện tại đều là Client Components để render dữ liệu thời gian thực.
- **Server Components:** Được ưu tiên sử dụng mặc định trong `src/app` (như `layout.tsx`, `page.tsx`) trừ khi cần tính năng phía client.
- **Tên Component:** Sử dụng PascalCase (VD: `InventoryWidget.tsx`, `Sidebar.tsx`).

### 2.2. Quản lý trạng thái (State Management)
- Không dùng `useState` lồng nhau nhiều cấp (Prop Drilling).
- Sử dụng **Zustand** (tại `src/store/useIoTStore.ts`) để lưu trữ dữ liệu IoT (Nhiệt độ, Áp suất, Inventory). Các Widgets gọi trực tiếp `useIoTStore()` để lấy dữ liệu.

### 2.3. Kiểu dữ liệu (TypeScript)
- Tuyệt đối tránh sử dụng kiểu `any`.
- Mọi mô hình dữ liệu (SystemStatus, Thermodynamics) phải được định nghĩa trong `src/types/index.ts`.

### 2.4. Styling & Tailwind CSS
- Không viết inline-CSS. Luôn sử dụng Utility Classes của Tailwind.
- Tuân thủ Hệ thống thiết kế (Design System) của **Zenith Brew**:
  - Dùng tiền tố `bg-surface`, `bg-surface-container`, `text-on-surface` thay vì dùng mã màu cứng.
  - Sử dụng utility class `bento-border` đã được khai báo trong `globals.css` cho các card thống kê.
- Sử dụng thư viện `clsx` và `tailwind-merge` (thông qua hàm `cn()` ở `src/lib/utils.ts`) khi cần nối class động.

---

## 3. Quản lý Dữ liệu thời gian thực (IoT Data Flow)

Trong thực tế doanh nghiệp, các dữ liệu nhiệt độ/áp suất từ máy pha cà phê sẽ truyền về qua WebSocket hoặc MQTT.
- Hiện tại dữ liệu đang được "Mock" trong Zustand Store.
- Khi tích hợp API thật, hãy gọi custom hook (vd: `useIoTStream()`) ở mức Global Layout hoặc Root Store để cập nhật vào Zustand. Các Widget bên dưới sẽ tự động render lại (reactively) mà không cần viết lại mã giao diện.
