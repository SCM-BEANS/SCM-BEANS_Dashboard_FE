# Plan: Nối cơ cấu cụm 3 theo dữ liệu CAD SolidWorks

## 1. Mục tiêu

Xây dựng lại cơ cấu chuyển động của cụm 3 trong Dashboard bằng dữ liệu có thẩm quyền từ thư mục:

    C:/FPT/3D/Coffee_Machine_V3/Coffee_Machine_V3/He01_ThietBiBenTrong/ThietBiCafe/may_nenv2

Mục tiêu cuối cùng là các chi tiết trong final.glb và các model chuyển động liên quan:

- nằm đúng hệ tọa độ của cụm;
- được nối đúng parent/child, pivot, trục và điểm tham chiếu;
- chạy theo đúng Sketch, mate hoặc quan hệ hình học tương ứng trong SolidWorks;
- không còn phụ thuộc vào offset hoặc đường dẫn hình học viết tay trong component React;
- có thể kiểm tra từng chi tiết độc lập trước khi nối sang chi tiết kế tiếp.

Đây là plan, chưa chỉnh code sản phẩm, chưa di chuyển hoặc xóa asset hiện có, và chưa push Git.

## 2. Ràng buộc đã ghi nhận

- Làm chậm, chắc, nối từng phần một.
- Quy tắc này áp dụng cho toàn bộ 18 chi tiết trong Final.SLDASM, không chỉ oc_left và oc_right.
- Sau mỗi chi tiết phải có checkpoint: vị trí ban đầu, pivot, quan hệ nối, chuyển động, hồi vị và ảnh hưởng lên các chi tiết đã nối trước đó.
- Nếu một chi tiết chưa khớp thì dừng tại chi tiết đó; không dùng offset tạm để tiếp tục.
- File nối và manifest của cụm 3 phải nằm trong khu vực riêng của cụm 3, không dùng chung với cụm 1 hoặc cụm khác.
- Không sửa file CAD nguồn.
- Không đưa SLDPRT/SLDASM vào public runtime; chỉ đưa các artifact đã trích xuất cần thiết cho web.
- Không mở rộng sang Backend, IoT, điều khiển máy thật hoặc các cụm khác.

## 3. Design gate và quyết định kiến trúc

### 3.1. Những gì đã kiểm tra

Thư mục CAD có:

- Final.SLDASM;
- body_may.SLDPRT;
- 17 file SLDPRT của các chi tiết còn lại, tổng cộng 18 file SLDPRT;
- body_may.glb và final.glb;
- bản ZIP của thư mục nguồn.

Repo hiện có:

- DigitalTwinWorkspace để chọn tab cụm;
- DigitalTwinClusterViewer làm host chung cho viewer;
- DigitalTwinClusterCanvas đang nạp final.glb của cụm 3;
- logic cam hiện tại còn chứa tọa độ Sketch và offset viết trực tiếp trong component;
- module assembly riêng của cụm 1 tại src/components/features/digital-twin/assembly;
- các thay đổi chưa commit của người dùng trong DigitalTwinClusterCanvas.tsx, DigitalTwinClusterViewer.tsx, DigitalTwinWorkspace.tsx, translations.ts và asset cluster-03. Các thay đổi này phải được giữ nguyên và kiểm tra trước khi chạm vào cùng khu vực.

### 3.2. Kiến trúc được dùng trong plan

Giữ viewer chung, nhưng tách dữ liệu và logic cụm 3:

~~~text
src/components/features/digital-twin/
  DigitalTwinWorkspace.tsx
  DigitalTwinClusterViewer.tsx
  DigitalTwinClusterCanvas.tsx
  cluster-03/
    index.ts
    types.ts
    manifest.ts
    assembly.ts
    motion/
    diagnostics/
~~~

