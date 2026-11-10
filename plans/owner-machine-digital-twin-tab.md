# Owner machine detail: "Xem máy" digital twin tab

## Goal

Add a 4th tab **"Xem máy"** to the Owner machine detail page (`/dashboard/machines/:id`) after "Hợp đồng".
It shows the 3D coffee machine (body + cluster-03 compressor) with its real mechanical motion and the
operation cycle, restored from the old viewer that was deleted in commit `38a97ca`.
Source of truth for the old code: `git show 38a97ca^:<path>`.

The model is illustrative and local only: no IoT, telemetry, API or store wiring.

## Current state

- `src/pages/dashboard/machines/machines-screen.tsx` already has tabs via `MachineSectionTabs`
  (`detailTabs` = overview / maintenance / contracts, panels use `role="tabpanel"`, `hidden`, and
  class `machineStyles.ownerDetailTabPanel`; `detailPanelId(tab)` builds panel ids; tab ids are
  `owner-machine-tab-<value>`).
- Model assets still exist in `public/models/digital-twin/` (body, cluster-02, cluster-03 + `connections/*.json`).
  Draco decoder is in `public/draco-gltf/`.
- `three`, `@react-three/fiber`, `@react-three/drei`, `three-stdlib` are installed. Do not install anything.
- Offline CAD scripts live in `scripts/digital-twin/cluster-03/cad/` (`validate-*.mjs`). They are not runtime code.

## What to restore (from `38a97ca^`)

Into `src/components/features/digital-twin/` (same relative paths):

- `BodyModelViewer.tsx`, `BodyModelCanvas.tsx`
- `DigitalTwinClusterCanvas.tsx` (needed for its exported helpers and motion runtime used by `BodyModelCanvas`)
- `operation/DigitalTwinOperationConfig.ts`, `operation/useDigitalTwinTestCycle.ts`
- Only the `material-effects/*` files that `BodyModelCanvas.tsx` imports, transitively
  (expected: `CoffeeGroundEffect.tsx`, `WaterFlowEffect.tsx`, `MaterialEffectsConfig.ts`, `WaterFlowConfig.ts`,
  `coffeeGroundRuntime.ts`, `waterFlowRuntime.ts`). Check the real import graph; do not bring test viewers/canvases.

Schemas `src/schemas/digitalTwinCycle.ts` and `src/schemas/digitalTwinMaterialEffects.ts` go to the repo convention:
`src/schema/digital-twin-cycle.schema.ts` and `src/schema/digital-twin-material-effects.schema.ts`. Update imports.

Do NOT restore: `DigitalTwinWorkspace.tsx`, `DigitalTwinClusterViewer.tsx`, `*TestViewer.tsx`, `*TestCanvas.tsx`,
`useMaterialEffectsTest.ts`, `src/components/3d/AssemblyExplorer.tsx`, `src/data/Assem1.ai-assembly.json`, App Router pages, plans.

Keep the motion / kinematics / loader code as is. Only change what is required to compile and fit the app.

## Required adaptations

1. **i18n removal.** The old code used `useI18nStore` / `TranslationKey` (deleted). Replace every `t("key")` with the
   Vietnamese string from `git show 38a97ca^:src/lib/i18n/translations.ts` (the `vi` entry for that key).
   Put the strings in a new `src/text/digital-twin/digital-twin-messages.ts` (follow the `src/text/*/…-messages.ts`
   pattern, `as const` object) and import from there. Operation stage `labelKey`s in `DigitalTwinOperationConfig.ts`
   must map to Vietnamese labels the same way. Write UTF-8 and keep Vietnamese diacritics.
2. **Styling.** The old JSX used Tailwind tokens that no longer exist (`bento-border`, `text-on-surface`,
   `bg-primary`, `bg-outline-variant`, …). Replace with a CSS module `digital-twin-viewer.module.css` using the Owner
   palette already used in `src/components/machines/machines.module.css` (borders `#e9e2dc`, text `#302b29`/`#786e69`,
   accent `#b91222`, active bg `#fae9eb`, radius 8–14px, focus outline `3px solid rgb(185 18 34 / 28%)`).
   Toolbar buttons must stay ≥ 44px touch targets. No horizontal page scroll at 390px width.
3. **Config.** Move the model / motion URL constants the old `DigitalTwinWorkspace` passed to the "body" tab into
   `src/components/features/digital-twin/digital-twin-model-config.ts`, and export one wrapper:

   ```tsx
   export function MachineDigitalTwinView() // renders <BodyModelViewer enableOperationTest enableCoffeeEffect
   //   enableWaterEffect includeCompressorMotion compressorModelUrls compressorRootFrameUrl
   //   compressorMotionDefinitionUrls /> with the same values the old "body" tab used
   ```
   Put it in `src/components/features/digital-twin/machine-digital-twin-view.tsx`.
4. **Pages Router.** `"use client"` is harmless; keep or drop. `next/dynamic` inside the viewers stays.
   Import paths `three/addons/...` must resolve with three 0.183 (check `tsc`).

## Wiring in `machines-screen.tsx`

- Add `{ value: "model", label: "Xem máy" }` as the last entry of `detailTabs`.
- Load the wrapper with `next/dynamic(() => import(...).then(m => m.MachineDigitalTwinView), { ssr: false, loading: () => <p className={styles.loadingNotice} role="status">Đang tải mô hình…</p> })`.
- Render the viewer **only while the tab is active** (`detailTab === "model" && <…/>`) so the ~25 MB of models and the
  WebGL context are not created on page load and are released when leaving the tab.
  The tab panel element itself follows the same pattern as the other panels (id, role, aria-labelledby, hidden, class).
- Above the viewer, one muted line: "Mô hình 3D minh họa, chuyển động mô phỏng — không phải dữ liệu thời gian thực của máy."
- Show the tab for every machine type.
- Do not change anything else on the page.

## Tests

- `tests/e2e/owner-machines-ui.spec.ts`: add a test that opens the detail page, clicks tab "Xem máy", asserts the tab is
  selected, the note line is visible and the page does not show a crash. Headless WebGL may fail: assert either the
  canvas region or the viewer's own load-error message is visible, not a specific render.
  Route `**/models/digital-twin/**` and `**/draco-gltf/**` to `route.continue()` (no mocking needed).
- Run the existing CAD validators to confirm data still matches:
  `for f in scripts/digital-twin/cluster-03/cad/validate-*.mjs; do node "$f" || echo "FAIL $f"; done` and report results.

## Verify and report

- Final check: `bash scripts/verify/verify.sh --e2e "owner-machines-ui.spec.ts maintenance-ticket-actions.spec.ts machine-operational-overview.spec.ts"`
  then `bash scripts/verify/verify.sh` (full, includes build) once. Never call Playwright or `next build` directly.
- No commit, no push, no install. FE only.
- Large files (>600 lines) are yours, do not delegate them to DeepSeek.
- Report (max 20 lines): files added/changed, what you changed inside restored files and why, validator output,
  verify summary lines, anything left undone.
