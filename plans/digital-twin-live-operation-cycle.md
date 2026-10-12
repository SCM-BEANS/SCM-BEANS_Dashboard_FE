# Digital Twin Live Operation Cycle (Local Test Prototype)

## Objective

Add a Machine Body operation mode that demonstrates a complete coffee-making cycle with a local fake event source. A user presses one test button; the prototype advances through the configured stages automatically, highlights the model responsible for the current stage, hides explicitly mapped occluding parts when needed, restores the previous stage when the cycle advances, and returns the scene to its normal state at completion.

Backend, WebSocket, MQTT, telemetry ingestion, and server-side control are explicitly deferred. The prototype must expose a normalized cycle-event boundary so a later backend adapter can replace the fake source without changing the 3D renderer.

This is a plan-only artifact. It does not authorize product-code changes, asset edits, commits, deployment, or external coordination.

## Feasibility assessment

The feature is feasible within the current frontend architecture:

- `BodyModelCanvas.tsx` already owns the loaded Body GLB scene and can resolve nodes by their preserved GLB source names.
- The Body asset contains separately named component and assembly nodes, so phase-specific visibility and material treatment can be applied without editing the GLB.
- `DigitalTwinClusterCanvas.tsx` already contains verified Cluster-03 motion definitions and a reusable `ClusterMotionRuntime`; the prototype can reuse that runtime for any phase whose motion mapping is verified.
- The current `useLiveTelemetry.ts` is only a mock WebSocket example for temperature, pressure, and flow. It does not provide semantic cycle phases, so it must not be wired directly to the renderer.
- The main technical risk is not rendering the highlight; it is obtaining an approved mapping for each process stage and its occluders. The mapping must be explicit and validated against the actual GLB hierarchy.

## Confirmed decisions

- **Input source for this increment:** a local deterministic fake cycle, not Backend data.
- **User action:** one test button starts the complete cycle automatically from the first stage to the final stage.
- **Cycle repeat:** the button is available again after completion; it is disabled while a run is active to prevent competing timers.
- **Initial process scope:** grinding, tamping, and extraction, plus idle/running/complete states. Further stages can be added through configuration after the user supplies the machine-specific details.
- **Rendering behavior:** the active component receives a prominent display treatment; explicit occluders are temporarily hidden; the prior stage is restored before the next stage is applied.
- **State boundary:** the 3D renderer receives normalized visual state and does not open a server connection or own the cycle timer.
- **Existing feature ownership:** keep the work inside the Digital Twin feature. Preserve the current Body loading/error/retry/camera lifecycle and the existing verified Cluster-03 runtime.
- **Existing controls:** retain current zoom/reset and manual compressor controls unless a later request explicitly removes them. The new test-cycle action is a separate prototype control.
- **Assets:** do not edit, re-export, rename, or replace any GLB or CAD-derived JSON asset.

## Decision record

| Decision | Options considered | Selected outcome and rationale |
| --- | --- | --- |
| Cycle input boundary | Connect the renderer directly to telemetry; derive phases from raw sensor thresholds; normalize semantic phase events before rendering | Normalize semantic events. Raw telemetry does not identify discrete operations reliably, and direct renderer connections would spread transport concerns through Three.js code. |
| Test behavior | Advance one phase per click; run a complete cycle automatically | Complete automatic cycle. This matches the requested demonstration and exercises transition, cleanup, and repeat behavior in one interaction. |
| Visual mapping | Infer occluders dynamically with raycasts; use an explicit phase-to-node mapping | Explicit mapping. It is deterministic, testable, and protects against hiding the active node or unrelated machine parts. |
| Highlight implementation | Mutate shared GLTF materials; clone materials only for active meshes; replace all materials | Clone only affected materials and restore original references. This preserves shared material ownership, maps, and cleanup semantics while avoiding cross-node recoloring. |
| Backend integration | Add a provisional API/WebSocket now; defer transport and keep the normalized event contract | Defer transport. The local prototype can validate the visual behavior first and later add an adapter at the same event boundary. |

