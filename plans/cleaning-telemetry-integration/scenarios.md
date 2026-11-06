# Scenarios — Cleaning & Telemetry

Ngày: 2026-11-06. Skill scenario áp dụng vì API đa role và dữ liệu máy có scope. Chỉ là thiết kế kiểm thử, chưa chạy test.

Actors: Owner, Admin, Moderator, Technician; máy Smart IoT/CONVENTIONAL; API theo JWT; query cache; Pages Router. Cả 12 chiều được xem xét. Compliance tập trung scope/log, không có xóa dữ liệu hoặc giao dịch tài chính trong feature.

| ID | Chiều | Trigger cụ thể | Mức độ | Hành vi mong đợi / test anchor |
|---|---|---|---|---|
| S01 | Authorization | Owner A logout rồi Owner B mở cùng machine URL | CRITICAL | Cache tách subject, hủy query cũ; không render A. Mock đổi subject và response chậm. |
| S02 | Authorization | Moderator mở tab connection hoặc chọn deep link points | HIGH | Không request heartbeat/points; hiện trạng thái theo quyền. Assert zero requests. |
| S03 | Authorization | Owner nhập reviewId của Owner khác / Technician grant hết hạn | HIGH | 403 giữ trạng thái quyền, không fallback endpoint rộng. Live read có tài khoản test hoặc ghi chưa xác minh. |
| S04 | Timing | Đổi máy/filter khi query cũ chưa về | HIGH | Hủy request, key mới; không render response cũ dưới tên mới. Deferred promise test. |
| S05 | Timing | Double click quyết định rồi mạng timeout | HIGH | Khóa pending; không tự resend POST; refetch review trước quyết định tiếp. |
| S06 | Timing | Review chuyển CLEARED/REVIEWED trước lúc xác nhận | HIGH | Refetch/gate trạng thái; 409 reload và giữ reason draft, không báo duyệt thành công. |
| S07 | Input | from>=to, ngày không có thật, query tab/enum giả | HIGH | Validate trước GET, chuẩn hóa URL và lỗi tại field; không gửi date invalid. |
| S08 | Input | Null health/boolean và numeric value=0 | HIGH | Null chưa biết, 0 hiển thị thật; không ép null thành false hoặc 0. |
| S09 | Input | field telemetry chứa text hoặc object | MEDIUM | Bảng có thể đọc; chart chỉ numeric hữu hạn; không đoán đơn vị. |
| S10 | Scale | Cleaning COMPLETED nằm ở trang thứ hai | HIGH | Không kết luận thiếu từ page đầu; scoped filter tồn tại hoặc trạng thái chưa kiểm tra. Test hai trang. |
| S11 | Scale | Brew page cuối đúng20 dòng / review header hasNext false | HIGH | Dùng metadata PageResponse hoặc header; không suy hasNext chỉ từ length. |
| S12 | Scale | Danh sách100 máy, chỉ10 máy visible | HIGH | Không fan-out cleaning mỗi5s; heartbeat chỉ visible Smart IoT và giới hạn tải. Request-count test. |
| S13 | State | Không có ACTIVE contract nhưng trước đây đã pha | HIGH | Rỗng hợp lệ với giải thích phạm vi; không nói chưa từng có dữ liệu. |
| S14 | State | Máy thường hoặc machineType chưa xác nhận | HIGH | Không query IoT tự động; giữ hồ sơ máy/bảo trì không liên quan. |
| S15 | State | Người xem mở thẳng tab cleaning rồi Back/Forward | HIGH | URL source of truth, filter/page/tab khôi phục không loop useEffect. E2E direct-refresh-back. |
| S16 | Environment | Browser timezone UTC/US, xem hôm nay VN | HIGH | Cùng UTC bounds từ ngày Asia/Ho_Chi_Minh. Test 00:00 và23:59 VN. |
| S17 | Environment | Mobile390px, keyboard và reduced motion | MEDIUM | Tab focus/selected đúng, bảng scroll trong card, không che action bar. |
| S18 | Environment | Tab browser hidden rồi visible | MEDIUM | Poll heartbeat dừng/tiếp tục có kiểm soát; cleaning không reload hàng loạt. |
| S19 | Failure | Influx503 nhưng cup API thành công | HIGH | Lỗi cục bộ telemetry; số ly/histories còn dùng được. Không có OFFLINE giả. |
| S20 | Failure | Cleaning timeout / history chưa tải | HIGH | Hiện chưa tải/lỗi và retry, không nói chưa vệ sinh. |
| S21 | Failure | Session401/403 | HIGH | Theo flow auth hiện có, không retry vòng lặp hoặc gọi ingestion fallback. |
| S22 | Data integrity | Heartbeat/point/review trả machineId khác context | HIGH | Reject theo schema/context trước render. |
| S23 | Data integrity | Daily cup bucket UTC, UI chọn ngày VN | HIGH | Không relabel bucket UTC thành VN hoặc cộng history chưa đủ; xác minh bucket, nhãn rõ. |
| S24 | Data integrity | cleaning finishedAt thiếu, flags false/null | MEDIUM | Hiển thị dấu thiếu đúng nghĩa, giữ status server. |
| S25 | Integrations | Timestamp thiếu offset hoặc PageResponse khác tài liệu | HIGH | Gate adapter bằng OpenAPI/response; ghi mismatch, không permissive parse che lỗi. |
| S26 | Integrations | Nâng backend cho Moderator heartbeat trong annotation nhưng security chưa đổi | HIGH | Theo quyền runtime đã xác nhận, không mở UI chỉ vì annotation. |
| S27 | Integrations | API recipeBreakdown thiếu category zero | MEDIUM | Không bịa category/đếm tổng từ rows; totalCups dùng trường chính thức. |
| S28 | Compliance | Debug log vô tình in token/metricsJson/evidenceReferences | HIGH | Review code và test không log nhạy cảm, không cache bundle private key. |
| S29 | Compliance | URL chia sẻ chứa ownerId để đổi scope | HIGH | Owner không truyền ownerId; API role-scoped và auth subject key. |
| S30 | Compliance | Nhầm POST device ingest hoặc certificate issuance vào refresh | HIGH | Network allowlist chỉ API feature; không tạo device data/provisioning. |
| S31 | Business | OFFLINE nhưng health lần cuối còn tốt | HIGH | Hai vùng độc lập, timestamp hiển thị; không ghi sức khỏe hiện tại tốt. |
| S32 | Business | Chưa đến cuối ngày và chưa có CLOSING | MEDIUM | Chưa ghi nhận, không cảnh báo vi phạm/suy thiếu compliance. |
| S33 | Business | FOLLOW_UP được chọn | HIGH | Chỉ review decision, không invoice/penalty mutation. Assert request payload/routes. |
| S34 | User types | Owner mới0 máy, Admin nhiều Owner, Technician có grant | HIGH | State và endpoint theo role, không gọi Owner API từ Admin/Technician. |
| S35 | User types | Owner chỉnh URL machineId từ UUID sangserial | MEDIUM | Resolver có quy tắc documented; scoped machine lookup và giữ canonical URL, không bỏ validation tùy tiện. |
| S36 | User types | Screen reader đọc badge chỉ có chấm màu | MEDIUM | Có text/aria đầy đủ, không phân biệt state chỉ bằng màu. |

Tổng: 1 CRITICAL, 27 HIGH, 8 MEDIUM, 0 LOW; 12 chiều. Mọi CRITICAL/HIGH phải được map vào phase01–04; không dùng test giả lập làm bằng chứng phân quyền backend thật.
