# Digital Twin Material Effects - Revised Plan

## Topic and status

- Topic: capture the saved Sketch18 CAD coordinate and use it to place the coffee-ground effect inside Machine Body.
- Current checkpoint: Phase 4 implementation is complete; Phase 5 visual/regression verification remains unverified because no browser surface is available.
- Next work: visually verify the Body coffee origin, direction, density, replay, and cleanup when a browser/WebGL surface is available.
- Execution mode: Standard, TDD Off. Phase 3 evidence and Phase 4 Body implementation are recorded below; Phase 5 remains the acceptance gate.
- Deferred: water flow, ong_nuoc.glb, backend/live transport, physical machine control, GLB re-export, and unrelated Digital Twin cleanup.

This revision supersedes the previous Phase 3/4/5 ordering in this plan. The old Phase 3 visual gate is retained as verification inside the new Body work, while water is deferred until the coffee effect has been accepted in Body.

## Objective

Use the actual post-grinding opening represented by Sketch18 in Mayxoay1.SLDPRT as the authoritative CAD reference. Store the transformed point in the Mayxoay1-model frame and resolve it through the existing Body node Mayxoay1-1 when the Body effect is added. Reuse the deterministic coffee particle effect and make the Body operation cycle emit coffee after the grinding stage without changing existing machine motion ownership or exposing the deferred water asset.

## Confirmed user and architecture decisions

- Work remains stopped at the isolated coffee prototype in Phase 2 until the next implementation request.
- The next phase begins with CAD coordinate capture, not water and not a new test tab.
- Sketch18 is the source of truth for the outlet center and normal. Its raw CAD coordinates must be persisted with explicit frame and unit metadata; the raw sketch coordinate must never be treated as a Three.js world coordinate.
- Coffee is the only effect in this revision. Body integration follows the user meaning of coffee leaving Mayxoay after grinding.
- The existing /digital tab structure remains. Machine Body keeps its existing operation, camera, compressor, loading, error, and retry controls.
- The feature-owned material-effects code owns coffee configuration, deterministic particle math, and the reusable visual layer. BodyModelViewer owns operation state and passes a narrow playback input. BodyModelCanvas owns the Body/GLB scene graph, verified anchor transform, and resource lifecycle.
- No CAD reader or SolidWorks COM dependency runs in the browser. CAD is read once during calibration and the verified numeric evidence is committed to the frontend feature configuration.
- Phase 3 does not require loading or attaching the standalone may_xoay.glb. The Machine Body runtime anchor is the existing Mayxoay1-1 node; its matrixWorld converts the persisted local Sketch18 point. The isolated Phase 2 test may continue to use its own Mayxoay1-2 asset.
- ong_nuoc.glb remains hidden and absent from this work.

## Current evidence

The following was read from the saved file through the SolidWorks API in read-only mode on 2026-10-13:

~~~text
CAD file: C:\GIT\Coffee_Machine_V3\HeKhungChinh\Mayxoay1.sldprt
Feature: Sketch18 (feature index 52, ProfileFeature, after Boss-Extrude14)
Sketch: 2D, not derived, editable, under-constrained
Geometry: one non-construction circular arc
Radius: 0.01125 m (11.25 mm)
Diameter: 0.02250 m (22.50 mm)
Center in Sketch18 local frame: (-0.0605, 0, 0) m
Normal in Sketch18 local frame: (0, 0, 1)
Model-to-sketch transform array:
  [1, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, -0.012, 1, 0, 0, 0]
~~~

The center and normal are evidence in the Sketch18 frame only. Phase 3 must invert/apply the documented transform and verify the result against the loaded GLB and the Body attachment before any Body particle is allowed to use it.

## Decision record

| Decision | Options considered | Selected outcome and rationale |
| --- | --- | --- |
| CAD data at runtime | Read SolidWorks/CAD at runtime; hardcode an unexplained world point; capture typed evidence once | Capture typed, frame-labelled CAD evidence once. Browser runtime stays local and deterministic, and future recalibration has an auditable source. |
| Coordinate storage | New generic data layer; feature config; external-only notes | Store the raw Sketch18 evidence and the verified derived anchor in the existing material-effects feature configuration/schema. No generic layer is justified. |
| Body trigger | Always-on coffee; full-cycle-only trigger; separate coffee trigger | Keep the full operation trigger and add one separate Body-only coffee simulation button. Both paths feed the same one-shot coffee layer; the manual path does not start machine motion. |
| Renderer reuse | Duplicate particle code in Body; import the test viewer wholesale; extract a renderer/runtime boundary | Extract a test- and Body-neutral coffee visual/runtime layer. Keep test controls and test controller private to the test tab. |
| Coordinate anchor | Guess a Body world coordinate; use a mesh bounding-box center; attach to the verified Sketch18-derived point | Resolve a unique Mayxoay/body source chain and apply the calibrated Sketch18-derived local point and normal. Fail visibly on missing or ambiguous anchors. |
| Water sequencing | Add water now; integrate water before coffee; defer water | Defer water until coffee is accepted in Body. No water code or pipe asset changes in this revision. |

