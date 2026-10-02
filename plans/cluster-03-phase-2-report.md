# Cluster 03 - Phase 2 report

## Status

`Verified - root-frame gate passed; motion phases remain deferred.`

Phase 2 establishes the CAD/GLB aggregate frame for cluster-03. It does not resolve parent/pivot relationships or enable a new motion controller.

## Root-frame evidence

- Evidence artifact: `public/models/digital-twin/cluster-03/connections/root-frame.json`.
- All 18 CAD component transforms were compared with the 18 named mesh-node matrices in `final.glb`.
- Maximum translation residual: `0.000465459 mm`.
- Maximum matrix-entry residual: `4.947491722973041e-7`.
- Target tolerance: `0.1 mm` translation and `1e-4` matrix entry.
- `body_may-1` is fixed in the CAD inventory and is used as the root authority.
- The validated aggregate root transform is identity; the GLB already carries the CAD component transforms.

## Runtime change

- `DigitalTwinClusterCanvas` loads and validates `root-frame.json` before accepting the cluster-03 model.
- Cluster-03 applies the validated matrix once at the aggregate root and preserves all GLB node transforms.
- Cluster-03 no longer recenters the model by bounding-box offset. Camera fitting changes camera position/target only.
- Cluster-02 keeps its existing legacy centering path because it has no cluster-03 root-frame contract; cluster-01's separate viewer was not changed.
- `root-frame.json`, `final.glb`, and the manifest are served from cluster-03-only URLs.

## Verification evidence

Passed:

- `node scripts/digital-twin/cluster-03/cad/validate-cluster-03-root-frame.mjs`
- `node scripts/digital-twin/cluster-03/cad/generate-cluster-03-manifest.mjs --check`
- `node --check` for both cluster-03 extraction scripts
- `git diff --check`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `npm.cmd run build`
- Local HTTP checks returned `200` for `final.glb`, `root-frame.json`, and `cluster-03.manifest.json`.
- Browser smoke test at `/digital`: Compressor tab reached `Compressor model ready`; Reset camera remained functional and the model stayed visible.

The build emitted an existing Recharts warning about a chart container with width/height `-1`. The repository lint command is unavailable in the current setup: `next lint` is incompatible with the installed Next 16 command behavior, and direct ESLint has no project configuration.

## Review and boundary

Separate Standard review found no material Phase 2 findings. Existing unrelated changes in the digital-twin viewer/workspace and translation files were preserved.

Phase 3 has not started. The next gate is the first part-level checkpoint for `oc_left`; its parent, pivot, and Sketch path must be extracted and verified before any additional part is changed.