## Current and proposed structure

### Current relevant tree

```text
src/
├── app/(dashboard)/digital/page.tsx
├── components/features/digital-twin/
│   ├── DigitalTwinWorkspace.tsx
│   ├── BodyModelViewer.tsx
│   ├── BodyModelCanvas.tsx
│   ├── DigitalTwinClusterViewer.tsx
│   └── DigitalTwinClusterCanvas.tsx
├── hooks/useLiveTelemetry.ts
├── schemas/machine.ts
├── store/useIoTStore.ts
└── lib/i18n/translations.ts
public/models/digital-twin/
└── body, cluster-02, cluster-03 assets and verified motion JSON
```

The worktree already contains the user-requested transparent Body viewer changes in `BodyModelViewer.tsx` and `BodyModelCanvas.tsx`. Those changes are preserved and are not treated as disposable baseline code.

### Proposed tree

```text
src/
├── schemas/digitalTwinCycle.ts                         # normalized cycle event/state schema
├── components/features/digital-twin/
│   ├── operation/
│   │   ├── DigitalTwinOperationConfig.ts               # phase definitions and node mapping
│   │   └── useDigitalTwinTestCycle.ts                   # local one-shot cycle source/controller
│   ├── BodyModelViewer.tsx                              # button, status, lifecycle owner
│   └── BodyModelCanvas.tsx                              # scene highlight/visibility application
└── lib/i18n/translations.ts                             # EN/VI labels and stage announcements
```

No new generic `shared`, `common`, or platform layer is proposed. A future server adapter may live beside the existing data hooks or in a feature-owned adapter, but it is outside this plan.

### Responsibility and dependency direction

- `src/schemas/digitalTwinCycle.ts` owns transport-neutral validation and TypeScript types. It imports only Zod/type dependencies and never imports a feature component.
- `DigitalTwinOperationConfig.ts` owns static phase definitions, durations, active node names, occluder names, highlight settings, and optional verified motion instructions. It does not import React, Three.js, or transport code.
- `useDigitalTwinTestCycle.ts` owns the deterministic local timer and cycle state. It consumes the config and emits normalized events/state; it does not access GLTF objects.
- `BodyModelViewer.tsx` owns the user action, visible operation status, retry/unmount reset, and passes normalized visual state to the canvas. It does not fetch server data.
- `BodyModelCanvas.tsx` owns scene-local material snapshots, visibility snapshots, node lookup, highlight application, occluder hiding, restoration, and existing GPU cleanup. It does not know whether the source was a test event or a future server event.
- `DigitalTwinClusterCanvas.tsx` remains the owner of verified Cluster-03 kinematics. No second solver or animation loop is introduced.
- The route and Dashboard shell remain composition-only. Other Digital Twin tabs do not import the operation controller internals.

## Normalized prototype interface

The exact server payload is not selected yet. The prototype uses a transport-neutral shape that can later be populated by an adapter:

```ts
type DigitalTwinCyclePhase =
  | "idle"
  | "grinding"
  | "tamping"
  | "extraction"
  | "complete"
  | "fault";

interface DigitalTwinCycleEvent {
  machineId: string;
  cycleId: string;
  sequence: number;
  phase: DigitalTwinCyclePhase;
  progress: number; // 0..1 for the current phase
  emittedAt: string;
  source: "test" | "server";
}
```

The visual definition remains feature-owned and is deliberately separate from this event schema:

```ts
interface DigitalTwinOperationStageDefinition {
  phase: Exclude<DigitalTwinCyclePhase, "idle" | "fault">;
  durationMs: number;
  activeNodeNames: readonly string[];
  hiddenOccluderNames: readonly string[];
  highlightColor: string;
  mainDriveProgress?: readonly [number, number];
  lowerDriveProgress?: readonly [number, number];
}
```

