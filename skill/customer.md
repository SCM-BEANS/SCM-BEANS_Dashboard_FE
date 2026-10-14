# Dolores Customer: PC implementation playbook

Use through [dolores-customer](dolores-customer/SKILL.md), whose mandatory rules apply throughout. Read [shared guide](figma-guide.md) before implementation.

Source: [Customer canvas 3:5](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=3-5).

## Screen groups and implementation order

| Area | Main frame families | Design and behavior to preserve |
| --- | --- | --- |
| Overview and agreements | C01, C02, C19, C35 | Store overview, Smart/standard contracts and related machine/billing context |
| Machines and monitoring | C03–C06, C17, C18, C29 | Lists, Smart versus standard details, menu, illustration, offline/stale indicators |
| Bills and evidence | C07–C09, C20, C22–C24, C30, C36, C37 | First/recurring invoices, transfer proof, shortfall, excess refund, overdue reminders, standard receipts |
| Support and maintenance | C10, C21, C32–C34, C44 | Incident reports, support progress, substitute machine, maintenance, menu assistance |
| Contract end and purchase | C11, C12, C14–C16, C25–C27 | Expiry, early end/new contract discussion, settlement/refund, sale proposal, document acknowledgement |
| Notifications | C13 | The actual linked destinations and read/state treatment shown in Figma |
| Private-menu editing | C28, C38, C42 and quantity variants | Own menu, dish selection, gram/ml changes, required ingredients, discard and error cases |
| Save/send/apply | C38/C42 confirmations and quantity variants, C40, C41 | D-01: combined save-and-send action; sent/pending/applied remain distinct; C39-ALT draft alternatives excluded |
| Own dish additions | C45–C48 | Supported dish addition, unsupported-dish branch, send confirmation, pending and applied states |

Frame numbering is discontinuous; do not invent a missing C31 or treat number ranges as exhaustive.

## Role-specific constraints

- Customer sees and edits only their own permitted stores, contracts, machines, records, and private menus. Existing server-side ownership checks must remain effective.
- Customer cannot edit Global Menu or another customer's private menu.
- Standard-machine screens have records and contract location; do not introduce Smart telemetry, GPS, remote menu, or fabricated live status.
- Inspect the source C18 illustration. The guide describes two vector views with Smart Animate, not free-rotation 3D.
- Payment evidence sent, payment verified, and invoice settled are separate outcomes. Do not equate an uploaded receipt with a verified payment.
- Contract/sale/support submissions follow the shown confirmation and acknowledgement paths; do not invent instantaneous approval.

## Confirmed private-menu flow: D-01

The user confirmed “lưu và gửi cùng một lần” on 2026-10-02. Read D-01 in [shared guide](figma-guide.md) for exact affected nodes and exclusions. This decision is settled; do not request draft-versus-combined confirmation again.

Implement editing → existing combined save-and-send confirmation → submit save and send in one user operation → sent/pending-machine state → applied after acknowledgement. Inspect live Figma transitions for the exact screens and controls. Do not add independent draft saving or a second send step to the successful flow.

For this approved flow:

- Preserve water, coffee and fresh-milk units and ingredient requirements; use supplied hardware limits, not guessed bounds.
- Preserve discard, missing-ingredient, unsupported-dish, offline/pending and support branches that the live design supplies.
- Restrict targets to the customer's eligible machines.
- Sent or saved must never be presented as machine-applied without acknowledgement.
- Canceling the confirmation must not save or send. A failed or partially completed service operation must not display successful delivery/application; follow established error handling and ask about missing recovery behavior without inventing it.
- Do not turn illustrated quantities or delays into business constants.

## Handoff focus

Cover tenant isolation, standard/Smart distinctions, bill/evidence statuses, contract and support navigation, purchase-document acknowledgement, menu ingredient validation, discard behavior, selected-machine ownership, the combined submission, and asynchronous acknowledgement states. Classify the six D-01 draft alternatives as excluded by user decision, not blocked, missing, or passed.

## Frame inventory

Observed 2026-10-02: **124 direct top-level frames**. This includes UI states and alternatives; it is not a list of separate routes. Refresh before implementation and inspect descendants/components for additional states. A listed frame is evidence of its presence, not approval of a labeled pending alternative or proof of prototype wiring.

