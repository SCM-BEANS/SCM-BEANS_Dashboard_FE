# Cluster 03 phase 7 — arm_right_3

Status: verified from SolidWorks read-only evidence.

- Driver: `truc_chinh-1`.
- CAD mates: `Parallel7` and `Concentric22` make `arm_right_3-1` follow the main shaft; `Coincident15` resolves it against `body_may-1`; `PathMate14` receives the line connection from `arm_right_2-1`.
- The two `Concentric22` reference points differ along the common axis, so validation uses axis-line separation rather than an incorrect point-distance check.
- Runtime artifact: `/models/digital-twin/cluster-03/connections/arm-right-3.json`.

The main motor branch drives `truc_chinh-1`; `arm_right_3-1` uses that coupled shaft angle, so the right branch does not introduce an independent motor.
