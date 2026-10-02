# Cluster 03 — Phase 1 report

## Status

`Verified — contract gate ready; runtime motion not enabled.`

Phase 1 was limited to the cluster-03 manifest, connection-data contract, and isolated asset layout. No React/viewer code, CAD source, or animation logic was changed.

## Delivered artifacts

- `public/models/digital-twin/cluster-03/connections/cluster-03.manifest.json`
- `public/models/digital-twin/cluster-03/connections/sketches.json`
- `public/models/digital-twin/cluster-03/connections/constraints.json`
- `public/models/digital-twin/cluster-03/connections/validation.json`
- `scripts/digital-twin/cluster-03/cad/generate-cluster-03-manifest.mjs`

The generator is deterministic from `plans/cluster-03-phase-0-inventory.json` and supports a read-only `--check` validation pass.

## Contract decisions

- Contract version: `cluster-03-connections.v1`.
- Runtime units: meters.
- Coordinate frame: `solidworks-assembly`.
- All 18 parts map to the corresponding mesh node in the aggregate `cluster-03/final.glb`.
- `final.glb` is the only render owner in this phase; `oc_left.glb` is recorded as a deferred detail artifact and is not loaded as an overlay.
- `body_may-1` is the fixed assembly root. The other 17 parts have explicit pending parent/pivot states until SolidWorks mate entities and reference geometry are normalized.
- All 51 mate records remain `pending-mate-entity-extraction`; no parent/child or pivot was guessed from filenames or bounding boxes.
- The manifest contains a loader contract, duplicate-mesh/z-fighting rule, artifact matrix, and rollback plan that retains the aggregate model if the new contract fails to load.

## Evidence

- 18 part records; stable IDs are unique.
- 18 mapped mesh indices; mesh indices are unique.
- 21 sketch records preserved from the Phase 0 inventory.
- 51 CAD mate records preserved as inventory-only constraints.
- Every required JSON file exists under the cluster-03 `connections` directory.
- No generated connection artifact contains a cluster-01/cluster-02 reference or an absolute local source path.
- `runtimeReady` is intentionally `false`.

## Checks run

```text
node scripts/digital-twin/cluster-03/cad/generate-cluster-03-manifest.mjs
node scripts/digital-twin/cluster-03/cad/generate-cluster-03-manifest.mjs --check
node --check scripts/digital-twin/cluster-03/cad/generate-cluster-03-manifest.mjs
git diff --check
```

All checks passed. The separate review found no material Phase 1 findings.

## Boundary

Phase 2 has not started. The next authorized phase is root-frame/model alignment; the first part-level motion checkpoint remains `body_may`, followed by `oc_left` only after the root frame is verified.
