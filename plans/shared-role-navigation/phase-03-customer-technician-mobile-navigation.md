# Phase 03 — Customer and Technician Mobile Navigation

## Objective

Replace Customer and Technician's horizontally scrolling mobile navigation strips with the shared header-triggered bottom sheet.

## Spec stories

- **P1:** all roles use one mobile navigation interaction while retaining their distinct route lists and logout callbacks.
- **P1:** the shared mobile navigation remains keyboard-operable and accessible.
- **P2:** nested customer/technician paths keep the correct parent item active.

## Scope and tasks

1. Add the shared hamburger/sheet in the Customer and Technician mobile headers while keeping existing notification controls available.
2. Pass each role's existing complete navigation list, current concrete path/root, accessible labels, and sign-out callback/state; move their mobile logout actions to the shared drawer footer.
3. Remove the horizontal mobile strips and their navigation-only styling from each shell; keep page content, action bars, notifications, and desktop `Sidebar` behavior intact.
4. Verify dynamic customer and Technician detail/workflow routes highlight their corresponding parent destination.

## Files and modules

- Update `src/pages/dashboard/customer-shell.tsx` and `src/pages/dashboard/customer-shell.module.css`.
- Update `src/pages/technician/technician-shell.tsx` and `src/pages/technician/technician-shell.module.css`.
- Add or extend focused Customer and Technician navigation tests under `tests/`.

## Dependencies

- Depends on `phase-01-shared-mobile-navigation-admin` for the mobile component and matcher.
- Phase 02 may be completed first to keep role migrations sequential, but Customer/Technician integration has no direct dependency on Moderator behavior.

## Tests and measurable acceptance

- Run focused Customer and Technician menu/route tests plus the common matching tests.
- Run `npm.cmd run lint` and `npx.cmd tsc --noEmit --incremental false`.
- For both roles, verify every existing mobile destination is present in the shared sheet and links to its current route; confirm logout appears at the drawer bottom and still invokes the shell callback.
- Verify the hamburger remains reachable alongside notifications at 360 px; the old horizontal nav strip is absent and the sheet has no horizontal overflow.
- Verify nested/dynamic detail paths mark one correct parent destination and logout remains unchanged.
- Check keyboard opening, Escape/backdrop dismissal, focus containment/restoration, reduced motion, and 44 px targets for both shells.
- Confirm both desktop role sidebars still render through the shared desktop `Sidebar`.

## Risks and open questions

- The old bottom strips currently provide quick links and may have influenced reserved bottom padding. Remove their spacing only where it is navigation-specific; preserve page action bars and notification access.
- Customer and Technician menus differ in length and route nesting. The shared sheet must scroll vertically without horizontal overflow or obscuring its close/logout controls.