## Frontend structure and boundaries

### Relevant current tree

~~~text
src/app/(dashboard)/digital/page.tsx              # existing route composition
src/components/features/digital-twin/
  DigitalTwinWorkspace.tsx                        # existing tab composition
  BodyModelViewer.tsx                              # Body UI and operation controller
  BodyModelCanvas.tsx                              # Body GLB scene and motion runtime
  DigitalTwinClusterCanvas.tsx                    # existing cluster loader/runtime
  operation/
    DigitalTwinOperationConfig.ts                 # existing operation stages
    useDigitalTwinTestCycle.ts                    # existing local operation cycle
  material-effects/
    MaterialEffectsConfig.ts                      # existing test configuration
    MaterialEffectsTestViewer.tsx                 # existing test UI
    MaterialEffectsTestCanvas.tsx                 # existing Mayxoay test scene
    useMaterialEffectsTest.ts                     # existing test-only controller
src/schemas/digitalTwinMaterialEffects.ts         # existing local effect schemas
public/models/digital-twin/cluster-02/may_xoay.glb
public/models/digital-twin/body/coffee_machine_03_v2.glb
~~~

### Proposed tree and ownership

~~~text
src/components/features/digital-twin/
  DigitalTwinWorkspace.tsx                        # registers existing tabs only
  BodyModelViewer.tsx                             # passes enable/playback boundary
  BodyModelCanvas.tsx                             # hosts Body effect and scene lifecycle
  material-effects/
    MaterialEffectsConfig.ts                      # effect + raw/verified CAD evidence
    CoffeeGroundEffect.tsx                         # reusable visual layer, no test UI
    coffeeGroundRuntime.ts                         # deterministic particle math/update
    MaterialEffectsTestViewer.tsx                 # remains test-only UI
    MaterialEffectsTestCanvas.tsx                 # test scene consumes shared layer
    useMaterialEffectsTest.ts                     # remains test-only controller
src/schemas/digitalTwinMaterialEffects.ts          # evidence and playback schemas
~~~

Allowed dependency direction:
- Workspace composes viewers; no Three.js traversal.
- BodyModelViewer may use operation cycle and pass narrow coffee playback input; no CAD/particle geometry.
- BodyModelCanvas owns Body/Mayxoay loading, anchor resolution, operation-event adaptation, cleanup.
- material-effects config/runtime/schema must not import Body components, operation UI, backend, SolidWorks, or browser storage.
- Reusable coffee layer may import Three.js/R3F/config but not test UI/controller.
- DigitalTwinClusterCanvas remains compressor/cluster motion owner.
- No new shared/common/utils/data/platform/route directory.

### Rendering and hydration
- Three.js/GLB remains client-only/dynamic Canvas.
- CAD evidence static typed data; browser never imports SolidWorks.
- Body Canvas owns bounded coffee runtime and disposes instanced mesh/geometry/material on reset/retry/tab/unmount.

## Local contracts and evidence shape

Add validated CAD evidence without changing existing operation-cycle contract:

~~~ts
interface MaterialEffectCadEvidence {
  sourceFile: "Mayxoay1.SLDPRT";
  featureName: "Sketch18";
  units: "meters";
  sketchFrame: "Sketch18-local";
  center: readonly [number, number, number];
  normal: readonly [number, number, number];
  radius: number;
  modelToSketchTransform: readonly [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
  ];
  constraintStatus: "under-constrained";
}
~~~

Verified runtime anchor:

~~~ts
interface MaterialEffectBodyAnchor {
  root: "body";
  sourceName: "Mayxoay1-1";
  sourceFrame: "Mayxoay1-1-local";
  localPointMeters: readonly [number, number, number];
  localNormal: readonly [number, number, number];
  outletDiameterMeters: number;
  calibrationResidualMeters: number;
}
~~~

Body adapter keeps DigitalTwinCycleEvent unchanged. It converts existing string cycleId/operation phase into internal coffee playback state and guarantees one run per operation cycle. Existing test event schema remains test-local unless additive reuse is needed.

## Phase 1 - Existing isolated test tab

Outcome: existing /digital material-test tab loads Mayxoay independently and provides Phase2 context.

