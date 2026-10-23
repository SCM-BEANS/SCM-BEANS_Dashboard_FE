# Kế hoạch: Hiển thị Machine Body 3D trong chi tiết máy Admin

## Routing contract

- **Phase:** plan
- **Domain:** frontend
- **Capability:** `frontend/fe-architecture`, `frontend/fe-ui`
- **Workspace:** `C:\GIT\SCM-BEANS_Dashboard_FE`
- **Branch:** `sơn`
- **Side effect của kế hoạch:** chỉ ghi artifact kế hoạch vào workspace; chưa cấp phép chỉnh product code trong bước này.
- **Verification dự kiến:** TypeScript, lint, diff check, route smoke test và browser/manual UI check nếu môi trường browser khả dụng.

## Mục tiêu

Trong trang `/admin/machines/{id}`, panel **“Mô hình máy”** của máy Smart IoT phải hiển thị machine body 3D thật đang được dùng ở `/digital`, thay cho ảnh tĩnh. Giai đoạn này chỉ đưa body model vào trang, giữ lại các khả năng đã có của viewer: loading, ready, lỗi/retry, zoom và reset camera.

Không bật hiệu ứng cà phê, hiệu ứng nước hoặc chuyển động máy nén trong bước đầu này.

## Quyết định đã xác nhận

- **Ranh giới code:** tái sử dụng `BodyModelViewer` hiện có trong `src/components/features/digital-twin/`; không copy loader Three.js/R3F sang phần Admin.
- **Ranh giới route:** giữ route App Router hiện tại `/admin/machines/[machineId]`; route chỉ compose màn hình, không tự xử lý Three.js.
- **Phạm vi máy:** chỉ panel chi tiết của Smart IoT dùng body model. Màn hình máy thường giữ nội dung thông tin hợp đồng/lịch sử, không ép hiển thị model 3D.
- **UX:** dùng viewer body-only với zoom, reset, loading và retry sẵn có. Không thêm control hay animation mới.
- **Asset/data:** dùng model local hiện có `/models/digital-twin/body/coffee_machine_03_v2.glb`; không thêm API, telemetry, WebSocket, MQTT hay dữ liệu máy thật.
- **Hiện trạng cần lưu ý:** worktree đang có các thay đổi chưa commit từ phần clone UX Admin machines. `AdminMachineDetailScreen.tsx` đã có một tích hợp `BodyModelViewer` từ lượt trước; khi thực thi phải rà soát và hoàn thiện trên thay đổi hiện có, không ghi đè thay đổi không liên quan.

## So sánh phương án

| Phương án | Đánh đổi | Kết quả |
| --- | --- | --- |
| Tái sử dụng `BodyModelViewer` và `BodyModelCanvas` | Ít code mới, giữ cùng loader/lifecycle/controls với `/digital`; Admin phụ thuộc vào feature digital-twin đã ổn định | **Chọn** — đúng kiến trúc hiện tại và yêu cầu của người dùng |
| Copy viewer/Three.js vào `AdminMachineDetailScreen` | Có thể tùy biến nhanh nhưng tạo duplicate loader, cleanup và UI state; dễ lệch hành vi với `/digital` | Loại — tăng chi phí bảo trì và rủi ro hydration/WebGL |
| Nhúng `/digital` bằng iframe hoặc mở route khác | Tái sử dụng được UI nhưng phá layout Admin, navigation và kiểm soát lifecycle | Loại — không phù hợp trải nghiệm detail route |

## Cấu trúc frontend và ranh giới trách nhiệm

### Cây liên quan hiện tại

