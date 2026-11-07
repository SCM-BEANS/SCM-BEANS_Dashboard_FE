# Action bar: one convenient, consistent action area on every page and role

Planner/reviewer: Claude · Implementer: Codex. FE only (`C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`). Do not commit/push/install. Follow the existing structure.

## Audit findings (current state)
- `src/components/action-bar/action-bar.tsx`: `ActionBarLayout` (in all 4 role shells) + `ActionBarConfig` (portal). Only ~25 files use it; most detail/workflow screens put page actions inline in content, including everything added for the 19 APIs connected on 2026-11-06 (create maintenance ticket, transfer machine, confirm order received, fallback offer, emergency authorization, recall legacy review…).
- The dock always renders, even with no actions: an empty 64-80px white strip.
- `ButtonBar` has a single look, so there is no visual primary, secondary or danger. `ActionBarActions` sets `data-variant`, but no CSS uses it.
- Mixed content in the bar: navigation ("Quay lại", "Về danh sách", links to other sections), "Thử lại" for errors, "Làm mới", and real business actions. The contract detail bar has up to 8 buttons (admin `pages/admin/contracts/index.page.tsx`, moderator `pages/moderator/contracts/contract-detail-screen.tsx`).
- `pages/moderator/moderator-shell.tsx#renderActions` renders permanently disabled placeholder buttons (`disabledAction`: reconcile invoice, create technical request, create buyback request) on section lists.
- Duplicate dock implementation: `.accountActionsDock` in `pages/admin/admin-shell.module.css`.
- `BackButtonHeading` (39 usages) already provides the back control in the page heading.

## UX rules (apply everywhere)
R1. **What goes in the bar:** only page-level actions that act on the page's main entity or flow (create, save, submit, approve, transfer, confirm, cancel…). Row/item actions stay inline next to their item. Steppers keep their step action inline.
R2. **No navigation duplicates:** remove "Quay lại / Về danh sách / Về …" from the bar, because `BackButtonHeading` handles back. Cross-section shortcut links (e.g. overview → reports) are allowed only as secondary actions when they are the obvious next step; otherwise remove them.
R3. **Errors:** "Thử lại" belongs next to the error message in content, not in the bar.
R4. **Only valid actions:** show an action only when the current role and status allow it (same rules as the BE). Never show permanently disabled placeholders. A temporarily disabled action (e.g. form invalid, waiting for data) must explain why via `aria-describedby` and a visible tooltip/hint.
R5. **Order and emphasis (same on every page):** left: danger actions (Hủy, Chấm dứt, Xóa…), outline red, always behind a confirm dialog. Right: secondary actions, then the **single primary action** (the most likely next step) at the far right, filled brand color `#b81724` with white text.
R6. **Max 3 visible:** 1 primary + up to 2 secondary/danger visible; the rest go into a "Thêm thao tác" overflow menu (accessible menu button: Enter/Space/Arrow keys, Esc closes, focus returns). On mobile (<1024px), 1 primary + overflow menu for everything else.
R7. **Pending:** a running action shows its pending label, disables itself and its siblings to prevent double submits, and re-enables on error.
R8. **Forms:** create/edit pages show "Hủy" (secondary) and "Lưu"/"Tạo …" (primary, `type="submit" form={formId}`). The primary is disabled while invalid or pending. If the form is dirty, "Hủy" asks for confirmation.
R9. **Same entity → same actions, same order, every role:** build action lists per entity with shared hooks/builders (e.g. `useMachineDetailActions`, `useRepairCaseActions`), filtered by role/status, and use them from every role screen.
R10. **Labels:** Vietnamese, verb + object, ≤ 4 words ("Tạo phiếu bảo trì", "Chuyển điểm bán").
R11. **Dock visibility:** render the dock only when at least one action is registered; the main content gets bottom padding equal to the dock height only while it is visible (desktop 80px, mobile 64px + safe area).

## Component work (batch 0)
- `ButtonBar`: add `variant?: "primary" | "secondary" | "danger"` (default secondary = current look) with CSS for primary (filled `#b81724`, hover darker, white text) and danger (white background, red border/text). Keep focus-visible and disabled styles. All existing callers stay visually unchanged unless they opt in.
- New `PageActions` component in `src/components/action-bar/page-actions.tsx`: props `actions: PageAction[]`, where `PageAction = { id; label; variant?: "primary"|"secondary"|"danger"; onClick?; href?; type?: "button"|"submit"; form?; disabled?; disabledReason?; pending?; pendingLabel?; confirm?: { title; description; confirmLabel } }`. It renders through `ActionBarConfig`, applies R5 ordering, R6 overflow (desktop 3 visible, mobile 1 + menu), R7 pending lock and confirm dialogs for `confirm` (reuse `NotificationDialog`). Extend or replace `ActionBarActions` so there is one API; migrate its current callers.
- `ActionBarLayout`: track registered actions (context counter or MutationObserver on the slot) to implement R11; expose a CSS variable `--action-bar-height` that shells use for main bottom padding.
- Remove `.accountActionsDock` duplication by moving its users to `PageActions`.
- Tests: unit + Playwright for ordering, overflow menu keyboard behaviour, pending lock, confirm dialog, hidden empty dock, mobile layout.

## Migration batches (each = separate Codex run, review, commit)
- **Batch 1:** screens touched on 2026-11-06 (maintenance ticket/request, installation, locations, repair replacement, lifecycle): move page-level actions into `PageActions` with shared per-entity builders.
- **Batch 2:** Admin pages (`src/pages/admin/**`, admin-users, contracts incl. the 8-button bar → primary + overflow).
- **Batch 3:** Moderator pages and `moderator-shell` (remove disabled placeholders and keep only valid shortcuts per R2/R4).
- **Batch 4:** Owner (`src/pages/dashboard/**`, customer read/workflow screens) and Technician (`src/pages/technician/**`).
Each batch: grep the batch's screens for page-level buttons rendered outside the bar and back/retry buttons inside the bar; apply R1-R11; keep behaviour and BE calls unchanged; update/add Playwright tests asserting the buttons are inside the action bar region (`getByRole("contentinfo", { name: … })` or the footer `aria-label`) in the right order.

## Done when (every batch)
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build` pass; the batch's Playwright specs pass; `node --test tests/*.test.cjs` has no new failure titles (89 pre-existing). Print a per-file summary.
