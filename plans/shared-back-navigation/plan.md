# Plan: Điều hướng quay lại dùng chung

**Date:** 2026-10-27
**Mode:** Hard
**Risk:** normal — thay đổi điều hướng UI đa vai trò, không sửa xác thực, dữ liệu hay API.
**Test mode:** `--tdd` (user override trong lệnh cook)
**Tasks:** checklist trong file này
**Project root:** `E:/Đồ án/SCM-BEANS_Dashboard_FE` (git root; không có `.skills.json`)

## Scope Challenge

- **Exists?** Có các link/nút quay lại rải rác trong `moderator-shell`, một số màn customer dashboard, technician và admin; `AdminBreadcrumb` chỉ hiển thị breadcrumb. Hành vi chưa đồng nhất và có màn thiếu nút.
- **Minimum?** Một `BackButton` dùng chung, bộ theo dõi lịch sử nội bộ của Next.js, fallback do từng màn hình cấu hình, rồi tích hợp vào các màn chi tiết/workflow có màn cha rõ ràng. Không tự thêm nút vào mọi route gốc.
- **Complexity?** Hard — cần quản lý lịch sử Back/Forward, fallback deep-link, nhiều kiểu route và bốn vùng vai trò.
- **Tests:** TDD được bật theo lệnh người dùng chọn; viết test đỏ trước code ở từng phase.
- **Tasks:** checklist trong `plan.md`.

## Spec Quality Check

- **[NEEDS CLARIFICATION]:** không còn mục cần người dùng quyết định; spec giới hạn phạm vi vào màn có parent rõ và yêu cầu ánh xạ fallback khi kiểm kê route.
- **Success criteria:** định lượng theo 100% route thuộc phạm vi, 0 điều hướng ra ngoài ứng dụng, 44 px tối thiểu.
- **User stories:** có P1/P2 và mã US-01 đến US-04.
- **Acceptance criteria:** kiểm chứng được bằng luồng list → detail, deep-link, kiểm tra nút trùng và kích thước/focus.

**Verdict: PASS**

## Research

**Execution note:** theo bảng host compatibility của Codex, researcher/planner/reviewer được chạy inline tuần tự thay vì subagent.

### Primary — Lịch sử nội bộ dùng chung, BackButton có fallback rõ

**Verdict:** recommended — khớp với hành vi người dùng yêu cầu và giữ được entry danh sách trước đó.

