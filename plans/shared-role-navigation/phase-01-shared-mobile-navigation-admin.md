# Phase 01 — Shared Mobile Navigation and Admin Integration

## Objective

Create the shared mobile bottom sheet and common active-route matching behavior, then use it in Admin as the first role integration.

## Spec stories

- **P1:** shared hamburger and sheet behavior; role-specific items and disabled states; keyboard and assistive-technology operation.
- **P2:** exact and nested route matching with at most one current item.

## Scope and tasks

1. Add a mobile navigation component and a separate CSS module under `src/components/sidebar/`. It receives the role's ordered items, current path/root, accessible labels, and existing logout state/callback.
2. Keep the component self-contained for local open state, hamburger trigger, bottom-sheet rendering, route-selection close, backdrop/Escape close, focus containment/restoration, reduced motion, minimum target size, and a logout action pinned at the bottom. Close the sheet at 1024 px and wider so a stale open state cannot reappear when returning to mobile.
3. Extract or add one route-matching helper used by desktop `SidebarNavigation` and the new mobile renderer. Normalize query/hash and trailing slash; match nested routes by path segment; do not let the role root prefix unrelated routes; mark only the most specific enabled item current.
4. Integrate the component into the Admin mobile header. Keep Admin route/menu mapping and logout logic in the Admin shell, and preserve `ADMIN_ENABLED_PATHS` disabled items and their explanatory titles.
5. Keep `src/pages/admin/menu/admin-menu.tsx` as the role's desktop adapter as needed; remove its mobile sheet implementation once the shared component owns that behavior.
6. Remove only Admin sheet-specific styles/state, keeping the desktop `Sidebar` and unrelated shell/header/action-bar layout intact.

## Files and modules

- Add `src/components/sidebar/mobile-navigation.tsx`.
- Add `src/components/sidebar/mobile-navigation.module.css`.
- Add a route-matching helper under `src/components/sidebar/`.
- Update `src/components/sidebar/sidebar.tsx` to use the common matching helper.
- Update `src/pages/admin/admin-shell.tsx` and `src/pages/admin/admin-shell.module.css`.
- Update `src/pages/admin/menu/admin-menu.tsx` if needed to retain desktop-only role mapping.
- Add focused checks under `tests/` for route matching and shared mobile navigation behavior.

## Dependencies

None. This phase establishes the component and matcher used by later role integrations.

## Tests and measurable acceptance

- Run focused Node tests with `node --test` for path normalization/matching: exact, nested, dynamic-detail parent, query/hash, trailing slash, unrelated same-prefix route, disabled item, and duplicate-prefix tie-breaking; assert no more than one item is current.
- Run `npm.cmd run lint` and `npx.cmd tsc --noEmit --incremental false`.
- In the Admin mobile view, confirm a header hamburger opens the shared sheet, route selection closes and navigates, Admin pending links remain inert, and the logout callback behaves as before.
- Keyboard walkthrough: opening moves focus into the named sheet; Tab and Shift+Tab stay inside; Escape and backdrop close it; closing restores focus to the hamburger; link and close targets are at least 44 px high.
- At 768 px, confirm the mobile drawer remains available. Open it, resize to 1024 px, then return to 768 px; confirm it closes at the desktop breakpoint and does not reopen from stale state.
- Confirm the logout action is at the bottom of the drawer and invokes Admin's existing callback.
- Confirm the desktop Admin sidebar remains the existing shared renderer at desktop widths.

## Risks and open questions

- Admin currently obtains its path from the Pages Router template; integration must supply the concrete pathname so dynamic routes activate their parent item.
- Removing sheet styles from a module used by other Admin layout parts can accidentally remove shared spacing. Restrict deletion to selectors no longer referenced.