The initial duration values are test-only configuration, not machine timing claims. The first prototype may use equal short durations so the full cycle is easy to verify; the user-provided process details must replace those values before claiming physical timing fidelity.

## State ownership and lifecycle

| State | Authoritative owner | Behavior |
| --- | --- | --- |
| Test cycle status (`idle`, `running`, `complete`, `fault`) | `useDigitalTwinTestCycle` | Starts once per button press, emits ordered stages, disables the trigger while running, and cancels timers on unmount/retry. |
| Current phase and progress | Cycle controller | Derived from the latest accepted local event; no duplicate copy in the canvas. |
| Phase-to-node mapping | Static operation config | Versioned with the feature; validated before a run can apply a stage. |
| Node visibility/material snapshots | `BodyModelCanvas` refs | Restored on every phase transition, completion, retry, error, and unmount. |
| Camera/zoom/manual controls | Existing `BodyModelViewer` state | Unchanged by the test cycle. |
| Server connection and freshness | Not present in this prototype | A later backend adapter owns connection, stale, reconnect, and server event rejection behavior. |

## Phase 1 — Define the local cycle contract and model mapping

### Outcome

The prototype has an approved stage table describing which Body/Cluster nodes perform grinding, tamping, and extraction, which nodes occlude them, what highlight treatment to use, and whether an already-verified motion runtime should be driven for that stage.

### Scope

- Add the normalized cycle schema/types and operation configuration boundary.
- Inventory the actual GLB node names and hierarchy for the Body and any attached display clone used by the Body tab.
- Build an explicit mapping table for the three initial stages:
  - active nodes;
  - hidden occluders;
  - optional main/lower motion ranges only where the existing runtime is verified;
  - display label and highlight color.
- Mark any stage whose geometry is not currently available as `visualOnly` or as a stopped gate rather than inventing motion.
- Have the user review the mapping before implementation proceeds to scene mutation.

### Non-scope

- No Backend, WebSocket, MQTT, REST request, or telemetry subscription.
- No new GLB export or source CAD change.
- No automatic occlusion inference.
- No claim that placeholder stage timing represents the physical machine.

### Dependencies and implementation boundary

- Depends on the existing Body GLB, current Body/Cluster integration, and the user’s additional process/component information.
- Affected areas: `src/schemas/digitalTwinCycle.ts` and `src/components/features/digital-twin/operation/DigitalTwinOperationConfig.ts`.
- Preserve the current uncommitted Body viewer changes.

### Side effects and risks

- The current Body loader permanently detaches a small set of static hidden nodes. A candidate occluder that is already detached cannot be used as a reversible cycle occluder; the mapping must reject it or receive a separately approved loader adjustment.
- GLTF source names may differ from sanitized `Object3D.name`; lookup must use the same preserved source-name convention already used by the Body loader.
- A missing or duplicated mapping node must fail validation before a test run starts.

### Verification

- Run a read-only node inventory against the local GLB assets.
- Validate every configured active/occluder node exists exactly once in its target scene graph.
- Confirm no occluder is an ancestor of an active node unless the mapping intentionally hides a whole subtree and the target is supplied through another display root.
- Confirm the initial phase order and labels with the user.

### Acceptance, entry, exit, and review gates

- **Entry:** the local-test-only scope is approved and the user has supplied or accepted the initial three-stage mapping.
- **Exit:** schema and mapping are explicit, node lookup is deterministic, and every unresolved geometry/motion item is named as a later gate.
- **Stop if:** a required component is fused into an unaddressable mesh, an occluder cannot be restored safely, or the requested stage requires unverified kinematics. Report the exact asset limitation instead of guessing.
- **Review gate:** read-only review confirms the config is feature-owned, contains no transport code, and does not encode undocumented CAD assumptions.

## Phase 2 — Add the deterministic full-cycle test source and button

### Outcome

