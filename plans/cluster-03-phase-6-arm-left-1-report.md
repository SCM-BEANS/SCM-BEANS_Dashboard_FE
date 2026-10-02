# Cluster 03 Phase 6 — arm_left_1-1

## Result

arm_left_1-1 is verified as an independent Phase 6 checkpoint.

- CAD source: arm_left_1.SLDPRT, instance arm_left_1-1
- GLB node: arm_left_1-1 in final.glb
- Parent anchor: body_may-1
- CAD path constraint: PathMate8
- Driver relation: oc_left-1 through Coincident1 and Concentric1
- Runtime motion: driver-follow translation along the already verified body_may-1:Sketch1 path
- Orientation: preserved from the initial GLB/CAD pose
- Mesh owner: final.glb; no arm overlay is loaded

## Evidence

SolidWorks was opened in a separate read-only session with revision 32.1.0. The evidence file is:

plans/cluster-03-phase-6-arm-left-1-cad-evidence.json

The evidence contains the independent mate records PathMate8, Coincident1, and Concentric1. The arm and oc concentric axes align with dot product 1.

The runtime artifact is:

public/models/digital-twin/cluster-03/connections/arm-left-1.json

The driver path is referenced from the verified oc-left.json artifact rather than copied as an untracked geometry offset. The arm's CAD mating point is reconstructed at progress 0 with residual 8.469999434971913e-17 m.

## Verification

- node scripts/digital-twin/cluster-03/cad/validate-cluster-03-arm-left-1-motion.mjs — passed
- node scripts/digital-twin/cluster-03/cad/generate-cluster-03-arm-left-1-connection.mjs --check — passed
- Progress samples 0, 0.5, 1 — passed
- GLB matrix residual: 2.994173913806186e-7
- Previously verified oc_left-1 and oc_right-1 records remain ready

## Chain status

The later checkpoints are now complete. `arm_left_1-1` remains a separate GLB mesh sibling of `body_may-1`; the body mesh is not nested inside or merged into the arm node. Its body-facing geometry is part of the `arm_left_1.SLDPRT` mesh and its `PathMate8` relation is the intended CAD connection to the body path.

`arm_left_2-1` follows the same verified cam path. `arm_left_3-1` is coupled at runtime by the Phase 6 point-on-rotated-line solver, which keeps the `PathMate10` point on `Sketch1:Line1` while preserving the arm axis/pivot relation. The chain validator is:

`scripts/digital-twin/cluster-03/cad/validate-cluster-03-arm-left-chain-motion.mjs`
