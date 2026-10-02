# Phase 5 checkpoint — `truc_nen-1`

Status: **Verified — checkpoint 2/5 của Phase 5**

## CAD evidence

- Component: `truc_nen.SLDPRT`, stable id `truc_nen-1`.
- Parent axis: `body_may-1` qua `Concentric23` (`MateConcentric`, `mateType: 1`).
- Axis assembly: `[6.165890344762365e-16, 4.261501286010193e-15, 1]`, độ dài chuẩn hóa `1`.
- Translation relation: `Screw2` (`MateScrew`, `mateType: 17`) nối `truc_nen-1` với `box_nen-1`.
- SolidWorks interop cung cấp `revolutionValue = 0.004 m/revolution`, `reverse = true`, `revolutionType = 1`, `mateAlignment = 1`.
- `Lock2` nối `truc_nen-1` với `gear_nen-1`; quan hệ này được giữ trong artifact và được runtime lower-drive sử dụng sau khi checkpoint GearMate4 hoàn tất.
- CAD không cung cấp angular/travel limit; test một vòng dùng pitch đã đọc và được ghi là diagnostic-only.

Evidence nguồn: `plans/cluster-03-phase-5-truc-nen-cad-evidence.json`.

## Artifact và runtime

- Motion contract: `public/models/digital-twin/cluster-03/connections/truc-nen.json`.
- Generator: `scripts/digital-twin/cluster-03/cad/generate-cluster-03-truc-nen-connection.mjs`.
- Validator: `scripts/digital-twin/cluster-03/cad/validate-cluster-03-truc-nen-motion.mjs`.
- Runtime contract `screw-axis` áp dụng quay quanh trục +Z và dịch dọc trục theo `-0.004 m` trong một vòng test; không dùng offset hard-code.
- `final.glb` vẫn là render owner; không nạp GLB overlay cho trục.

## Verification

- Pivot round-trip residual: kiểm tra trong validator ở ngưỡng `1e-8 m`.
- Pitch và chiều dịch: `+0.004 m/revolution` từ CAD, `reverse=true`, runtime sample cuối `-0.004 m`.
- Samples: progress `0`, `0.5`, `1`, tương ứng góc `0`, `π`, `2π`.
- Generator `--check`: pass.
- `validate-cluster-03-truc-nen-motion.mjs`: pass.
- `validate-cluster-03-truc-chinh-motion.mjs`: pass sau khi thêm screw-axis adapter.
- `validate-cluster-03-oc-left-motion.mjs`: pass.
- `validate-cluster-03-oc-right-motion.mjs`: pass.
- `npx.cmd tsc --noEmit --incremental false`: pass.

## Gate

Checkpoint `truc_nen-1` đạt. `Lock2` là dependency của nhánh lower-drive; phần GearMate4 được xác nhận ở checkpoint gear tương ứng. Next checkpoint: `gear_motor_chinh-1`.
