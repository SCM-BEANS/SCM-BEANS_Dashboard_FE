# Action bar batch 1: review fixes

Context: `plans/action-bar-ux.md`. Batch 1 is in the working tree (not committed). Fix exactly these, then re-run checks.

1. **Deterministic priority instead of id sorting.** `PageActionsRegistry.updateSnapshot` sorts merged actions by `id`, so when several groups register a `primary`, the winner is whichever id is alphabetically first. Example: on Admin machine detail while editing a maintenance ticket, "Sửa máy" stays primary and the ticket form's "Lưu thay đổi" is demoted (violates R8).
   - Add `priority?: number` to `PageAction` (default 0, higher = more important).
   - The registry keeps registration order (Map insertion order); remove the id sort.
   - The renderer chooses as primary the `variant: "primary"` action with the highest priority; on a tie, the **last registered** wins (more specific, nested content mounts later). Every other `primary` renders as secondary. Order secondary and danger actions by priority desc, keeping registration order on ties, before the R6 visible/overflow split, so the most important ones stay visible.
   - Set priorities in `entity-page-actions.ts` and the admin machine screen:
     - Form save/cancel while editing (machine edit, ticket details, owner appointment confirm, technician save parts): 100.
     - Status-driven next steps (overdue review, assign technician, start work, confirm receipt, legacy review, offer replacement/emergency): 50.
     - Create ticket: 20.
     - Entity edit: 10.
     - Transfer and shortcuts: 0.
     - Danger: 0.
2. **Same actions in every role (R9).** Remove the ADMIN special case in `buildMaintenanceTicketCreatePageActions` (create ticket is `primary`, priority 20, for Admin, Moderator and Owner alike). On Admin machine detail, "Sửa máy" becomes secondary, priority 10.
3. **While a form is editing,** the page's primary must be that form's submit. Unrelated page actions may stay, but only in the overflow menu or as secondary. Priorities 100 vs ≤50 handle this; verify it.
4. **Cleanup:** builders must not bake pending text into `label` (`label: x.pending ? "Đang…" : "…"`), because `pendingLabel` already does this. Use the static label.
5. **Tests:**
   - Node (`tests/page-actions.test.cjs`): add registry/renderer cases: two groups with primaries → the higher priority wins; on a tie → the last registered wins; demoted primaries render as secondary; no id-based reordering.
   - Playwright (`tests/e2e/maintenance-ticket-actions.spec.ts`): on Admin machine detail, "Tạo phiếu bảo trì" is the primary (last button, primary variant), "Sửa máy" is not primary. After opening a ticket and clicking "Chỉnh sửa chi tiết", the primary is "Lưu thay đổi". Moderator and Owner also show "Tạo phiếu bảo trì" as primary.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build` pass; `npx playwright test tests/e2e/page-actions.spec.ts tests/e2e/maintenance-ticket-actions.spec.ts tests/e2e/maintenance-request-actions.spec.ts tests/e2e/location-detail.spec.ts tests/e2e/repair-case-replacement-actions.spec.ts tests/e2e/lifecycle-actions.spec.ts tests/e2e/installation-work-order-records.spec.ts` pass; `node --test tests/*.test.cjs` has no new failure titles (89 baseline). Do not commit, push or install. Print a per-file summary.
