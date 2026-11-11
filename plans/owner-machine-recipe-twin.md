# Owner "Xem máy": recipe-driven digital twin with a visibility design

Supersedes `plans/owner-machine-live-digital-twin.md` for everything that maps `brewState` to motion
(that work is uncommitted; replace it, do not keep two mechanisms). Owner role only for now, but keep the new
pieces role-neutral (props, not role checks) so Technician/Admin can reuse them later.

## Why

The viewer was built for a fixed test cycle. Real machines send (a) a dish name per cup and (b) the dish has a recipe
procedure. So: receive the dish name → look up its recipe → build a brew script → play the script on the 3D model,
and present the model so the user can actually see the working part (shells see-through, focus part highlighted,
rest dimmed, camera follows, labels with the recipe values).

Real data (verified in BE `dolores_platform`, read-only):
- `machinesApi.listBrewRecords(machineId, { from, to, page, size })` → `{ content: [{ id, eventId, machineId, recipeName, brewedAt, receivedAt }] }`.
  A record exists only AFTER the cup is made, so the twin REPLAYS the dish that was just brewed (seconds late). Say so in the UI.
- Recipe procedure = list of `DIRECTIVE:number` strings (`src/schema/recipes.schema.ts`): `PREWATER, PREMILK, DOSE, TAMP, HOLDTAMP,
  PREINFUSE, BLOOM, EXTRACT, DRYTAMP, POSTMILK, POSTWATER`. Older recipes may contain display strings: parse leniently, ignore unknown.
- Machine detail already has `activeMenuId` / `activeMenuName` (null = default menu). Owner-readable recipe APIs:
  `recipeMenusApi.listLocalRecipes(menuId)` + `getLocalRecipe(id)` (`steps`), `recipesApi.getGlobalById` / `listGlobalPage`.
  Check BE controllers and `SecurityConfig` to confirm which ones an OWNER may call; resolve a recipe by name
  (trim, case-insensitive). If it cannot be resolved (403/404/not found), fall back to a default script
  (DOSE:18, TAMP:100, EXTRACT:40) labelled "Quy trình chuẩn (không tìm thấy công thức)".
- Heartbeat stays only for the connection badge/last-seen/metrics (poll every 10 s). No `brewState`→motion mapping any more.

## 1. Brew script (pure, unit-tested) — `src/components/features/digital-twin/script/`

`parse-procedure.ts`: `parseProcedure(steps: string[])` → `{ directive, value }[]` (tolerant).
`build-brew-script.ts`: `buildBrewScript(procedure, name)` → `BrewScript { name, steps: BrewScriptStep[] }`,
`BrewScriptStep { id, kind, label (vi), valueText?, durationMs, phase?: DigitalTwinCyclePhase, motionHold?: boolean,
focus: PartGroupId[], effects: { water?: boolean, coffee?: boolean, grinderSpin?: boolean } }`.

Directive → step (in recipe order, then the fixed tail). Reuse the verified cluster-03 motion by feeding the existing
phases to `BodyModelCanvas` (do NOT edit motion code): closing → tamping → … → opening → ejecting → scraping, using
`DIGITAL_TWIN_OPERATION_STAGES` motion ranges. Pose must be continuous: a step without its own motion holds the previous pose.

| Directive | Step | Focus groups | Effects | Notes |
|---|---|---|---|---|
| PREWATER, POSTWATER | "Nước 30 ml" | water, output | water | pose held |
| PREMILK, POSTMILK | "Thêm sữa" | (none; label only) | – | model has no milk part |
| DOSE:g | "Xay 18 g" then "Nạp cà phê", then auto "Đóng cụm nén" | hopper, grinder, then brewUnit | grinderSpin, coffee (falling grounds) | grinding phase then dosing then closing |
| TAMP:n, HOLDTAMP:n | "Nén 100%" / "Giữ nén" | brewUnit | – | tamping phase; hold = progress stays 1 |
| PREINFUSE:n, BLOOM:n | "Ngâm sơ bộ n s" | water, brewUnit | water | closed pose held for n seconds |
| EXTRACT:ml | "Chiết xuất 40 ml" | water, brewUnit, output | water, coffee flow | extraction phase (visual) |
| DRYTAMP | "Nén khô" | brewUnit | – | tamping at end pose |
| fixed tail | "Mở cụm nén", "Đẩy bã", "Về vị trí chờ" | brewUnit, waste | – | opening, ejecting, scraping |

