# Digital Twin Model Integration Plan

## Objective

Integrate the tested first mechanical assembly into the Dashboard at `/digital`, preserving its mechanical links and interaction behavior while using the Dashboard's visual system. The page is a local, self-contained model experience for now: no Backend, IoT, or telemetry integration is in scope. The other three machine clusters are explicitly deferred.

## Accepted decisions

- **Rendering architecture — user selected A:** keep the tested assembly as a Three.js module whose `createMechanismAssembly` API returns a `THREE.Group`; mount and update it through one React Three Fiber `Canvas` using the Dashboard's installed Three.js and loader dependencies. Do not embed the source page's vanilla renderer, render loop, or DOM controls.
- **UX layout — user accepted the proposed layout:** use the existing Dashboard shell and design tokens; on desktop give the model the dominant area with an adjacent grouped control panel; on mobile stack the scene and collapse/expand controls.
- **Scope order:** bring in the existing tested mechanical model and its links first. Keep all additional machine clusters for a later phase, after this first assembly has been integrated and accepted.
- **Current deliverable:** mechanical model and model-view/motion controls only. Defer the coffee-flow visualization and its controls; keep the imported assembly internals hidden and stopped.
- **Data boundary:** show model state and local simulation controls only. Do not present `useIoTStore` mock values as live machine data, and do not add API, WebSocket, or MQTT work.

## Current-state findings and assumptions

- The Dashboard already depends on Three.js, React Three Fiber, Drei, and Zustand. Reuse these dependencies rather than introducing another renderer or a second Three.js copy.
- The source assembly is at `C:\FPT\3D\test_3d\test_3d`. Its reusable facade is under `src/assembly/`; its runtime manifest references 13 Draco-compressed GLB assets. The tested static HTML pages, renderer/bootstrap files, and duplicate legacy `src/motion/` implementation are not part of the integration.
- The Dashboard already has `public/draco-gltf/` decoder files. Reuse that location only after checking compatibility with the installed Three.js loader; replace or align the decoder assets only if verification demonstrates a mismatch.
- The existing route is `src/app/digital/page.tsx` and is currently a blank stub. To inherit the shared Dashboard layout without changing the URL, relocate the route page to `src/app/(dashboard)/digital/page.tsx` and ensure there is only one App Router page for `/digital`.
- Use the Dashboard's surface/text/border tokens and existing bilingual i18n store. Avoid hard-coded visual styling where the shared tokens apply.
- Source assembly relations and rollback behavior are treated as invariants, including the bilateral pin/slot constraints, shaft/gear/piston alignment, arm pivots, and wiper-to-arm links.

## Out of scope

- Integrating the remaining three machine clusters or designing a generalized multi-cluster configuration system.
- Exposing the coffee-flow visualization or its playback/speed/reset controls in the current `/digital` experience.
- Backend/API, WebSocket/MQTT, real machine telemetry, persistence, authentication, or control of physical equipment.
- Porting source `index.html`, `coffee.html`, CSS, standalone `main.js`/`coffee-main.js` render loops, SLDPRT files, or the unused duplicate motion implementation.
- Broad Dashboard design-system refactoring or repairing unrelated tooling issues.

## Requirement-to-phase mapping

| User goal / constraint | Planned phases |
| --- | --- |
| Match the overall Dashboard palette and layout | 2, 3 |
| Bring in the tested model and links first; defer other clusters | 1, 2, 4 |
| Make interaction convenient across desktop and mobile | 3, 4 |
| No Backend data; use Three.js | 1, 2, 3, 4 |
| Use the user-selected React Three Fiber architecture | 1, 2 |

## Phase 1 — Port the first assembly and runtime assets

**Outcome:** the Dashboard repository contains only the reusable first-cluster assembly module and the runtime assets it needs, without bringing over the standalone test site's renderer/UI.

**Scope:** inspect the source facade and its relative imports; copy the required `src/assembly/**` module files and its 13 runtime GLBs into a feature-owned source location and `public/models/digital-twin/cluster-01/`; adapt only asset URL/configuration seams needed for public asset URLs and injected Dashboard dependencies. Reuse the target application's Three.js, `GLTFLoader`, and `DRACOLoader`. Verify the existing local Draco decoder path against the app's loader version before relying on it.

**Not in scope:** route/UI work, other clusters, SLDPRT assets, standalone renderer files, duplicate legacy motion code, and Backend interfaces.

