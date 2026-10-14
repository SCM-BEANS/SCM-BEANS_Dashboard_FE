# Dolores Admin: PC implementation playbook

Use through [dolores-admin](dolores-admin/SKILL.md), whose mandatory rules apply throughout. Read [shared guide](figma-guide.md) before implementation.

Source: [Admin canvas 3:2](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=3-2).

## Screen groups and implementation order

Use these groups to locate work, not as inferred prototype edges. Confirm live transitions within each group.

| Area | Main frame families | Design and behavior to preserve |
| --- | --- | --- |
| Overview and revenue | A01, A05, A08, A09 | KPI labels, periods, chart/table composition; distinguish gross receipts, actual revenue, and deposits |
| Accounts and access | A02, A03 and MOD/TECH variants, A07, A26 | Role-specific creation forms, validation, confirmations, staff list, tenant status and permissions |
| Customers and stores | A04, A06, A10, A11 | Customer/store context and detail navigation without losing selected customer |
| Contracts | A12, A13 and STD variant, A24 | Smart/standard contract details, current status, history and related machines |
| Fleet and stock | A14, A15, A23, A25 | Stock, machine records, parts/repair history and loan history |
| Smart monitoring | A16, A17, A18 | Customer → machines → eligible Smart data; preserve freshness/offline indicators shown in Figma |
| Global Menu | A19, A20, A21, A22, A27 | Menu/dish lists, ingredient units, required milk/coffee, edits, confirmation and delivery states |

## Role-specific constraints

- Admin is a distinct role from Moderator; do not reuse Moderator permissions simply because layouts resemble each other.
- Account creation covers Customer, Moderator, Technician as specified. Creating Admin accounts needs separate evidence/approval.
- Keep financial labels and sums semantically distinct. Use existing data/calculation contracts; ask if their meanings disagree with the guide.
- Preserve customer, contract, machine, and historical context through linked views.
- Use the same common component implementation as other approved Dolores dashboards where visual/state definitions match.
- Inspect navigation active states against actual Figma instances. If instances appear contradictory, report the nodes instead of correcting the design silently.

## Handoff focus

Supply evidence for role choices in account forms, Smart versus standard detail behavior, revenue/deposit separation, nested navigation, menu validation, and every changed confirmation/error/success state. Backend permission or financial correctness remains unverified unless exercised against an appropriate authorized environment.

## Frame inventory

Observed 2026-10-02: **63 direct top-level frames**. This includes UI states and alternatives; it is not a list of separate routes. Refresh before implementation and inspect descendants/components for additional states. A listed frame is evidence of its presence, not approval of a labeled pending alternative or proof of prototype wiring.

