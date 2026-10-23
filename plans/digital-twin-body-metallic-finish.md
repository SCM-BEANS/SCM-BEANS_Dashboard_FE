# Digital Twin Body Metallic Finish Plan

## Objective

Give the standalone **Machine Body** view inside `/digital` a restrained cool steel/metal appearance while preserving the existing `Body.glb` geometry, hierarchy, camera behavior, tab lifecycle, and mechanism viewer.

This is a plan-only artifact. It does not authorize product-code changes, asset edits, commits, or deployment.

## Confirmed architecture and UI/UX decisions

- **Feature ownership:** keep the change inside `src/components/features/digital-twin/BodyModelCanvas.tsx`, where the Body GLB is loaded and its R3F scene is owned. `BodyModelViewer.tsx` continues to own loading/error/retry and zoom/reset state only.
- **Existing architecture:** preserve Next.js App Router, React Three Fiber, Three.js, the existing `/digital` route, and the separate Body/Mechanism tabs from `plans/digital-twin-body-tab.md`.
- **Asset boundary:** do not edit, re-export, recompress, rename, or rewrite `public/models/digital-twin/body/Body.glb`. Apply a display-only material style after the model loads.
- **Visual direction:** use a cool steel-gray tint with stronger metallic response and moderate roughness, so highlights remain readable instead of producing a mirror-like or flat-black body.
- **Interaction direction:** add no new user interaction. Preserve fixed Body camera orientation, zoom, reset, loading, ready, error, retry, keyboard semantics, and responsive layout.
- **Data boundary:** no API, telemetry, IoT, persistence, external texture, HDR environment, or new model request.

## Decision record

| Option | Trade-offs | Decision |
| --- | --- | --- |
| Adjust the loaded GLTF materials in `BodyModelCanvas` | Smallest change, preserves geometry and maps, local and reversible; depends on materials exposing PBR properties | **Selected.** Fits the existing feature boundary and the requested visual change. |
| Replace every mesh material with a new `MeshStandardMaterial`/`MeshPhysicalMaterial` | More predictable metallic values, but can discard GLB maps, alpha behavior, normal detail, and material-specific settings | Rejected for this increment because it risks reducing the model's existing visual detail. |
| Edit or re-export `Body.glb` | Could make the finish permanent, but changes source provenance and requires a separate asset review/rollback path | Rejected; the current Body plan explicitly preserves the source asset. |
| Add an HDR/environment asset or postprocessing | Can improve reflections, but adds asset/runtime complexity and possibly external or generated media | Rejected; first validate the requested color/material change with the existing local lights. |

## Phase 1 — Apply a feature-local metallic material style

**Outcome:** the loaded standalone Body model renders with a consistent cool steel-gray material treatment without changing the source GLB or the Mechanism tab.

**Scope:**

- Add one feature-local material-style constant in `BodyModelCanvas.tsx`, with the initial bounded values:
  - tint: cool steel-gray, approximately `#7f8b97`;
  - `metalness`: `0.82` when supported;
  - `roughness`: `0.28` when supported.
- Traverse `gltf.scene` after load and before `setModel` to apply the style to mesh materials.
- Preserve each material's existing texture maps, normal maps, alpha/transparency, side, and other GLTF-defined settings.
- Handle both a single material and material arrays.
- Set color only when the material exposes a color; set `metalness` and `roughness` only when those PBR properties exist, so unsupported material types do not break loading.
- Keep the existing stage plane, fixed camera, zoom/reset behavior, loader, Draco path, loading/error lifecycle, and tab mounting unchanged.

**Not in scope:**

- Editing `Body.glb` or any source CAD/model file.
- Recoloring the stage plane, the mechanism assembly, sidebar/header, or shared design tokens.
- Adding a color picker, finish selector, persistence, animation, new controls, environment map, postprocessing, API, or telemetry.
- Changing the Body/Mechanism tab structure or the `/digital` URL.

**Dependencies:** the existing Body tab implementation and local `Body.glb`/Draco decoder remain available; no dependency upgrade is required.

**Implementation boundary / affected components:**

- `src/components/features/digital-twin/BodyModelCanvas.tsx`: material styling helper/constant and its call in the existing GLTF success path.
- No changes to `BodyModelViewer.tsx`, `DigitalTwinWorkspace.tsx`, `DigitalTwinViewer.tsx`, translations, public assets, route files, or mechanism assembly files unless verification exposes an unrelated regression that requires a separately approved change.

**Interface/schema changes:** none. Existing component props and loader callbacks remain unchanged.

**Side effects:** all body meshes in the active Body viewer receive the new display-only material properties. The material adjustment is local to the loaded scene and is disposed through the existing model cleanup path when the tab unmounts or retries.

