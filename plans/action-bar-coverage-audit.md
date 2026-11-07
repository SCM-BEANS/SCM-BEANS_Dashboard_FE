# Action bar coverage audit: pages that still have no bar

Context: `plans/action-bar-ux.md` (R1-R11). All earlier batches and the merge with origin/ref (e048989) are pushed. The user reports that some pages still show **no action bar**; example: Admin `Hóa đơn & chứng từ thanh toán` list (`src/pages/admin/invoices/invoices-management-screens.tsx`). Goal: every page view where the user can reasonably act gets a bar with the right actions. FE only; read `C:/GitHub/BEANS/dolores_platform` controllers (`@PreAuthorize`/`hasAnyRole`, status guards) to decide what is valid, never modify it. Do not commit, push or install.

## Rule for a view with no bar
For each **view** (list, detail, create/edit, and each tab or sub-screen in a file that renders several views via query params), decide:
1. **BE-backed page action?** It acts on the whole page or the current filter/selection, and the role may call it. Examples: create the entity, export the current list, generate a report, mark all notifications read, start the page's workflow. If yes, add it via `PageActions`: create/export = primary (20), other actions secondary.
2. **Otherwise, an obvious next-step shortcut?** Example: an invoice list → the refunds queue or overdue refunds; a machine operational overview → the machine's maintenance tickets. Add at most 2 as secondary (0). Never re-add back/"Về …"/"Quay lại", refresh, or retry (R2/R3), and never add disabled placeholders (R4).
3. **If neither exists,** leave the view without a bar, and record why in the inventory (e.g. a read-only settings page with no BE write).

Use only BE endpoints that exist and the role is allowed to call. Reuse existing API methods in `src/apis/*`. If an action needs an API method that is missing, add it following the existing api/schema pattern. Put shared action lists in `src/components/action-bar/entity-page-actions.ts` when the same entity appears in several roles, so every role gets the same actions in the same order (R9).

Known candidates (verify against the BE):
- Admin invoices list: "Xuất hóa đơn" (`POST /billing/exports`, `BillingExportRequest(format, invoiceIds, ownerId)`) exports the invoices currently shown or filtered; then navigate to the existing export job detail. A secondary shortcut can lead to refunds or overdue refunds if those screens exist.
- Moderator invoices list/index: the same entity as Admin, so the same shared actions apply where the Moderator role is allowed.
- Notifications (Admin, Technician, others): "Đánh dấu tất cả đã đọc" only if the BE has that endpoint; otherwise no bar.
- Machine operational overview (Admin, Moderator, Owner) `src/pages/*/machines/machine-operational-overview-screen.tsx`, added by a teammate: these still use `ActionBarConfig` + `ButtonBar` with back ("Về hồ sơ máy") and refresh. Convert to `PageActions`, remove back/refresh (refresh may move inline next to the data heading), and keep "Báo cáo tổng hợp" as secondary only where it is the obvious next step. `tests/e2e/page-actions.spec.ts:131` expects the Owner operations screen's dock hidden when no action remains; keep that test true or update it if a valid action is added.
- Settings pages: if a profile/password/preferences form saves, use R8 (Hủy + Lưu with `form=`).
- Technician home/tasks/machine-check lists: the next work step (e.g. open the first assigned task) only if it is a clear page-level action; otherwise leave them without a bar and record why.

## Deliverable per run
1. An **inventory table** for the role in scope: route/view → current bar actions → decision (added / unchanged / no bar because …).
2. The code changes.
3. Tests: add cases to a role spec (`tests/e2e/admin-page-actions.spec.ts`, `moderator-page-actions.spec.ts`, `owner-technician-page-actions.spec.ts`) for every view where you added a bar. The Admin invoices list must have a case. Update the node/e2e tests only where they assert placement.

## Done when
- `npx tsc --noEmit -p .`, `npm run lint` and `npm run build` pass, and the touched e2e specs pass.
- `grep -rn "ActionBarConfig\|<ActionBar\b" src --include=*.tsx` matches only inside `src/components/action-bar/`.
- Restore `debug.log` if changed.
