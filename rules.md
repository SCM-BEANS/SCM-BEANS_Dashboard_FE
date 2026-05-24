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
├── hooks/             # 🪝 Custom Hooks (TanStack Query, WebSockets)
├── schemas/           # 📝 Zod Schemas & Types (Validation)
├── store/             # 🗄️ Quản lý Client State (Zustand)
├── types/             # 🏷️ Định nghĩa TypeScript (Interfaces)
└── lib/               # 🛠️ Các hàm tiện ích (utilities, formatters, twMerge)
```

## 2. Quy tắc Viết mã (Coding Guidelines)

### 2.1. React Components
- **Client Components:** Phải khai báo `"use client";` ở dòng đầu tiên nếu Component có sử dụng Hooks (useState, useEffect, Zustand). Các Component trong `src/components/features` và `src/components/layout` hiện tại đều là Client Components để render dữ liệu thời gian thực.
- **Server Components:** Được ưu tiên sử dụng mặc định trong `src/app` (như `layout.tsx`, `page.tsx`) trừ khi cần tính năng phía client.
- **Tên Component:** Sử dụng PascalCase (VD: `InventoryWidget.tsx`, `Sidebar.tsx`).

### 2.2. Quản lý trạng thái & Data Fetching (State & API Layer)
- **Client State:** Sử dụng **Zustand** để quản lý state cục bộ phía UI (ví dụ: `selectedMachineId`, `statusFilter`). Không dùng `useState` lồng nhau nhiều cấp.
- **Server State:** Sử dụng **TanStack Query (React Query)** kết hợp với **Axios** (hoặc native Fetch) để gọi REST API, quản lý caching, và background refetching. Không gọi API trực tiếp trong UI components.

### 2.3. Kiểu dữ liệu & Validation (Zod + TypeScript)
- Tuyệt đối tránh sử dụng kiểu `any`.
- Sử dụng **Zod** để định nghĩa schema và ép kiểu dữ liệu chặt chẽ từ API hoặc WebSockets. Các schema được đặt tại thư mục `src/schemas`.

### 2.4. Styling & Tailwind CSS
- Không viết inline-CSS. Luôn sử dụng Utility Classes của Tailwind.
- Tuân thủ Hệ thống thiết kế (Design System) của **Zenith Brew**:
  - Dùng tiền tố `bg-surface`, `bg-surface-container`, `text-on-surface` thay vì dùng mã màu cứng.
  - Sử dụng utility class `bento-border` đã được khai báo trong `globals.css` cho các card thống kê.
- Sử dụng thư viện `clsx` và `tailwind-merge` (thông qua hàm `cn()` ở `src/lib/utils.ts`) khi cần nối class động.

---

## 3. Quản lý Dữ liệu thời gian thực (IoT Data Flow)

Trong thực tế doanh nghiệp, các dữ liệu tần số cao (nhiệt độ, áp suất, lưu lượng) từ máy pha cà phê sẽ truyền về qua **WebSocket** hoặc **MQTT.js**.
- Sử dụng custom hook (vd: `useLiveTelemetry`) để kết nối WebSocket/MQTT, lắng nghe và xử lý sự kiện.
- **Quan trọng:** Với dữ liệu thời gian thực cập nhật liên tục (để vẽ Real-time charts), hãy lưu vào local state của custom hook (`useState` array) để render UI thay vì mutate liên tục vào cache của TanStack Query gây giảm hiệu năng. Khi unmount Component, nhớ dọn dẹp (cleanup) các kết nối WebSocket/MQTT.