**Implementation boundary / affected areas:** source project `src/assembly/**` and its `assets.js`/configuration are the import reference; target changes are limited to a feature-owned assembly module (for example `src/components/features/digital-twin/assembly/**`), the 13 files under `public/models/digital-twin/cluster-01/`, and a decoder asset only if compatibility checks require it. Keep the public facade free of DOM/browser UI dependencies and inject `{ THREE, GLTFLoader, DRACOLoader }` from the app.

**Side effects:** adds approximately 13 local model assets and assembly source files to the web deployment. Confirm their combined size and ensure the asset manifest uses same-origin public URLs; do not introduce a CDN dependency for the models or decoder.

**Verification:** inspect the copied import graph and asset manifest; verify every referenced GLB exists; verify each GLB's Draco requirement is satisfiable by the app's loader/decoder; run the source assembly contract, boundary, coffee-flow, and slot-motion checks against the Dashboard's installed Three.js version where the test harness supports it.

**Acceptance criteria:**

- The facade can be imported by the Dashboard with its installed Three.js and loader instances and returns a `THREE.Group` plus its documented control/lifecycle API.
- All 13 runtime GLBs load from local public paths with no dependency on the source site's relative paths or external CDN.
- Existing mechanical constraints, coffee-flow behavior, and rejection/rollback behavior remain intact under the source assembly checks.
- No other machine cluster, standalone renderer, HTML page, or legacy duplicate motion subsystem is ported.

**Entry:** accepted architecture and source project identified; confirm the Dashboard's installed Three.js lockfile version and decoder compatibility.

**Exit:** assembly import/asset checks and applicable existing source tests pass, or a specific incompatibility is documented before proceeding.

**Risk / response:** decoder-version mismatch or a source-relative asset path may prevent loading. Use the installed application's matching decoder assets and explicitly configured local base URL; do not silently fall back to a network CDN.

**Approval / stop gate:** stop for user direction if successful integration would require replacing the Dashboard's Three.js/R3F stack, weakening assembly constraints, or adding another cluster. Otherwise continue within the accepted architecture.

**Review gate:** read-only review of the imported module boundary, asset list, license/provenance requirements, and preservation of assembly invariants before UI integration.

## Phase 2 — Host the assembly at `/digital` through React Three Fiber

**Outcome:** `/digital` renders the first assembly in one Dashboard-owned R3F canvas, and the route inherits the shared Dashboard shell.

**Scope:** relocate the current blank page to `src/app/(dashboard)/digital/page.tsx`; create a client-side feature viewer that owns assembly creation/loading, exposes the returned `THREE.Group` to R3F, and calls `update(delta)` from `useFrame`. Inject the app's `THREE`, `GLTFLoader`, and `DRACOLoader`; configure the local decoder and model base path. Handle loading, failure/retry, and cleanup so pending loads or animation callbacks cannot mutate an unmounted viewer. On teardown, stop updates and call the assembly's `dispose` API exactly once.

**Not in scope:** controls layout beyond the minimum viewer lifecycle states, telemetry, extra clusters, or independent WebGL renderer management.

**Implementation boundary / affected areas:** `src/app/(dashboard)/digital/page.tsx`, `src/components/features/digital-twin/**`, and the route relocation from `src/app/digital/page.tsx`. Use one `<Canvas>` and R3F lifecycle; do not call `new THREE.WebGLRenderer`, install another animation loop, or attach source-page DOM listeners.

**Side effects:** moving the page changes only its route-group ownership; Next.js route groups preserve `/digital`. The model assets are fetched locally by the browser and GPU memory is allocated for the lifetime of the viewer.

**Verification:** confirm there is exactly one App Router route for `/digital`; run TypeScript and production build; open `/digital` in the browser and verify the model loads, camera interaction works, loading/error states are visible, and navigating away then back does not leave duplicate loops, listeners, or GPU resources.

**Acceptance criteria:**

- `/digital` appears inside the standard Dashboard sidebar/header shell without changing its URL.
- The scene uses one R3F canvas and the Dashboard dependency instances; no vanilla renderer or second render loop is active.
- The local assembly loads and animates via `useFrame`; cleanup and failed/pending-load paths are safe.
- No API/BE request or mock telemetry is introduced.

**Entry:** Phase 1 meets its exit criteria and the stub route's current contents are preserved/understood before relocation.

**Exit:** the route builds and the browser lifecycle checks pass on desktop and at least one narrow viewport.