Scope:
- retain current in-page tab, Mayxoay-only GLB, outlet marker, camera/reset, lifecycle, hidden pipe behavior

Non-scope:
- no Body, water, backend, CAD runtime, or source GLB edits

Dependencies: existing workspace and Draco decoder.

Implementation boundary: existing Workspace and material-effects test files.

Side effects: only the selected tab loads effect resources.

Verification:
- lifecycle
- unique lookup
- keyboard tabs
- no Body/pipe requests

Acceptance: existing tabs unchanged.

Entry: current test-tab code present.

Exit: isolated test remains mountable and disposable.

Risks: current node is a presentation anchor, not necessarily the final CAD opening.

Gate: stop if no unique node can be found without editing the asset.

Review: no Body/pipe coupling.

## Phase 2 - Current coffee prototype checkpoint (paused here)

Outcome: deterministic replayable coffee prototype in the isolated Mayxoay tab; frozen visual baseline.

Scope:
- current particle behavior
- small particle radius
- bounded higher density
- run/reset
- reduced-motion handling
- current 180-degree presentation

Non-scope:
- no water/approval work
- no Body integration
- no pipe
- no backend or physical command

Dependencies: Phase 1 plus the material schema/controller.

Boundary: current material config, canvas, viewer, controller, and schema.

Side effects: bounded GPU resources while mounted; reset/unmount dispose them.

Verification:
- preserve run/reset/replay/tab cleanup
- preserve reduced motion
- preserve desktop/narrow layout
- preserve EN/VI
- preserve TypeScript health

Acceptance: prototype remains the reference; it is not Body-integrated and does not authorize water.

Entry: Phase 1 exit.

Exit: intentionally paused at the current checkpoint.

Risks: current marker/source name may not be the CAD-accurate Sketch18 point.

Gate: no Body/water work while the plan is prepared.

Review: preserve existing user changes.

## Phase 3 - Capture Sketch18 and define the Mayxoay1-1 Body anchor

Outcome: Sketch18 evidence is persisted with units and frame; one verified local release anchor for Body/Mayxoay1-1 is derived.

Scope:
- read Mayxoay1.SLDPRT read-only through SolidWorks API or equivalent
- persist raw radius, center, normal, feature, constraint status, and matrix in typed feature config/schema
- document matrix ordering and the conversion formula from Sketch18-local to Mayxoay1-model coordinates
- persist the release point and normal as local data for the Body/Mayxoay1-1 node
- verify that the Body scene exposes one resolvable Mayxoay1-1 anchor; the runtime will apply its matrixWorld later
- use the 22.5 mm diameter as the future effect spawn diameter; no standalone GLB marker is required in this phase

Non-scope:
- no particle behavior changes
- no water
- no Body runtime integration
- no GLB re-export
- no SolidWorks save/write
- no new route

Dependencies: saved CAD, the current Machine Body scene, and the existing Mayxoay1-1 naming contract.

Boundary: schema/config and temporary feature diagnostic; no CAD code in Body Canvas or the app shell.

Side effects: static evidence/config only; no runtime external dependency.

Verification:
- reread CAD and assert the captured values
- assert frame conversion rather than using the raw point
- assert the Sketch18-to-Mayxoay1-model transform with SolidWorks MathPoint/MathVector evidence
- assert the persisted Body anchor name is Mayxoay1-1 and the local point is not a bounds-derived point
- calibration residual must be 0 for the direct transform; a larger residual is a stop condition, not a guessed offset
- confirm no standalone may_xoay.glb load is required for the Body anchor

Acceptance:
- raw evidence is schema-valid
- the derived anchor has source name, local frame, local point, local normal, diameter, and residual
- the Body integration phase can resolve Mayxoay1-1 and apply the local point without a second GLB
- no coordinate/unit decision remains unresolved

Entry: Phase 2 is frozen and the user authorizes coordinate/Body work.

Exit: verified transform contract ready, or an exact mismatch is documented.

Risks: under-constrained sketch, axis/scale convention, missing or ambiguous Mayxoay1-1 node. No arbitrary offsets.

Gate: stop if residual is nonzero, Mayxoay1-1 is missing/nonunique, or the under-constrained location is nondeterministic.

Review: typed, frame-labelled, feature-owned, and no browser SolidWorks dependency.

### Phase 3 execution record - 2026-10-13

Phase status: coordinate capture complete; runtime/visual verification unverified.

