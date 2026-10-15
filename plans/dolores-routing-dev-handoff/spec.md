# Dolores — bàn giao logic cho dev

**Ngày rà soát:** 2026-10-04  
**Trạng thái:** Bản rà soát nghiệp vụ và prototype; còn các điểm cần chốt được liệt kê cuối tài liệu.  
**Phạm vi:** Bộ Next.js local tại E:/Đồ án/dolores-nextjs, baseline MainFlow và SRS v1.1 trong Downloads, cùng các xác nhận người dùng trong cuộc trò chuyện.

## Kết luận

Routing hiện tại bao phủ phần lớn khu vực và màn hình cần trình diễn cho Admin, Moderator, Technician và Customer. Tuy nhiên, prototype chưa phải tài liệu đủ để dev suy luận và viết logic production: route chỉ chọn loại màn hình; trạng thái được giữ trong localStorage, một số thao tác là dữ liệu mẫu, và có liên kết/điều kiện đang trái SRS v1.1.

Đã tạo bộ bàn giao đi kèm gồm bản đồ route, danh mục 20 main flow/45 scenario, luồng trạng thái, ma trận quyền, kiểm tra thiếu/sai, quyết định còn mở và checklist nghiệm thu. Không đưa các dữ liệu sample hay lời gợi ý trước đó thành quy tắc nghiệp vụ.

## User stories và tiêu chí bàn giao

- **[P1]** Là developer, tôi cần từng scenario có actor, điều kiện đầu vào, thứ tự thao tác, record liên quan và kết quả cuối để triển khai đúng luồng đã thống nhất. **Đạt khi:** đủ 20/20 flow và 45/45 scenario nguồn được map trong `flow-catalog.md` và `acceptance-checklist.md`.
- **[P1]** Là developer, tôi cần quyền vai trò, quan hệ bản ghi và guard trạng thái nhất quán để không lộ dữ liệu hoặc cập nhật nhầm hợp đồng/máy. **Đạt khi:** mọi thao tác ghi được kiểm tra quyền ở server; kiểm tra âm và liên kết chéo bản ghi trong checklist đều đạt.
- **[P1]** Là người phụ trách nghiệp vụ, tôi cần các chi tiết chưa chốt được giữ riêng để mỗi nhóm dev không tự đặt ra quy tắc khác nhau. **Đạt khi:** mọi điểm chưa có căn cứ nằm trong `open-decisions.md`, không được xem là yêu cầu đã duyệt.
- **[P2]** Là người dùng văn phòng trên web/mobile, tôi cần mở được đúng hồ sơ từ list, thông báo và liên kết sâu, đồng thời hoàn thành thao tác tiền/chứng từ trên màn hình hẹp. **Đạt khi:** route giữ đúng ID/phạm vi sau refresh/back và các luồng invoice, task, menu, monitoring, buyback được nghiệm thu ở các chiều rộng nêu trong checklist.

### Success criteria cho bản triển khai

- [ ] 20/20 main flow và 45/45 scenario có test kết quả pass.
- [ ] 0 thao tác trái quyền hoặc truy cập chéo Tenant lọt qua kiểm tra server-side.
- [ ] 0 hóa đơn, khoản thu, hoàn tiền, deposit, machine assignment, usage event hoặc task bị ghi vào sai parent record trong các kiểm tra nghiệm thu.
- [ ] 100% quyết định còn mở được chặn khỏi hành vi tự suy diễn; hành vi phụ thuộc chúng chỉ mở khi có quyết định được ghi nhận.
- [ ] Tất cả route trong `screen-route-map.md` hỗ trợ tải trực tiếp/refresh và trả đúng record hoặc lỗi không tìm thấy/không có quyền.

### Hiệu đính quan trọng so với bản nháp 2026-10-03

Không dùng bản nháp lưu trong sources/routing-spec-2026-10-03-superseded.md để code. SRS v1.1 và xác nhận mới hơn đã chốt: (1) ly Smart đến trễ của bill tháng thường chuyển sang tháng kế tiếp, không sửa và phát hành lại bill cũ; (2) bill Smart cuối cùng chờ đồng bộ đủ dữ liệu từ mọi ngày sử dụng đến mốc dừng thuê, gồm ngày máy offline, rồi mới phát hành; không đặt ngưỡng số ngày online; (3) phí trễ và reminder dừng đúng thời điểm khách tải chứng từ và bấm xác nhận đã thanh toán, tách khỏi thời điểm Moderator đối soát; (4) thuê bắt đầu và kết thúc trong cùng tháng tính theo thời gian thuê thực tế. Xem U-02, U-06–U-11 và BR-10–BR-18 trong nguồn SRS đã trích xuất.