Machine Body exposes one accessible test action that runs the entire local cycle automatically from the first stage through completion and can be run again after completion.

### Scope

- Implement `useDigitalTwinTestCycle.ts` with a sequential timer/state machine driven by the approved stage config.
- Emit ordered normalized test events with a cycle id, sequence, phase, progress, and timestamp.
- Add one `Run test cycle` action to the existing Machine Body control area.
- Show the current phase and running/complete status in an accessible status region.
- Keep the action disabled while running to prevent overlapping cycles; retry, tab switch, and unmount must cancel the pending timer.
- Add English and Vietnamese labels for the button, running state, stage names, completion, and recoverable test errors.

### Non-scope

- No change to `useLiveTelemetry.ts`, `useIoTStore.ts`, `useMachineStore.ts`, Axios, React Query, or any API endpoint.
- No server freshness, reconnect, stale-event, multi-tab, or offline behavior.
- No replacement of the existing manual compressor Run/Stop control.

### Dependencies and implementation boundary

- Depends on Phase 1’s approved event/stage definitions.
- Affected areas: `operation/useDigitalTwinTestCycle.ts`, `BodyModelViewer.tsx`, and `src/lib/i18n/translations.ts`.
- The hook may be consumed by `BodyModelViewer`, but it must not import the canvas or Three.js runtime.

### Side effects and risks

- Timers can outlive a tab switch or retry if cleanup is incomplete; use a cancellation/ref guard and verify stale callbacks cannot update state.
- A second click during a run could create competing event sequences; the disabled state and controller guard must reject it.
- If the mapping fails validation, the UI must show a recoverable operation error and restore the scene rather than leaving a partial stage active.

### Verification

- Keyboard-trigger the button and confirm focus remains usable.
- Confirm one click emits the stages in order exactly once, reaches `complete`, and enables a second run.
- Confirm repeated clicks while running do not create a second cycle.
- Switch tabs, retry the Body viewer, and unmount during each stage; verify no late timer changes the next mount.
- Confirm no network request is made by the prototype.

### Acceptance, entry, exit, and review gates

- **Entry:** Phase 1 mapping and normalized event types pass review.
- **Exit:** the complete cycle can be started and repeated through one button, with deterministic status announcements and cleanup.
- **Stop if:** the test controller needs to know Three.js node details, requires a second animation loop, or cannot cancel stale callbacks.
- **Review gate:** inspect the diff for transport leakage into UI code, duplicated state owners, overlapping timers, and missing EN/VI keys.

## Phase 3 — Apply highlight and reversible occlusion in the Body scene

### Outcome

Each active stage is visually understandable in the loaded Machine Body: the responsible model is prominent, explicitly mapped occluders are hidden when necessary, and the previous stage returns to its normal appearance before the next stage is applied.

### Scope

- Extend `BodyModelCanvas.tsx` with a stage visual-state input.
- Resolve active and occluder nodes across the Body scene and the visible compressor display clone where applicable.
- Snapshot original node visibility and material references before the first stage.
- Clone only affected mesh materials for the active stage and apply a high-contrast highlight treatment, including emissive response where supported.
- Restore original material references and visibility on every transition, completion, error, retry, and unmount.
- Keep the canonical hidden Cluster-03 runtime separate from the visible display clone; never recolor or hide the canonical solver as a substitute for the visible model.
- Keep a text label/status for the current stage so operation is not communicated by color alone.

### Non-scope

- No source GLB edits, postprocessing, clipping-plane system, x-ray shader, or automatic raycast-based occlusion.
- No changes to Cluster-02/Cluster-03 standalone tab behavior.
- No global material mutation or permanent visibility mutation.

### Dependencies and implementation boundary

- Depends on Phase 1 mapping and Phase 2 normalized stage events.
- Scene mutation remains inside `BodyModelCanvas.tsx`, which already owns GLTF loading, display-clone creation, and resource cleanup.
- `BodyModelViewer.tsx` supplies stage state; it does not traverse Three.js objects.