Chỉ tạo các thư mục con khi phase tương ứng thật sự cần chúng. Module cluster-03 được phép được gọi bởi viewer chung; module generic không được import ngược logic riêng của cluster-03. Không đưa dữ liệu cụm 3 vào assembly module của cụm 1.

Asset runtime được cô lập:

~~~text
public/models/digital-twin/cluster-03/
  final.glb
  parts/
    <part>.glb
  connections/
    cluster-03.manifest.json
    sketches.json
    constraints.json
    validation.json
~~~

final.glb hiện có được giữ làm model tổng thể cho tới khi asset layout mới được kiểm tra. Thư mục parts chỉ chứa model thật sự cần để điều khiển riêng; không sao chép hàng loạt nếu final.glb đã có mesh tương ứng. Các file JSON trong connections là dữ liệu riêng của cụm 3, không phải thư viện dùng chung.

### 3.3. Lựa chọn và lý do

| Vấn đề | Phương án không chọn | Phương án chọn |
| --- | --- | --- |
| Nguồn tọa độ | Giữ các số tọa độ/offset trong TSX | Manifest sinh từ CAD, ghi rõ đơn vị và hệ tọa độ |
| Mesh chuyển động | Overlay tất cả GLB chi tiết lên final.glb | Dùng final.glb làm nền; chỉ nạp mesh riêng khi cần, tránh trùng mesh và z-fighting |
| Logic nối | Để toàn bộ trong viewer generic | Adapter/assembly riêng cho cluster-03, viewer chỉ truyền manifest và trạng thái |
| Thứ tự làm | Sửa nhiều chi tiết trong một lần | Một chi tiết một checkpoint, theo dependency graph |
| Chẩn đoán | Đo bằng mắt hoặc bounding box | Hiển thị pivot/anchor/constraint và đo sai số từ điểm CAD |

Nếu dữ liệu CAD không đủ để xác định một quan hệ, phải ghi trạng thái unresolved và dừng; không suy đoán bằng tâm bounding box.

### 3.4. Hướng UI/UX

Giữ tab cụm 3 và các nút test hiện có: reset camera, zoom, Cam +/-, Auto và Line. Sau khi cơ cấu nền ổn định, bổ sung một chế độ chẩn đoán riêng của cụm 3, mặc định tắt, gồm:

- hiện/ẩn pivot và anchor;
- hiện/ẩn đường nối hoặc Sketch;
- hiện tên node/part đang được kiểm tra;
- hiển thị sai số vị trí của chi tiết đang chọn;
- chọn đúng một part để test, không làm người dùng hiểu nhầm là điều khiển máy thật.

Chế độ loading, ready, error/retry và disabled phải được giữ rõ ràng. Các control mới phải có nhãn, trạng thái pressed/selected, focus bàn phím và thông báo lỗi phù hợp. Không thay đổi layout Dashboard chung nếu không cần thiết.

## 4. Hợp đồng dữ liệu CAD-to-runtime

Manifest cụm 3 phải có version và source evidence để có thể truy ngược từ runtime về CAD.

### 4.1. Hệ tọa độ và đơn vị

- Đơn vị chuẩn runtime: mét.
- Ghi rõ đơn vị nguồn của SolidWorks và bước quy đổi.
- Ghi rõ world frame của Final.SLDASM, local frame của từng SLDPRT và frame của final.glb.
- Ghi root transform giữa CAD và GLB: translation, rotation, scale và handedness.
- Không cho phép mỗi part tự có một offset ẩn trong code.

### 4.2. Part record

Mỗi part record tối thiểu gồm:

- stable id;
- tên file SLDPRT hoặc component instance trong assembly;
- tên node GLB đã map rõ ràng;
- parent id;
- local matrix và/hoặc transform được trích xuất;
- pivot/reference point;
- axis hoặc direction nếu part có chuyển động;
- mesh source: node trong final.glb hoặc asset riêng trong parts;
- render mode: static, movable, overlay hoặc hidden-from-base;
- source feature/mate/sketch dùng để xác minh;
- trạng thái validation và sai số đo được.

