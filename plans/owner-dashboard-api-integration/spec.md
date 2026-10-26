# Spec: Kết nối API cho Owner Dashboard

**Ngày:** 2026-10-26
**Trạng thái:** Ready

---

## Problem Statement

Các màn hình Dashboard của Owner đã có giao diện nhưng chưa được nối đầy đủ với backend, nên Owner chưa thể dùng dữ liệu và nghiệp vụ thật theo đúng thứ tự điều hướng. Cần nối từng màn hình theo thứ tự sidebar, theo kiến trúc chia file hiện tại và chỉ dùng các API có phạm vi/quyền được Swagger xác nhận.

---

## User Stories

- **[P1]** Là Owner, tôi muốn xem tổng quan tài khoản và hoạt động của mình để nắm tình hình sử dụng dịch vụ.
  Chấp nhận khi: màn Tổng quan gọi API dashboard bằng phiên hiện tại, thể hiện loading/empty/error riêng và không gửi Owner ID để đổi phạm vi.

- **[P1]** Là Owner, tôi muốn xem hợp đồng và máy của mình để truy cập hồ sơ đang có.
  Chấp nhận khi: dữ liệu lấy từ endpoint profile/contracts và machines; chi tiết chỉ mở được với ID thuộc Owner hiện tại.

- **[P1]** Là Owner, tôi muốn xem menu global và menu local của mình để theo dõi cấu hình đang dùng.
  Chấp nhận khi: dữ liệu global và local lấy từ API tương ứng; thao tác ghi chỉ xuất hiện khi được API cho phép.

- **[P1]** Là Owner, tôi muốn xem hóa đơn và nộp bằng chứng thanh toán để hoàn tất nghĩa vụ thanh toán.
  Chấp nhận khi: hóa đơn và payment proof dùng API billing hiện hành; tải chứng từ theo multipart và idempotency mà API yêu cầu.

- **[P1]** Là Owner, tôi muốn báo lỗi máy để đội ngũ Dolores tiếp nhận yêu cầu sửa chữa.
  Chấp nhận khi: form chọn máy của Owner, nhập mô tả sự cố và gửi intake qua API; hiển thị kết quả thành công/lỗi rõ ràng.

- **[P3]** Thu mua máy cũ tạm thời chưa kết nối API theo yêu cầu hiện tại.

- **[P1]** Là Owner, tôi muốn xem và đánh dấu thông báo đã đọc để theo dõi cập nhật.
  Chấp nhận khi: danh sách, số chưa đọc và thao tác read dùng API notifications trong JWT scope hiện tại.

---

## Functional Requirements

1. **FR-01 — Thứ tự:** Nối màn hình theo đúng sidebar: Tổng quan → Hợp đồng → Máy của tôi → Menu của tôi → Hóa đơn → Yêu cầu hỗ trợ → Thu mua máy cũ → Thông báo. Thu mua máy cũ giữ trạng thái chưa kết nối API và được bỏ qua; tiếp tục với Thông báo.

2. **FR-02 — Kiến trúc:** Tôn trọng cấu trúc hiện tại: page điều phối UI, API module chứa HTTP calls, schema/types giữ contract, dùng lib/routes/text/components hiện có. Không gom toàn bộ API calls vào page component.

3. **FR-03 — Phạm vi Owner:** Mọi request dùng bearer session hiện tại; không gửi ownerId do UI tự chọn. Với endpoint hợp đồng cần {idaasUserId}, chỉ lấy subject từ identity đã xác thực; không nhận tùy ý từ URL/form.

4. **FR-04 — Tổng quan:** Dùng GET /api/v1/dashboard/overview. Nếu lọc ngày, truyền fromDate và toDate cùng nhau, tối đa 90 ngày; mặc định theo API là 7 ngày.

5. **FR-05 — Hợp đồng:** Dùng GET /api/v1/profiles/{idaasUserId}/contracts?page=&size= và API chi tiết hợp đồng. Phân trang theo tham số backend; không truy vấn hồ sơ Owner khác.

6. **FR-06 — Máy:** Dùng GET /api/v1/machines và GET /api/v1/machines/{id}; xử lý lỗi từ chối truy cập và không hiển thị dữ liệu máy của Owner khác.

7. **FR-07 — Menu:** Dùng GET /api/v1/recipes/global, GET /api/v1/recipes/local; dùng mutation local chỉ theo schema/permissions của Swagger. Không dựa vào endpoint effective theo machine cho tới khi phạm vi Owner được xác nhận.

8. **FR-08 — Hóa đơn:** Dùng billing invoice/list/detail/line-item APIs. Payment proof dùng endpoint /api/v1/billing/invoices/{invoiceId}/payment-proofs; gửi multipart và Idempotency-Key theo contract. Không gọi API /payments đã bị đánh dấu vô hiệu hóa.