### Side effects and risks

- Material clones increase GPU material count while a stage is active; dispose only clones owned by the Body viewer and never dispose shared GLTF materials prematurely.
- An active node may be nested under a hidden parent; validation must reject that mapping before rendering.
- Reparenting the compressor display clone can make source-name lookup ambiguous; lookup must be scoped to the visible root and tested for uniqueness.

### Verification

- Exercise every configured stage and inspect the active node, hidden occluders, and restored previous node.
- Confirm active highlight remains visible at the existing camera framing and does not depend on hover or color alone.
- End the cycle and verify every touched node/material returns to its baseline state.
- Retry and switch tabs mid-stage; verify no hidden mesh or cloned material remains on remount.
- Inspect Three.js resource counts or a deterministic resource tracker where available.

### Acceptance, entry, exit, and review gates

- **Entry:** Phase 2 emits a deterministic stage stream and Phase 1 mapping is validated.
- **Exit:** highlight, occlusion, restoration, and cleanup work for all initial stages without affecting other tabs.
- **Stop if:** the asset cannot expose a requested component at node/mesh level, material cloning breaks maps/transparency, or restoration cannot be proven.
- **Review gate:** read-only review checks material ownership, visibility restoration, canonical/display separation, and absence of a second render loop.

## Phase 4 — Connect verified mechanical motion to the local cycle

### Outcome

The test cycle drives existing verified Digital Twin motion only where the stage definition has an approved mechanical mapping; visual-only stages remain explicit rather than using fabricated motion.

### Scope

- Reuse `ClusterMotionRuntime` and its existing `apply`/`advance`/`dispose` boundary.
- Add stage motion instructions only for verified progress ranges and drive chains.
- Ensure the test-cycle controller and the existing manual compressor control share one frame-update owner and cannot advance the same runtime concurrently.
- Synchronize the visible display clone after each runtime update.
- Reset motion progress when the cycle completes or when the user retries.

### Non-scope

- No new CAD solver, new kinematic equations, new asset export, or guessed movement for grinding/tamping/extraction.
- No server commands or real-machine actuation.
- No change to the standalone Cluster-03 controls unless the shared runtime adapter requires a behavior-preserving refactor.

### Dependencies and implementation boundary

- Depends on Phase 3 visual state and the existing verified Cluster-03 runtime.
- Affected code is limited to the Digital Twin operation config/controller and the existing Body/Cluster runtime seam.
- `DigitalTwinClusterCanvas.tsx` remains the single owner of Cluster-03 kinematic equations and runtime cleanup.

### Side effects and risks

- Two independent controls could fight over progress or create duplicate `useFrame` work. The implementation must choose one authoritative runtime command per frame.
- A phase transition may change highlight before motion reaches its target; the controller must define transition ordering and test it.
- An unverified mechanism must remain static and clearly marked as visual-only rather than silently presenting an inaccurate movement.

### Verification

- Confirm motion starts/stops at the configured stage boundaries and the display clone follows the canonical runtime.
- Confirm the existing manual compressor control still works when the test cycle is idle.
- Confirm the test cycle cannot start a second loop or leave motion running after completion, retry, tab switch, or unmount.
- Compare progress endpoints against the existing Cluster-03 validation artifacts.

### Acceptance, entry, exit, and review gates

- **Entry:** Phase 3 visual transitions are stable and the user has approved the motion mapping for each non-visual-only stage.
- **Exit:** every claimed moving stage uses existing verified runtime behavior; all other stages are explicitly visual-only.
- **Stop if:** satisfying the process requires changing CAD equations, adding an unverified offset, or altering the source model.
- **Review gate:** read-only review confirms no duplicated solver, no competing frame loop, and no regression in standalone Cluster-03 behavior.

## Phase 5 — Prototype verification and handoff

### Outcome