Stable id phải dựa trên component/path/instance trong assembly, không dựa duy nhất vào tên hiển thị có thể trùng.

### 4.3. Connection record

Mỗi connection record tối thiểu gồm:

- id;
- type: fixed, revolute, prismatic, path hoặc loại được CAD xác định;
- parent và child;
- parent anchor và child anchor;
- axis/direction;
- giới hạn hoặc miền chuyển động nếu CAD có;
- source mate/feature/sketch;
- thứ tự phụ thuộc;
- bằng chứng kiểm tra và tolerance.

Các loại tọa độ hình học phải được lưu bằng số đã chuẩn hóa; runtime không đọc trực tiếp object COM hoặc type của SolidWorks.

### 4.4. Sketch/path record

Mỗi Sketch dùng cho chuyển động phải lưu:

- source part;
- source feature name;
- plane/frame;
- segment order;
- line start/end;
- arc start/end/center/radius;
- hướng chạy;
- parameterization;
- điểm bắt đầu/kết thúc;
- giá trị mẫu phục vụ test.

Sketch1/Sketch2 của body_may sẽ được dùng làm dữ liệu kiểm chứng cho oc_left/oc_right sau khi xác nhận mapping trong assembly, thay vì copy số liệu vào component.

## 5. Biên giới công cụ CAD và runtime

### 5.1. CAD extraction boundary

Tool trích xuất chạy ngoài browser, dự kiến đặt tại:

    scripts/digital-twin/cluster-03/cad/

Tool này được phép:

1. mở Final.SLDASM ở chế độ đọc;
2. duyệt component tree và transform instance;
3. mở từng SLDPRT liên quan;
4. đọc Sketch, axis, face/reference và mate/feature cần thiết;
5. đổi đơn vị và frame;
6. sinh manifest JSON cùng report validation;
7. đọc scene graph của GLB để tạo mapping có bằng chứng.

SolidWorks interop type, COM exception và quyền truy cập file chỉ được tồn tại trong extraction tool. Runtime web chỉ nhận JSON đã chuẩn hóa.

### 5.2. Prerequisites

- SolidWorks và interop assembly tương thích với file nguồn;
- quyền đọc thư mục FPT;
- các file SLDASM/SLDPRT không bị khóa hoặc suppress làm mất component;
- GLB tương ứng có thể đọc bằng Three.js/GLTFLoader;
- đơn vị, axis convention và trạng thái rebuild của assembly được ghi lại.

Nếu SolidWorks không khả dụng hoặc component bị thiếu, phase extraction phải dừng với evidence cụ thể. Không dùng số ước lượng để giả lập quan hệ CAD.

## 6. Quy trình checkpoint cho từng chi tiết

Quy trình này bắt buộc áp dụng giống nhau cho toàn bộ danh sách part: body_may, oc_left, oc_right, truc_chinh, truc_nen, gear_motor_chinh, gear_motor_nen, gear_nen, arm_left_1, arm_left_2, arm_left_3, arm_right_1, arm_right_2, arm_right_3, box_nen, head_nen, gac_coffee và wiper_gear. oc_left/oc_right chỉ là hai checkpoint đầu để xác nhận hệ tọa độ và phương pháp; không phải phạm vi duy nhất.

Mỗi chi tiết đi qua đúng các bước sau, không gộp nhiều chi tiết vào một change set:

1. Xác định source component và stable id.
2. Xác định mesh/node tương ứng trong GLB.
3. Xác định parent, pivot, anchor và trục từ CAD.
4. Thêm một record vào manifest.
5. Thực hiện một thay đổi runtime tối thiểu cho riêng chi tiết đó.
6. Kiểm tra vị trí ban đầu khi progress = 0.
7. Kiểm tra ít nhất ba điểm chuyển động: đầu, giữa và cuối; nếu là rotation thì kiểm tra thêm hướng trục.
8. Kiểm tra reset và giữ nguyên các chi tiết đã pass trước đó.
9. Ghi sai số, ảnh chụp hoặc log kiểm chứng vào report.
10. Chỉ sau khi đạt acceptance criteria của part mới chuyển sang part kế tiếp.

