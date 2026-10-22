# Kế hoạch: Chuẩn hóa API Dolores theo cấu trúc QLS

## Trạng thái

- Trạng thái: đề xuất; implementation chưa bắt đầu, chờ người dùng duyệt.
- Chế độ: Standard; TDD: On.
- Repo đích: `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`.
- Phạm vi: API/type modules của Dolores.
- UI/UX: không áp dụng; không thay đổi màn hình, route hay hành vi người dùng.

## Mục tiêu

Giữ API tách file theo domain như hiện tại, nhưng làm chữ ký giống phong cách QLS: khai báo rõ kiểu input và `Promise<ResponseType>`; DTO request/response được import từ các type module theo domain.

Zod tiếp tục là nguồn shape chuẩn và runtime validation. API tiếp tục dùng shared Dolores client để giữ nguyên base URL, auth/error handling, response parsing và proxy. Không đổi endpoint hoặc runtime behavior.

## Quyết định đã chốt

| Chủ đề | Hướng đã chọn |
|---|---|
| Cấu trúc | Một API module cho mỗi domain; method public có return type tường minh. |
| DTO | Tạo `src/types/dolores/<domain>.ts`; API và consumers lấy DTO từ đó. |
| Nguồn type | Derive bằng `z.infer<typeof ...Schema>`; không viết thêm handwritten interface trùng với Zod. |
| HTTP | Giữ `requestDolores`, `requestDoloresBlob`, schemas, auth/error handling và proxy. Không chuyển sang gọi Axios trực tiếp như QLS vì Dolores client đang thực hiện runtime validation và đã được chọn trong kế hoạch tích hợp Moderator. |
| Contract | Giữ nguyên HTTP method, path, params/body, ID validation, response transformation và errors. Không thêm endpoint. |
| Request DTO | Giữ body DTO hiện có, gồm `RecipePublishRequest`; các ID/query/scalar input giữ dạng primitive khi phù hợp. |

## Baseline

- Đã có 12 API modules theo domain trong `src/apis/dolores`.
- Return types phần lớn đang được TypeScript suy luận từ schema truyền vào `requestDolores`, nên chữ ký API chưa hiển thị rõ `Promise<T>`.
- Runtime schemas nằm ở `src/schemas/dolores`; nhiều schema đã có type aliases suy luận. API consumers, hooks và một số Admin/Moderator screens đang import các aliases trực tiếp từ schema files.
- Notification unread count và maintenance schedule đang có response schema nhưng chưa có named type alias.
- Dùng TypeScript strict, alias `@/*`, Zod; chưa có OpenAPI type generation hay test script trong package scripts. Regression tests chạy bằng `node --test tests/*.test.cjs`.
- Kế hoạch Moderator API integration trước đó đã chọn dùng chung Dolores client/schemas/hooks. Plan này chỉ chuẩn hóa cách tổ chức và khai báo types.

## Cấu trúc đích

```
src/
  apis/dolores/
    alerts.api.ts
    billing.api.ts
    buybacks.api.ts
    contracts.api.ts
    dashboard.api.ts
    installationWorkOrders.api.ts
    locations.api.ts
    machines.api.ts
    notifications.api.ts
    recipes.api.ts
    telemetry.api.ts
    tenants.api.ts
    client.ts                    # giữ nguyên
  schemas/dolores/               # runtime schemas/helpers
  types/dolores/
    billing.ts
    buybacks.ts
    contracts.ts
    dashboard.ts
    installationWorkOrders.ts
    locations.ts
    machines.ts
    notifications.ts             # gồm Notification và Alert
    recipes.ts
    telemetry.ts
    tenants.ts
```

Các module trong `types/dolores` export named aliases suy ra từ schema. Chuyển type aliases ra khỏi schema modules và migrate type-only imports trong APIs, hooks và components. Schema values, ID validators và runtime helpers (ví dụ `unwrapLocations`) vẫn thuộc `schemas/dolores`.

## Phạm vi

**Bao gồm:** type modules theo domain; bổ sung alias còn thiếu cho unread count và maintenance schedule; chuyển các type-only imports đang trỏ vào schema; khai báo input/return types cho tất cả methods trong 12 API modules; compile-time contract fixture; regression, lint, typecheck và review diff.

