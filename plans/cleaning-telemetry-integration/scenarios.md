# Scenarios — Cleaning & Telemetry

Ngày thiết kế: 2026-11-06. Skill scenario áp dụng vì API đa role và dữ liệu máy có scope. Evidence FE đã cập nhật ngày2026-11-07 ở cuối file; live gaps vẫn UNVERIFIED.

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

## Evidence matrix — Phase 04, 2026-11-07

Unit/adapter: `tests/owner-analytics.test.cjs`, `tests/dolores-telemetry.test.cjs`, `tests/offline-violation-reviews.test.cjs`. Browser mock: `tests/e2e/machine-operational-overview.spec.ts`. Đây là bằng chứng FE, không xác nhận security của BE.

| Scenario | Bằng chứng / giới hạn |
|---|---|
| S01 | Browser đổi JWT subject khi lịch sử Owner A còn pending, trả403 cho Owner B; dữ liệu A và số ly cũ không xuất hiện. Query key có subject. Truy cập chéo hai Owner thật: **UNVERIFIED**. |
| S02, S26 | Browser Moderator list/detail/operations và offline review: zero heartbeat/points; source không import telemetry adapter trong Moderator IoT/detail. |
| S03 | Browser Technician chờ machine lookup rồi403, không hiện OFFLINE/Owner Analytics/offline review; offline adapter truyền403 và kiểm tra context. Grant Technician hết hạn và Owner chéo scope trên server thật: **UNVERIFIED**. |
| S04 | Browser đổi máy hoặc bộ lọc khi brew history cũ pending; chờ response cũ settled rồi xác nhận chỉ có dữ liệu máy/kỳ mới. Adapter truyền AbortSignal, kiểm tra identity/context; account-pending race có test riêng. |
| S05 | Browser rapid confirm + POST timeout: một POST, pending khóa gửi, giữ draft; adapter không auto retry409/timeout. |
| S06 | Adapter GET lại trạng thái REVIEWED chặn POST; browser409 giữ reason, refetch và không báo thành công. |
| S07 | Unit ngày không tồn tại/range đảo/enum/page sai; browser URL sai không gửi các request feature. |
| S08 | Unit heartbeat health0/null, numeric0, Owner count0 và boolean bắt buộc; render health0 giữ nguyên. |
| S09 | Unit chart chỉ numeric finite; text/object được đưa vào bảng, không đoán đơn vị. |
| S10 | Unit cleaning COMPLETED trang2, snapshot tối đa5trang và incomplete; không kết luận chưa vệ sinh từ trang đầu. |
| S11 | Unit PageResponse + offline X-Page/X-Page-Size/X-Has-Next; browser cleaning pagination/filter reset. |
| S12 | Browser100máy: heartbeat chỉ hàng visible; fake clock vượt max stagger960ms trước đếm. Cleaning không lặp theo heartbeat. |
| S13 | Source gate từ ACTIVE contract và activeMachineCount, nhãn ngoài phạm vi; schema giữ0. Phạm vi ACTIVE-only của server được ghi rõ; không xác minh dữ liệu lịch sử thật ngoài ACTIVE. |
| S14 | Browser CONVENTIONAL/null machineType không gọi IoT/analytics; unknown có nhãn riêng. Technician chỉ query sau lookup Smart IoT thành công. |
| S15 | Browser tabs/filter/page/deep link/reload/Back/Forward, giữ query khác. |
| S16 | Unit ngày VN sang UTC inclusive/exclusive và năm/tháng chuyển tiếp; code dùng timezone Asia/Ho_Chi_Minh thay vì browser timezone. |
| S17 | Browser390px, keyboard Enter, dialog focus/Escape trả focus, reduced motion, không page overflow; cross-role widths390/768/1023/1024/1440. |
| S18 | Browser fake-clock: hidden dừng heartbeat, visible tiếp tục; cleaning request count không đổi qua các nhịp poll. |
| S19, S20 | Browser telemetry503 không đổi kết nối ONLINE thành OFFLINE; cleaning timeout hiện lỗi, không empty/0 giả; cup API vẫn hiển thị18. Unit snapshot lỗi trang sau không giả complete. |
| S21 | Adapter/browser403 giữ state quyền, không fallback; automatic query retries tắt. Refresh-session401 với IDaaS thật: **UNVERIFIED**; dùng hạ tầng auth hiện có. |
| S22 | Unit machine/heartbeat/point/review identity mismatch và context owner/contract/machine bị từ chối trước render/POST. |
| S23 | UI ghi rõ daily bucket UTC, calendar chọn ngày VN; totalCups lấy API không cộng từ page. Bucket dữ liệu runtime thật: **UNVERIFIED**. |
| S24 | Schema started/finishedAt và flags theo DTO; render missing finishedAt là dấu—; null boolean không bị ép false mà bị schema từ chối. |
| S25 | Unit từ chối timestamp thiếuoffset/PageResponse/header lệch. GET OpenAPI server2026-11-07 có đủ8routes; authenticated response samples cho từng role: **UNVERIFIED**. |
| S27 | Unit recipeBreakdown có thể rỗng, totalCups là trường chính thức; không tự tạo category. |
| S28 | Source scan trong adapters/schema/panels/pages của feature không có console/localStorage/sessionStorage ghi token/rawhealth/private evidence; health stream IDs không được render (unit). |
| S29 | Unit Owner params strict từ chối ownerId; browser request chỉ machine/range và query key tách subject. |
| S30 | Source/network audit feature chỉ GET analytics/telemetry/review và POST review decision; không device ingest/certificate/replay/billing/penalty. |
| S31 | Unit/render connection tách health lịch sử và timestamp; OFFLINE không được mô tả health hiện tại. |
| S32 | Cleaning summary dùng “Chưa ghi nhận”, không tính compliance hoặc tạo cảnh báo vi phạm. |
| S33 | Unit decision chỉ NO_ACTION/FOLLOW_UP, body bounded; browser một POST decision, source không mutation tài chính. |
| S34 | Browser4role scope, Technician không Owner/review; Owner empty-list/ACTIVE gate được source review. Tài khoản mới0máy và grant thật: chưa live xác minh. |
| S35 | Unit adapter hỗ trợ serial resolver đúng API; route máy vẫn UUID, URL sai không mở scope. |
| S36 | Badge có text/state/role; browser quyền/error phân biệt bằng nội dung, không chỉ màu. |

Các mục **UNVERIFIED** cần môi trường và phiên test được phép tương ứng. Không xem mockJWT hay OpenAPI public là bằng chứng quyền truy cập production; chưa kết luận release-ready khi build toàn repo còn lỗi baseline.
