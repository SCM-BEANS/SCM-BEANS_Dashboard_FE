# Phase 01 — Shared history-aware back control

**ID:** `phase-01-history-aware-back-control`
**Stories:** US-01, US-02, US-04

## Objective

Tạo primitive quay lại dùng chung và một nguồn trạng thái lịch sử nội bộ đủ tin cậy để giữ thao tác Back của trình duyệt, đồng thời có fallback khi mở deep-link.

### Tests to Write First

- `tests/shared-back-navigation.test.cjs`: direct entry không có parent; route push nội bộ ghi parent; replace không tạo parent giả; malformed/external fallback bị từ chối.
- Test `BackButton` gọi hành động history-first do provider cấp và chuyển fallback chính xác khi không có parent.
- Xác nhận các test trên fail trước khi tạo helper/provider/component.

## Scope and Tasks

1. Thêm helper thuần để đọc/ghi metadata có namespace trên từng history entry, tạo ID và chuẩn hóa path cùng-origin.
2. Trong provider ở custom App, bọc `history.pushState` để entry mới ghi parent ID hiện tại; bọc `replaceState` để giữ nguyên ID/parent. Back/Forward của trình duyệt sẽ tự khôi phục metadata gắn trên entry tương ứng.
3. Tạo `BackButton` với props `label` và `fallbackHref`; gọi `router.back()` khi state hiện tại có parent Dolores; nếu không thì gọi `router.replace(fallbackHref)`. Đảm bảo fallback là path nội bộ, không nhận URL external/protocol-relative.
4. Dùng cấu trúc component/style hiện có; hiển thị icon mũi tên trái, focus-visible và vùng thao tác tối thiểu 44 px ở desktop lẫn mobile.
5. Không truy cập `window` khi SSR/render; đăng ký và dọn listener trong lifecycle đúng cách.
6. Không thêm dependency hoặc đổi router.

## Files / Modules

- `src/pages/_app.page.tsx`
- `src/components/navigation/history-entry.ts` — file mới, helper metadata và patch History API
- `src/components/navigation/in-app-history-provider.tsx` — file mới
- `src/components/navigation/back-button.tsx` — file mới
- `src/components/navigation/back-button.module.css` — file mới
- Tái sử dụng `src/components/button/button-bar.tsx` nếu không làm sai semantics của hành động back.

## Dependencies

Không có phase trước. Phase 02 và 03 phụ thuộc API của `BackButton` và history provider trong phase này.

## Acceptance / Verification

- Từ một list có query/bộ lọc, mở detail rồi bấm nút: quay lại đúng entry list trước đó; URL query được giữ.
- Mở trực tiếp detail không có route Dolores trước: fallback tới route cùng-origin đã cấu hình, không quay ra website ngoài.
- Kiểm tra luồng push → back → forward, shallow query, hard reload/deep-link và khôi phục từ bfcache để chắc tracker không lặp, dùng nhầm external entry hoặc trỏ sai.
- Màn SSR/render ban đầu không lỗi `window is not defined`; focus-visible rõ và chiều cao nút ≥44 px trên mobile/desktop.
- Dùng API Pages Router theo tài liệu Next.js [useRouter](https://nextjs.org/docs/pages/api-reference/functions/use-router); giữ App Router ngoài phạm vi.

## Risks / Notes

- Patch History API là phần rủi ro cao nhất; giữ nguyên state của Next.js, chỉ thêm metadata có namespace, và khôi phục hàm gốc khi provider unmount. Không coi `window.history.length` là bằng chứng route trước thuộc Dolores.
- TDD test các quy tắc entry/fallback trước implementation; walkthrough trình duyệt vẫn cần để xác nhận behavior của Next Router thật.