**Risk / response:** route duplication or asynchronous load/unmount races can cause build or lifecycle defects. Keep a single route definition, guard stale async completions, and verify cleanup through navigation.

**Approval / stop gate:** stop if the existing route has gained user work not represented by the blank stub, if shell ownership conflicts with another route, or if the selected R3F host requires a material architecture change.

**Review gate:** review route ownership, Three.js singleton usage, loader/decoder configuration, error states, and resource cleanup before adding the full interaction panel.

## Phase 3 — Add Dashboard-aligned, accessible interaction UX

**Outcome:** users can inspect and operate the first assembly's local simulation with clear, responsive controls that remain consistent with the rest of the Dashboard.

**Scope:** implement the accepted split layout: dominant 3D scene and adjacent control panel on desktop; vertically stacked scene and collapsible controls on mobile. Use existing Dashboard tokens, surfaces, borders, spacing, and bilingual i18n. Group controls for assembly/view mode, camera reset, link/constraint markers, automatic/manual motion, and motion speed. Do not expose the coffee-flow visualization or controls in this delivery; keep the internal effect hidden and stopped. Represent only local model state. Default automatic motion off; honor reduced-motion preference. Define safe continuous manual interaction: stop on pointer up/cancel/leave, keyboard release where applicable, window blur, and component teardown; avoid duplicate step/jog actions from pointer and click events. Provide accessible names, keyboard operation, pressed/selected state, visible focus, and concise loading/error/status announcements.

**Not in scope:** real machine commands, telemetry/status cards sourced from mock IoT stores, live history charts, configuration persistence, or controls for absent clusters.

**Implementation boundary / affected areas:** digital-twin feature components/styles and `src/lib/i18n/translations.ts` or the project's established translation resources/store integration. Prefer feature-local UI/state over changing general Dashboard components. Extend shared design tokens only if an existing semantic token is genuinely missing.

**Side effects:** adds bilingual strings and local UI state; manual and automatic controls affect only the in-browser model. Ensure a visible label communicates that this is a local model/simulation, not a live machine-control surface.

**Verification:** test desktop and mobile layout, all view/marker/camera/auto/manual/speed/coffee controls, keyboard and touch use, reduced-motion behavior, pointer cancellation/focus-loss stop behavior, both app languages, and loading/error announcements. Check browser console for React/R3F warnings and failed local assets.

**Acceptance criteria:**

- Visual tokens and shared Dashboard shell are used; there are no unexplained hard-coded colors that conflict with the design system.
- Desktop and mobile layouts remain usable without clipping the canvas or trapping controls below the fold; mobile control panel is collapsible.
- Every control operates the assembly API and exposes clear active/disabled state; continuous movement always stops when interaction is interrupted.
- Mechanical-link visualization is clearly part of the local model; no live/BE data is implied.
- New user-facing strings are available through the existing bilingual i18n mechanism; core controls are keyboard-accessible.

**Entry:** Phase 2 viewer lifecycle works and the assembly API-to-control mapping is documented.

**Exit:** interaction and responsive/accessibility checks pass; user-facing status clearly distinguishes local simulation from live machine data.

**Risk / response:** too many controls may obscure the model, while continuous movement may continue after lost pointer focus. Keep controls grouped/collapsible, make camera/model area dominant, and centralize stop behavior across release/cancel/blur/unmount.

**Approval / stop gate:** stop before introducing any action that could be interpreted as a physical machine command or requires real telemetry; that would need a separate specification and explicit approval.

**Review gate:** review design-token use, responsive hierarchy, bilingual coverage, accessible state/labels, and all motion-stop paths before final integration verification.

## Phase 4 — Integration verification and handoff

**Outcome:** the first-cluster `/digital` feature is verified against its scope and handed off with known limitations stated.

**Scope:** run applicable assembly contract/boundary/slot-motion checks with the Dashboard's installed Three.js; run the repository TypeScript and production build checks; complete browser checks for the accepted desktop/mobile model UX and scene lifecycle. Coffee-flow behavior is deferred and is not a UI acceptance check. Review the final diff to confirm only the planned feature, route relocation, translations, and local assets changed.

**Not in scope:** fix unrelated lint/tooling problems or expand into additional clusters/backend work. If a check is unavailable because of an existing script issue, record the exact evidence and use the nearest relevant verification without expanding scope.