**D-01 scope annotation:** the six nodes `114:22269`, `114:22615`, `114:22961`, `114:23425`, `114:23443`, and `114:23461` are excluded draft alternatives. Their original Figma names below are retained as evidence, including historical “Cần chốt” wording. The remaining frames still require normal route/state mapping and verification.

| Node | Figma frame name |
| --- | --- |
| [14:8](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-8) | C01 · Tổng quan của cửa hàng |
| [14:116](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-116) | C02 · Hợp đồng của tôi |
| [14:204](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-204) | C03 · Máy của tôi |
| [14:300](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-300) | C04 · Chi tiết máy Smart IoT |
| [14:406](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-406) | C05 · Chi tiết máy thông thường |
| [14:510](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-510) | C06 · Menu hiện tại trên máy |
| [14:593](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-593) | C07 · Hóa đơn & thanh toán |
| [14:689](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-689) | C08 · Thanh toán tháng đầu tiên |
| [14:795](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-795) | C09 · Chi tiết hóa đơn & đối chiếu |
| [14:901](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-901) | C10 · Báo sự cố máy |
| [14:1003](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-1003) | C11 · Sắp hết hạn hợp đồng |
| [14:1102](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-1102) | C12 · Đề nghị thu mua máy cũ |
| [14:1196](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=14-1196) | C13 · Thông báo & nhắc nhở |
| [19:86](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=19-86) | C14 · Kết thúc hợp đồng & hoàn cọc |
| [24:86](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=24-86) | C15 · Chứng từ thu mua máy cũ |
| [24:191](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=24-191) | C16 · Đã xác nhận chứng từ thu mua |
| [44:88](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=44-88) | C17 · Giám sát máy Smart IoT |
| [44:198](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=44-198) | C18 · Mô hình máy Smart IoT |
| [57:10087](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10087) | C19 · Chi tiết hợp đồng thuê |
| [57:10208](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10208) | C20 · Gửi ảnh chứng từ chuyển khoản |
| [57:10326](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10326) | C21 · Yêu cầu hỗ trợ của tôi |
| [57:10433](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10433) | C22 · Cần thanh toán phần còn thiếu |
| [57:10543](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10543) | C23 · Theo dõi hoàn tiền thanh toán thừa |
| [57:10653](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10653) | C24 · Hoàn cọc đã hoàn tất |
| [57:10766](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10766) | C25 · Đề nghị kết thúc hợp đồng sớm |
| [57:10875](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10875) | C26 · Trao đổi hợp đồng thuê mới |
| [57:10988](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-10988) | C27 · Gửi đề nghị bán máy của tôi |
| [57:11113](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-11113) | C28 · Menu của tôi · máy S-018 |
| [57:11220](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-11220) | C29 · Máy mất kết nối · dữ liệu gần nhất |
| [57:11333](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-11333) | C30 · Nhắc thanh toán hóa đơn |
| [57:11439](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-11439) | C32 · Máy thay thế trong hợp đồng |
| [57:11556](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-11556) | C33 · Lịch sử bảo trì & sửa chữa |
| [57:11666](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=57-11666) | C34 · Tiến trình yêu cầu hỗ trợ |
| [58:5479](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5479) | C10-CONFIRM · Xác nhận · Báo sự cố máy |
| [58:5488](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5488) | C10-SUCCESS · Đã ghi nhận thành công |
| [58:5495](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5495) | C10-ERROR · Chưa thể gửi thông tin |
| [58:5507](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5507) | C11-CONFIRM · Xác nhận · Sắp hết hạn hợp đồng |
| [58:5516](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5516) | C11-SUCCESS · Đã ghi nhận thành công |
| [58:5523](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5523) | C15-PREVIEW · Chứng từ thu mua máy cũ |
| [58:5533](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5533) | C15-CONFIRM · Xác nhận · Chứng từ thu mua máy cũ |
| [58:5542](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5542) | C15-SUCCESS · Đã ghi nhận thành công |
| [58:5549](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5549) | C19-PREVIEW · Chi tiết hợp đồng thuê |
| [58:5559](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5559) | C20-CONFIRM · Xác nhận · Gửi ảnh chứng từ chuyển khoản |
| [58:5568](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5568) | C20-SUCCESS · Đã gửi chứng từ · chờ đối chiếu |
| [58:5575](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5575) | C20-ERROR · Chưa thể gửi thông tin |
| [58:5587](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5587) | C23-PREVIEW · Theo dõi hoàn tiền thanh toán thừa |
| [58:5597](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5597) | C24-PREVIEW · Hoàn cọc đã hoàn tất |
| [58:5607](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5607) | C25-CONFIRM · Xác nhận · Đề nghị kết thúc hợp đồng sớm |
| [58:5616](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5616) | C25-SUCCESS · Đã ghi nhận thành công |
| [58:5623](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5623) | C26-CONFIRM · Xác nhận · Trao đổi hợp đồng thuê mới |
| [58:5632](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5632) | C26-SUCCESS · Đã ghi nhận thành công |
| [58:5639](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5639) | C27-CONFIRM · Xác nhận · Gửi đề nghị bán máy của tôi |
| [58:5648](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5648) | C27-SUCCESS · Đã ghi nhận thành công |
| [58:5655](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5655) | C15-ISSUE · Trao đổi về chứng từ thu mua |
| [58:5664](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5664) | C15-ISSUE-SUCCESS · Đã gửi thông báo cho Moderator |
| [59:6053](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=59-6053) | C18-FRONT · Mô hình nhìn phía trước |
| [63:11385](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-11385) | C02-FILTER-1 · Đang hiệu lực |
| [63:11507](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-11507) | C02-FILTER-2 · Sắp hết hạn |
| [63:11642](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-11642) | C03-FILTER-1 · Smart IoT |
| [63:11771](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-11771) | C03-FILTER-2 · Thông thường |
| [63:11911](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-11911) | C06-FILTER-1 · Đã cập nhật |
| [63:12026](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-12026) | C06-FILTER-2 · Cần hỗ trợ |
| [63:12155](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-12155) | C07-FILTER-1 · Chưa thanh toán |
| [63:12286](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-12286) | C07-FILTER-2 · Đã thanh toán |
| [63:12430](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-12430) | C13-FILTER-1 · Chưa đọc |
| [63:12557](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-12557) | C13-FILTER-2 · Đã xử lý |
| [64:10074](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=64-10074) | C35 · Hợp đồng máy thường C-205 |
| [64:10195](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=64-10195) | C35-PREVIEW · Hợp đồng đã ký C-205 |
| [64:10205](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=64-10205) | C36 · Hóa đơn thuê máy thường |
| [64:10315](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=64-10315) | C37 · Gửi chứng từ thuê máy thường |
| [64:10431](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=64-10431) | C37-CONFIRM · Xác nhận gửi chứng từ C-205 |
| [64:10440](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=64-10440) | C37-SUCCESS · Đã gửi chứng từ C-205 |
| [114:4566](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-4566) | C38 · Tinh chỉnh Espresso |
| [114:4681](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-4681) | C38-60 · Espresso · nước pha 60 ml |
| [114:4800](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-4800) | C38-20G · Espresso · cà phê 20 g |
| [114:4919](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-4919) | C42 · Tinh chỉnh cà phê sữa tươi |
| [114:5032](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-5032) | C42-150 · Cà phê sữa tươi · 150 ml sữa |
| [114:5145](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-5145) | C42-MISSING · Chưa thể lưu công thức |
| [114:22269](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-22269) | C39-ALT · Đã lưu menu riêng · chưa gửi máy · Cần chốt lưu nháp riêng |
| [114:22380](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-22380) | C40 · Đã gửi · chờ máy cập nhật |
| [114:22489](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-22489) | C41 · Menu riêng đã được máy áp dụng |
| [114:22615](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-22615) | C39-ALT-20G · Đã lưu menu riêng · chưa gửi máy · Cần chốt lưu nháp riêng |
| [114:22726](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-22726) | C40-20G · Đã gửi · chờ máy cập nhật |
| [114:22835](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-22835) | C41-20G · Menu riêng đã được máy áp dụng |
| [114:22961](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-22961) | C39-ALT-MILK · Đã lưu menu riêng · chưa gửi máy · Cần chốt lưu nháp riêng |
| [114:23072](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23072) | C40-MILK · Đã gửi · chờ máy cập nhật |
| [114:23181](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23181) | C41-MILK · Menu riêng đã được máy áp dụng |
| [114:23307](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23307) | C44 · Cập nhật menu cần hỗ trợ |
| [114:23416](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23416) | C38-CONFIRM · Lưu và gửi menu riêng? |
| [114:23425](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23425) | C39-ALT-CONFIRM · Gửi menu riêng đến S-018? · Cần chốt lưu nháp riêng |
| [114:23434](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23434) | C38-20G-CONFIRM · Lưu và gửi menu riêng? |
| [114:23443](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23443) | C39-ALT-20G-CONFIRM · Gửi menu riêng đến S-018? · Cần chốt lưu nháp riêng |
| [114:23452](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23452) | C42-CONFIRM · Lưu và gửi menu riêng? |
| [114:23461](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23461) | C39-ALT-MILK-CONFIRM · Gửi menu riêng đến S-018? · Cần chốt lưu nháp riêng |
| [114:23470](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=114-23470) | C38-DISCARD · Bỏ bản chỉnh sửa riêng? |
| [142:5247](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=142-5247) | C17-APPLIED-60 · Giám sát menu riêng đã áp dụng |
| [142:5407](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=142-5407) | C28-APPLIED-60 · Menu riêng đã áp dụng |
| [142:5537](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=142-5537) | C17-APPLIED-20G · Giám sát menu riêng đã áp dụng |
| [142:5697](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=142-5697) | C28-APPLIED-20G · Menu riêng đã áp dụng |
| [142:5827](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=142-5827) | C17-APPLIED-MILK · Giám sát menu riêng đã áp dụng |
| [142:5987](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=142-5987) | C28-APPLIED-MILK · Menu riêng đã áp dụng |
| [156:5658](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=156-5658) | C38-BOTH · Espresso · 20 g + 60 ml |
| [156:5777](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=156-5777) | C38-BOTH-CONFIRM · Lưu và gửi menu riêng |
| [156:5786](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=156-5786) | C40-BOTH · Đã gửi · chờ máy cập nhật |
| [156:5895](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=156-5895) | C41-BOTH · Menu riêng đã được máy áp dụng |
| [156:6020](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=156-6020) | C17-APPLIED-BOTH · Giám sát menu riêng đã áp dụng |
| [156:6091](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=156-6091) | C28-APPLIED-BOTH · Menu riêng đã áp dụng |
| [180:6190](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=180-6190) | C38-EDIT-APPLIED-60-TO-20G · Espresso |
| [180:6252](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=180-6252) | C38-EDIT-APPLIED-60-TO-20G · Xác nhận |
| [180:6259](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=180-6259) | C40-EDIT-APPLIED-60-TO-20G · Chờ máy |
| [183:6186](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=183-6186) | C41-EDIT-APPLIED-60-TO-20G · Máy đã xác nhận |
| [186:6118](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=186-6118) | C38-DISCARD-FROM-APPLIED-MENU · Bỏ thay đổi? |
| [187:6111](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=187-6111) | C38-EDIT-APPLIED-MILK-120-TO-150 · Cà phê sữa tươi |
| [193:6168](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=193-6168) | C42-MILK-FROM-APPLIED · Xác nhận |
| [193:6175](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=193-6175) | C40-MILK-FROM-APPLIED · Chờ máy |
| [193:6235](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=193-6235) | C41-MILK-FROM-APPLIED · Máy đã xác nhận |
| [193:6312](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=193-6312) | C17-MILK-FROM-APPLIED · Giám sát |
| [193:6383](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=193-6383) | C28-MILK-FROM-APPLIED · Menu riêng |
| [211:6404](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=211-6404) | C45 · Thêm món riêng từ menu Dolores |
| [211:6461](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=211-6461) | C46 · Món riêng chưa được máy hỗ trợ |
| [211:6518](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=211-6518) | C45-CONFIRM · Gửi món riêng tới máy |
| [211:6525](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=211-6525) | C47 · Món riêng đang chờ máy xác nhận |
| [211:6582](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=211-6582) | C48 · Món riêng đã áp dụng trên máy |
| [211:6660](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=211-6660) | C45-INGREDIENTS · Thành phần cho món riêng |
