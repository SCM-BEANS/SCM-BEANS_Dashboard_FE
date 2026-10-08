# Digital Twin Body Compressor Motion

## Objective

Make the compressor assembly represented by `may_ne_coffe-1` in the Body tab use the existing Cluster 3 model and verified Cluster 3 motion logic. The Body tab will expose one compressor motion control that toggles between Run and Stop. The motion is stopped on initial load, and the existing camera controls remain available.

## Confirmed decisions

- Architecture: reuse the existing Cluster 3 GLB, root-frame contract, motion-definition JSON files, and kinematic solver. Do not export or replace another CAD asset.
- User-facing workflow: one Body-tab motion button, default stopped. The button toggles the main and lower Cluster 3 drives together. Existing zoom and camera-reset controls are not motion controls and remain unchanged.
- Coordinate strategy: keep a canonical Cluster 3 runtime model in its original CAD coordinate frame, keep it non-rendering, and mirror its local poses to a render clone placed with a runtime-computed transform from `body_may-1` to the Body model node `may_ne_coffe-1`. Do not transform the canonical solver model or rewrite CAD motion coordinates.
- Source of truth: Cluster 3 motion equations and contract validation remain owned by the existing Cluster 3 feature code. The Body integration consumes a narrow runtime adapter rather than duplicating kinematic equations.
- Lifecycle: Body-tab unmount disposes the solver, guide geometry, model resources, and shared GPU resources. Switching tabs must leave no running animation loop or retained model reference.
- Visual behavior: preserve the current GLB materials and environment lighting. Do not add a body-wide recolor or CAD export step. The static `may_ne_coffe-1` mesh is hidden only when the compressor integration is enabled so it is not rendered underneath the moving parts.

## Alternatives considered

### Reuse Cluster 3 runtime (selected)

This keeps the verified CAD motion data and existing validation in one place, avoids a second animation implementation, and is reversible because the static Body path remains available when the integration flag is disabled. The additional complexity is a canonical-runtime/render-clone bridge and explicit shared-resource cleanup.

### Export a new animated Body GLB from CAD (not selected)

This could make the Body asset self-contained, but it requires a new external CAD export, a new node/animation contract, and another validation path. It would also make the current verified Cluster 3 solver unavailable for the Body integration and is not needed because the measured `may_ne_coffe-1` and `body_may-1` bounds already match.

## Current structure and constraints

- `src/components/features/digital-twin/BodyModelViewer.tsx` owns Body-tab status, retry, camera state, and overlay controls.
- `src/components/features/digital-twin/BodyModelCanvas.tsx` loads `coffee_machine_03_v2.glb`, hides requested Body nodes, attaches Mayxoay when requested, fits the camera, and owns Body resource cleanup.
- `src/components/features/digital-twin/DigitalTwinClusterCanvas.tsx` owns Cluster 3 model loading, contract parsing, CAD path/axis solving, guide creation, and the animation loop.
- `src/components/features/digital-twin/DigitalTwinWorkspace.tsx` mounts only the active tab. The Body tab and Combined tab share `BodyModelViewer`, so compressor loading must be opt-in and must not be enabled for Combined.
- Cluster 3 assets are local: `public/models/digital-twin/cluster-03/final.glb`, `connections/root-frame.json`, and the 15 motion-definition JSON files already passed to the Cluster 3 viewer.
- The worktree already contains user changes replacing `Body.glb` with `coffee_machine_03_v2.glb`. Those changes and unrelated existing changes must be preserved.

## Proposed boundaries and interfaces

1. `DigitalTwinClusterCanvas.tsx`
   - Add a narrow exported `ClusterMotionRuntime` adapter with operations to apply progress, advance both drives, update guide visibility, and dispose motion state.
   - Move the existing Cluster 3 scene initialization and frame-advance behavior behind that adapter so the Cluster 3 tab continues to use the same solver path.
   - Export only the loader/assembly helpers required by Body integration: root-frame loading, motion-definition loading, part preparation/combination/validation, and runtime creation. Do not expose individual kinematic equations to Body code.

2. `BodyModelCanvas.tsx`
   - Add an opt-in compressor integration and a `compressorRunning` input.
   - Load the existing Cluster 3 model and contracts alongside the Body model when enabled.
   - Validate the Cluster 3 assembly, create the canonical runtime, clone the post-attachment hierarchy for display, and compute the placement matrix from the Body `may_ne_coffe-1` world matrix and Cluster 3 `body_may-1` world matrix.
   - Hide the static Body compressor mesh, render only the placed clone, and synchronize local transforms after each solver update. The canonical runtime remains hidden and untransformed.
   - Include the placed clone in camera bounds and dispose shared clone resources exactly once.