**Implementation boundary / affected areas:** the Phase 1–3 feature files and route only. No new product behavior is added in this phase unless a verification defect is found; defects return to their owning phase.

**Side effects:** verification may generate build artifacts/caches; do not commit or remove unrelated user data. Model assets increase deployment payload, so report the measured asset footprint in handoff.

**Verification:** require successful applicable source assembly checks, `npx tsc --noEmit --incremental false`, `npm run build`, and manual browser acceptance for scene loading, camera, all mechanical-model controls, responsive layout, language switching, and navigation cleanup. Coffee-flow UI is deferred. Check that the browser makes no BE/telemetry requests from this feature.

**Acceptance criteria:**

- `/digital` meets the goals and phase acceptance criteria with no unresolved high-severity correctness, interaction, or lifecycle issue.
- Existing first-assembly links/motion checks remain green against the app's Three.js instance.
- TypeScript and production build pass; any unavailable check is documented with cause and substitute evidence.
- The handoff records imported asset footprint, verification results, local-simulation/no-BE boundary, and deferred work (three remaining clusters and future data integration).

**Entry:** Phases 1–3 have passed their review gates, or the user has explicitly directed continuation with a documented Phase 3 verification gap.

**Exit:** all acceptance evidence is recorded and no in-scope blocker remains.

**Risk / response:** source tests may assume a standalone environment or depend on network access. Point them to the installed app Three.js and local assets; do not add network dependence or weaken a failed invariant to get a green result.

**Approval / stop gate:** stop and report evidence if a required assembly invariant or build check fails for a reason that needs source-model changes, dependency upgrades, or broader Dashboard refactoring.

**Review gate:** final read-only review confirms no BE integration, no extra clusters, no standalone renderer, one `/digital` route, and no unrelated changes.

## Execution record

**Execution mode:** Standard  
**TDD:** Off (user-selected)  
**Target workspace:** `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`

| Phase | Status |
| --- | --- |
| 1 — Port the first assembly and runtime assets | Complete |
| 2 — Host the assembly at `/digital` through React Three Fiber | Complete — responsive viewport, load/error/retry, navigation, and teardown safeguards verified |
| 3 — Add Dashboard-aligned, accessible interaction UX | Partial — reduced-motion and forced-interruption runtime checks remain unavailable; user authorized proceeding |
| 4 — Integration verification and handoff | Unverified — two Phase 3 runtime checks remain unavailable; mobile and network evidence have documented limits |

### Phase 1 evidence

- Imported the 16 JavaScript files from source `src/assembly/` into `src/components/features/digital-twin/assembly/`. All copied module files are byte-identical to source except `config.js`, whose defaults now use `/models/digital-twin/cluster-01` and `/draco-gltf/` instead of relative/CDN URLs.
- Imported exactly 13 GLB assets into `public/models/digital-twin/cluster-01/` (2,124,044 bytes). All target files match source hashes; all GLB headers and JSON chunks are valid, and every file declares `KHR_draco_mesh_compression`.
- The local manifest resolves all 13 asset roles to existing same-origin public files. The existing decoder WASM hash matches the file shipped with installed Three.js 0.183.2; its shared path was retained. Actual browser decoding/rendering of these GLBs remains a Phase 2 acceptance check.
- Baseline source checks passed: `assembly-contract.mjs`, `assembly-boundary.mjs`, `coffee-flow.mjs`, and `slot-motion.mjs`, using the Dashboard's local Three.js 0.183.2.
- Re-ran those checks against a temporary mirror of the imported target module; all passed. The first `slot-motion.mjs` attempt in the mirror failed because its fixture expects the GLBs in the working directory. Copied the required GLB fixtures into the temporary directory and retried once; it passed (maximum slot error approximately `0.000056 mm`, rollback passed). Temporary fixtures were removed.
- All 16 imported JavaScript files passed `node --check`. The temporary Node ESM test harness emitted `MODULE_TYPELESS_PACKAGE_JSON` warnings because the repository does not declare `type: module`; tests still passed. No test or harness files were added to the product tree.
- Read-only review found no scope or dependency-boundary issues. No standalone renderer, DOM/UI code, other clusters, or Backend/telemetry integration was imported. Existing `src/app/digital/` was left untouched.
- TypeScript/build and real browser rendering checks were not run in this phase; route integration and browser lifecycle are Phase 2 gates.