Sai số phải được đo từ anchor/pivot/điểm Sketch hoặc reference point. Bounding box chỉ dùng để fit camera, không dùng để suy ra cơ cấu.

## 7. Thứ tự nối dự kiến cho toàn bộ chi tiết

Thứ tự cuối cùng phải được xác nhận lại từ dependency graph của Final.SLDASM. Thứ tự khởi đầu dưới đây bảo đảm nối từ frame gốc ra ngoài và bao phủ toàn bộ 18 chi tiết:

1. body_may — xác lập root frame và static alignment.
2. oc_left — thử nghiệm đầu tiên theo Sketch tương ứng.
3. oc_right — độc lập với oc_left nhưng dùng cùng quy ước frame.
4. truc_chinh — xác lập trục/shaft liên quan.
5. truc_nen — xác lập trục nén và các dependent.
6. gear_motor_chinh.
7. gear_motor_nen.
8. gear_nen.
9. arm_left_1.
10. arm_left_2.
11. arm_left_3.
12. arm_right_1.
13. arm_right_2.
14. arm_right_3.
15. box_nen.
16. head_nen.
17. gac_coffee.
18. wiper_gear.

Nếu CAD cho thấy một part là dependency của part đứng trước trong danh sách, chỉ được đổi thứ tự sau khi ghi lại lý do trong manifest/report. Không nối đồng thời cả cụm arm trái hoặc arm phải; từng file vẫn là một checkpoint riêng. Không được đánh dấu hoàn tất một nhóm chỉ vì một chi tiết trong nhóm đã pass.

## 8. Requirement-to-phase mapping

| Yêu cầu | Phase |
| --- | --- |
| Đọc đầy đủ file SLDASM/SLDPRT, Sketch, tọa độ và quan hệ | 0, 1 |
| Có hệ tọa độ và transform có thể truy nguyên | 1, 2 |
| File nối riêng cho cụm 3 | 1, 2 |
| Không dùng offset hard-code | 2 trở đi |
| Nối chậm, từng phần một | 3 đến 9 |
| oc_left/oc_right chạy đúng đường CAD | 3, 4, 10 |
| Tất cả 18 chi tiết có parent/pivot/anchor và trạng thái kiểm chứng riêng | 2 đến 9, 11 |
| Các chi tiết phụ thuộc nối đúng parent/child | 5 đến 9 |
| Có nút test và chẩn đoán | 10 |
| Build và kiểm tra web | 11 |

## 9. Các phase thực hiện

### Phase 0 — Chốt nguồn CAD và inventory read-only

**Kết quả:** Có inventory đầy đủ của Final.SLDASM, 18 SLDPRT, GLB, feature/sketch/mate liên quan và bảng source-to-runtime dự kiến.

**Phạm vi:**

- mở assembly ở chế độ đọc;
- lấy component tree, instance transform, suppression/configuration;
- liệt kê feature/sketch/axis/reference có liên quan đến chuyển động;
- đọc scene graph final.glb và các GLB chi tiết hiện có;
- xác nhận đơn vị, root frame và hướng trục;
- xác nhận file nào là nguồn chính, file nào chỉ là artifact render.

**Không trong phạm vi:** chỉnh CAD, chỉnh GLB, chỉnh React, sinh offset tạm.

**Kiểm tra:** mỗi component phải có source path và trạng thái; mọi GLB node dùng cho chuyển động phải có mapping hoặc trạng thái missing.

**Acceptance criteria:**

