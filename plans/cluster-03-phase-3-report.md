# Cluster 03 - Phase 3 report

## Status

`Implemented and CAD/GLB gate verified for oc_left-1; Phase 4 intentionally not started.`

This phase changed only the first movable checkpoint, `oc_left-1`. `oc_right-1` and the remaining cluster-03 parts were not connected.

## CAD connection resolved

- SolidWorks source: `Final.SLDASM`, revision `32.1.0`, read-only extraction.
- Target component: `oc_left-1` from `oc_left.SLDPRT`.
- CAD parent/root: fixed `body_may-1` from `body_may.SLDPRT`.
- Connection: `PathMate7` (`swMatePATH`), with the target reference on `oc_left-1` and the path reference on `body_may-1`.
- Motion path: `body_may.SLDPRT:Sketch1`, ordered `Arc3 -> Line1`.
- Render owner: `final.glb` node `oc_left-1`; `oc_left.glb` remains a non-loaded detail artifact.

The extracted anchor is stored in assembly coordinates and as a local node point. No body-assembly offset or hand-written CAD coordinate remains in the runtime motion logic.

## Delivered artifacts

- `plans/cluster-03-phase-3-oc-left-cad-evidence.json`
- `public/models/digital-twin/cluster-03/connections/oc-left.json`
- `scripts/digital-twin/cluster-03/cad/Cluster03OcLeftConnection.cs`
- `scripts/digital-twin/cluster-03/cad/generate-cluster-03-oc-left-connection.mjs`
- `scripts/digital-twin/cluster-03/cad/validate-cluster-03-oc-left-motion.mjs`

The cluster-03 manifest now records `phase-3-oc-left-ready`, the resolved parent/anchor, and the motion-definition URL. Overall `runtimeReady` remains `false` because the other parts are still pending.

## Numerical evidence

- CAD anchor to Sketch1 arc start: `8.47e-17 m`.
- CAD arc-to-line join: `0 m`.
- CAD anchor reconstructed from the `oc_left` transform: `2.78e-17 m`.
- GLB initial anchor residual: `3.14e-7 m` (within the `1e-6 m` motion check tolerance and the Phase 2 GLB alignment tolerance).
- Motion samples at progress `0`, `0.5`, and `1`: residuals `0`, `6.94e-18 m`, and `0 m`.

## Runtime behavior

- The viewer loads and validates `oc-left.json` only for cluster-03.
- The guide is generated from the manifest path and attached only as visualization.
- The node moves by preserving its CAD-derived local anchor; orientation is preserved.
- `Cam -`, `Cam +`, `Auto`, `Line`, and `Reset` continue to use the existing controls.
- The runtime creates one motion state for `oc_left-1`; it does not move `oc_right-1`.
- Cluster-02 keeps its separate legacy recentering path.

## Verification

Passed:

- SolidWorks extractor compiled and completed read-only extraction with the requested active assembly path.
- `node scripts/digital-twin/cluster-03/cad/validate-cluster-03-root-frame.mjs`
- `node scripts/digital-twin/cluster-03/cad/generate-cluster-03-manifest.mjs --check`
- `node scripts/digital-twin/cluster-03/cad/generate-cluster-03-oc-left-connection.mjs --check`
- `node scripts/digital-twin/cluster-03/cad/validate-cluster-03-oc-left-motion.mjs`
- `node --check` for the new Phase 3 generators/validators.
- `tsc --noEmit --incremental false`.
- `npm.cmd run build`.
- HTTP `200` for `final.glb`, `root-frame.json`, `oc-left.json`, and `cluster-03.manifest.json`.
- `git diff --check`.

The existing `npm.cmd run lint` command remains unusable because installed Next 16 interprets `next lint` as a project directory. The build emitted the existing Recharts width/height `-1` warning.

Browser interaction smoke test could not be run in this turn because the browser helper reported `No browser is available`. Therefore the CAD/GLB and build gates pass, but the click-level Cam/Auto/Reset observation remains pending a live browser session. Per the plan, Phase 4 is stopped until that gate is observed.
