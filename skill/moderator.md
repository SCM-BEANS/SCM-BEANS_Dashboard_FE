# Dolores Moderator: PC implementation playbook

Use through [dolores-moderator](dolores-moderator/SKILL.md), whose mandatory rules apply throughout. Read [shared guide](figma-guide.md) before implementation.

Source: [Moderator canvas 3:3](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=3-3).

## Screen groups and implementation order

Confirm actual prototype edges; the grouping below is a discovery aid.

| Area | Main frame families | Design and behavior to preserve |
| --- | --- | --- |
| Contract onboarding | M01–M05, M28, M29, M40 | Negotiation/signing outside the system, document upload, standard/Smart handover, first invoice, contract details |
| Billing and reconciliation | M06, M07, M21–M24, M30, M31, M34, M35, M39, M41 | PAYG, reconciliation, shortfall, excess refund, bill versions, overdue amounts, late-cup branches |
| Maintenance and dispatch | M10, M19, M20, M26, M27, M33, M36–M38 | Technical request variants, results, alerts, maintenance, substitute-machine allocation |
| End of contract | M11–M14 | Expiry reminder, retrieval, assessment, settlement/refund, early termination and violation states |
| Used-machine purchase | M15, M16, M32 | Assessment/negotiation, purchase documents, collection, refurbishment/test, stock entry |
| Stock and machine history | M08, M42–M45 | Unleased stock, individual machine records, loan history, repairs and parts |
| Customer monitoring | M17, M18, M46 | Customer → machine → eligible Smart data/model |
| Customer accounts | M47–M49 | Customer list, creation and detail; no staff-account creation |
| Global Menu | M09, M25, M50–M52 | Dish list, ingredient quantities, fresh-milk coffee validation, target machines, sending states |

## Role-specific constraints

- Moderator creates Customer accounts only. Do not expose Admin account/staff management actions.
- Preserve invoice eligibility guards: paid/reconciled → next-cycle late cups; unfinalized, in-term, editable → recalculate/resend. Never reopen a finalized bill as a UI shortcut.
- Keep shortfall collection, excess refund, deposit refund, and compensation greater than deposit as distinct flows.
- Require the Technician retrieval/assessment outcome before settlement/refund where the source flow requires it.
- Track customer acknowledgement of purchase documents independently of collection dispatch; acknowledgement must not become an invented dispatch blocker.
- Match substitute type to the original machine and attribute Smart usage by period to the primary contract.
- Preserve evidence uploads and reconciliation status; never display completion merely because the user selected a file or pressed a button.
- Preserve all task-specific M19 variants and their return paths. A single generic request form must not erase required fields or outcomes.

## Handoff focus

Provide transition evidence across Moderator/Technician and Moderator/Customer handoffs. Exercise unpaid editable versus finalized billing branches, standard versus Smart machines, shortfall/excess/deposit cases, customer-only account creation, purchase acknowledgement, and changed upload/menu states. Use safe test records; do not trigger real financial or device effects for visual verification.

## Frame inventory

Observed 2026-10-02: **140 direct top-level frames**. This includes UI states and alternatives; it is not a list of separate routes. Refresh before implementation and inspect descendants/components for additional states. A listed frame is evidence of its presence, not approval of a labeled pending alternative or proof of prototype wiring.