**Không bao gồm:** đổi endpoint, request/response contract, quyền backend, client/auth/interceptors/proxy, query keys hoặc hook behavior; UI/routes; mutation mới; codegen hay dependency mới; tiếp tục các phase của `moderator-api-integration.md`.

## Phases

### Phase 1 — DTO modules theo domain

**Kết quả:** các DTO công khai có đường dẫn thống nhất dưới `src/types/dolores`, suy ra từ Zod schemas.

**Files/phạm vi:** thêm type modules, chuyển `z.infer` aliases khỏi `schemas/dolores`, bổ sung hai alias còn thiếu và cập nhật các type-only imports tại API/hooks/screens. Giữ nguyên runtime schema values và helpers.

**TDD/verification:** trước implementation, thêm compile-time type-surface fixture dưới `tests` để import DTO từ `@/types/dolores` và gán vào expected types. Chạy `node_modules/.bin/tsc.cmd --noEmit` (fixture phải fail trước khi types tồn tại, rồi pass sau migration) và `node --test tests/*.test.cjs`.

**Acceptance:** mọi API DTO có named export; không có bản interface trùng lặp; không còn type-only imports từ schema modules; runtime schema imports/validation và response transformations không đổi.

**Gate:** không sang Phase 2 nếu typecheck/tests fail, xuất hiện circular imports, hoặc phải thay runtime behavior/schema contract. Sửa trong phạm vi hoặc dừng để review.

### Phase 2 — Chữ ký tường minh kiểu QLS

**Kết quả:** mọi public method trong alerts, billing, buybacks, contracts, dashboard, installation work orders, locations, machines, notifications, recipes, telemetry và tenants khai báo input và `Promise<T>`; DTOs dùng `import type`.

**Kiểu cần thể hiện:** response list/single DTO tương ứng; `Blob` cho document/proof download; kiểu sau unwrap cho location list; và typed request body cho recipe publish. Các contract/machine identity checks hiện có tiếp tục giữ nguyên.

**Acceptance:** tất cả method có return annotation tường minh; list/single/Blob/transformed results được khai báo theo giá trị caller thật sự nhận; URL, method, params, body, UUID validation, response checks và error mapping không thay đổi.

**Verification/gate:** chạy `tsc --noEmit` và regression suite. Review từng module với baseline; mọi diff ngoài type declarations/imports là stop-and-review condition.

### Phase 3 — Regression, review, handoff

**Checks:** `node_modules/.bin/tsc.cmd --noEmit`, `npm run lint`, `node --test tests/*.test.cjs`, `git diff --check`. Production build chỉ chạy khi không có Next dev server dùng chung `.next`; không dừng server của người dùng. Browser/E2E không bắt buộc vì không đổi UI hoặc request behavior.

**Review gate:** read-only review tập trung vào schema/type drift, API response typing, imports, endpoint invariance và phạm vi diff. Kết thúc khi acceptance criteria đều đạt hoặc ghi lại blocker kèm bằng chứng.

## Rủi ro và boundaries

- DTO drift: tránh handwritten duplicates; Zod remains the canonical shape source and typecheck verifies consumers.
- Import lẫn lộn: DTOs lấy từ `types/dolores`; runtime schema values/helpers lấy từ `schemas/dolores`.
- Màn hình Admin/Moderator bị ảnh hưởng: chỉ đổi type imports, không sửa JSX/state/behavior.
- Git metadata có dấu hiệu bất thường lúc lập plan: `git status --short` từng báo không ở work tree trong khi `rev-parse` nhận diện work tree. Trước lần sửa đầu, xác nhận đúng checkout và baseline diff; nếu không tách được thay đổi sẵn có thì dừng trước khi ghi source.
- Build dùng chung `.next`: kiểm tra trạng thái dev server trước; TypeScript, lint và regression tests vẫn là checks bắt buộc.

## Điều kiện bắt đầu

Chỉ bắt đầu sửa source sau khi người dùng duyệt plan này. Phạm vi được giới hạn vào các phase ở trên; nếu cần thay client/auth, endpoint, API behavior hoặc UI thì dừng và xin quyết định mới.
