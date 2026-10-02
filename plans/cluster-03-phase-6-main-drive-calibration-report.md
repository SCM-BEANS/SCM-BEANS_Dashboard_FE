# Cluster 03 Phase 6 — main-drive calibration increment

## Result

The main branch now uses `oc_left-1` as the normalized path master. The
`gear_motor_chinh-1` angle is interpolated from a CAD-derived 101-point table
covering cam progress `0..1`, ending at `1.66818569905618` radians. The
`GearMate2` relation remains reversed 1:1, so `wiper_gear-1` receives the
exact negative motor angle.

`LimitDistance2` is evaluated as its CAD range, not as a fixed nominal 6 mm
offset. `PathMate10` and `LimitDistance1` are checked at the same runtime
solution before arm_left_2 is applied.

## arm_left_1 body connection

`arm-left-1.json` now contains an explicit verified `bodyConnection` record for
`PathMate8`, connecting `arm_left_1-1` to `body_may-1` Sketch1 `Arc3+Line1`.
The runtime parser and CAD validator require this record.

## Evidence

- `oc_left-1` CAD path length is preserved at `0.039434609527920564 m`.
- 1001 interpolated checks across progress `0..1` remain within both CAD
  distance ranges.
- `LimitDistance2`: `0.002469471663313584..0.00600000000000005 m`.
- `LimitDistance1`: `0.0014694716633136002..0.005000000000000094 m`.
- `arm_left_1` PathMate8 start residual: `0 m`.

## Verification

- TypeScript: passed.
- Gear motor and arm-left generators with `--check`: passed.
- gear_motor_chinh, arm_left_1, arm_left_2, arm_left_3 and chain validators:
  passed.
- `diagnose-cluster-03-main-drive-range.mjs`: passed at 1001 samples.

The remaining cluster-03 components outside this left/main-drive checkpoint
are still governed by the existing phase status.