- inventory có đủ source file và kích thước/thời gian đọc;
- biết component nào có mesh trong final.glb;
- biết component nào cần GLB riêng;
- có kết luận rõ về frame và đơn vị;
- nếu SolidWorks không đọc được thì dừng tại đây với lỗi và phương án dữ liệu thay thế cần người dùng cung cấp.

**Gate:** không sang Phase 1 nếu chưa có coordinate authority.

### Phase 1 — Thiết kế manifest và thư mục riêng cluster-03

**Kết quả:** Có schema manifest, mapping contract và layout asset riêng, chưa đưa logic nối vào viewer.

**Phạm vi:**

- tạo hợp đồng JSON cho parts, connections, sketches và validation;
- xác định stable id và quy tắc mapping node GLB;
- xác định loader contract và version;
- tách artifact cluster-03 khỏi assembly cluster-01;
- lập artifact matrix: source, derived JSON, GLB tổng thể, GLB chi tiết cần thiết.

**Không trong phạm vi:** animation runtime, UI mới, xóa asset cũ, copy ZIP vào public.

**Kiểm tra:** schema reject record thiếu parent/pivot/frame/source evidence; không có path tham chiếu sang cluster-01/02.

**Acceptance criteria:**

- mọi file nối có prefix/đường dẫn thuộc cluster-03;
- manifest có units/frame/version;
- có quy tắc duplicate mesh và z-fighting;
- có kế hoạch rollback asset nếu URL mới không tải.

**Gate:** review boundary và schema trước khi nối chi tiết đầu tiên.

### Phase 2 — Root frame và model tổng thể

**Kết quả:** final.glb nằm đúng vị trí CAD tổng thể, chưa kích hoạt chuyển động của các part.

**Phạm vi:**

- áp dụng một root transform lấy từ CAD/GLB validation;
- kiểm tra body_may và các mốc tham chiếu;
- đảm bảo camera fit không can thiệp transform cơ cấu;
- giữ final.glb làm nền nếu nó đã chứa mesh tĩnh.

**Acceptance criteria:**

- root alignment đạt tolerance đã ghi trong validation report;
- reset camera không đổi vị trí model;
- không còn offset root ẩn trong DigitalTwinClusterCanvas;
- asset cluster-03 không ảnh hưởng cluster-01/02.

**Gate:** chỉ khi root đúng mới bắt đầu oc_left.

### Phase 3 — Nối oc_left

**Kết quả:** oc_left được điều khiển bằng pivot/anchor và Sketch/path từ manifest.

**Phạm vi:**

- map oc_left.SLDPRT với node GLB;
- lấy pivot/reference point và parent từ CAD;
- trích xuất Sketch1/đường tương ứng;
- chạy progress 0, giữa, 1;
- giữ đường guide chỉ là visualization của dữ liệu manifest.

**Acceptance criteria:**

- tâm/anchor oc_left nằm đúng trên Sketch tại toàn bộ sample points;
- hướng chuyển động và điểm bắt đầu đúng;
- Cam +/Cam - và Auto không tạo snap;
- reset trả về đúng initial pose;
- không sử dụng body assembly offset riêng để chữa sai lệch;
- nếu mesh oc_left không nằm trong final.glb, overlay riêng phải trùng mesh nền và mesh nền tương ứng phải được ẩn để không z-fighting.

**Gate:** lỗi vị trí hoặc hướng ở bất kỳ sample nào thì dừng, không nối oc_right.

### Phase 4 — Nối oc_right

**Kết quả:** oc_right chạy đúng Sketch/path đối xứng hoặc path thực tế được CAD xác nhận.

**Phạm vi:** giống Phase 3 nhưng với oc_right và source Sketch tương ứng; kiểm tra độc lập rồi kiểm tra hai oc chạy cùng scene.

**Acceptance criteria:**