Durations are ESTIMATES (real timings unknown): constants in `brew-timing-config.ts` (e.g. grinding ≈ 90 ms/g clamped 1.2–4 s,
extraction ≈ 55 ms/ml clamped 2–7 s, preinfuse = value s, others from the existing stage durations). Comment them as estimates.

`BrewScriptPlayer` hook `useBrewScriptPlayer()`: `play(script)`, `stop()`, `queue` (several new cups play one after another),
exposes `{ status, script, stepIndex, event: DigitalTwinCycleEvent|null (source "server"|"test"), presentation }`.
Runs once start→finish then returns to idle/rest pose. No looping.

## 2. Part groups and presentation — `src/components/features/digital-twin/presentation/`

`part-groups.ts` (pure): map GLB node names to groups (names verified from `public/models/digital-twin/body/coffee_machine_03_v2.glb`):
- `shell`: `CV01_Mattrai-1`, `CV03_Matsau-1`, `CV04_Mattren-1`, `CV05_Mattruoc-1`
- `frame`: `HK01_TamDe-1`, `HK03_TamTren-1`, `HK04_TamL-1`, `HK05_TamR-1`, `HK06_TamSau-1`, `HK08_ThanhCodinhnap-1`, `HK09_Ganap-1`, `HK10_ThanhCodinhTruoc-1`, `HK11_GaHeDauRa-1`, `HK02_Chande-*`, loose screws (`socket head cap screw_iso-*`, `pan head cross recess screw_iso-*`)
- `hopper`: `Assem_HopCafe-1`; `grinder`: `Mayxoay1-1`, `Mayphacafe-1` (verify what `Mayphacafe-1` is by inspecting the mesh position; if unsure put it in `grinder` and note it in the report)
- `brewUnit`: cluster-03 display root `Final`; `output`: `Assem_HeRaCafe-1`
- `water`: inside `Assem_HeNhiet02-1`: `BOILER-1`, `ULKA EX5-1`, `GA ULKA EX5-1/2`, `FlowMeter-1`, `Assem01_BinhNuoc-1`, `PSL601A-1`, `DONGHO-1`, plus `DauVaoNuoc-4`
- `waste`: `Assem_Thungba-1`, `Assem_CumThoatNuoc-1`
- `electrical`: `Assem_BangDien-1`, `SUNON Fan 70x70x20 mm-2`
- anything unmapped → `other` (treated like frame for dimming).
A node test (`tests/digital-twin-part-groups.test.cjs`, same style as `tests/digital-twin-live.test.cjs`) reads the GLB JSON and asserts every
listed name exists, so a model update cannot silently break the mapping.

`BodyModelCanvas` gets ONE new optional prop `presentation?: { focus: PartGroupId[]; layers: Record<PartGroupId, boolean>; ghostShells: boolean; autoCamera: boolean; label?: { text: string; group: PartGroupId } | null }`
(default = unchanged behaviour). Implement it next to the existing visual-state/restore pattern (clone materials, restore on cleanup, dispose clones):
1. Layers: a group with `layers[g] === false` is `visible = false`. Defaults: all on except `electrical`.
2. Focus: focused groups keep full material + a soft emissive tint `#b91222`; every other visible group → opacity 0.35 grey-tinted. No focus (idle) → everything normal.
3. Shells: when `ghostShells`, shells that sit between the camera and the focus group's bounding box (ray/segment test, recomputed on step change and
   throttled while the camera moves, ≤ 5 Hz) go to opacity 0.12; other shells stay solid. If the test fails or no focus, ghost all four shells while a script runs.
   Shells return to solid when idle. Never mutate shared materials in place.
4. Camera: if `autoCamera`, ease OrbitControls target + distance toward the focus bounding box (≈ 600 ms). Any user orbit/zoom sets `autoCamera` false
   (the viewer shows a "Tự theo dõi" toggle to re-enable). Respect `prefers-reduced-motion` (jump, no easing).
5. Label: a small `Html` (drei) chip anchored at the focus group's bounding-box top: step text + value ("Xay 18 g"). Remove when idle.
6. Effects: drive the existing coffee/water effects from the script (`effects.coffee` → coffee run, `effects.water` → water run, reset between
   steps). Grinder spin: if `Mayxoay1-1` has no rotation animation, rotate it slowly around its axis only while `grinderSpin` (small, reversible, restored after).
