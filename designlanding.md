# Tài liệu Thiết kế & Đặc tả Landing Page (SCM-BEANS Dashboard)

## 1. Tổng quan (Overview)
Trang Landing Page của hệ thống SCM-BEANS (IoT Espresso Machine Dashboard) là điểm chạm đầu tiên của người dùng. **Theo yêu cầu, ngay sau khi người dùng đăng nhập thành công, hệ thống sẽ điều hướng trực tiếp đến trang Landing Page này** trước khi vào giao diện Dashboard điều khiển chi tiết.
Trang này đóng vai trò giới thiệu tổng quan về hệ sinh thái máy pha cà phê thông minh, mang lại trải nghiệm thị giác cao cấp (premium) và công nghệ (high-tech).

## 2. Xu hướng Nghệ thuật & Quy tắc thiết kế UX/UI (Art Direction & UX/UI)
Lấy cảm hứng từ sự sáng tạo của **Vinamilk** và kết hợp chặt chẽ với Hệ thống thiết kế **Zenith Brew**:
- **Phong cách thị giác (Visual Aesthetics):** 
  - Giao diện sống động, sử dụng các dải màu (gradient) tinh tế, mượt mà mang lại cảm giác nghệ thuật.
  - Ứng dụng Glassmorphism (hiệu ứng kính mờ) để tạo chiều sâu và sự hiện đại cho các khối thông tin.
  - Typography: Dùng font chữ hiện đại, kích thước lớn và in đậm cho các tiêu đề chính (Hero Text) để tạo sự chú ý mạnh mẽ.
- **Trải nghiệm Tương tác (Micro-animations):** 
  - Hiệu ứng cuộn trang (Parallax scroll) linh hoạt, mượt mà.
  - Các phần tử (button, card) có hiệu ứng hover nổi bật, tạo cảm giác hệ thống luôn "sống" và phản hồi tức thì với người dùng.
- **Tuân thủ Design System (theo `rules.md`):**
  - Sử dụng triệt để các Design Tokens của Tailwind đã cấu hình: `bg-surface`, `bg-surface-container`, `text-on-surface`.
  - Tuyệt đối không dùng mã màu cứng hay inline-CSS.
  - Các khối nội dung dạng thẻ (Card) phải sử dụng class `bento-border` (từ `globals.css`) để đồng nhất giao diện thẻ.

## 3. Bố cục & Sắp xếp Content (Layout Architecture)
Kế thừa cấu trúc mạch lạc, rành mạch và có tính điều hướng cao từ **Elegoo**, kết hợp với tính hiện đại:

1. **Header (Sticky/Floating Navbar):** 
   - Thanh điều hướng trong suốt, tự động đổi màu nền khi cuộn trang.
   - Chứa logo, các liên kết nhanh và nút "Go to Dashboard" nổi bật ở góc phải dành cho người dùng đã đăng nhập.
2. **Hero Section (Màn hình đầu tiên - Above the fold):**
   - Video hoặc hình ảnh chất lượng cao tràn viền mô phỏng cảnh chiết xuất Espresso cực kỳ hấp dẫn (Crema chảy mượt mà).
   - Headline lớn và ấn tượng.
   - Primary CTA Button kích thích hành động: "Explore Your Dashboard".
3. **Features Grid (Bento Box Layout):**
   - Áp dụng cấu trúc lưới (Grid) kiểu Bento để trình bày các tính năng IoT cốt lõi của hệ thống:
     - *Thẻ 1 (Lớn):* Real-time Thermodynamics (Nhiệt độ, Áp suất).
     - *Thẻ 2:* Smart Inventory Management (Quản lý hạt, vật tư).
     - *Thẻ 3:* Production Analytics (Thống kê sản lượng pha chế).
   - *Lưu ý:* Mọi thẻ đều áp dụng class `bento-border`.
4. **Interactive Machine Showcase (Tương tác trực quan):**
   - Hình ảnh một cỗ máy pha cà phê nguyên khối đặt ở trung tâm, với các điểm chạm (hotspots) nhấp nháy. 
   - Khi hover vào hotspot, một tooltip sẽ bật lên hiển thị dữ liệu telemetry mô phỏng (ví dụ: Boiler Temp: 93°C, Pump Pressure: 9 Bar).
5. **Footer:**
   - Thiết kế tối giản, cung cấp thông tin bản quyền và liên kết hệ thống.

## 4. Nội dung & Hình ảnh (Content & Imagery)
Nội dung và hình ảnh được chắt lọc từ đẳng cấp của các thương hiệu cà phê đặc sản thiết bị cao cấp (**Whole Latte Love, Clive Coffee, La Marzocco, Victoria Arduino**):
- **Tone of Voice:** Chuyên nghiệp, mang tính kỹ thuật, thể hiện niềm đam mê cà phê sâu sắc (Coffee enthusiast & Engineering focused).
- **Từ khóa cốt lõi:** Precision Extraction (Chiết xuất chuẩn xác), Thermal Stability (Ổn định nhiệt), Real-time Telemetry (Đo lường thời gian thực), Commercial-grade (Tiêu chuẩn thương mại).
- **Hình ảnh yêu cầu:**
  - Cận cảnh E61 Grouphead, tay cầm không đáy (bottomless portafilter) đang chiết xuất espresso.
  - Bảng đồng hồ áp suất cơ kết hợp màn hình kỹ thuật số.
  - Lớp vỏ kim loại (chrome/stainless steel) phản chiếu ánh sáng sang trọng.
- **Nội dung mẫu (Copywriting):**
  - *Headline chính:* "Master Your Extraction. Empowered by IoT."
  - *Sub-headline:* "Hệ thống giám sát máy pha cà phê thời gian thực, mang công nghệ đo lường công nghiệp vào nghệ thuật pha chế của Barista."

## 5. Yêu cầu Kỹ thuật (Technical Requirements)
Tuân thủ nghiêm ngặt đặc tả kiến trúc tại `rules.md`:
1. **Cấu trúc Thư mục & Components:**
   - Trang Landing Page đóng vai trò là điểm vào đầu tiên. (Ví dụ: Đặt tại `src/app/page.tsx` hoặc `src/app/landing/page.tsx` tùy kiến trúc định tuyến hiện tại).
   - Ưu tiên sử dụng **Server Components** cho layout tĩnh.
   - Các hiệu ứng cuộn, hover, hoạt ảnh tương tác (3D/Hotspots) phải được tách ra thành các **Client Components** nằm trong `src/components/features/landing/` (khai báo `"use client";`).
2. **Styling & Animation:**
   - Toàn bộ layout được dựng bằng **Tailwind CSS**.
   - Dùng hàm `cn()` (từ thư viện `clsx` & `tailwind-merge` trong `src/lib/utils.ts`) khi cần nối hoặc thay đổi class động.
   - Khuyến nghị sử dụng **Framer Motion** để xử lý mượt mà các vi tương tác (micro-animations) và hiệu ứng xuất hiện.
3. **Hiệu suất & Tối ưu hóa:**
   - Các hình ảnh độ phân giải cao (hiển thị chi tiết máy pha) phải dùng component `next/image` của Next.js để tối ưu dung lượng và tốc độ tải.
4. **Luồng xác thực (Authentication Flow):**
   - Đảm bảo logic tại Middleware hoặc Auth Hook: Khi người dùng đăng nhập thành công, URL chuyển hướng mặc định phải là URL của Landing Page này, thay vì bay thẳng vào giao diện Dashboard điều khiển. (Từ Landing Page, người dùng sẽ tự click "Go to Dashboard" để vào không gian làm việc chính).