**Verification:**

- Inspect the material traversal for single-material and material-array meshes.
- Confirm maps and transparency remain attached after styling.
- Run `npx tsc --noEmit --incremental false`.
- Run `npm.cmd run build` and confirm `/digital` is generated.
- Check `git diff --check` and confirm no GLB/public asset changed.

**Acceptance criteria:**

- The Body view visibly has a cool steel/metal finish under the existing local lights, with readable highlights and no mirror-like glare or black crush.
- Existing body geometry, orientation, stage placement, fixed camera behavior, zoom, reset, loading, ready, error, and retry behavior are unchanged.
- The Mechanism tab remains behaviorally unchanged.
- No new network request, route, API, state store, or translation key is introduced.
- The source `Body.glb` and all public model assets remain byte-for-byte unchanged.

**Entry condition:** this plan is approved for implementation; the current Body viewer and related plan are re-read so intervening user changes are preserved.

**Exit condition:** the material style is implemented in the Body feature boundary and all source/build/diff checks pass; any visual issue requiring lighting or asset changes is explicitly recorded instead of expanding scope silently.

**Risks and response:**

- A GLB material may not expose standard PBR fields. Guard property writes and retain its original material behavior.
- A color tint may interact with an existing base-color map. Preserve the map and inspect the rendered result; do not replace the material wholesale.
- High metalness can become too dark without environment reflections. Keep the first increment limited to the existing lights and stop for a separate visual-design decision if the result is not readable.
- Material styling must not mutate a shared global material. Apply it only to the scene instance created by this Body viewer.

**Approval/stopping gate:** stop and report if the desired metallic appearance requires editing the GLB, adding an environment asset/postprocessing, changing the mechanism viewer, changing shared tokens, or changing the existing loader/lifecycle contract.

**Review gate:** read-only review confirms the change is feature-local, source assets are untouched, PBR properties are guarded, existing maps/lifecycle are preserved, and no unrelated route/mechanism/UI behavior changed.

## Phase 2 — Visual and regression verification

**Outcome:** the Body finish is verified in the real `/digital` workflow and handed off with evidence and any remaining visual limitations.

**Scope:**

- Open `/digital` and verify the initial Body tab shows the metallic finish.
- Verify fixed camera orientation remains unchanged; zoom and reset still work.
- Switch Body → Mechanism → Body and verify only the active Canvas is mounted and both viewers recover normally.
- Verify loading, ready, error/retry, keyboard focus, accessible labels, narrow viewport layout, and EN/VI text remain intact.
- Confirm the Mechanism model's controls and appearance are unchanged.
- Inspect browser console and network behavior for new errors or external material/texture requests.

**Not in scope:** subjective redesign of the whole page, mechanism recoloring, source asset editing, environment/HDR work, or unrelated lint/tooling repair.

**Dependencies:** Phase 1 is complete; a browser environment capable of rendering the local GLB is available.

**Implementation boundary / affected components:** verification only across the Body feature and `/digital` route; defects return to Phase 1 unless they reveal a separate architecture or product decision.

**Side effects:** browser/build caches may be generated. Do not remove unrelated user data or revert unrelated workspace changes.

**Verification:** record commands, exit codes, browser viewport, tab-switch results, visual observations, console/network observations, and final `git diff --check` output. If browser rendering is unavailable, mark visual acceptance unverified rather than inferring it from source inspection.

**Acceptance criteria:**

- The metallic Body finish is visually confirmed in `/digital`.
- Body camera and controls remain operable and accessible.
- Mechanism behavior and appearance remain unchanged.
- No external model/material/decoder request is introduced.
- TypeScript, production build, and diff checks pass, or named failures are recorded with their cause.

**Entry condition:** Phase 1 exit criteria are met and the browser/build environment is available.

**Exit condition:** visual and regression evidence is recorded; no unresolved in-scope high-severity issue remains.

**Risks and response:** visual rendering may differ across GPU/browser implementations. Record browser and viewport details and do not claim universal appearance from one environment.

**Approval/stopping gate:** stop if the visual result is unreadable, the GLB cannot load, or verification reveals a lifecycle/regression issue outside the material-only boundary.

**Review gate:** final read-only review checks material ownership, asset preservation, tab isolation, accessibility/interaction preservation, build evidence, and absence of unrelated changes.

## Assumptions

- “Kim loại hơn” means a cool steel-gray tint with higher metallic response, not a user-selectable finish system.
- The existing Body GLB uses materials compatible with color/metalness/roughness guards; unsupported material types will retain their safe existing properties.
- No exact brand color was requested, so the plan uses a restrained neutral steel tint rather than a saturated brand color.
- The user wants planning first; implementation requires a separate follow-up instruction after plan approval.