## Tài liệu trong gói bàn giao

| Tài liệu | Dùng để |
|---|---|
| flow-catalog.md | Đọc 20 main flow, thứ tự scenario, vai trò, route và kết quả mong đợi. |
| screen-route-map.md | Tra cứu 49 dạng route hiện tại, màn hình, quyền và route chưa đại diện đủ record. |
| state-and-data-contracts.md | Dùng làm khung state transition, liên kết entity, guard và dữ liệu audit. |
| implementation-review.md | Các sai lệch P1/P2 có căn cứ mã nguồn; prototype limitation; điểm UX/mobile cần bàn giao. |
| acceptance-checklist.md | 45 scenario gốc và các kiểm tra âm, phân quyền, dữ liệu để dev/QA nghiệm thu. |
| open-decisions.md | Các quyết định còn thiếu trong SRS v1.1; trạng thái câu hỏi làm rõ đang chờ người dùng. |
| sources/mainflow-sep30.txt | Bản text tra cứu của MainFlow_NghiepVu.docx ngày 2026-09-30; dùng để truy vết lịch sử, không ghi đè quyết định mới hơn. |
| sources/srs-v1.1.txt | Bản text tra cứu của file Dolores_Software_Requirements_Specification_EN_v1.1.docx. |
| sources/menu-corrected.txt | Bản text tra cứu của MainFlow/Software Requirement Specification_Menu_Corrected.docx. |
| sources/review-manifest.json | Hash và kích thước nguồn để biết chính xác file nào đã được đối chiếu. |

## Source of truth và cách xử lý mâu thuẫn

1. Quyết định mới nhất người dùng đã xác nhận trong hội thoại có quyền ưu tiên cao nhất.
2. Tiếp theo là Software Requirement Specification EN v1.1 được cập nhật ngày 2026-10-02 cùng U-01…U-11.
3. Tiếp theo là MainFlow_NghiepVu ngày 2026-09-30 và SRS menu-corrected; các bản này là nguồn lịch sử/traceability nếu khác với xác nhận mới hơn.
4. Figma và Next.js prototype chỉ mô tả giao diện/tương tác đang có, không chứng minh nghiệp vụ đã chốt.
5. Nếu logic cần để thực hiện không có trong các nguồn nghiệp vụ trên, đánh dấu Cần chốt. Không tự thêm điều kiện, phí, trạng thái pháp lý hoặc quyền.

**Ghi chú G01:** Quyền Admin/Moderator trong tin nhắn mới nhất được ưu tiên hơn phần OI-01 còn mở trong SRS v1.1. Quyền tạo/quản lý shop, đặt trạng thái Tenant và cấp quyền truy cập là của Admin; Moderator chỉ tạo tài khoản Tenant và quản lý hợp đồng khách hàng theo phạm vi. Chỉ quan hệ Tenant–shop, trình tự liên kết và danh mục trạng thái cụ thể còn mở.

## Nghiệp vụ đã xác nhận