```text
src/app/(admin)/admin/machines/page.tsx
  # route danh sách /admin/machines
src/app/(admin)/admin/machines/[machineId]/page.tsx
  # route chi tiết, nhận machineId và compose màn hình
src/components/dolores/AdminMachineScreens.tsx
  # UX danh sách máy/tồn kho và các view legacy
src/components/dolores/AdminMachineDetailScreen.tsx
  # composition/detail data của Admin machine detail
src/components/features/digital-twin/BodyModelViewer.tsx
  # client wrapper, viewer state, controls, loading/error/retry
src/components/features/digital-twin/BodyModelCanvas.tsx
  # R3F canvas, GLTF/DRACO loading, camera và scene lifecycle
public/models/digital-twin/body/coffee_machine_03_v2.glb
  # model body local
```

### Ranh giới sau khi thực thi

- `src/app/(admin)/admin/machines/[machineId]/page.tsx` chỉ giải mã `machineId` và render `AdminMachineDetailScreen`.
- `AdminMachineDetailScreen` sở hữu layout nghiệp vụ Admin và quyết định Smart IoT/standard; nó không sở hữu `Canvas`, `GLTFLoader`, `OrbitControls` hay vòng render.
- `BodyModelViewer` sở hữu trạng thái client: loading, ready, error, retry, zoom và reset.
- `BodyModelCanvas` sở hữu Three.js/R3F, model URL, decoder local, camera fit và cleanup.
- `DoloresUI`/`DoloresShell` chỉ cung cấp primitive/layout; không import ngược digital-twin feature.
- Không tạo thêm `shared`, `utils`, registry model hoặc route mới vì hiện chưa có ownership cần thiết.

### Dependency direction

```text
Admin route
  -> AdminMachineDetailScreen
      -> DoloresShell / DoloresUI
      -> features/digital-twin/BodyModelViewer
          -> BodyModelCanvas
              -> React Three Fiber / Three.js / local public asset
```

Không cho phép route hoặc Dolores primitive gọi trực tiếp browser WebGL API. `BodyModelViewer` đã là client component và canvas được dynamic import với `ssr: false`, nên giữ nguyên boundary này.

## Phase 1 — Hoàn thiện tích hợp viewer vào detail route

**Outcome:** `/admin/machines/[machineId]` của Smart IoT render đúng machine body 3D trong panel “Mô hình máy”, không còn ảnh tĩnh.

**Scope:** rà soát tích hợp hiện có; bỏ import/render `next/image` và `coffee-machine-float.png` trong panel model; dùng `<BodyModelViewer />` với props mặc định body-only; giữ panel, tiêu đề và layout Admin; giữ nguyên nhánh máy thường, unknown machine và các panel nghiệp vụ khác.

**Không thuộc scope:** sửa model GLB, sửa loader Three.js, bật compressor/coffee/water effects, thêm API/telemetry, thay đổi route `/digital`, hoặc refactor toàn bộ design system.

**Dependencies:** `BodyModelViewer` và `BodyModelCanvas` hiện có; asset local và decoder local hiện có; route `[machineId]` đã tồn tại.

**Implementation boundary / affected components:** chủ yếu `src/components/dolores/AdminMachineDetailScreen.tsx`; chỉ sửa `BodyModelViewer.tsx`/`BodyModelCanvas.tsx` nếu kiểm tra cho thấy lỗi tích hợp cụ thể. Không tạo viewer thứ hai.

**Side effects:** route detail trở thành client-interactive thông qua component con; trình duyệt tải GLB và cấp phát GPU khi Smart IoT detail được mở. Không tạo request backend mới.

**Verification:** kiểm tra import graph; tìm không còn `coffee-machine-float.png` trong panel detail; chạy `npx tsc --noEmit`; mở `/admin/machines/S-018` và `/admin/machines/S-022`; kiểm tra HTML/console không có lỗi render server.

**Acceptance criteria:**

- `/admin/machines/S-018` và `/admin/machines/S-022` hiển thị panel model chứa canvas body 3D.
- Không còn ảnh tĩnh trong panel “Mô hình máy”.
- Machine body dùng đúng asset `/models/digital-twin/body/coffee_machine_03_v2.glb` thông qua viewer dùng chung.
- `/admin/machines/C-031` vẫn hiển thị detail máy thường, không bị ép mount body viewer.
- `/digital` không bị thay đổi behavior.

