# Cluster 03 Phase 6 — arm_left_3-1

## Result

arm_left_3-1 is connected as the third left-arm runtime node. Its mesh remains owned by final.glb; no separate detail GLB is loaded.

Status: verified

Motion kind: wiper-gear-driven axis rotation with PathMate10 coupling

Primary driver: gear_motor_chinh-1 through GearMate2 and wiper_gear-1; dependent shaft relation: truc_chinh-1 through Parallel1 and Concentric6

Parent: body_may-1

## CAD evidence

Source assembly: Final.SLDASM

Target component: arm_left_3-1 from arm_left_3.SLDPRT

Primary mates:

- Coincident5 anchors arm_left_3-1 to body_may-1.
- Parallel1 preserves the arm orientation relative to truc_chinh-1.
- Concentric6 puts the arm axis on the truc_chinh-1 axis.

The arm2 connection is now explicit:

- PathMate10 connects the arm_left_2-1 point to this part's Sketch1 Line1.
- LimitDistance1 confirms the initial 5 mm relationship for the same connection pair.

The wiper-to-arm relation is resolved in the runtime graph:

- Coincident7 relates arm_left_3-1 to wiper_gear-1.
- `upstreamDriver` records `wiper_gear-1` and `Coincident7`; it is no longer deferred.

## Runtime artifact

Motion definition: public/models/digital-twin/cluster-03/connections/arm-left-3.json

The diagnostic angle range remains in the artifact for testing. Playback takes the main-drive angle from `gear_motor_chinh-1` and `GearMate2`, rotates `wiper_gear-1`, then follows `arm_left_2-1` through PathMate11/LimitDistance2 and `arm_left_3-1` through Coincident7. `truc_chinh-1` follows the arm through Parallel1 and Concentric6; the dependent cam progress keeps the PathMate10 point inside the finite `Sketch1:Line1` segment. The target line moves rigidly with arm_left_3-1. The aggregate final.glb remains the sole render owner.

## Verification

- Concentric axis alignment dot: 1.
- Axis-line residual: 4.094582739977468e-17 m.
- Pivot round-trip residual: 1.0007415106216802e-16 m.
- final.glb matrix residual: 3.632699792366356e-7.
- Gear-driven samples verified at progress 0, 0.5, and 1.
- Dense 101-sample point-on-finite-line residuals are below 1e-15 m.
- arm_left_2-1 and truc_chinh-1 remain runtime-ready.
- Coincident7, PathMate11, and LimitDistance2 are resolved in the main-drive graph.
- Runtime loader URL is registered in the cluster workspace.

Validators:

- scripts/digital-twin/cluster-03/cad/validate-cluster-03-arm-left-3-motion.mjs
- scripts/digital-twin/cluster-03/cad/validate-cluster-03-arm-left-chain-motion.mjs

LimitDistance1, Coincident7, PathMate11, and LimitDistance2 are verified at the initial CAD pose. The lower `gear_motor_nen-1 -> gear_nen-1 -> truc_nen-1` branch remains independent from this main-drive graph.