- oc_right đúng anchor, trục, hướng và giới hạn;
- chạy riêng không làm oc_left trượt;
- chạy đồng thời không phá root hoặc body;
- guide của hai phía lấy từ manifest, không phải hai bộ số hard-code;
- reset/retry/load lại giữ nguyên kết quả.

**Gate:** chỉ chuyển sang trục/gear khi hai oc pass độc lập và kết hợp.

### Phase 5 — Nối từng trục và truyền động

**Kết quả:** truc_chinh, truc_nen và từng gear được nối theo dependency graph CAD.

**Driver authority:** có hai nhánh độc lập. Nhánh chính là `gear_motor_chinh-1 -> GearMate2 -> wiper_gear-1`; từ wiper, `PathMate11`/`LimitDistance2` kéo `arm_left_2-1`, sau đó `Coincident7`/`Parallel1`/`Concentric6` giữ `arm_left_3-1` và `truc_chinh-1` cùng cơ cấu. Nhánh nén là `gear_motor_nen-1 -> GearMate4 -> gear_nen-1 -> truc_nen-1`. Các shaft/gear/arm phía sau phải nhận góc qua `GearMate`/mate phụ thuộc; solver hình học chỉ được giải bậc tự do còn lại, không được tự chọn lại góc motor hoặc góc arm đang do motor dẫn.

**Thứ tự checkpoint:** truc_chinh, truc_nen, gear_motor_chinh, gear_motor_nen, gear_nen; mỗi file một change set logic và một report entry.

**Phạm vi mỗi checkpoint:**

- xác định axis và mate;
- xác định parent;
- kiểm tra rotation/translation và phase;
- kiểm tra không làm thay đổi pivot của oc đã pass;
- kiểm tra gear ratio hoặc quan hệ truyền động nếu CAD có dữ liệu đủ để xác định.

**Acceptance criteria:** mỗi part đạt checklist part-level trước khi thêm part tiếp theo; lỗi gear không được bù bằng scale/position tùy ý. Mỗi trục và mỗi gear phải có evidence riêng, không gộp thành một kết quả chung cho cả nhóm truyền động.

### Phase 6 — Nối arm trái từng file

**Kết quả:** arm_left_1, arm_left_2 và arm_left_3 nối lần lượt vào các anchor đã pass.

Với `PathMate` gồm một điểm và một line hữu hạn, điểm phải được giữ trong đoạn line `[start, end]`. Khi `wiper_gear` nhận góc từ `gear_motor_chinh` qua `GearMate2`, `arm_left_2` phải theo đúng `PathMate11`/`LimitDistance2`; line của `arm_left_3` phải quay cứng theo `Coincident7`, đồng thời `truc_chinh` phải theo `Parallel1`/`Concentric6`. Solver chỉ tìm cam-progress/góc arm2 cần thiết để điểm nằm trên đoạn `PathMate10`, còn hình học path của `oc_left` phải giữ nguyên.

**Phạm vi:** pivot/axis/mate từng arm, kiểm tra chạm/cắt rõ ràng tại các sample motion; giữ oc và trục đã pass.

**Acceptance criteria:** mỗi arm được test riêng, sau đó test cộng dồn; không dùng một transform chung cho cả ba arm nếu CAD không thể hiện như vậy. arm_left_1, arm_left_2 và arm_left_3 chỉ được ghi pass độc lập.

### Phase 7 — Nối arm phải từng file

**Kết quả:** arm_right_1, arm_right_2 và arm_right_3 nối lần lượt, độc lập với arm trái rồi kết hợp.

**Phạm vi:** tương tự Phase 6, ưu tiên kiểm tra mirror/frame vì hai phía có thể không chỉ là đổi dấu tọa độ.

**Acceptance criteria:** mỗi arm đúng source frame, không bị đặt sang phía đối diện do nhầm handedness; test trái/phải đồng thời không làm mất alignment. arm_right_1, arm_right_2 và arm_right_3 chỉ được ghi pass độc lập.

### Phase 8 — Nối nhóm cuối cụm theo từng file