The local test-cycle mode is verified in `/digital` with evidence for sequence, visuals, lifecycle, accessibility, and absence of Backend coupling.

### Scope

- Run focused static, build, and browser checks.
- Verify Machine Body only; confirm Combined, Mayxoay, and standalone Compressor tabs remain unchanged.
- Verify English/Vietnamese labels, keyboard activation, visible focus, status announcements, and narrow viewport behavior.
- Inspect network activity to confirm the prototype makes no server/WebSocket/MQTT request.
- Inspect the final diff and preserve the existing transparent Body viewer changes.

### Non-scope

- No Backend implementation or server contract negotiation.
- No new test framework or dependency installation.
- No commit, push, deployment, CAD operation, or source asset mutation.

### Dependencies and implementation boundary

- Depends on Phases 1–4 and a browser environment capable of loading the local GLB/Draco assets.
- Verification remains inside the designated workspace.

### Side effects and risks

- Build/browser caches may be generated; unrelated workspace data must not be removed.
- Browser/GPU differences may affect perceived highlight intensity; record viewport/browser evidence rather than claiming universal appearance from source inspection.

### Verification

- `npx tsc --noEmit --incremental false`.
- `npm.cmd run build` if the current environment permits it.
- `npm.cmd run lint` may be attempted, but an unchanged Next 16/legacy `next lint` incompatibility must be reported separately.
- Browser workflow: load Body, press the test button once, observe every stage, wait for completion, run again, switch tabs during a stage, retry/unmount, and return to Body.
- Verify `git diff --check`, `git status --short`, changed paths, and that no public model asset changed.

### Acceptance, entry, exit, and review gates

- **Entry:** all implementation phases pass their review gates.
- **Exit:** the full local cycle meets the aggregate acceptance criteria, every unavailable check is marked `unverified`, and no in-scope high-severity regression remains.
- **Stop if:** a required visual/lifecycle check fails, a resource leak is observed, or any implementation begins to require Backend scope.
- **Review gate:** final read-only review confirms feature ownership, normalized event boundary, reversible scene state, preserved current changes, and no network integration.

## Aggregate acceptance criteria

- One accessible Machine Body test button starts a complete local cycle automatically.
- The initial cycle stages are ordered as grinding → tamping → extraction → complete, with the stage set/configuration ready for later user-provided additions.
- The active component is visually prominent and accompanied by a textual stage status; the behavior does not rely on color alone.
- Explicit occluders hide only during the mapped stage and all affected nodes/materials return to their normal state on transition and completion.
- Existing zoom/reset/manual controls, Body loading/error/retry behavior, and other Digital Twin tabs do not regress.
- No API, WebSocket, MQTT, Backend, telemetry, persistence, or external asset request is introduced.
- All timers, material clones, visibility changes, and runtime references are cleaned up on completion, retry, tab switch, and unmount.
- The prototype emits a normalized event shape that a future server adapter can consume without changing the renderer contract.
- TypeScript/build/diff evidence is recorded with unavailable checks clearly distinguished from passes.

## Deferred follow-up: Backend/live-machine adapter

Create a separate plan after the Backend event contract is available. That plan should add a transport adapter that converts server messages into the normalized cycle events above, define machine/cycle identity and sequence handling, specify freshness/reconnect/stale-event behavior, and preserve the existing operation controller and Body renderer boundaries. The server must not depend directly on GLB node names unless a separate versioned contract is explicitly approved.

## Explicit assumptions

- The test button is placed in the existing Machine Body control area and uses the current Dashboard design system.
- Existing zoom/reset and manual compressor controls remain available during this prototype; removing or replacing them is a separate UI decision.
- Initial test stage durations are short local demo values and are not presented as physical machine timings.
- User-supplied process/component information will refine the Phase 1 mapping before any claim of physical correspondence is made.
- The current uncommitted changes in `BodyModelViewer.tsx` and `BodyModelCanvas.tsx` belong to the user and must be preserved.