**Entry condition:** quyết định kiến trúc và UX đã được người dùng xác nhận; các thay đổi clone UX hiện tại đã được đọc và giữ nguyên.

**Exit condition:** route compile được và body viewer mount đúng ở Smart IoT detail mà không làm hỏng nhánh standard/unknown.

**Risks / response:** import client viewer trong Server Component có thể gây lỗi build/hydration nếu phá boundary; giữ component boundary hiện tại và dùng dynamic canvas sẵn có. Nếu model không load, kiểm tra asset/decoder trước khi sửa dependency.

**Approval / stopping gate:** dừng và báo người dùng nếu cần thay đổi Three.js/R3F version, sửa GLB, thêm model asset, hoặc thay đổi hành vi `/digital`.

**Review gate:** read-only review xác nhận không có duplicate viewer, không có API mới, không có ảnh tĩnh còn sót trong panel, và không thay đổi unrelated Admin UX.

## Phase 2 — Xác nhận UI/UX và lifecycle của viewer

**Outcome:** người dùng có trải nghiệm body model nhất quán với `/digital` trong detail route trên desktop và viewport hẹp.

**Scope:** xác nhận hierarchy `Mô hình máy` → mô tả → viewer; loading overlay; ready status; zoom in/out; reset camera; disabled state khi chưa ready; error message và retry; camera không rotate/pan theo cấu hình hiện tại; panel không chạy hiệu ứng cà phê/nước/compressor.

**Không thuộc scope:** thiết kế lại viewer, thêm animation, bật tab hoặc route con cho model, đồng bộ trạng thái máy thật, hoặc thêm hành động nguy hiểm/điều khiển thiết bị.

**Dependencies:** Phase 1 exit; browser/runtime có thể mở local app. Nếu browser connector không khả dụng, dùng route smoke test và source evidence, ghi rõ phần visual chưa xác minh.

**Implementation boundary / affected components:** ưu tiên không sửa code; nếu có lỗi layout thì chỉ chỉnh wrapper/layout trong `AdminMachineDetailScreen.tsx`, không sửa generic Dolores primitives. Chỉ chỉnh viewer feature khi lỗi thuộc lifecycle hoặc accessibility dùng chung.

**Side effects:** không thêm state nghiệp vụ; zoom/reset chỉ là state cục bộ trong viewer. Khi rời route, viewer phải cleanup theo lifecycle hiện có.

**Verification:**

- Mở các route `/admin/machines/S-018`, `/admin/machines/S-022` và tải lại trực tiếp.
- Kiểm tra loading → ready; zoom và reset; xác nhận rotate/pan bị tắt.
- Nếu asset lỗi, kiểm tra overlay lỗi và nút retry có thể phục hồi.
- Kiểm tra `/admin/machines/C-031` không mount viewer.
- Kiểm tra desktop và viewport hẹp không làm tràn panel/control.
- Kiểm tra network chỉ tải asset local và decoder local; không có request BE/IoT.

**Acceptance criteria:**

- Controls có accessible name, focus rõ và disabled đúng trước khi model ready.
- Loading/error/retry có status/alert quan sát được và không làm vỡ phần còn lại của detail page.
- Model nằm trong panel, không bị cắt nghiêm trọng hoặc che các control.
- Không thể hiểu nhầm viewer là điều khiển máy vật lý; đây chỉ là model local.
- Route standard và navigation “Về danh sách máy” vẫn hoạt động.

**Entry condition:** Phase 1 route integration passes typecheck and direct-route smoke test.

**Exit condition:** UI states and responsive behavior pass manual checks, hoặc các giới hạn môi trường browser được ghi rõ.

**Risks / response:** canvas nặng trên thiết bị yếu hoặc panel quá cao; giữ sizing của viewer hiện có, không tăng thêm effects, và kiểm tra viewport hẹp. Nếu loading state che sai layout, sửa wrapper cục bộ thay vì đổi shared shell.