3. `BodyModelViewer.tsx`
   - Add an opt-in `includeCompressorMotion` prop for the Body tab.
   - Keep a single `compressorRunning` state and render one accessible Run/Stop toggle. Disable it while loading or after an error; retry returns it to stopped.
   - Keep zoom and camera-reset controls and existing loading/ready/error overlays.

4. `DigitalTwinWorkspace.tsx` and translations
   - Enable compressor motion only for the Body tab.
   - Add English and Vietnamese labels/ARIA text for the Body compressor Run/Stop toggle and update the Body canvas label from static wording to interactive wording where needed.

## Acceptance criteria

- Opening `/digital` on the Body tab loads the existing Body model and the existing Cluster 3 assets without a CAD/export step.
- `may_ne_coffe-1` is not rendered underneath the integrated compressor, while the rest of the Body model and its current materials remain visible.
- At rest, the runtime-computed transform maps the Cluster 3 anchor node `body_may-1` onto the Body node `may_ne_coffe-1`; the full displayed 18-mesh Cluster 3 assembly has the same world AABB as the replaced Body compressor within `1e-6` meters.
- The Body tab has one compressor motion Run/Stop button. It is stopped on first load, disabled during loading/error, and has correct `aria-pressed`/accessible labeling.
- Activating Run advances both main and lower Cluster 3 drive chains together; Stop freezes the current pose. It must not start a second animation loop when clicked repeatedly.
- Cluster 3 motion-definition validation, path/axis coupling, and existing Cluster 3 tab behavior remain intact.
- Switching away from Body or retrying does not leave animation, guide meshes, or GPU resources alive.
- Combined, Mechanism, Cluster 02, and standalone Cluster 03 tabs do not gain compressor loading or regress their existing controls.
- `npx tsc --noEmit --incremental false` passes. The relevant build/check commands are run and any pre-existing command failure is reported separately from regressions.

## Phase 1 — Shared Cluster 3 runtime adapter

### Outcome

The existing Cluster 3 scene uses a reusable runtime adapter with no intended user-visible behavior change. The adapter is the only new entry point Body integration uses for Cluster 3 motion.

### Scope

- Add the runtime interface and factory around the existing solver state initialization, progress application, automatic advance, guide visibility, and cleanup.
- Refactor `ClusterScene` to use the adapter while preserving its current manual progress, auto-motion, guide, reset, and error behavior.
- Preserve all existing Cluster 3 contract parsing and kinematic equations.

### Non-scope

- No Body-tab rendering or new button yet.
- No changes to GLB/JSON assets.
- No changes to CAD equations, progress speed, motion ranges, or Cluster 3 UX labels.

### Dependencies and boundary

- Depends on the existing `DigitalTwinClusterCanvas.tsx` model/contract code and local Cluster 3 assets.
- Changes are limited to `DigitalTwinClusterCanvas.tsx` and its internal types/helpers.
- No external service, package installation, asset replacement, commit, or deployment.

### Side effects and risks

- The runtime factory must clean up any guide meshes if initialization fails halfway through.
- The current Cluster 3 tab must retain its existing React-state progress semantics; the adapter must not introduce a competing timer or state loop.

### Verification

- Type-check the changed module.
- Run the existing Cluster 3 CAD/contract validation scripts that are relevant to the loaded root and motion definitions.
- If browser tooling is available, load the standalone Cluster 3 tab and confirm the existing controls still move the same chains. Otherwise record the environment limitation.

### Acceptance, entry, exit, and review gates

- Entry: current Cluster 3 code and contracts are unchanged and readable.
- Exit: adapter compiles, Cluster 3 uses it, cleanup is explicit, and no acceptance criterion outside this phase is claimed.
- Stop if the adapter requires changing the verified motion equations or if a Cluster 3 contract becomes invalid.
- Review gate: inspect the diff for duplicated solver logic, stale refs, and resource cleanup before Phase 2.

## Phase 2 — Body-tab compressor integration and one-button UX

### Outcome

The Body tab renders the placed Cluster 3 compressor parts over the Body model and controls both drive chains with one Run/Stop button.

### Scope