| Node | Figma frame name |
| --- | --- |
| [11:8](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-8) | M01 · Tổng quan hợp đồng & thanh toán |
| [11:122](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-122) | M02 · Đàm phán & lập hợp đồng thuê |
| [11:232](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-232) | M03 · Bàn giao & lắp đặt máy thường |
| [11:338](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-338) | M04 · Bàn giao & kích hoạt Smart IoT |
| [11:444](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-444) | M05 · Hóa đơn tháng đầu |
| [11:549](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-549) | M06 · Hóa đơn định kỳ & đối soát |
| [11:661](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-661) | M07 · PAYG & số ly gửi về muộn |
| [11:757](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-757) | M08 · Máy & tồn kho |
| [11:858](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-858) | M09 · Global Menu & công thức |
| [11:956](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-956) | M10 · Lịch sử bảo trì & sửa chữa |
| [11:1051](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-1051) | M11 · Nhắc hợp đồng sắp hết hạn |
| [11:1156](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-1156) | M12 · Thu hồi trước quyết toán cọc |
| [11:1252](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-1252) | M13 · Quyết toán & hoàn cọc sau đánh giá |
| [11:1357](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-1357) | M14 · Chấm dứt sớm & vi phạm |
| [11:1579](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=11-1579) | M16 · Thu mua máy cũ · tân trang & nhập kho |
| [23:58](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=23-58) | M15 · Thu mua máy cũ · chứng từ mua bán |
| [35:57](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=35-57) | M17 · Giám sát Smart IoT · theo khách hàng |
| [39:57](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=39-57) | M18 · Chi tiết dữ liệu & mô hình máy |
| [54:3817](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-3817) | M19 · Gửi yêu cầu cho Technician |
| [54:3957](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-3957) | M20 · Yêu cầu kỹ thuật & kết quả |
| [54:4087](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-4087) | M21 · Đối soát chứng từ thanh toán |
| [54:4237](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-4237) | M22 · Yêu cầu thanh toán phần còn thiếu |
| [54:4363](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-4363) | M23 · Hoàn khoản thanh toán thừa |
| [54:4502](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-4502) | M24 · Xử lý số ly gửi về muộn |
| [54:4628](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-4628) | M25 · Chỉnh công thức Espresso |
| [54:4769](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-4769) | M26 · Máy thay thế & phân bổ số ly |
| [54:4917](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-4917) | M27 · Cảnh báo & nhắc việc |
| [54:5045](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-5045) | M28 · Danh sách hợp đồng thuê |
| [54:5175](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-5175) | M29 · Hồ sơ hợp đồng C-204 |
| [54:5313](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-5313) | M30 · Bồi thường vượt tiền đặt cọc |
| [54:5440](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-5440) | M31 · Ghi nhận hoàn cọc |
| [54:5576](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-5576) | M32 · Đánh giá máy mua cũ & thương lượng |
| [54:5705](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-5705) | M33 · Chi tiết lịch sử bảo trì / sửa chữa |
| [54:5838](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-5838) | M34 · Dư nợ quá hạn & phí cộng dồn |
| [54:5965](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-5965) | M35 · Hoàn cọc · máy được đánh giá tốt |
| [54:6085](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-6085) | M36 · Theo dõi vi phạm hợp đồng |
| [54:6212](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-6212) | M37 · Cảnh báo mất kết nối / lỗi menu |
| [54:6336](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-6336) | M38 · Kết quả Technician · YC-017 |
| [54:6465](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-6465) | M39 · Lịch sử phiên bản hóa đơn |
| [58:4862](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4862) | M02-CONFIRM · Xác nhận · Đàm phán & lập hợp đồng thuê |
| [58:4871](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4871) | M02-SUCCESS · Đã ghi nhận thành công |
| [58:4878](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4878) | M02-ERROR · Chưa thể gửi thông tin |
| [58:4890](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4890) | M05-CONFIRM · Xác nhận · Hóa đơn tháng đầu |
| [58:4899](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4899) | M05-SUCCESS · Đã ghi nhận thành công |
| [58:4906](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4906) | M11-CONFIRM · Xác nhận · Nhắc hợp đồng sắp hết hạn |
| [58:4915](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4915) | M11-SUCCESS · Đã ghi nhận thành công |
| [58:4922](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4922) | M12-CONFIRM · Xác nhận · Thu hồi trước quyết toán cọc |
| [58:4931](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4931) | M12-SUCCESS · Đã ghi nhận thành công |
| [58:4938](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4938) | M13-CONFIRM · Xác nhận · Quyết toán & hoàn cọc sau đánh giá |
| [58:4947](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4947) | M13-SUCCESS · Đã ghi nhận thành công |
| [58:4954](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4954) | M14-CONFIRM · Xác nhận · Chấm dứt sớm & vi phạm |
| [58:4963](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4963) | M14-SUCCESS · Đã ghi nhận thành công |
| [58:4970](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4970) | M15-CONFIRM · Xác nhận · Thu mua máy cũ · chứng từ mua bán |
| [58:4979](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4979) | M15-SUCCESS · Đã ghi nhận thành công |
| [58:4986](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4986) | M16-CONFIRM · Xác nhận · Thu mua máy cũ · tân trang & nhập kho |
| [58:4995](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-4995) | M16-SUCCESS · Đã ghi nhận thành công |
| [58:5002](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5002) | M19-CONFIRM · Xác nhận · Gửi yêu cầu cho Technician |
| [58:5011](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5011) | M19-SUCCESS · Đã gửi yêu cầu cho Technician |
| [58:5018](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5018) | M19-ERROR · Chưa thể gửi thông tin |
| [58:5030](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5030) | M21-CONFIRM · Xác nhận · Đối soát chứng từ thanh toán |
| [58:5039](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5039) | M21-SUCCESS · Đã ghi nhận thành công |
| [58:5046](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5046) | M21-PREVIEW · Đối soát chứng từ thanh toán |
| [58:5056](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5056) | M22-CONFIRM · Xác nhận · Yêu cầu thanh toán phần còn thiếu |
| [58:5065](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5065) | M22-SUCCESS · Đã ghi nhận thành công |
| [58:5072](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5072) | M23-CONFIRM · Xác nhận · Hoàn khoản thanh toán thừa |
| [58:5081](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5081) | M23-SUCCESS · Đã ghi nhận thành công |
| [58:5088](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5088) | M24-CONFIRM · Xác nhận · Xử lý số ly gửi về muộn |
| [58:5097](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5097) | M24-SUCCESS · Đã ghi nhận thành công |
| [58:5104](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5104) | M25-CONFIRM · Lưu công thức Espresso |
| [58:5113](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5113) | M25-SUCCESS · Đã lưu thông tin |
| [58:5120](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5120) | M26-CONFIRM · Xác nhận · Máy thay thế & phân bổ số ly |
| [58:5129](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5129) | M26-SUCCESS · Đã ghi nhận thành công |
| [58:5136](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5136) | M29-PREVIEW · Hồ sơ hợp đồng C-204 |
| [58:5146](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5146) | M30-CONFIRM · Xác nhận · Bồi thường vượt tiền đặt cọc |
| [58:5155](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5155) | M30-SUCCESS · Đã ghi nhận thành công |
| [58:5162](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5162) | M31-CONFIRM · Xác nhận · Ghi nhận hoàn cọc |
| [58:5171](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5171) | M31-SUCCESS · Đã ghi nhận hoàn cọc |
| [58:5178](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5178) | M32-CONFIRM · Xác nhận · Đánh giá máy mua cũ & thương lượng |
| [58:5187](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5187) | M32-SUCCESS · Đã ghi nhận thành công |
| [58:5210](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5210) | M35-CONFIRM · Xác nhận · Hoàn cọc · máy được đánh giá tốt |
| [58:5219](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5219) | M35-SUCCESS · Đã ghi nhận thành công |
| [58:5226](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5226) | M36-CONFIRM · Xác nhận · Theo dõi vi phạm hợp đồng |
| [58:5235](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5235) | M36-SUCCESS · Đã ghi nhận thành công |
| [58:5242](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5242) | M19-TYPE · Chọn công việc kỹ thuật |
| [58:5259](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5259) | M24-CARRY · Cộng số ly vào tháng kế tiếp |
| [58:5268](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5268) | M24-CARRY-SUCCESS · Đã ghi nhận 120 ly vào kỳ sau |
| [58:5275](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5275) | M26-RETURN · Xác nhận kết thúc dùng máy thay |
| [58:5284](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5284) | M26-RETURN-SUCCESS · Đã kết thúc máy thay thế |
| [58:5291](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5291) | M35-PAID · Đã ghi nhận hoàn đủ cọc |
| [59:5108](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=59-5108) | M18-FRONT · Mô hình nhìn phía trước |
| [63:4645](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-4645) | M06-FILTER-1 · Chờ đối chiếu |
| [63:4800](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-4800) | M06-FILTER-2 · Quá hạn |
| [63:5567](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-5567) | M10-FILTER-1 · Bảo trì |
| [63:5708](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-5708) | M10-FILTER-2 · Sửa chữa |
| [63:5863](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-5863) | M11-FILTER-1 · Đã phản hồi |
| [63:6012](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-6012) | M11-FILTER-2 · Chưa phản hồi |
| [64:5762](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=64-5762) | M40 · Hợp đồng máy thường C-205 |
| [64:5900](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=64-5900) | M40-PREVIEW · Hợp đồng đã ký C-205 |
| [70:5860](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-5860) | M19-INSTALL-STD · Gửi yêu cầu: Lắp đặt máy thường |
| [70:5998](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-5998) | M19-INSTALL-STD-CONFIRM · Xác nhận: Lắp đặt máy thường |
| [70:6007](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6007) | M19-INSTALL-STD-SUCCESS · Đã gửi: Lắp đặt máy thường |
| [70:6018](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6018) | M19-INSTALL-SMART · Gửi yêu cầu: Lắp đặt & kích hoạt Smart IoT |
| [70:6156](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6156) | M19-INSTALL-SMART-CONFIRM · Xác nhận: Lắp đặt & kích hoạt Smart IoT |
| [70:6165](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6165) | M19-INSTALL-SMART-SUCCESS · Đã gửi: Lắp đặt & kích hoạt Smart IoT |
| [70:6176](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6176) | M19-REPAIR · Gửi yêu cầu: Sửa chữa / lỗi kết nối |
| [70:6314](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6314) | M19-REPAIR-CONFIRM · Xác nhận: Sửa chữa / lỗi kết nối |
| [70:6323](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6323) | M19-REPAIR-SUCCESS · Đã gửi: Sửa chữa / lỗi kết nối |
| [70:6334](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6334) | M19-BUYBACK · Gửi yêu cầu: Đánh giá máy khách đề nghị bán |
| [70:6472](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6472) | M19-BUYBACK-CONFIRM · Xác nhận: Đánh giá máy khách đề nghị bán |
| [70:6481](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6481) | M19-BUYBACK-SUCCESS · Đã gửi: Đánh giá máy khách đề nghị bán |
| [70:6492](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6492) | M19-COLLECTION · Gửi yêu cầu: Thu gom máy đã thu mua |
| [70:6630](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6630) | M19-COLLECTION-CONFIRM · Xác nhận: Thu gom máy đã thu mua |
| [70:6639](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=70-6639) | M19-COLLECTION-SUCCESS · Đã gửi: Thu gom máy đã thu mua |
| [80:14044](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-14044) | M42 · Máy trong kho · chưa cho thuê |
| [80:14202](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-14202) | M43 · Hồ sơ máy S-022 |
| [80:14354](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-14354) | M44 · Máy cho mượn & lịch sử sử dụng |
| [80:14498](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-14498) | M45 · Lịch sử sửa chữa, bảo trì & linh kiện |
| [80:14803](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-14803) | M46 · Máy của Nguyễn Minh Anh |
| [80:15073](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-15073) | M50 · Global Menu mùa hè · các món |
| [80:16396](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-16396) | M51 · Thêm món · Cà phê sữa tươi |
| [80:16676](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-16676) | M25-60 · Chỉnh Espresso · nước pha 60 ml |
| [80:16820](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-16820) | M25-20G · Chỉnh Espresso · cà phê 20 g |
| [80:16949](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-16949) | M52 · Gửi menu đến máy Smart |
| [80:17085](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-17085) | M47 · Tài khoản khách hàng |
| [80:17213](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-17213) | M48 · Tạo tài khoản khách hàng |
| [80:17354](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-17354) | M49 · Hồ sơ khách hàng Nguyễn Minh Anh |
| [80:17624](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=80-17624) | M41 · Ly gửi muộn · hóa đơn đã hoàn tất |
| [81:14870](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-14870) | M51-MISSING · Thêm món · thiếu thành phần bắt buộc |
| [81:15147](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15147) | M48-CONFIRM · Tạo tài khoản khách hàng |
| [81:15156](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15156) | M48-SUCCESS · Đã lưu thông tin |
| [81:15163](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15163) | M41-CONFIRM · Ghi nhận số ly vào tháng sau |
| [81:15172](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15172) | M41-SUCCESS · Đã lưu thông tin |
| [81:15179](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15179) | M51-CONFIRM · Lưu món Cà phê sữa tươi |
| [81:15188](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15188) | M51-SUCCESS · Đã lưu thông tin |
| [81:15209](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15209) | M25-20G-CONFIRM · Lưu thay đổi lượng cà phê |
| [81:15218](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15218) | M25-20G-SUCCESS · Đã lưu thông tin |
| [81:15225](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15225) | M52-CONFIRM · Gửi menu xuống máy |
| [81:15234](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15234) | M52-SUCCESS · Đã lưu thông tin |
| [81:15241](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=81-15241) | M51-INGREDIENTS · Thành phần của Cà phê sữa tươi |
| [140:8049](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=140-8049) | M33-C031 · Chi tiết sửa chữa máy C-031 |