**Phase 1 verification status:** Verified for the phase's module, asset, manifest, and assembly-invariant checks; actual browser Draco decode is explicitly pending Phase 2.  
**Next gate:** stop at the Standard phase boundary. Begin Phase 2 only after this phase record is reviewed.

### Phase 2 evidence

- Moved the blank route to `src/app/(dashboard)/digital/page.tsx`; this is the only App Router page for `/digital` and it inherits the existing Dashboard shell.
- Added a client-side viewer with one dynamically loaded React Three Fiber canvas. It injects the Dashboard's `THREE`, `GLTFLoader`, and `DRACOLoader`, loads same-origin assets from `/models/digital-twin/cluster-01/` with `/draco-gltf/`, and advances the assembly through `useFrame`. No standalone renderer, second render loop, API call, or telemetry adapter was added.
- Browser testing on the existing Next.js dev server showed the assembly load, camera orbit by drag, EN/VI title and subtitle updates, navigation to the Dashboard and back, and a fresh model load after returning. The Next.js development overlay showed no remaining issues after the asset correction.
- Corrected two imported GLBs (`wiper.glb` and `wiper_gear.glb`): their embedded normal-map bytes were DDS while the glTF metadata declared PNG, which caused two GLTFLoader texture errors. Removed only those unsupported normal-texture references; the compressed geometry payloads remain unchanged. All 13 GLBs still have valid headers/JSON and Draco requirements; current combined asset size is 2,113,712 bytes.
- `tsc --noEmit --incremental false`, `git diff --check`, route uniqueness, the GLB integrity check, and a feature-source scan for API/telemetry/network calls passed. The scan found no such calls in the new route/feature.
- `npm.cmd run build` passed with network access for the existing Inter font. Next.js compiled `/digital` and generated all routes; it also emitted an unrelated Recharts warning about a chart width/height of `-1` while prerendering another page.
- Forced a local GLB 404 by temporarily moving `left_arm.glb`; the accessible error UI appeared. Restored the original 18,252-byte file, selected **Try again**, and confirmed the model loaded successfully.
- At 390×844 CSS px in Edge, the canvas measured 356×589 px, the document stayed 390 px wide with no horizontal overflow, and the assembly remained visible.
- In a fresh Edge tab, `/digital` announced its loading state; navigation immediately to `/dashboard` and back to `/digital` completed, and the assembly rendered again without a visible Next.js error. The browser API does not expose GLB request interception, so the exact network-request phase at unmount could not be observed. Code review confirmed the pending branch aborts the loading manager, marks the scene inactive, ignores stale completion callbacks, and calls guarded disposal once.

**Phase 2 verification status:** Verified for the approved route, local loading, camera, locale, error/retry, navigation, narrow viewport, and guarded unmount behavior. Request-level timing could not be instrumented, but the loading-state navigation scenario and source lifecycle review passed.  
**Next gate:** Phase 2 review gate passed; continue to Phase 3 as requested.

### Phase 3 evidence

- Added `DigitalTwinControls.tsx` as a feature-owned panel and updated `DigitalTwinViewer.tsx` to compose the desktop split layout and the mobile stacked/collapsible layout. `DigitalTwinCanvas.tsx` exposes the assembly controller to local controls and supports camera refit without remounting the scene.
- Controls map to the existing assembly API for component views, camera reset, link markers, automatic/manual motion, motion speed, and coffee-flow visibility/playback/speed/reset. All state remains in the browser; no API, BE, IoT store, WebSocket, or MQTT integration was added.
- Added bilingual labels/help/status for every control and view mode. EN/VI switching was verified in the browser. A review finding about a changing toggle name was fixed by giving flow playback a stable accessible name while retaining `aria-pressed`.
- Desktop browser checks passed: selecting Piston changed the visible model; camera reset and marker toggle responded; auto motion toggled on/off; speed input changed through keyboard interaction and displayed fractional values; coffee flow showed, played, paused, and reset; pointer click and Space-key press/release on manual movement ended with the control unpressed.
- At 390x844 CSS px, the 3D canvas measured 356x488 px, the page had no horizontal overflow, and the control panel opened/closed. The expanded Vietnamese panel also fit the viewport width without clipped header text.
- Source review confirmed reduced-motion preference stops automatic and coffee animation, disables automatic playback, and permits explicit manual movement. Pointer up/cancel/leave/lost capture, key up, button blur, window blur, and teardown all route to stop logic. The current browser controls cannot emulate `prefers-reduced-motion` or hold/cancel a pointer while switching focus, so those exact runtime paths remain unverified.
- `tsc --noEmit --incremental false`, final `npm.cmd run build`, and `git diff --check` passed. The build still reports the unrelated Recharts width/height `-1` warning from another page. `npm.cmd run lint` is unavailable: the repository script invokes `next lint`, which Next 16 treats as a project path; no ESLint config file is present. No test script/framework exists, so interaction evidence is browser-based.
- Final read-only review found no remaining correctness, boundary, or maintainability findings in the Phase 3 changes. No hard-coded UI colors were added; existing Dashboard tokens are used.

