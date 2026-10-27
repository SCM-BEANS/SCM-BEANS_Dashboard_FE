# Phase 04 — Cross-Role Validation and Accessibility

## Objective

Verify that all four roles use the same mobile navigation component, preserve their own routes and logout behavior, and retain the shared desktop sidebar.

## Spec stories

- **P1:** shared mobile navigation across the four roles.
- **P1:** role-specific destinations, enabled/disabled states, and logout behavior.
- **P1:** keyboard and assistive-technology operation.
- **P2:** consistent active state for exact and nested routes.

## Scope and tasks

1. Review the final role-by-role route matrix against `ADMIN_NAVIGATION_LINKS`, `MODERATOR_NAVIGATION_LINKS`, `CUSTOMER_NAVIGATION_LINKS`, and `TECHNICIAN_NAVIGATION_LINKS`; verify item ordering, labels, destinations, enabled state, and sign-out callback.
2. Check that no duplicate Admin/Moderator drawer or Customer/Technician horizontal navigation remains and that each mobile shell uses the same component.
3. Run the active-route matrix for exact roots, nested sections, dynamic detail routes, query/hash strings, trailing slashes, and unrelated paths sharing a textual prefix.
4. Validate mobile interaction at 360 px, 390 px, and 768 px, including no horizontal overflow and no collision with header notification controls; confirm the drawer is used through 1023 px and desktop navigation starts at 1024 px.
5. Validate keyboard/focus behavior, sheet announcement, reduced motion, close affordances, and 44 px minimum actionable targets across each role.
6. Check desktop widths to confirm all four roles still render `Sidebar` and mobile sheet markup is not exposed as desktop navigation.
7. With each role's sheet open, resize to 1024 px and back to 768 px; confirm the sheet closes at the breakpoint and stays closed after returning.

## Files and modules

- Shared component and matcher under `src/components/sidebar/`.
- Role shells and styles: Admin, Moderator, Customer, and Technician.
- Route configuration in `src/routes/routes.ts` if obsolete Moderator-only mobile data was removed.
- Consolidated navigation tests under `tests/`.

## Dependencies

- Depends on `phase-01-shared-mobile-navigation-admin`, `phase-02-moderator-mobile-navigation`, and `phase-03-customer-technician-mobile-navigation`.

## Tests and measurable acceptance

- Run the focused navigation tests and `npm.cmd run lint` plus `npx.cmd tsc --noEmit --incremental false`.
- Run `npm.cmd run build` after all role integrations.
- Complete a manual route walkthrough for every role and a nested route in each role; selecting a link closes the sheet and leaves no more than one active item.
- At widths 360 px, 390 px, and 768 px, verify zero horizontal overflow in the mobile drawer and no collision between hamburger and notification controls.
- For each role, confirm focus moves into the sheet, remains contained, returns to the trigger on close, and Escape/backdrop dismissal work.
- Confirm actionable links/buttons are at least 44 px high, reduced motion is honored, Admin disabled destinations remain non-interactive, and all role logout callbacks still execute.
- Confirm every role places logout at the drawer bottom; the full Moderator menu appears without a separate three-shortcut bar.
- At desktop widths, confirm all four roles retain the shared `Sidebar` and unchanged navigation destinations.
- Confirm a viewport transition to desktop closes the mobile sheet and resizing back to mobile does not restore a stale open sheet.

## Risks and open questions

- Manual visual/keyboard review is still needed because route/config unit tests cannot establish viewport overflow, focus behavior, or announcement quality by themselves.
- On 2026-10-27, the user chose to continue with automated Phase 04 testing. Live cross-role visual checks are deferred and remain unverified; no role authentication was bypassed.
- If any route configuration has intentionally conflicting nested destinations, document the tie-break rule and update the route matrix rather than allowing multiple active items.