9. **FR-09 — Repair intake:** Gửi lỗi máy bằng POST /api/v1/repair-cases/intakes với machine ID, mô tả lỗi và idempotency key theo schema; hiển thị kết quả API trả về.

10. **FR-10 — Repair intake:** Owner chọn máy từ GET /api/v1/machines và gửi machineId, issueDescription cùng idempotencyKey qua POST /api/v1/repair-cases/intakes. Không hiển thị thao tác triage; endpoint triage chỉ dành cho Moderator/Admin. Chưa nối API lịch sử RepairCase/intake.

11. **FR-11 — Buyback:** Tạm thời không gọi API Buyback. Giữ nội dung màn hình thông báo chức năng chưa kết nối.

12. **FR-12 — Thông báo:** Dùng list/unread-count/mark-read/read-all APIs; không gửi ownerId, để JWT xác định scope.

13. **FR-13 — Trạng thái API:** Mỗi màn phân biệt loading, dữ liệu rỗng, lỗi quyền, lỗi kết nối và thành công. Có retry cho GET an toàn; mutation chỉ retry với idempotency contract khi có.

14. **FR-14 — Không giả lập:** Không dùng mock data, localStorage hoặc success giả làm fallback khi API lỗi/thiếu. Nếu backend thiếu chức năng, hiển thị trạng thái giới hạn có giải thích và ghi rõ API cần bổ sung.

15. **FR-15 — Thông tin riêng tư:** Không đưa private evidence lên URL công khai, không log token hoặc nội dung chứng từ; chỉ gửi/đọc qua endpoint có xác thực.

---

## Non-Functional Requirements

- **Performance:** Tôn trọng pagination/filter của API; không tải toàn bộ dữ liệu chỉ để lọc ở client khi endpoint đã có tham số phân trang.
- **Security:** 0 request Owner được phép truyền Owner ID do người dùng điều khiển để đổi scope; mọi thao tác dữ liệu tuân theo bearer auth và quyền endpoint. Không lộ URL/object storage private.
- **Availability:** Lỗi API phải hiển thị trạng thái có thể hiểu và retry phù hợp; không thay bằng nội dung giả. Không tự retry mutation thiếu idempotency key.
- **Maintainability:** API types/schema và request logic nằm đúng tầng hiện có; mỗi màn giữ trách nhiệm hiển thị và tương tác UI.

---

## Success Criteria

- [ ] Bảy mục sidebar có kết nối API được xử lý đúng thứ tự; Thu mua máy cũ được bỏ qua theo yêu cầu.
- [ ] 100% dữ liệu Owner hiển thị lấy từ response API; không có mock/localStorage làm nguồn dữ liệu nghiệp vụ.
- [ ] Không có request nào cho phép client chọn Owner scope; API từ chối truy cập chéo Owner được phản ánh thành trạng thái lỗi phù hợp.
- [ ] Mỗi màn hiển thị riêng loading, empty, error và loaded states.
- [ ] Form repair intake gửi đúng machineId, issueDescription và idempotencyKey; không gọi triage.
- [ ] Payment evidence chỉ đi qua API được xác thực và đúng multipart/idempotency contract.
- [ ] Màn Buyback không gọi API.

---

## Out of Scope

- Thay đổi backend, quy tắc phân quyền hoặc schema API.
- Giao diện và workflow Operator dành cho Admin, Moderator hoặc Technician.
- Kết nối API Buyback & Refurbishment trong giai đoạn này.
- API danh sách/timeline lịch sử RepairCase hoặc intake đang chờ.
- Thay đổi cấu trúc ứng dụng lớn ngoài các tầng/module cần thiết để nối Dashboard Owner.
- Gọi API mutation trên dữ liệu môi trường thật trong giai đoạn khảo sát/thiết kế.
- Tạo dữ liệu mock hoặc cơ chế local-only thay cho lịch sử backend.

---

## Assumptions

- Các endpoint trong Swagger là contract mục tiêu hiện tại; hành vi runtime có thể còn phụ thuộc trạng thái backend.
- Backend xác định Owner scope từ bearer JWT ở các endpoint được mô tả là Owner-scoped; GET Repair Cases cần xác minh riêng vì tài liệu chỉ ghi visible to the current role.
- UI hiện tại đã có đủ shell/navigation cho 8 mục; công việc tập trung vào kết nối data/interaction và trạng thái.
- Theo quyền endpoint, Owner gửi Repair intake; Moderator/Admin thực hiện triage.
- Owner scope của API repair intake được backend xác thực qua bearer JWT.
- Người dùng chọn thứ tự triển khai từ trên xuống.