- Repo dùng Next.js Pages Router. `src/pages/_app.page.tsx` là custom App chạy xuyên route và hiện chỉ bọc `QueryClientProvider`; đây là điểm phù hợp để đăng ký bộ theo dõi điều hướng dùng chung.
- Next.js xác nhận `router.back()` tương đương nút Back của trình duyệt (`window.history.back()`). Custom App là nơi phù hợp để cài provider tồn tại giữa route changes. Tham khảo [useRouter — Pages Router](https://nextjs.org/docs/pages/api-reference/functions/use-router) và [Custom App](https://nextjs.org/docs/pages/building-your-application/routing/custom-app).
- `BackButton` nhận `fallbackHref` tường minh. Provider đánh dấu các entry cùng-origin trên History API; dùng `router.back()` khi current entry có parent Dolores đã đánh dấu. Direct entry không có parent dùng `router.replace(fallbackHref)` để tránh vòng detail → list → detail. Không suy ra danh sách cha bằng cách cắt URL và không dùng `history.length` làm bằng chứng duy nhất.
- Không cần dependency mới. Có thể dùng `ButtonBar`/lucide icon hiện có, nhưng cần bảo đảm chiều cao 44 px kể cả breakpoint hiện tại giảm nút xuống 40 px.

**Rủi ro:** provider bọc History API nên phải giữ nguyên state Next.js và chỉ gắn metadata có namespace. Back/Forward dùng lại metadata trên đúng entry; fallback phải cùng origin; shallow query views cần giữ query/bộ lọc.

### Alternative — Link tĩnh về trang cha

**Verdict:** viable with caveats — rất ổn định với deep-link, nhưng không đáp ứng yêu cầu quay về đúng thao tác trước.

- Từng trang dùng `Link` hoặc `ButtonBar href={parent}`. Dễ đọc, không cần theo dõi lịch sử, và không thể đưa người dùng ra site ngoài.
- Đổi lại, thao tác luôn tạo lại route cha; có thể mất entry list cụ thể, query/bộ lọc và trạng thái cuộn. Repo hiện đã có kiểu này ở nhiều nơi nên giữ nguyên không khắc phục cảm giác thiếu nút và hành vi không đồng nhất.
- Suy luận parent tự động từ URL còn rủi ro hơn vì `/new`, `/detail`, workflow nhiều bước và query-state không cùng một quy tắc phân cấp.

## Proposed Approach

Triển khai phương án history-first theo spec. Bộ theo dõi điều hướng nằm trong custom App, `BackButton` là primitive dùng chung trong `src/components/navigation`, còn từng route/workflow cấu hình `label` và fallback. Đặt nút nhất quán ở đầu vùng nội dung, sát phía trên tiêu đề; giữ action bar cho thao tác nghiệp vụ và gỡ link quay lại cũ để mỗi màn chỉ có một nút.

Màn thuộc phạm vi: detail/workflow của customer dashboard và technician catch-all; moderator customer/contract/entity details và nested workflows; admin machine detail cùng business/store detail views có trạng thái query. Trang root/list không có màn cha sẽ không tự có nút.

### UX Decisions Confirmed by User — 2026-10-27

- Deep-link detail không có lịch sử Dolores trước đó dùng fallback về danh sách cha.
- Nút nằm phía trên tiêu đề màn hình.
- Quay lại giữ nguyên bộ lọc/phân trang và trạng thái danh sách vừa rời.

## Phase Index

1. `phase-01-history-aware-back-control` — primitive và lịch sử điều hướng nội bộ.
2. `phase-02-customer-technician-integration` — customer dashboard và technician routes.
3. `phase-03-moderator-admin-integration` — moderator và admin details/workflows.
4. `phase-04-cross-role-validation-accessibility` — rà phủ route, loại nút trùng, kiểm chứng đa vai trò.

## Risks and Decisions

- **HIGH:** metadata entry bị mất hoặc patch History API sai có thể khiến back lặp, forward sai hoặc dùng fallback không cần thiết. Phase 01 phải kiểm chứng pushState, Back, Forward, replaceState và direct entry trước khi tích hợp diện rộng.
- **HIGH:** màn hình stateful dùng shallow query (admin businesses/stores) có thể mất filter/page nếu fallback hoặc entry xử lý sai. Giữ query khi quay lại entry trước; direct link fallback về list cùng route.
- **MEDIUM:** shell và page cùng render nút. Mỗi route chỉ chọn một chủ sở hữu UI; gỡ hành động cũ trong cùng phase tích hợp.
- **MEDIUM:** Pages Router có SSR. Không truy cập `window` trong render phía server; khởi tạo route tracker trong effect.
- **MEDIUM:** TDD kiểm tra helper metadata, quy tắc push/replace và fallback; Phase 01 và 04 vẫn yêu cầu walkthrough Back/Forward, direct-entry, bfcache và query-state để kiểm tra hành vi trong trình duyệt thật.
- **Decision:** không thêm thư viện, không chuyển App Router, không tự động hiển thị nút trên mọi route lồng nhau.
- **Decision:** direct-entry fallback dùng `router.replace`, tránh để nút danh sách đưa người dùng trở lại detail vừa fallback.
- **Rollback:** nếu điều hướng sai, revert provider/BackButton và các tích hợp route để khôi phục link hiện có; không có migration hoặc dữ liệu bền cần rollback.

## Red-Team Review

**Verdict:** WARN (không có CRITICAL; Hard mode cần người dùng xem xét trước khi triển khai).
**Score:** 9.7 = 10 - (0 x CRITICAL) - (0 x HIGH) - (1 x MEDIUM 0.3) - (0 x LOW)

- **MEDIUM — `phase-01-history-aware-back-control.md`:** bộ điều hướng Back/Forward có nhiều trạng thái. **MITIGATION:** theo lựa chọn `--tdd`, Phase 01 có automated tests cho entry metadata, push/replace và fallback; walkthrough trình duyệt vẫn xác nhận tích hợp với Next Router.

## Phase Tracking

- `feature_list.json`: 4 phase mới đã được thêm theo phase ID; Phase 01 có automated evidence, các phase sau vẫn chưa bắt đầu.

## Session Notes — Phase 01

- TDD red: `tests/shared-back-navigation.test.cjs` được chạy trước khi tạo helper và thất bại vì module chưa tồn tại.
- TDD green: 6/6 test của Phase 01 pass; chúng kiểm tra direct-entry, push/back/forward, replace, fallback nội bộ, accessibility target và SSR.
- `npm.cmd run lint` và `npx.cmd tsc --noEmit --incremental false` pass.
- Full suite hiện có 135 test: 89 pass, 46 fail. Nhiều test fail vì test cũ tham chiếu các module không có trong checkout; không thay đổi các domain đó trong Phase 01.
- Không chạy production build vì dev server đang hoạt động tại `localhost:3000`; tránh thao tác vào `.next` đang được phiên local dùng. Browser walkthrough Back/Forward với Next Router thật sẽ được làm sau khi các route có nút ở Phase 02–04.
- Phase 01 đã triển khai và chờ người dùng duyệt trước khi tiếp tục theo chế độ `--hard`.
- Người dùng đã duyệt Phase 01 và yêu cầu tiếp tục Phase 02.

## Session Notes — Phase 02

- TDD red: `tests/customer-technician-back-navigation.test.cjs` ban đầu fail 6/6 khi descriptor và screen chưa có metadata/nút quay lại.
- TDD green: test Phase 02 pass 6/6; test kết hợp Phase 01 + 02 pass 12/12.
- Mapping được kiểm tra cho customer contracts, machines, invoices, menu, support, buyback, notifications; technician tasks, substitute workflow, maintenance history và machine-history detail.
- `npm.cmd run lint` và `npx.cmd tsc --noEmit --incremental false` pass. GET smoke cho `/dashboard`, customer machine detail, `/technician/tasks` và technician history detail đều trả HTTP 200.
- Full suite hiện 141 test: 95 pass, 46 fail. Đây là cùng 46 lỗi đã thấy ở Phase 01, ngoài phạm vi Phase 02; không phát sinh lỗi mới theo số liệu chạy lại.
- Không chạy production build do dev server tại `localhost:3000` đang hoạt động. Chưa thao tác browser Back/Forward trên session đăng nhập; kết quả browser walkthrough sẽ được xác nhận sau khi hoàn tất route integration.
- Phase 02 đã triển khai và chờ người dùng duyệt trước khi tiếp tục theo chế độ `--hard`.

## Checklist

- [x] Phase 01 - Shared history-aware back control (approved)
- [x] Phase 02 - Customer and technician integration (approved)
- [x] Phase 03 - Moderator and admin integration (approved by user)
- [x] Phase 04 — Cross-role coverage and accessibility validation (approved by user)

## Session Notes - Phase 03

- TDD red: `tests/moderator-admin-back-navigation.test.cjs` failed before the route helpers and UI integration existed.
- TDD green: Phase 03 tests pass 5/5; combined Phase 01-03 tests pass 17/17.
- Moderator history-first BackButton now sits before nested/detail headings for customers, contracts, machines, IoT, invoices, recipes, technical requests, machine history, buyback, and alerts. Root/list screens stay without a back button; section actions remain on root lists. Duplicate detail links were removed.
- Admin machine detail keeps IoT and refresh actions in the action bar. Businesses and stores use query-preserving list fallbacks for direct detail entry; create Cancel actions are unchanged.
- `npm.cmd run lint` and `npx.cmd tsc --noEmit --incremental false` pass. Local route smoke requests returned HTTP 200.
- Full suite: 100/146 pass and 46 fail; the 46 failures match the existing baseline failures from Phase 01/02.
- Browser walkthrough was attempted in the existing local Admin session, but client navigation reached the forbidden screen. The tab URL was restored; interactive history behavior remains unverified.
- The user approved Phase 03 on 2026-10-27 and asked to continue to Phase 04.

## Session Notes - Phase 04

- TDD red: `tests/back-navigation-coverage.test.cjs` failed before the missing Admin destinations and shared headings were added.
- TDD green: coverage test 3/3; combined shared, customer/technician, moderator/admin, and coverage tests 20/20.
- Completed Admin back coverage for contract create/detail/history, machine create/detail, store create, IoT Owner detail, and menu create. List roots remain without back controls; duplicate cancel/list actions were removed from nested views.
- Admin machine status filters and IoT owner pagination are represented in route queries, so browser Back/Forward and deep-link fallbacks can restore the same parent list state.
- `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false`, and an isolated production build pass. The isolated build used a temporary `distDir`; it was removed afterward. The running development server at `localhost:3000` remained available.
- Full suite: 103/149 pass and 46 fail. Those 46 match the existing baseline failures recorded in prior phases; all 20 navigation tests pass.
- Read-only code review returned 10.0 with 0 CRITICAL, 0 HIGH, 0 MEDIUM, and 0 LOW findings. Manual interactive role walkthrough remains unverified because the available Admin browser session reached the forbidden screen; no credentials were supplied or used.
- The user approved Phase 04 on 2026-10-27. Implementation and automated checks are complete; the interactive browser walkthrough remains unverified.
