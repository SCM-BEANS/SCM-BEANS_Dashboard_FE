# Phase 02 — Moderator Mobile Navigation

## Objective

Replace Moderator's inline mobile sheet with the shared bottom sheet and keep its complete role-specific route list.

## Spec stories

- **P1:** shared mobile opening/selection behavior, role-specific destinations, and accessible dismissal/focus behavior.
- **P2:** nested Moderator routes mark the appropriate menu parent current.

## Scope and tasks

1. Add the shared hamburger/sheet to the Moderator mobile header without removing notification controls or role-specific page heading behavior.
2. Pass the full Moderator navigation list and existing sign-out callback/state to the shared component; put logout at the drawer bottom and remove the old three-shortcut mobile bar.
3. Remove Moderator's duplicated sheet state, dialog markup, focus handling, and sheet-only CSS.
4. Remove `MODERATOR_MOBILE_NAVIGATION_LINKS` and its label/shortcut derivation only if no other consumer remains; derive the current active item from the full Moderator navigation configuration.
5. Preserve the existing desktop Moderator sidebar and all route authorization and sign-out behavior.

## Files and modules

- Update `src/pages/moderator/moderator-shell.tsx`.
- Update `src/pages/moderator/moderator-shell.module.css`.
- Update `src/routes/routes.ts` only to remove obsolete mobile-only configuration after confirming it has no other consumers.
- Add or extend focused Moderator navigation tests under `tests/`.

## Dependencies

- Depends on `phase-01-shared-mobile-navigation-admin` for the component and matching contract.

## Tests and measurable acceptance

- Run focused Moderator navigation tests and the route-matching tests established in Phase 01.
- Run `npm.cmd run lint` and `npx.cmd tsc --noEmit --incremental false`.
- At a mobile width, verify the header hamburger opens the same sheet as Admin; every current Moderator destination is listed and resolves to its existing route.
- Verify a contract/customer/entity nested route marks the matching parent and no second item is marked current.
- Verify Moderator notification controls, page heading/current label, desktop sidebar, and logout callback remain functional.
- Repeat Escape, backdrop, focus containment/restoration, and 44 px target checks for the Moderator integration.

## Risks and open questions

- The old Moderator mobile shortcuts contain fewer items than the full menu. Ensure no page title relies on that reduced list before deleting its route configuration.
- The shell stylesheet also owns layout rules; remove only duplicate sheet selectors and preserve action/footer spacing.
