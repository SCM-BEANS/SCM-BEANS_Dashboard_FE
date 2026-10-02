# Dolores Technician: PC implementation playbook

Use through [dolores-technician](dolores-technician/SKILL.md), whose mandatory rules apply throughout. Read [shared guide](figma-guide.md) before implementation.

Source: [Technician canvas 3:4](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=3-4).

## Screen groups and implementation order

| Area | Main frame families | Design and behavior to preserve |
| --- | --- | --- |
| Assigned work | T01, T09, T12 | All/delivery/repair/collection filters, task detail, notifications, status and assigned context |
| Handover | T02, T03 | Separate standard handover and Smart installation/activation steps |
| Repair and maintenance | T04, T14 | Repair outcomes, parts and maintenance records, confirmations and completion states |
| Retrieval and assessment | T05, T10 | Condition assessment, collection results, used-machine assessment and required evidence |
| Substitute machines | T06, T13 | Same-type temporary substitute, return procedure and correct machine/contract association |
| Refurbishment | T07 | Refurbishment/test outcomes before stock readiness |
| Work history | T08, T11 | Smart/standard filters and individual machine work history |

## Role-specific constraints

- Implement assigned technical work and evidence capture. Do not grant Moderator settlement/refund or Admin account-management capabilities.
- Standard and Smart handover are different workflows. Only Smart supports activation/telemetry steps when supplied by the design and actual integration.
- Capture retrieval and condition assessment before the Moderator settlement handoff. Do not mark settlement completed from a Technician result submission.
- Preserve task, machine, customer, contract, parts, and outcome associations; UI sorting/filtering must not change the record submitted.
- Keep substitute handover and substitute return distinct, including same-type constraints and historical attribution.
- The design does not authorize inventing automatic scheduling, new job statuses, or extra mandatory evidence fields. Ask if a required service/state is missing.
- Error, confirm, cancellation, return-to-list, and success behavior must follow the actual linked Figma states.

## Handoff focus

Cover assigned-task filters, source-to-detail navigation, standard versus Smart handover, repair/parts submissions, retrieval assessments, substitute issue/return, refurbishment outcomes, and history. Verify the downstream result state separately from the appearance of a success screen.

## Frame inventory

Observed 2026-10-02: **40 direct top-level frames**. This includes UI states and alternatives; it is not a list of separate routes. Refresh before implementation and inspect descendants/components for additional states. A listed frame is evidence of its presence, not approval of a labeled pending alternative or proof of prototype wiring.

| Node | Figma frame name |
| --- | --- |
| [13:49](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=13-49) | T01 · Việc được giao |
| [13:157](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=13-157) | T02 · Bàn giao máy thường |
| [13:257](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=13-257) | T03 · Lắp đặt & kích hoạt Smart IoT |
| [13:357](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=13-357) | T04 · Sửa chữa & thay linh kiện |
| [13:457](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=13-457) | T05 · Thu hồi & ghi nhận tình trạng |
| [13:557](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=13-557) | T06 · Bàn giao máy thay thế tạm thời |
| [13:657](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=13-657) | T07 · Máy thu mua · tân trang & kiểm thử |
| [13:747](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=13-747) | T08 · Lịch sử máy |
| [54:7314](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-7314) | T09 · Chi tiết yêu cầu YC-017 |
| [54:7385](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-7385) | T10 · Đánh giá máy khách đề nghị bán |
| [54:7466](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-7466) | T11 · Lịch sử xử lý máy S-018 |
| [54:7528](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-7528) | T12 · Thông báo công việc |
| [54:7586](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-7586) | T13 · Ghi nhận trả máy thay thế |
| [54:7661](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=54-7661) | T14 · Ghi nhận lịch sử bảo trì |
| [58:5298](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5298) | T02-CONFIRM · Xác nhận · Bàn giao máy thường |
| [58:5307](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5307) | T02-SUCCESS · Đã ghi nhận thành công |
| [58:5314](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5314) | T03-CONFIRM · Xác nhận · Lắp đặt & kích hoạt Smart IoT |
| [58:5323](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5323) | T03-SUCCESS · Đã ghi nhận thành công |
| [58:5330](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5330) | T04-CONFIRM · Xác nhận · Sửa chữa & thay linh kiện |
| [58:5339](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5339) | T04-SUCCESS · Đã ghi nhận thành công |
| [58:5346](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5346) | T05-CONFIRM · Xác nhận · Thu hồi & ghi nhận tình trạng |
| [58:5355](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5355) | T05-SUCCESS · Đã ghi nhận thành công |
| [58:5362](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5362) | T06-CONFIRM · Xác nhận · Bàn giao máy thay thế tạm thời |
| [58:5371](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5371) | T06-SUCCESS · Đã ghi nhận thành công |
| [58:5378](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5378) | T07-CONFIRM · Xác nhận · Máy thu mua · tân trang & kiểm thử |
| [58:5387](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5387) | T07-SUCCESS · Đã ghi nhận thành công |
| [58:5394](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5394) | T09-CONFIRM · Xác nhận · Chi tiết yêu cầu YC-017 |
| [58:5403](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5403) | T09-SUCCESS · Đã ghi nhận thành công |
| [58:5410](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5410) | T10-CONFIRM · Xác nhận · Đánh giá máy khách đề nghị bán |
| [58:5419](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5419) | T10-SUCCESS · Đã ghi nhận thành công |
| [58:5426](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5426) | T13-CONFIRM · Xác nhận · Ghi nhận trả máy thay thế |
| [58:5435](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5435) | T13-SUCCESS · Đã ghi nhận thành công |
| [58:5442](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5442) | T14-CONFIRM · Xác nhận · Ghi nhận lịch sử bảo trì |
| [58:5451](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5451) | T14-SUCCESS · Đã ghi nhận thành công |
| [58:5458](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=58-5458) | T09-TYPE · Mở biểu mẫu theo công việc |
| [63:10875](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-10875) | T01-FILTER-1 · Giao máy |
| [63:10970](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-10970) | T01-FILTER-2 · Sửa chữa |
| [63:11065](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-11065) | T01-FILTER-3 · Thu hồi |
| [63:11183](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-11183) | T08-FILTER-1 · Smart IoT |
| [63:11278](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK?node-id=63-11278) | T08-FILTER-2 · Máy thường |
