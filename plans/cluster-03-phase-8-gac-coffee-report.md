# Cluster 03 Phase 8 — gac_coffee-1

## Result

`gac_coffee-1` now uses the CAD relationship actually read from `Final.SLDASM`:

- Primary parent: `body_may-1` through `Coincident10`
- Contact relation: `arm_left_1-1` through `Tangent3`
- GLB node: `gac_coffee-1` in `final.glb`
- Runtime relation: `body-mounted-tangent-contact` with `straight-body-bar-translation` motion driven by the `Tangent3` contact projection from `arm_left_1-1`

The node is not reparented under the moving `arm_left_1-1`; its CAD parent remains `body_may-1`. During `Arc3` (path progress `0 → 0.6196234683`), the runtime projects the verified `Tangent3` contact displacement onto the fixed CAD-derived straight slide axis `[0, -1, 0]` and preserves the GAC orientation. Once the arm enters `Line1`, the GAC pose is held and only the arm-side contact/connector slides along the groove.

## Evidence

SolidWorks revision `32.1.0` was inspected in a separate read-only session. The evidence file is:

`plans/cluster-03-phase-8-gac-coffee-cad-evidence.json`

It contains both mate records with no extraction warnings:

- `Coincident10`: `body_may-1` ↔ `gac_coffee-1`
- `Tangent3`: `arm_left_1-1` ↔ `gac_coffee-1`

The normalized runtime artifact is:

`public/models/digital-twin/cluster-03/connections/arm-left-1.json`

## Verification

- `node scripts/digital-twin/cluster-03/cad/validate-cluster-03-arm-left-1-motion.mjs` — passed
- `node scripts/digital-twin/cluster-03/cad/generate-cluster-03-arm-left-1-connection.mjs --check` — passed
- CAD/runtime samples `0`, `0.5`, `1` — passed for the arm path; GAC initial GLB residual `3.219637925155894e-7`
- Edge browser workflow at `http://localhost:3000/digital`: Compressor loaded, main-drive progress was checked at `0%`, `60%` (arc), `70%` (line), and `100%` (line); the model remained in the `Compressor model ready` state
- `npx.cmd tsc --noEmit --incremental false` — passed
- `npm.cmd run build` — passed

The overall Cluster-03 plan remains partial; this checkpoint only corrects `gac_coffee-1` and does not mark the remaining Phase 8 parts complete.
