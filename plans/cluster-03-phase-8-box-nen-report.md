# Cluster-03 Phase 8 — `box_nen-1` checkpoint

Status: verified at the part level.

## CAD evidence

- Source assembly: `Final.SLDASM` (SolidWorks revision `32.1.0`).
- Target component: `box_nen-1` from `box_nen.SLDPRT`.
- Motion group: `motor_nen`.
- CAD mounting parent: fixed `body_may-1`.
- Orientation mates: `Concentric28`, `Parallel15`.
- Motion constraints: `Screw2` (`truc_nen-1` ↔ `box_nen-1`) and `LimitDistance4` (`box_nen-1` ↔ `gear_nen-1`).
- Extractor output: `plans/cluster-03-phase-8-box-nen-cad-evidence.json`.

`Concentric28` and `Parallel15` keep the box coaxial and aligned with the fixed body while leaving the axial slide degree of freedom. The logical lower-drive chain remains `gear_motor_nen-1 -> GearMate4 -> gear_nen-1 -> truc_nen-1 -> Screw2 -> box_nen-1`.

## Runtime change

- Motion artifact: `public/models/digital-twin/cluster-03/connections/box-nen.json`.
- Contract: `cluster-03-box-nen-motion.v1`, `kind: screw-follow`.
- Manifest part status: `runtime-box-nen-screw-follow-ready`.
- `box_nen-1` is attached to its CAD mounting parent `body_may-1`, then translated alone along the Screw2 axis using the resolved lower-drive displacement after `GearMate4` coupling; the visible shaft remains rotation-only.
- The aggregate `final.glb` remains the only render owner; no overlay GLB was added.

## Validation

- Initial GLB/CAD matrix residual: `2.9941739065897366e-7` (matrix tolerance `1e-5`).
- Screw pitch: `0.004 m/revolution`; the viewer now exposes 6 motor revolutions per progress cycle, giving an approximate runtime travel of `0` to `-0.024 m` before the small `GearMate4` ratio correction.
- CAD screw-follow samples at one revolution remain (`0`, `-0.002`, `-0.004 m`); runtime applies the expanded 6-revolution envelope to `box_nen-1` only, while the shaft and gears do not receive axial translation.
- `node scripts/digital-twin/cluster-03/cad/generate-cluster-03-box-nen-connection.mjs --check`: passed.
- `npx.cmd tsc --noEmit --incremental false`: passed.

The manifest keeps the overall `runtimeReady: false` marker because the plan still tracks final phase-9/11 controller verification separately; `box_nen-1` itself is resolved in the `motor_nen` motion branch.