**Kết quả:** box_nen, head_nen, gac_coffee và wiper_gear được nối lần lượt theo graph thực tế; wiper_gear là mắt xích của nhánh main-drive, không phải driver của nhánh `gear_motor_nen`.

**Phạm vi:** xác định fixed/movable state, anchor, limit và dependency; manifest phải ghi rõ `wiper_gear` nhận từ `GearMate2` và nhánh `gear_motor_nen -> gear_nen -> truc_nen` hoạt động độc lập.

**Acceptance criteria:** từng file có trạng thái pass riêng; chuyển động cuối cụm không làm mesh chồng sai hoặc tách khỏi parent; không thêm part chỉ vì tên giống nhau mà thiếu source evidence. Không dùng kết quả của oc để suy ra các chi tiết còn lại.

### Phase 9 — Hoàn thiện assembly controller cluster-03

**Kết quả:** runtime có một controller/adapter riêng cho cluster-03, dùng manifest và graph thay cho logic cam viết trực tiếp trong Canvas.

**Phạm vi:**

- load manifest và validate trước khi animate;
- resolve GLB node bằng mapping;
- tạo parent/child graph;
- apply transform theo CAD frame;
- tách motion state khỏi React render nếu cần;
- quản lý cleanup, loader failure, retry và unmount;
- giữ viewer generic chỉ truyền props/state cần thiết.

**Không trong phạm vi:** refactor toàn bộ digital-twin, sửa assembly cluster-01 nếu không bị ảnh hưởng trực tiếp.

**Acceptance criteria:** không còn geometry constant riêng cho oc trong Canvas; part không tồn tại hoặc manifest lỗi phải báo lỗi rõ, không âm thầm đặt về origin; cleanup không để animation loop hoặc object cũ.

### Phase 10 — Chế độ chẩn đoán và test controls

**Kết quả:** người dùng có thể kiểm tra từng part mà không cần sửa code.

**Phạm vi:**

- chọn part hiện tại;
- toggle pivot/anchor/constraint line/label/error;
- nút step forward/back, reset, auto cho cơ cấu đã pass;
- status hiển thị part đang test và phase;
- error/retry cho manifest hoặc asset thiếu;
- accessibility, keyboard và reduced motion.

**Acceptance criteria:** control không gửi lệnh thật; trạng thái loading/ready/error/disabled rõ; bật diagnostics không thay đổi transform; ẩn diagnostics không làm mất motion.

### Phase 11 — Verification, review và handoff

**Kết quả:** có evidence cho từng part và toàn bộ cụm 3.

**Kiểm tra tự động:**

- validate schema/manifest;
- kiểm tra mọi node/asset URL tồn tại;
- kiểm tra không có reference sang cluster-01/02;
- kiểm tra unit conversion và matrix round-trip;
- npx tsc --noEmit --incremental false;
- npm run build;
- git diff --check.

**Kiểm tra browser:**

- mở tab cụm 3;
- load/retry/reset;
- test từng part theo work queue;
- kiểm tra oc_left/oc_right ở đầu, giữa, cuối đường;
- kiểm tra zoom/camera reset;
- bật/tắt diagnostics;
- đổi tab rồi quay lại để kiểm tra cleanup;
- kiểm tra console không có lỗi runtime hoặc asset 404.

**Acceptance criteria cuối:**

- toàn bộ 18 part pass hoặc có trạng thái deferred/unresolved riêng từng part được ghi rõ;
- oc_left và oc_right đi đúng path CAD trong tolerance đã thống nhất;
- parent/child và pivot của các part đã nối đúng;
- không còn offset chữa cháy trong runtime;
- asset và file nối chỉ thuộc cluster-03;
- build/typecheck pass;
- browser không có lỗi nghiêm trọng;
- handoff có danh sách file, sai số, evidence, hạn chế và phần còn lại.

## 10. Tolerance và cách đánh giá

