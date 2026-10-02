# Phase 5 checkpoint — `gear_nen-1`

Status: **Verified — checkpoint 5/5 của Phase 5**

## CAD evidence

- Component: `gear_nen.SLDPRT`, stable id `gear_nen-1`.
- Parent axis: `body_may-1` qua `Concentric27` (`MateConcentric`, `mateType: 1`).
- Axis assembly: `[-2.0780419536897073e-16, -3.848548080272432e-15, -1]`, độ dài chuẩn hóa `1`.
- Gear relation: `GearMate4` nối `gear_nen-1` với `gear_motor_nen-1`.
- Gear ratio: numerator `0.008`, denominator `0.008061088074535322`, ratio `0.9924218574502`, `reverse=true`.
- Axial constraint: `LimitDistance4`, minimum `0.001 m`, maximum/current `0.05578 m`. Constraint được giữ như evidence, không suy thành angular limit.
- Không có angular limit trong CAD evidence; dải một vòng chỉ là diagnostic-only.

Evidence nguồn: `plans/cluster-03-phase-5-gear-nen-cad-evidence.json`.

## Artifact và runtime

- Motion contract: `public/models/digital-twin/cluster-03/connections/gear-nen.json`.
- Generator: `scripts/digital-twin/cluster-03/cad/generate-cluster-03-gear-nen-connection.mjs`.
- Validator: `scripts/digital-twin/cluster-03/cad/validate-cluster-03-gear-nen-motion.mjs`.
- Runtime dùng pivot/trục từ `Concentric27`; ratio, reverse và `LimitDistance4` được lưu đầy đủ. Playback nhận góc master từ `gear_motor_nen-1` theo GearMate4; LimitDistance4 vẫn là constraint evidence, không suy thành angular limit.
- `final.glb` vẫn là render owner, không có gear overlay.

## Verification

- Generator `--check`: pass.
- Validator gear_nen: pass; ratio `0.9924218574502`, reverse `true`, distance limit `0.001–0.05578 m`, ba mốc `0/π/2π`.
- Validators của hai shaft và hai motor gear: pass.
- Validators oc_left/oc_right và root frame: pass; 18/18 GLB node transforms giữ trong tolerance.
- `npx.cmd tsc --noEmit --incremental false`: pass.

## Gate

Toàn bộ 5 checkpoint của Phase 5 đã pass ở mức part-level. Hai gear motor là master runtime drives; wiper_gear/arm phải và các driven-part còn lại vẫn có checkpoint riêng theo plan.