| Node | Figma frame name |
| --- | --- |
| [10:49](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=10-49) | A01 · Tổng quan vận hành |
| [10:148](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=10-148) | A02 · Tài khoản toàn hệ thống |
| [10:247](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=10-247) | A03 · Tạo tài khoản khách hàng |
| [10:338](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=10-338) | A04 · Cửa hàng |
| [10:430](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=10-430) | A05 · Báo cáo doanh thu & vận hành |
| [54:723](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-723) | A06 · Thông tin cửa hàng |
| [54:800](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-800) | A07 · Tài khoản Tenant · quyền & trạng thái |
| [54:877](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-877) | A08 · Chi tiết báo cáo theo khách hàng |
| [54:965](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-965) | A09 · Thông tin vận hành cần chú ý |
| [54:1034](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-1034) | A10 · Khách hàng Nguyễn Minh Anh |
| [58:293](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-293) | A03-CONFIRM · Xác nhận · Tạo tài khoản Tenant |
| [58:302](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-302) | A03-SUCCESS · Đã ghi nhận thành công |
| [58:309](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-309) | A03-ERROR · Chưa thể gửi thông tin |
| [58:321](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-321) | A06-CONFIRM · Xác nhận · Thông tin cửa hàng |
| [58:330](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-330) | A06-SUCCESS · Đã ghi nhận thành công |
| [58:337](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-337) | A07-CONFIRM · Xác nhận · Tài khoản Tenant · quyền & trạng thái |
| [58:346](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-346) | A07-SUCCESS · Đã ghi nhận thành công |
| [58:353](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-353) | A05-FILTER · Chọn kỳ báo cáo |
| [80:1374](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-1374) | A11 · Khách hàng & cửa hàng |
| [80:1504](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-1504) | A12 · Hợp đồng & trạng thái |
| [80:1627](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-1627) | A13 · Chi tiết hợp đồng C-204 |
| [80:1753](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-1753) | A13-STD · Chi tiết hợp đồng C-205 |
| [80:15208](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-15208) | A24 · Lịch sử hợp đồng của khách |
| [80:15316](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-15316) | A26 · Quản lý tài khoản nhân sự |
| [80:15438](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-15438) | A14 · Máy & tồn kho |
| [80:15588](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-15588) | A14-STOCK · Máy trong kho · chưa cho thuê |
| [80:15730](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-15730) | A15 · Hồ sơ máy S-022 |
| [80:15866](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-15866) | A25 · Máy cho mượn & lịch sử sử dụng |
| [80:15992](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-15992) | A23 · Lịch sử sửa chữa, bảo trì & linh kiện |
| [80:16127](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-16127) | A16 · Giám sát Smart IoT · theo khách hàng |
| [80:16266](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-16266) | A17 · Máy của Nguyễn Minh Anh |
| [80:17757](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-17757) | A18 · Máy Smart S-018 · giám sát & hồ sơ |
| [80:17887](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-17887) | A19 · Global Menu & công thức |
| [80:17996](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-17996) | A20 · Global Menu mùa hè · các món |
| [80:18115](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-18115) | A21 · Thêm món · Cà phê sữa tươi |
| [80:18242](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-18242) | A22 · Chỉnh công thức Espresso |
| [80:18364](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-18364) | A22-60 · Chỉnh Espresso · nước pha 60 ml |
| [80:18492](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-18492) | A22-20G · Chỉnh Espresso · cà phê 20 g |
| [80:18605](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-18605) | A27 · Gửi menu đến máy Smart |
| [80:18725](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-18725) | A15-STD · Hồ sơ máy thường C-031 |
| [81:1850](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-1850) | A03-MOD · Tạo tài khoản Moderator |
| [81:1968](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-1968) | A03-TECH · Tạo tài khoản Technician |
| [81:2086](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-2086) | A21-MISSING · Thêm món · thiếu thành phần bắt buộc |
| [81:15001](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15001) | A03-ROLE · Chọn vai trò tài khoản |
| [81:15014](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15014) | A03-MOD-CONFIRM · Tạo tài khoản Moderator |
| [81:15023](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15023) | A03-MOD-SUCCESS · Đã lưu thông tin |
| [81:15030](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15030) | A03-TECH-CONFIRM · Tạo tài khoản Technician |
| [81:15039](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15039) | A03-TECH-SUCCESS · Đã lưu thông tin |
| [81:15046](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15046) | A26-CONFIRM · Lưu quyền và trạng thái tài khoản |
| [81:15055](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15055) | A26-SUCCESS · Đã lưu thông tin |
| [81:15062](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15062) | A21-CONFIRM · Lưu món Cà phê sữa tươi |
| [81:15071](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15071) | A21-SUCCESS · Đã lưu thông tin |
| [81:15078](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15078) | A22-CONFIRM · Lưu công thức Espresso |
| [81:15087](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15087) | A22-SUCCESS · Đã lưu thông tin |
| [81:15094](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15094) | A22-20G-CONFIRM · Lưu thay đổi lượng cà phê |
| [81:15103](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15103) | A22-20G-SUCCESS · Đã lưu thông tin |
| [81:15110](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15110) | A27-CONFIRM · Gửi menu xuống máy |
| [81:15119](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15119) | A27-SUCCESS · Đã lưu thông tin |
| [81:15126](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15126) | A21-INGREDIENTS · Thành phần của Cà phê sữa tươi |
| [81:15137](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15137) | A13-PREVIEW · Hợp đồng C-204 |
| [91:3618](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=91-3618) | A23-S018 · Lịch sử máy S-018 |
| [91:3763](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=91-3763) | A15-MB · Hồ sơ máy thu mua MB-017 |
| [91:3891](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=91-3891) | A26-TECH · Quản lý tài khoản Technician |
