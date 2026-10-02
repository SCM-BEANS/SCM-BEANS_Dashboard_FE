# Phase 5 checkpoint — `gear_motor_chinh-1`

Status: **Verified — checkpoint 3/5 của Phase 5**

## CAD evidence

- Component: `gear_motor_chinh.SLDPRT`, stable id `gear_motor_chinh-1`.
- Parent axis: `body_may-1` qua `Concentric12` (`MateConcentric`, `mateType: 1`).
- Axis assembly: `[1, -2.0166173804045197e-15, -6.938942623752423e-16]`, độ dài chuẩn hóa `1`.
- Gear relation: `GearMate2` (`MateGearDim`, `mateType: 10`) nối với `wiper_gear-1`.
- Gear ratio: numerator `0.008`, denominator `0.008`, ratio `1:1`, `reverse=true`.
- Không có angular limit trong CAD evidence. Test một vòng là diagnostic-only.

Evidence nguồn: `plans/cluster-03-phase-5-gear-motor-chinh-cad-evidence.json`.

## Artifact và runtime

- Motion contract: `public/models/digital-twin/cluster-03/connections/gear-motor-chinh.json`.
- Generator: `scripts/digital-twin/cluster-03/cad/generate-cluster-03-gear-motor-chinh-connection.mjs`.
- Validator: `scripts/digital-twin/cluster-03/cad/validate-cluster-03-gear-motor-chinh-motion.mjs`.
- Runtime dùng pivot/trục từ `Concentric12`; `GearMate2` là driver chính cho `truc_chinh-1` và chuỗi arm trái đã pass. Mesh `wiper_gear-1` vẫn giữ checkpoint driven-part riêng.
- `final.glb` vẫn là render owner, không có gear overlay.

## Verification

- Generator `--check`: pass.
- Validator gear motor: pass; trục chuẩn hóa, ratio `1`, reverse `true`, ba mốc `0/π/2π`.
- Validators `truc_chinh`, `truc_nen`: pass.
- `npx.cmd tsc --noEmit --incremental false`: pass.

## Gate

Checkpoint `gear_motor_chinh-1` đạt. GearMate2 đã được dùng làm master relation cho shaft/arm runtime; `wiper_gear-1` vẫn là driven-mesh follow-up. Next checkpoint: `gear_motor_nen-1`.