Completed:
- reread Mayxoay1.sldprt in a read-only SolidWorks API session
- persisted Sketch18 CAD evidence in MaterialEffectsConfig and the calibration report
- derived Mayxoay1-model point `(-0.0605, -0.012, 0) m` and normal `(0, -1, 0)` using SolidWorks MathPoint/MathVector and SketchToModelTransform
- defined the future Body release anchor as `Mayxoay1-1` local point with 22.5 mm diameter
- removed the Phase 3 dependency on loading standalone may_xoay.glb; Phase 2 test behavior remains unchanged

Evidence:
- `plans/digital-twin-material-effects-sketch18-calibration.json`
- `src/components/features/digital-twin/material-effects/MaterialEffectsConfig.ts`
- `src/schemas/digitalTwinMaterialEffects.ts`

Checks:
- TypeScript compiler: passed
- calibration JSON parse/invariant check: passed
- git diff whitespace check: passed
- production build: unavailable because next/font could not fetch Google Fonts in the environment
- lint: unavailable because the existing `next lint` script is incompatible with the installed Next version and resolves `lint` as a project directory
- browser/WebGL visual check: unavailable because no browser surface is available in the environment

Phase 3 gate result: passed for static/runtime resolution. The Body asset exposes exactly one `Mayxoay1-1` node, and Phase 4 applies its matrixWorld to the persisted local point without loading a second standalone may_xoay.glb. Visual placement remains part of Phase 5.

## Phase 4 - Integrate coffee effect into Machine Body

Outcome: Body emits coffee from the verified Sketch18 opening after grinding; motion ownership is unchanged.

Scope:
- extract deterministic particle update/instanced layer into CoffeeGroundEffect.tsx and coffeeGroundRuntime.ts
- keep the test controller/UI private; Body receives normalized playback only
- add a narrow enableCoffeeEffect/playback boundary to BodyModelViewer and BodyModelCanvas; enable it on Body only
- add one Body-only coffee simulation button that sends a manual run request without starting the full operation cycle
- reuse the existing operation Run cycle; transition from grinding completion to first dosing starts one coffee run per cycle
- use bounded local runtime on the existing Canvas frame path; no competing timer/backend
- apply the Phase 3 Body anchor, normal, diameter, spread, and target; do not copy the 180-degree test presentation into Body
- clear on reset, fault, retry, tab change, and unmount; keep settled state only until reset or next cycle
- preserve Mayxoay attachment, compressor, operation highlighting, camera, loading/error/retry, and resource lifecycle

Non-scope:
- water
- pipe or unrelated Body controls
- GLB edits
- backend
- telemetry
- physical controls
- compressor changes

Dependencies: Phase 3 anchor, grinding-to-dosing sequence, and Body lifecycle.

Boundary:
- BodyModelViewer: opt-in boundary and status controls
- BodyModelCanvas: Body anchor, operation adaptation, coffee layer, and cleanup
- Workspace: opt in Body only
- material-effects: reusable layer, runtime, and evidence
- OperationConfig only if an explicit post-grinding hook is required; otherwise unchanged
- ClusterCanvas unchanged unless narrow helper reuse is proven

Side effects: bounded instanced GPU work only while Body is mounted; no extra GLB.

Verification:
- one operation click produces one coffee run after grinding
- repeated clicks do not duplicate a run
- origin is the transformed Sketch18 opening, not a bounds center or water node
- direction follows the transformed normal
- Phase 2 radius and density remain the baseline
- reset/fault/retry/tab/unmount cleanup works
- Body compressor, operation, camera, loading, error, and retry controls are unchanged
- other tabs do not load the Body effect

Acceptance:
- Body visibly shows coffee after grinding
- playback is deterministic and one-shot per cycle
- one dedicated coffee-only Body control is added; the full operation control remains unchanged
- existing status remains accessible and announces transition/completion
- ong_nuoc.glb is absent

Entry: Phase 3 pass.

Exit: aligned and lifecycle-safe, or an exact limitation is documented.

Risks: occlusion, preserved world matrix, camera clipping, and resource disposal. Use explicit ownership and reversible state.

Gate: stop if arbitrary offsets, GLB edits, a new Canvas, a second timer, or pipe coupling is required.

Review: dependency direction, unique anchor, no duplicated controller, cleanup, and motion ownership.

### Phase 4 execution record - 2026-10-13

Phase status: implementation complete; visual verification unverified.

