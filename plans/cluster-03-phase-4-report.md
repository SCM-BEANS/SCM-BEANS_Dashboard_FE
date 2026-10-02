# Cluster 03 - Phase 4 report

## Status

`Verified; CAD/GLB/runtime and live browser smoke gates passed for oc_right-1.`

Phase 5 was not started. The remaining cluster-03 parts remain pending.

## CAD connection resolved

- SolidWorks source: `Final.SLDASM`, revision `32.1.0`, new read-only extraction session.
- Target component: `oc_right-1` from `oc_right.SLDPRT`.
- CAD parent/root: fixed `body_may-1` from `body_may.SLDPRT`.
- Connection: `PathMate12` (`swMatePATH`), target reference type 25 on `oc_right-1` and path reference on `body_may-1`.
- Motion path: `body_may.SLDPRT:Sketch2`, using `Arc1 -> Line2`; both segment directions are recorded as `reverse` because the PathMate anchor is at the Arc1 endpoint and the connected Line2 endpoint is the opposite CAD segment direction.
- Target evidence: `oc_right.SLDPRT:Sketch1`.
- Render owner: `final.glb` node `oc_right-1`; no separate detail GLB is overlaid.

The SolidWorks extractor reported `errors=0, warnings=2` while opening the assembly. It did not save or modify CAD.

## Delivered artifacts

- `plans/cluster-03-phase-4-oc-right-cad-evidence.json`
- `public/models/digital-twin/cluster-03/connections/oc-right.json`
- `scripts/digital-twin/cluster-03/cad/generate-cluster-03-oc-right-connection.mjs`
- `scripts/digital-twin/cluster-03/cad/validate-cluster-03-oc-right-motion.mjs`
- Updated `cluster-03.manifest.json` and `validation.json` with both oc motion definitions.

The manifest status is `phase-4-oc-right-ready`; aggregate `runtimeReady` remains `false` because all other parts are still pending.

## Numerical evidence

- PathMate anchor to `Sketch2:Arc1` endpoint: `2.86e-17 m`.
- `Sketch2` Arc1-to-Line2 join: `0 m`.
- Anchor reconstruction from the CAD component transform: `0 m`.
- GLB initial anchor residual: `2.998e-7 m`, within the `1e-6 m` runtime tolerance.
- Stored motion samples at progress `0`, `0.5`, and `1`: residuals `0`, `6.94e-18 m`, and `0 m`.

The previous `oc_left-1` checkpoint was rechecked and remains valid: `Arc3 -> Line1`, initial residual `3.139e-7 m`.

## Runtime behavior

- Cluster 03 loads `oc-left.json` and `oc-right.json` through the same validated motion-definition loader.
- Each node gets an independent CAD-derived path, anchor, state, and guide; both preserve their initial orientation.
- Existing `Cam -`, `Cam +`, `Auto`, `Line`, and `Reset` controls drive/show both oc states in the same scene for combined testing.
- `final.glb` remains the only render owner. `oc_left.glb` is not loaded as an overlay.

## Verification

Passed:

- `generate-cluster-03-manifest.mjs --check`
- `generate-cluster-03-oc-left-connection.mjs --check`
- `generate-cluster-03-oc-right-connection.mjs --check`
- `validate-cluster-03-oc-left-motion.mjs`
- `validate-cluster-03-oc-right-motion.mjs`
- `validate-cluster-03-root-frame.mjs`
- `tsc --noEmit --incremental false`
- `npm.cmd run build`
- `git diff --check`
- HTTP `200` for `/digital`, both motion JSON files, `cluster-03.manifest.json`, and `validation.json` from the local dev server.

The production build retains the existing Recharts warning about chart width/height `-1`. `npm.cmd run lint` remains unusable because the current project script runs `next lint`, which Next 16 interprets as a missing project directory.

Live browser smoke test passed in Edge at `http://localhost:3000/digital` with the Compressor tab selected:

- model status showed `Compressor model ready`;
- `Cam +` moved the shared progress from `0%` to `5%` and `Cam -` returned it to `0%`;
- `Auto` toggled on and off while both motion guides were visible;
- `Line` changed from `Hide cam line` to `Show cam line` and back;
- after moving to `10%`, `Reset` returned both oc states to `0%` and left the model ready.

The live screenshot showed the compressor scene with both oc guides and the test controls visible.

## Gate

Phase 4 is complete and stops here. Do not start Phase 5 without a new phase request. No other part was connected in this phase.