Tolerance không được tự ý lấy từ kích thước hiển thị. Phase 0 phải ghi độ chính xác của nguồn và exporter. Mặc định để review:

- điểm anchor/path: mục tiêu <= 0.1 mm khi dữ liệu CAD và transform cho phép;
- transform của chi tiết: sai số phải được báo theo từng axis và không được che bằng bounding box;
- sai số visual do mesh tessellation được tách riêng khỏi sai số pivot/constraint.

Nếu dữ liệu GLB không thể đạt tolerance vì thiếu pivot hoặc mesh bị bake sai frame, phải báo gap và yêu cầu export lại hoặc bổ sung reference; không giảm tolerance chỉ để pass.

## 11. Rủi ro và phương án xử lý

| Rủi ro | Cách xử lý |
| --- | --- |
| SolidWorks/Interop không mở được assembly | Dừng Phase 0, ghi lỗi/version/license và yêu cầu neutral export hoặc quyền truy cập |
| GLB mất hierarchy/node name | Tạo mapping có evidence hoặc yêu cầu export lại; không đoán theo vị trí gần nhất |
| Khác đơn vị mm/m hoặc khác handedness | Kiểm tra root frame và matrix round-trip trước mọi motion |
| final.glb đã chứa mesh nhưng overlay thêm mesh trùng | Dùng render ownership rõ ràng, ẩn mesh nền tương ứng hoặc không nạp overlay |
| Sketch/feature name không ổn định | Dùng component path + geometry signature/source evidence |
| Một part phụ thuộc part chưa pass | Chờ dependency, không nối tắt |
| Asset lớn làm chậm web | Chỉ thêm GLB chi tiết thật sự cần, đo payload và load time |
| Dirty worktree bị ghi đè | Không reset/checkout; review diff trước mỗi thay đổi cùng khu vực |
| Người dùng hiểu nhầm là điều khiển máy thật | Gắn nhãn local simulation/diagnostic; không thêm API hoặc command hardware |

## 12. Quy tắc dừng và review

Phải dừng và báo evidence trước khi tiếp tục nếu:

- root frame chưa khớp;
- thiếu source CAD hoặc GLB mapping;
- anchor/pivot sai ở một sample;
- part mới làm hỏng một part đã pass;
- manifest không xác định được parent/child;
- cần sửa ngoài cluster-03;
- cần thay đổi architecture chung hoặc dependency Three.js;
- cần xóa/ghi đè asset của người dùng.

Mỗi phase có review gate riêng. Với Phase 3 đến Phase 8, review gate là part-level, không gộp review cuối phase cho nhiều part chưa kiểm chứng.

## 13. Handoff sau khi plan được duyệt

Thứ tự thực hiện dự kiến:

1. Phase 0 và báo cáo inventory/frame.
2. Người dùng xem evidence; nếu đúng mới sang Phase 1.
3. Tạo manifest/folder contract.
4. Nối body_may rồi oc_left.
5. Báo cáo ảnh/log oc_left; chỉ khi đạt mới sang oc_right.
6. Tiếp tục từng part theo dependency graph.
7. Sau khi toàn bộ motion pass mới hoàn thiện diagnostics/UI và chạy verification cuối.

Plan này không tự cấp quyền sửa product code. Khi bắt đầu execution, mỗi phase phải tạo diff nhỏ, kiểm tra ngay, và giữ checkpoint để có thể quay lại đúng part đang làm mà không ảnh hưởng các part đã đạt.

## 14. Trạng thái plan

- Target workspace: C:/GitHub/BEANS/SCM-BEANS_Dashboard_FE
- Plan artifact: plans/cluster-03-cad-assembly-connection.md
- Execution mode: tuần tự, checkpoint theo từng part
- Product code changes: chưa thực hiện
- Git push: không thực hiện
- Approval cần có trước khi bắt đầu Phase 0 execution