**Phase 3 verification status:** Partial. Core desktop/mobile flows, bilingual UI, TypeScript, production build, and review passed. Runtime reduced-motion and forced pointer/focus interruption checks could not be run through the available browser controls; do not treat code inspection alone as runtime proof.  
**Next gate:** Phase 4 may proceed at the user's explicit direction; reduced-motion and forced pointer/focus interruption remain unverified and must be reported, not treated as passed.

**Scope update (2026-09-28):** the user clarified that the current `/digital` experience needs mechanical models only. The coffee-flow visualization and controls are deferred. Its imported assembly internals remain hidden and stopped; the visible controls continue to operate only the mechanical model.

### Phase 4 evidence

- The user explicitly authorized continuing to Phase 4 with Phase 3 still Partial. The reduced-motion emulation and forced pointer/focus-interruption runtime checks remain gaps; source review is not recorded as runtime proof.
- Removed the coffee-flow controls, state/handlers, and EN/VI strings from the Dashboard UI. The Canvas keeps the imported coffee effect hidden and stopped before loading; the assembly module itself is unchanged.
- Re-ran the imported `assembly-contract.mjs`, `assembly-boundary.mjs`, and `slot-motion.mjs` against a temporary copy of the Dashboard assembly and installed Three.js 0.183.2. All passed: contract passed; 13 model progress events and retry/dispose paths passed; maximum slot error was approximately `0.00005594 mm` and rollback passed. Temporary files were removed. The separate `coffee-flow.mjs` scenario was not rerun after the scope clarification.
- `tsc --noEmit --incremental false`, assembly JavaScript `node --check`, `git diff --check`, the one-route check, and the source scan for API/telemetry calls passed. The scan found no API or telemetry call in the route/feature. Browser-level network interception is not exposed by the available controls, so this is source-level evidence rather than a network trace.
- `npm.cmd run build` passed after retrying with approved access for the existing Google Fonts Inter fetch. Next.js generated `/digital` and the route set. The build continues to show the unrelated Recharts width/height `-1` warning. `npm.cmd run lint` remains unavailable because the configured `next lint` command is unsupported by Next.js 16 and no ESLint config exists.
- In Edge on the desktop `/digital` tab, the assembly loaded and rendered. The accessibility tree contains only view/camera, mechanical-links, and motion groups; no coffee-flow UI or labels remain. Selecting Piston and restoring Full assembly worked; camera reset, marker toggle, automatic motion, speed adjustment, and keyboard Space release for manual motion were exercised. EN/VI switching produced the expected translated model controls and no coffee-flow strings.
- Responsive browser evidence at 390×844 CSS px and mobile panel expand/collapse passed in Phase 3 before this scope reduction. It was not rerun after removal; the only layout change is removal of the final control group. Navigation cleanup remains covered by Phase 2 evidence.
- The local GLB footprint remains 13 files totaling 2,113,712 bytes (about 2.016 MiB). No extra clusters or Backend/IoT integration were added.
- Final source review found no in-scope correctness or boundary finding in the scope reduction. The assembly internals remain available but are hidden/stopped; this preserves the imported contract without exposing coffee flow to the current UI.

**Phase 4 verification status:** Unverified. Assembly, TypeScript, build, desktop browser behavior, language switching, and scope checks passed. Phase 3 reduced-motion and forced pointer/focus-interruption runtime checks remain unavailable; mobile evidence predates the scope reduction, and browser network interception is unavailable. Do not describe the full plan as verified until the two runtime checks are run in a capable browser environment.

## Deferred follow-up

After the first assembly has been accepted, plan the remaining three clusters as separate additions with their own asset/linkage verification. Plan coffee-flow visualization separately if it becomes needed. Specify Backend data contracts and any live machine-control permissions separately before connecting telemetry or commands; do not treat that work as an implicit continuation of this plan.