Completed:
- added `enableCoffeeEffect` only to the Machine Body viewer path
- resolved the existing Body node `Mayxoay1-1` from `coffee_machine_03_v2.glb`
- applied Sketch18 local point `(-0.0605, -0.012, 0) m` through the node `matrixWorld`
- transformed Sketch18 normal `(0, -1, 0)` through the node normal matrix for the coffee direction
- constrained Body spawn centers and particle radius to the calibrated 22.5 mm Sketch18 opening, then routed the fixed stream to the CAD-calibrated `box_nen-1` receiving surface
- increased the shared coffee particle count from 80 to 512 for a denser flow without changing particle size or the tube envelope
- decoupled the ten-second emission window from the approximately 2.6-second travel time of each ground, with deterministic emission slots and no retained accumulation
- hide each ground as soon as it reaches the `box_nen-1` receiving surface so no coffee accumulates there
- started one deterministic coffee run when the operation transitions from `grinding` to `dosing`
- added a dedicated Body button that starts only the coffee flow through a separate manual request
- reset on idle/grinding restart, fault, retry, tab unmount, and component cleanup
- extracted the deterministic particle update into `CoffeeGroundEffect.tsx` and `coffeeGroundRuntime.ts`; the isolated test reuses the same math
- did not add water, pipe assets, a second Body canvas, a second timer, or GLB edits

Evidence:
- `src/components/features/digital-twin/BodyModelCanvas.tsx`
- `src/components/features/digital-twin/BodyModelViewer.tsx`
- `src/components/features/digital-twin/DigitalTwinWorkspace.tsx`
- `src/components/features/digital-twin/material-effects/CoffeeGroundEffect.tsx`
- `src/components/features/digital-twin/material-effects/coffeeGroundRuntime.ts`
- `plans/digital-twin-material-effects-sketch18-calibration.json`

Checks:
- TypeScript compiler: passed
- Body GLB node inventory: passed; exactly one `Mayxoay1-1` node found
- target mapping check: passed; `box_nen-1` local point `(-0.0595, 0.2, 0.1636) m` maps to Body target `(-0.5124597, 0.3378370, -0.0696890) m`
- set continuous coffee emission to approximately 10 seconds while keeping
  each particle's travel time at approximately 2.6 seconds
- calibration/evidence update: passed
- `git diff --check`: passed
- production build: unavailable because `next/font` could not fetch Google Fonts
- lint: unavailable because the existing `next lint` script resolves `lint` as a project directory
- browser/WebGL visual check: unavailable; no browser/app surface is exposed

Remaining gate: Phase 5 must visually confirm that the transformed point appears at the intended Sketch18 opening and that the flow is not occluded or reversed.

## Phase 5 - Body visual and regression verification

Outcome: Body coffee evidence is captured on desktop/narrow layouts with an explicit acceptance or correction list; water remains deferred.

Scope:
- EN/VI Body operation
- compare against the Phase 2 baseline
- inspect marker/origin, direction, size, density, settling, occlusion, replay, reset, and camera

Non-scope: water, pipe, unrelated cleanup, and source asset edits.

Dependencies: Phase 4.

Boundary: verification only; any fix returns to Phase 3 or Phase 4.

Side effects: browser/build caches only.

Verification:
- idle -> grinding -> dosing coffee
- reset during stages and after complete
- tab remount has no stale particles or timers
- loading failure/retry
- compressor, zoom/reset, keyboard, aria-live, reduced motion, EN/VI, and narrow viewport
- npx tsc --noEmit --incremental false
- git diff --check
- existing build/lint attempted, with tooling failures classified
- no API/WebSocket/MQTT/external model/CAD runtime

Acceptance: user accepts Body coffee or receives a correction list; water and pipe remain untouched.

Entry: Phase 4 pass.

Exit: accepted, paused with bounded fixes, or stopped with a named limitation.

Risks: browser/GPU/timing; record evidence.

Gate: no water until Body coffee is accepted.

Review: Phase 2 baseline, Sketch18 source, narrow Body boundary, and deferred pipe.

## Deferred future work

Water flow is intentionally not a phase in this revised path. A separate plan/revision must define source, anchor, UI, lifecycle, approval, and whether ong_nuoc.glb may show. It must not be added as a side effect of Sketch18 or Body coffee.

## Explicit assumptions

- "After Mayxoay" means coffee begins when the operation leaves grinding, at the first dosing event.
- Sketch18 raw center (-60.5, 0, 0) mm is in the local sketch frame, not world; a transform is required.
- Saved evidence is stable enough despite the under-constrained status; if the marker is nondeterministic, stop.
- Current Phase 2 visual values remain the baseline until Body verification produces a correction list.
- TDD is off; use type, diff, runtime, browser evidence, and read-only review without introducing a new framework.

## Handoff and completion condition

The plan artifact is complete after it is written and read back. Product implementation is complete only after Phases 3-5 gates. No phase authorizes water, pipe visibility, CAD write, backend, deployment, commit, or push.

