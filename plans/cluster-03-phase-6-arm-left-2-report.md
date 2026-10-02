# Cluster 03 Phase 6 — arm_left_2-1

## Result

arm_left_2-1 is connected as the second left-arm runtime node. Its mesh remains owned by final.glb; no separate detail GLB is loaded.

Status: verified

Motion kind: driver-follow translation

Driver: oc_left-1 on the verified body_may-1 Sketch1 path

Dependency: verified arm_left_1-1

## CAD evidence

Source assembly: Final.SLDASM

Target component: arm_left_2-1 from arm_left_2.SLDPRT

Parent anchor: body_may-1

Primary chain mates:

- Coincident3 connects arm_left_1-1 to arm_left_2-1.
- Concentric2 keeps arm_left_2-1 aligned with oc_left-1.

The missing arm3 connection is now explicit in the runtime artifact:

- PathMate10 connects the arm_left_2-1 point to arm_left_3-1 Sketch1 Line1.
- The source point is [−0.060675690384481465, −0.09229695662598972, 0.06324946780065155] in the SolidWorks assembly frame.
- The initial point-on-line residual is 7.429669904675679e-16 m.
- LimitDistance1 is checked against the same point pair at 0.005000000000000074 m.

The second CAD relation is now resolved as part of the main-drive linkage:

- PathMate11 connects arm_left_2-1 to wiper_gear-1.
- LimitDistance2 constrains arm_left_2-1 against wiper_gear-1.
- Both relations are represented by `wiperConnection` with zero recorded initial residual.

## Runtime artifact

Motion definition: public/models/digital-twin/cluster-03/connections/arm-left-2.json

The runtime treats `gear_motor_chinh-1` as the primary driver through `GearMate2` into `wiper_gear-1`. The wiper connection drives `arm_left_2-1` through PathMate11 and LimitDistance2; `arm_left_3-1` follows the same moving linkage through Coincident7 and keeps `truc_chinh-1` aligned through Parallel1 and Concentric6. The dependent cam progress is then applied to the verified `oc_left-1`/arm_left_1-1 path, while the PathMate10 point remains inside the finite `Sketch1:Line1` segment. No infinite-line fallback, hand-written mesh offset, or duplicate overlay is used.

## Verification

- Concentric axis alignment dot: 1.
- Initial Coincident3 residual: 8.469999434971913e-17 m.
- final.glb matrix residual: 4.637667345708252e-7.
- Samples verified at progress 0, 0.5, and 1.
- arm_left_1-1 and oc_left-1 remain runtime-ready.
- `gear_motor_chinh-1 -> GearMate2 -> wiper_gear-1 -> PathMate11/LimitDistance2` is the playback driver; `arm_left_2-1` and `arm_left_3-1` follow the resolved CAD linkage.
- The PathMate10 and PathMate11 finite-line solutions are validated against the recorded CAD residuals; the browser test covers the full normalized main-drive range.
- Runtime loader URL is registered in the cluster workspace.

Validators:

- scripts/digital-twin/cluster-03/cad/validate-cluster-03-arm-left-2-motion.mjs
- scripts/digital-twin/cluster-03/cad/validate-cluster-03-arm-left-chain-motion.mjs

LimitDistance1, PathMate11, and LimitDistance2 are verified at the initial CAD pose. No arm_left_2 CAD mate remains deferred.