| Nhóm | Quy tắc làm căn cứ cho logic |
|---|---|
| Tài khoản và shop | Admin tạo/quản lý tài khoản Tenant, Moderator, Technician; tạo/quản lý shop, đặt trạng thái Tenant và cấp quyền truy cập Tenant. Moderator được tạo tài khoản Tenant và xem/quản lý hợp đồng của khách hàng trong phạm vi được giao; không được tạo tài khoản nhân sự, quản lý shop, đổi trạng thái Tenant hoặc cấp quyền. Quan hệ Tenant–shop và danh mục/chuyển trạng thái còn cần chốt chi tiết. |
| Hợp đồng/máy | Một hợp đồng thuê gắn một máy vật lý chính; một khách có thể có nhiều hợp đồng. Máy chính không đồng thời nằm trong hai hợp đồng thuê đang hiệu lực. Bàn giao hợp đồng giấy đã ký bên ngoài; Dolores lưu bản ký. |
| Máy thường | 1.500.000 VND/tháng. Có contract/installation location và lịch sử vận hành do nhân viên ghi nhận; không có cup telemetry, PAYG, online/offline, GPS giám sát, Global Menu, digital twin hay remote menu. |
| Smart IoT/PAYG | 750.000 VND/tháng + 1.000 VND/ly hợp lệ. Ly hợp lệ là ly bán và máy gửi trạng thái thành công. Edge giữ dữ liệu khi offline và tự gửi lên Cloud khi kết nối lại. Offline cap là điều khoản theo hợp đồng; 5 ngày chỉ là giá trị tham khảo. |
| Cọc/lắp đặt | Cọc 10.000.000 VND/máy/hợp đồng. Phí lắp mặc định 1.000.000 VND/máy, có thể khác theo hợp đồng. Cọc hiển thị riêng và không gộp vào phí ly chuyển kỳ. |
| Bill/tiền | Bill thường phát hành ngày cuối tháng; thời hạn 10 ngày làm việc tính T2–T7, không tính Chủ nhật. Chuyển khoản ngoài hệ thống. Tenant tải chứng từ và bấm xác nhận; Moderator so với số liệu tài khoản công ty và lưu đối soát nội bộ. Không có online payment/bank API. |
| Quá hạn | Mỗi ngày trễ: số dư chưa trả mới = số dư chưa trả trước đó × 1,05; ví dụ 5.000.000 → 5.250.000 → 5.512.500. Dừng cộng phí và reminder tại timestamp Tenant đã tải chứng từ và bấm xác nhận. Xử lý khi submission bị từ chối/đối soát thiếu còn mở. |
| Ly đến trễ | Bill tháng thường: ly đến trễ cộng dồn sang kỳ tháng kế tiếp. Bill Smart cuối cùng: đợi đủ dữ liệu sử dụng đến cutoff kết thúc thuê, bao gồm dữ liệu máy đã lưu offline, mới phát hành. Không kéo dài hợp đồng hay tạo tháng thuê giả do sync trễ. |
| Tiền/doanh thu | Chỉ tiền đã được Moderator đối soát là khoản thu dùng tính doanh thu. Doanh thu gộp có cọc; doanh thu thực tế loại cọc. Hoàn tiền là giao dịch ngân hàng bên ngoài, lưu chứng từ/xác nhận riêng. Refund netting và phân loại một số phụ phí còn mở OI-17. |
| Thuê cuối kỳ | Hợp đồng kéo qua nhiều tháng áp dụng tiền thuê đủ tháng kết thúc theo BR-10; PAYG theo các ly đến cutoff dừng dùng máy. Nếu thuê bắt đầu và kết thúc trong cùng tháng thì tiền thuê tính theo thời gian thuê thực tế. Công thức chia/rounding chưa chốt. |
| Bảo trì/sửa | Công ty bảo trì chu kỳ 3 tháng trong cửa sổ 10 ngày. Theo yêu cầu mới ngày 2026-10-14, Dolores cần theo dõi cam kết SLA của quy trình bảo trì/sửa chữa (mốc cam kết, tiến độ, kết quả và đúng/trễ hạn khi có thời hạn đã được chốt). Dolores không xếp lịch ca/giờ làm việc, không quản lý lịch rảnh của Technician và không tự phân công. Moderator vẫn điều phối Technician. Chu kỳ, kết quả, máy, linh kiện, giá và lịch sử được lưu; sửa/thay linh kiện và phí theo điều khoản; không tự động tính hóa đơn cho mọi công việc kỹ thuật. Mốc SLA, cách tính giờ và nhắc/escalation chưa có số liệu, ghi Cần chốt. |
| Máy thay thế | Phải cùng loại máy. Gắn vào hợp đồng thuê hiện hữu, không tạo hợp đồng thuê mới. Ly hợp lệ từ máy Smart thay thế tính vào hợp đồng trong đúng thời gian được gán. Không đổi chéo loại khi kho thiếu. |
| Hoàn cọc | Moderator yêu cầu chuẩn bị → Technician thu hồi/đánh giá → Moderator quyết toán theo tiền cọc thực nhận, bill và điều khoản → thông báo khách → theo dõi giao dịch hoàn ngoài hệ thống. Damage trừ trong cọc; phần vượt là khách phải bồi thường. Hạn hoàn số dư đủ điều kiện là 10 ngày làm việc tính từ thông báo kết quả Technician. Thứ tự trừ cụ thể và xung đột bill cuối đang chờ chốt. |
| Hết hạn/tiếp tục | Nhắc trước 1 tháng. Không trả lời = không thuê tiếp; hợp đồng hết xử lý theo luồng thu hồi. Không renewal/gia hạn; khách muốn tiếp tục ký hợp đồng mới hoàn toàn, máy mới có thể khác. |
| Thu mua máy cũ | Chỉ hỗ trợ khách thuê Dolores. Technician đánh giá nội bộ trước; Moderator chốt thỏa thuận/hợp đồng mua ký ngoài hệ thống và upload chứng từ chuyển khoản. Khách xem/xác nhận chứng từ độc lập; có thể thu gom theo thỏa thuận khi xác nhận còn chờ. Ghi “Chờ khách xác nhận trước khi thu gom” khi cần. Máy phải thu gom, tân trang và Technician test đạt; Moderator mới đánh dấu sẵn sàng cho thuê. |
| Menu | Global Menu chỉ Admin/Moderator quản lý; là menu mặc định có sẵn trên máy Smart IoT từ lúc sản xuất. Tenant nhận update, được sửa công thức riêng từ Global Menu và thêm món riêng nếu máy có capability. Update Global không ghi đè công thức riêng; Tenant tự xem base mới và chọn áp dụng. Thành phần bắt buộc/capability phải được giữ. Máy thường không nhận menu Dolores. |
| Vị trí | Mọi máy thuê có contract/installation location. Chỉ Smart IoT có monitored GPS location; hai trường không dùng thay thế nhau. |

