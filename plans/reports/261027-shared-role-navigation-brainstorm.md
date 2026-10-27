# Brainstorm: Shared Navigation for Four Roles

**Date:** 2026-10-27

## Ideas Explored

- **Reuse the shared desktop sidebar and extract one mobile drawer.** Keep the existing `Sidebar` for desktop. Move the Admin bottom-sheet interaction into a common mobile component; each role provides its own menu configuration and sign-out handler. This matches the selected design and minimizes shell changes.
- **Use horizontal mobile tabs for all roles.** This would keep destinations visible, but some roles have longer menus and the current customer/technician strips already overflow horizontally. The user selected a drawer instead.
- **Unify each entire role shell.** A common shell could also own headers, breadcrumbs, notifications, and action bars. That would mix different role workflows and make the navigation change much broader than needed.
- **Share only visual tokens and keep four mobile menus.** This is the smallest code change, but it would leave four separate implementations of open, close, focus, and active-route behavior.
- **Keep desktop and mobile implementations separate while sharing one role navigation contract.** The desktop and mobile files render the same role-specific links with their own layouts; a shared item/config contract prevents route and permission drift. This is the recommended component boundary.

## User's Direction

- The four roles share navigation appearance and interaction, while each keeps its own menu labels, route destinations, and enabled items.
- Desktop navigation remains a vertical sidebar.
- Mobile navigation is a bottom sheet opened by a hamburger button in the header.
- The existing Admin navigation is the visual and interaction reference.

## Codebase Findings

- Desktop already uses the shared `src/components/sidebar/sidebar.tsx` for all four roles. It renders role-provided items, active state, disabled entries, and sign-out. Its desktop styles hide it below the mobile breakpoint (`src/components/sidebar/sidebar.module.css:1-91`).
- `src/pages/admin/menu/admin-menu.tsx` contains the Admin navigation adapter and its mobile bottom-sheet implementation. It includes Escape/backdrop dismissal, focus handling, route-close behavior, and sign-out (`:39-183`).
- Customer and Technician currently display horizontally scrolling mobile link strips. Admin and Moderator use a bottom “More” control with separate drawer implementations.
- Role routes are already described separately in `src/routes/routes.ts`. Admin also has disabled/pending routes, and Moderator has a reduced mobile navigation list; those role differences need to remain explicit in the common configuration.
- Role headers, breadcrumbs, notification controls, page action bars, authorization checks, and sign-out handlers belong to the role shells. The common mobile component should receive the role's menu items and sign-out callback rather than own those workflows.

## Proposed Component Boundary

- Keep `Sidebar` as the shared desktop navigation component.
- Add a mobile navigation component and its stylesheet under `src/components/sidebar/`, in separate files from desktop styles.
- Let Admin, Customer, Technician, and Moderator adapt their existing role routes into the shared mobile component's item contract.
- Keep one active-route matching rule for exact and nested destinations, with explicit metadata where a role needs exact matching.
- Keep role-specific sign-out behavior in the shells and pass it to the mobile component.
- Use the Admin bottom sheet for the shared drawer's visual behavior, with a hamburger trigger in each role header. Preserve keyboard dismissal, focus containment/restoration, backdrop dismissal, and closing after route selection.

## Open Questions

None blocking. The planning phase can settle exact filenames, the responsive breakpoint, and whether the existing route arrays need small adapters.

## Risks

- Route matching currently varies between shells; normalizing query strings and trailing slashes must not break dynamic or nested routes.
- Admin disabled items and Moderator's reduced mobile list must not be lost or duplicated when creating role configurations.
- Sign-out is role-shell behavior and should remain passed in as a callback.
- The bottom sheet needs to retain keyboard focus behavior and avoid mobile viewport/safe-area overflow.