- Extend `BodyModelCanvas.tsx` with opt-in Cluster 3 loading, dynamic placement, hidden canonical runtime, display-clone pose synchronization, camera-bound union, and cleanup.
- Extend `BodyModelViewer.tsx` with `includeCompressorMotion`, one stopped-by-default Run/Stop state, and accessible button states.
- Enable the option from the Body branch in `DigitalTwinWorkspace.tsx`; leave Combined opt-out.
- Add the required English/Vietnamese translation keys and interactive Body label.

### Non-scope

- No manual main/lower sliders, cam-line controls, telemetry, backend commands, IoT control, or automatic start.
- No changes to the other digital-twin tabs.
- No changes to source 3D assets or material colors.

### Dependencies and boundary

- Depends on Phase 1 runtime adapter and the existing Body/Cluster asset contracts.
- Changes are limited to the digital-twin feature components and translation dictionary.
- The placement transform is computed at load time from actual node world matrices; no hardcoded camera/model offset is introduced.

### Side effects and risks

- Two scene graphs share geometries/materials. The display clone must not independently dispose shared resources; canonical cleanup owns them once.
- If `may_ne_coffe-1`, `body_may-1`, or any required motion node is missing, the whole Body integration must enter its existing error state rather than render a partially aligned machine.
- Pose synchronization must run after the canonical solver update and must copy reparented local transforms created by the verified attachment setup.

### Verification

- Validate the required Body and Cluster node names and the placement AABB using a deterministic Three.js/runtime check or a browser console check if the in-app browser is available.
- Type-check all changed TypeScript files.
- Exercise loading, stopped initial state, one click to Run, repeated clicks, Stop, retry, tab switch/unmount, and error overlay behavior.
- Confirm Combined does not load Cluster 3 URLs and standalone Cluster 3 still has its prior controls.

### Acceptance, entry, exit, and review gates

- Entry: Phase 1 adapter passes its review gate.
- Exit: all Body acceptance criteria pass, one motion toggle is visible and accessible, and the integrated pose is aligned at rest and while moving.
- Stop if placement cannot be derived from actual node matrices, if static and moving compressors visibly double-render, or if cleanup cannot be proven.
- Review gate: inspect the Body diff for stale loading promises, duplicate disposal, animation-loop duplication, and accidental Combined-tab activation before Phase 3.

## Phase 3 — Standard verification and handoff

### Outcome

The implementation is checked against the complete acceptance criteria and handed off with exact evidence and known limitations.

### Scope

- Run focused checks first, then broader available checks justified by the React/Three.js integration risk.
- Review final diff/status for accidental files and preserve the user’s existing model replacement changes.
- Record unavailable browser/visual checks without presenting them as passed.

### Non-scope

- No new test framework or dependency installation.
- No commit, push, deployment, or external CAD operation.

### Dependencies and boundary

- Depends on completed Phases 1 and 2.
- Verification remains inside the designated workspace.

### Verification plan

- `npx tsc --noEmit --incremental false` as the required static check.
- `npm run build` as the broader production check, if it runs in the current environment.
- `npm run lint` may be attempted but its known Next 16/legacy `next lint` compatibility failure must be classified separately if unchanged.
- Relevant Cluster 3 validation scripts and a deterministic node/placement check if available.
- Browser visual/interaction check for Body and standalone Cluster 3 if the existing browser environment starts successfully.

### Acceptance, entry, exit, and review gates

- Entry: Phase 2 review gate passed.
- Exit: every available required check is mapped to an acceptance criterion and final status is `verified`, `failed`, or `unverified`; no success claim is made for unavailable checks.
- Stop on a confirmed product regression or a required failed check; preserve the first failure evidence.
- Final review gate: inspect `git diff --check`, `git status --short`, changed paths, and the final test output before handoff.

## Explicit assumptions

- The user’s earlier request for “one button” refers to one compressor motion control; the existing zoom and camera-reset buttons remain because they control viewing rather than machine motion.
- The user accepts Run/Stop semantics where Stop freezes the current pose. A future Reset Motion control is out of scope.
- The Body tab should use both main and lower Cluster 3 drive chains simultaneously because the user described `may_ne_coffe-1` as one physical unit corresponding to Cluster 3.
- Existing Body hidden-node behavior (`CV02_Matphai-1`, `HK05_TamR-1`, `PART_03_BL-1`, and `Assem_HeNhiet02-1`) is preserved.