**Approval / stopping gate:** dừng nếu người dùng muốn thêm compressor/effects, thay đổi camera behavior, hoặc đưa model vào các loại máy thường; đó là scope/UI decision mới.

**Review gate:** review tập trung vào keyboard/focus, loading/error/retry, responsive layout, camera constraints và việc không mount thừa canvas.

## Phase 3 — Verification và handoff

**Outcome:** có bằng chứng đủ cho việc tích hợp body model vào Admin machine detail và bàn giao thay đổi rõ ràng.

**Scope:** chạy `npx tsc --noEmit`, `npm.cmd run lint`, `git diff --check`; chạy dev server và smoke test `/admin/machines`, `/admin/machines/S-018`, `/admin/machines/S-022`, `/admin/machines/C-031`, route unknown; review diff và asset references; ghi nhận build limitation nếu Next build không tải được Google Fonts trong môi trường hiện tại.

**Không thuộc scope:** sửa 5 lint warning cũ ngoài phạm vi, giải quyết network/fonts ngoài thay đổi này, commit/push/deploy, hoặc xử lý các plan digital-twin cũ chưa hoàn tất.

**Dependencies:** Phase 1 và Phase 2 review gates pass; không có process dev server còn sót trước khi handoff.

**Implementation boundary / affected components:** chỉ verification; defect quay về phase sở hữu. Không revert các thay đổi người dùng hoặc thay đổi clone UX không liên quan.

**Side effects:** có thể tạo `.next` cache và log dev; không xóa dữ liệu unrelated.

**Verification evidence cần ghi:**

- command và exit code của TypeScript/lint/diff check;
- HTTP status và marker của các route;
- kết quả model asset/decoder local;
- visual/runtime gaps nếu không có browser connector;
- danh sách file cuối cùng và xác nhận không có product code ngoài scope.

**Acceptance criteria:**

- TypeScript pass, lint không có error, diff check pass.
- Các route detail không trả 500 do import viewer.
- Model body 3D được dùng thay ảnh tĩnh trong Smart IoT detail.
- Không thêm backend/data integration và không làm thay đổi `/digital`.
- Handoff ghi rõ warning cũ hoặc build limitation nếu có.

**Entry condition:** Phase 2 đã hoàn tất hoặc các gap được người dùng chấp nhận bằng văn bản.

**Exit condition:** evidence được ghi lại, không còn lỗi in-scope nghiêm trọng, và chưa có commit/push nếu người dùng chưa yêu cầu.

**Risks / response:** dev server/browser không khả dụng hoặc build bị chặn bởi network; dùng typecheck, lint, source inspection và route evidence gần nhất, không tuyên bố visual pass khi chưa nhìn thấy runtime.

**Approval / stopping gate:** dừng nếu route trả 500, model/decoder không tải được, hoặc cần mở rộng sang effects/physical control.

**Review gate:** final diff review xác nhận dùng chung `BodyModelViewer`, chỉ Smart IoT render body model, standard/unknown vẫn an toàn, và không có dependency direction violation.

## Deferred work

- Bật chuyển động máy nén hoặc hiệu ứng cà phê/nước trong Admin detail.
- Ghép body với các cụm cơ khí khác hoặc tạo model assembly hoàn chỉnh.
- Gắn telemetry/live machine data hoặc điều khiển thiết bị thật.
- Thiết kế model viewer riêng cho máy thường.

## Approval status

- Kiến trúc: **đã xác nhận bởi người dùng** — reuse `BodyModelViewer`.
- UI/UX phase đầu: **đã xác nhận bởi người dùng** — body-only, zoom/reset/loading/retry, chưa bật effects/motion.
- Kế hoạch: chờ người dùng cho phép chuyển sang execution skill (`s-run`/`s-cook`) ở lượt tiếp theo.
