# Action bar batch 0: review fixes

Context: `plans/action-bar-ux.md`. Batch 0 is in the working tree (not committed). Fix exactly these:

1. **Keep the mobile dock static.** Before batch 0, on `max-width: 1023px` the dock was `position: static` inside the shell's flex column (below `main`). Batch 0 made it `position: fixed`, which can overlap role mobile navigation (see existing tests about the 64px mobile offset in `tests/*mobile-navigation*.test.cjs` and `tests/moderator-shell-*.test.cjs`). Restore `position: static; flex: 0 0 auto;` on mobile, keep the safe-area padding, and set `--action-bar-height` to `0px` on mobile (no padding is needed because the dock no longer overlays content). Remove the `!important` mobile variable hack. The desktop behaviour (fixed dock, `--action-bar-height: 80px` only while visible, hidden when empty) stays.
2. **No full page reloads.** In `src/components/action-bar/page-actions.tsx#runConfirmed`, navigate with `useRouter().push(href)` from `next/router` instead of `window.location.assign`.
3. **Overflow menu items:** the `disabledReason` span inside a `role="menu"` breaks the menu semantics. In the menu, render the reason as the item's `title` plus `aria-describedby` pointing to a visually hidden span outside the menu item list.
4. **Playwright spec (required):** add `tests/e2e/page-actions.spec.ts`, using pages that already render `PageActions` after batch 0 (technician screen, customer read/workflow screens; mock APIs with `page.route` like the other specs). Cover:
   - the primary action is the last button in the bar and uses the primary style (`data-variant`/class); a danger action is first;
   - with more than 3 actions the extra ones are in "Thêm thao tác"; the keyboard works (ArrowDown opens and focuses the first item, Arrow keys move, Esc closes and focus returns to the trigger);
   - a `confirm` action opens the dialog, and Hủy closes it without running;
   - the dock is hidden on a page without actions and visible with actions; on desktop the main content's last element is not covered by the dock (bounding boxes do not overlap);
   - at 390×844 the dock is static (not fixed), and only the primary action plus the overflow trigger are visible.
   If no existing page shows >3 actions or a confirm action, add a test-only fixture route **only under** `src/pages/dev/` guarded by `process.env.NODE_ENV !== "production"` (returns 404 in production builds), or test through an existing screen whose builder produces enough actions. Prefer the existing-screen option.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, `npx playwright test tests/e2e/page-actions.spec.ts` pass, and `node --test tests/*.test.cjs` has no new failure titles (89 baseline; especially the mobile navigation tests must not newly fail). Print a per-file summary.