Keep the existing `operationEvent`/motion code and the old `applyOperationVisualState` untouched; the new presentation layer runs in addition and must not fight it
(when `presentation` is provided it takes over highlighting/occluders; skip the stage `hiddenOccluders`/`activeNodes` handling in that case).

## 3. View — `machine-digital-twin-view.tsx` (+ css module)

`MachineDigitalTwinView({ machineId, machineType, activeMenuId })` (add `activeMenuId` from the detail data in `machines-screen.tsx`).
- Mode switch "Trực tiếp" / "Mô phỏng" (aria-pressed, ≥44 px). SMART_IOT default Trực tiếp; CONVENTIONAL only Mô phỏng + existing note.
- Trực tiếp: poll `listBrewRecords` every 5 s while tab visible (range last 24 h; first response is the baseline, do NOT replay old cups).
  New record ids → resolve recipe → enqueue script. Note: "Mô hình phát lại món vừa pha, chậm vài giây so với máy."
  Side panel: **Món đang pha** (name + recipe steps list with current step `aria-current="step"`, done ✓), **5 ly gần nhất**
  (each row has "Xem lại" → plays that dish's script), Kết nối (badge + last seen), Số liệu máy gửi (metricsJson dl), Cảnh báo đang mở.
- Mô phỏng: select of recipes from the active menu (fallback: "Quy trình chuẩn") + "Chạy món này" / "Dừng". Same player, same side steps list.
- Toolbar additions in the viewer (reuse toolbar styles): "Tự theo dõi" toggle, layer chips: Vỏ, Khung, Hệ nước, Cụm pha (hopper+grinder+brewUnit+output), Thùng bã
  (+ Điện only when prop `showElectricalLayer` is true; Owner passes false). Chips are toggle buttons (aria-pressed).
- Idle state: all shells solid, nothing dimmed, label "Sẵn sàng". Offline/never-seen: keep existing overlays.
- Layout/colours as before (Owner palette, ≥44 px targets, no horizontal scroll at 390 px; side panel under the viewer < 1024 px).
- Strings in `src/text/digital-twin/digital-twin-messages.ts` (UTF-8, diacritics).

## 4. Cleanup of the superseded live code
Remove `live/brew-state-mapping.ts`, its `BREW_STATE` motion usage and its unit test content that tests brewState→phase; keep the heartbeat query only for
connection/metrics. Update `tests/digital-twin-live.test.cjs` (or replace with script tests). `BodyModelViewer` keeps its external-event props if still useful, else remove them.

## Tests
- Unit (follow existing `tests/*.test.cjs` style/runner): `parseProcedure` (canonical, legacy strings, unknown), `buildBrewScript` for a Latte-like
  (`PREMILK:5 DOSE:18 TAMP:100 HOLDTAMP:50 PREINFUSE:3 EXTRACT:40 POSTMILK:20`), an Espresso (no milk), and minimal (`DOSE`,`EXTRACT`) recipes — order, fixed tail,
  continuous pose, durations clamped; part-group node-name existence test against the GLB.
- E2E in `tests/e2e/owner-machines-ui.spec.ts`: mock `brew-records` (baseline empty, second poll returns "Latte" — use `page.route` with a counter), mock the menu/recipe
  endpoint(s) you chose → side panel shows "Món đang pha: Latte" and the step list with a current step; the 5-recent list shows it; "Xem lại" replays;
  layer chip toggles `aria-pressed`; Mô phỏng shows recipe select + "Chạy món này"; CONVENTIONAL shows no "Trực tiếp"; no horizontal scroll at 390 px;
  keep the canvas-or-error assertion. Headless WebGL may fail: never assert pixels.

## Rules / verify / report
- FE only; never modify `C:/GitHub/BEANS/dolores_platform` (read for reference). No install, no commit. UTF-8, keep Vietnamese diacritics.
- Do not edit the motion/kinematics code paths of `DigitalTwinClusterCanvas.tsx`; changes in `BodyModelCanvas.tsx` only add the presentation layer.
- Large files (> 600 lines) are yours, do not delegate to DeepSeek.
- Verify via `bash scripts/verify/verify.sh --e2e "owner-machines-ui.spec.ts lifecycle-actions.spec.ts"` then one full `bash scripts/verify/verify.sh`. Never call Playwright or `next build` directly.
- Report (max 20 lines): files changed, which recipe/brew API you used and why, what `Mayphacafe-1` is, anything you could not verify, verify summary lines.