## Ngoài phạm vi đã xác nhận

- Dolores không cung ứng cà phê hoặc quản lý quy trình đặt mua/cấp phát nguồn cung cà phê. Việc lưu thành phần trong công thức menu không tạo ra chức năng tồn kho hay cung ứng nguyên liệu.
- Dolores không thay cho việc chuyển khoản ngân hàng, không xử lý thanh toán trực tuyến và không tự thi hành điều khoản/vi phạm hợp đồng.
- Dolores không quản lý lịch ca/giờ làm việc, tình trạng rảnh/bận hoặc lịch hẹn của Technician và không tự động phân công. Đây là ranh giới khác với việc theo dõi SLA: nền tảng được yêu cầu lưu cam kết dịch vụ đã thỏa thuận, mốc thời gian thực tế và tình trạng trong hạn/quá hạn. Không tạo SLA mặc định hoặc lịch/reminder bảo trì định kỳ khi cách tính, ngưỡng báo và người nhận chưa được chốt (OI-19).
- Tiêu chí định giá máy thu mua cũ, checklist đánh giá kỹ thuật và quy tắc nội bộ của Technician không cấu hình trong nền tảng.

## Tiêu chí hoàn tất bộ bàn giao

- Cả 20 flow và 45 scenario gốc được nhận diện/mapping; mỗi flow có route vào, người khởi tạo, người xử lý, precondition, hành động, entity cập nhật và điểm kết thúc.
- Mọi write action có quyền theo role + phạm vi bản ghi, guard trạng thái, lỗi không thỏa điều kiện, audit fields và đích sau thành công.
- Không dựa vào mã C-204, tháng 09/2026, thứ tự list, tiền cọc/global task state hay prefix machine ID để quyết định logic.
- Kiểm tra route trực tiếp, refresh/deep-link, record ID sai, quyền cross-customer và cửa sổ mobile được bao trong nghiệm thu.
- Không gắn Ready cho nghiệp vụ thanh toán/hoàn cọc cho tới khi làm rõ các mục P1 tại open-decisions.md.

## Liên hệ mã nguồn đã rà soát

- Route map/resolver: src/lib/prototype.ts.
- Catch-all route: src/app/[role]/[[...segments]]/page.tsx.
- UI screens/actions: src/components/PrototypeApp.tsx.
- Demo data/state types: src/lib/demo-store.tsx.
- Responsive shell/styles: src/app/globals.css.
- Scope demo hiện trạng: README.md.

## Kiểm tra đã thực hiện

Đây là rà soát tĩnh mã nguồn và đối chiếu tài liệu. Không chạy E2E, không gọi API/back-end, không đăng nhập, và không xác thực phần cứng/GPS/telemetry/menu thực tế trong lần rà soát này. Hash tài liệu nguồn và mã được ghi trong sources/review-manifest.json.

