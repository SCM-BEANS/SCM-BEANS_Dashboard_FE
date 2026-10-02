# Phase 5 checkpoint — `truc_chinh-1`

Status: **Verified — checkpoint 1/5 của Phase 5**

Phạm vi checkpoint này chỉ gồm `truc_chinh-1`. Các part `truc_nen-1`, `gear_motor_chinh-1`, `gear_motor_nen-1` và `gear_nen-1` vẫn pending.

## CAD evidence

- Assembly: `Final.SLDASM` trong thư mục nguồn `may_nenv2`.
- Component: `truc_chinh.SLDPRT`, stable id `truc_chinh-1`.
- Parent/anchor: `body_may-1` là fixed component; runtime giữ transform trong aggregate root, không chèn offset ẩn.
- Axis mate: `Concentric3` (`MateConcentric`, `mateType: 1`).
- Axis assembly: `[-1, -1.999992770446049e-15, -1.1865823933669593e-21]`, độ dài chuẩn hóa `1`.
- Mate evidence liên quan được giữ trong artifact, gồm `Distance1`, `Parallel1`, `Concentric6`, `Concentric7`, `Parallel7` và `Concentric22`.
- SolidWorks không cung cấp angular limit hoặc gear ratio cho checkpoint này. Dải `0 → 2π` trong runtime được ghi rõ là `diagnostic-test-envelope`, không phải giới hạn vật lý CAD.

Evidence nguồn: `plans/cluster-03-phase-5-truc-chinh-cad-evidence.json`.

## Artifact và runtime

- Motion contract: `public/models/digital-twin/cluster-03/connections/truc-chinh.json`.
- Generator: `scripts/digital-twin/cluster-03/cad/generate-cluster-03-truc-chinh-connection.mjs`.
- Validator: `scripts/digital-twin/cluster-03/cad/validate-cluster-03-truc-chinh-motion.mjs`.
- Manifest đã ghi parent, pivot, local axis và trạng thái `runtime-truc-chinh-ready`.
- Runtime đã thêm nhánh `axis-rotation`; góc `truc_chinh-1` hiện nhận từ master `gear_motor_chinh-1` qua GearMate2, còn `Cam +/−`, `Auto`, `Reset` là bộ điều khiển test chung. Không nạp mesh overlay; `final.glb` vẫn là render owner.
- Nhãn control đã đổi thành linked motion để không nói sai rằng chỉ oc chuyển động.

## Verification

- CAD/GLB matrix residual: `0.000004947491722973041` ở ngưỡng matrix validator `1e-5`.
- Pivot round-trip residual: `1.1775693440128312e-16 m`.
- Axis alignment dot: `1`.
- Samples: progress `0`, `0.5`, `1`, tương ứng góc `0`, `π`, `2π`.
- `truc_chinh` generator `--check`: pass.
- `validate-cluster-03-truc-chinh-motion.mjs`: pass.
- `validate-cluster-03-oc-left-motion.mjs`: pass.
- `validate-cluster-03-oc-right-motion.mjs`: pass.
- `validate-cluster-03-root-frame.mjs`: pass; 18/18 node transforms vẫn trong tolerance.
- `npx.cmd tsc --noEmit --incremental false`: pass.
- Live Edge smoke: Compressor ready; Cam+ đến 100%, Auto bật/tắt, Reset về 0%, Line hide/show đều hoạt động; không có app error. Chỉ còn cảnh báo deprecation `THREE.Clock` từ dependency.

## Gate

Checkpoint `truc_chinh-1` đạt. Chưa đánh dấu Phase 5 hoàn tất vì các checkpoint shaft/gear còn lại chưa được đọc và nối. Next checkpoint: `truc_nen-1`.
