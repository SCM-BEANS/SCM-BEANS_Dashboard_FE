# Plan: Shared Mobile Navigation for Four Roles

**Date:** 2026-10-27
**Mode:** Hard
**Risk:** normal — multi-file, user-facing navigation UI; no auth, API, data, or infrastructure changes.
**Test mode:** default (the request did not include `--tdd`)
**Project root:** `E:/Đồ án/SCM-BEANS_Dashboard_FE` (git root; no `.skills.json` marker)

## Scope Challenge

- **Exists?** The desktop `Sidebar` is already shared. Mobile navigation is split: Admin and Moderator each have a bottom sheet, while Customer and Technician have horizontally scrolling bottom navigation.
- **Minimum?** Add one mobile navigation component beside the existing shared sidebar, pass each role's existing menu and logout behavior into it, and migrate the four shells. Retain the existing desktop `Sidebar` renderer and role-specific route/menu definitions.
- **Complexity?** Hard — one shared accessible component has to replace four different mobile implementations without changing role routes, disabled states, or shell responsibilities.
- **Tests:** default — specify automated and manual acceptance checks; no test-first requirement was requested.

## Spec Quality Check

- **[NEEDS CLARIFICATION]:** none; the accepted interaction and scope are recorded in the spec.
- **Success criteria:** measurable by role coverage, route matching, viewport dimensions, keyboard behavior, focus restoration, and target height.
- **User stories:** prioritized P1/P2.
- **Acceptance criteria:** testable, including no route/disabled-state regressions and at most one active item.

**Verdict: PASS**

## Research Summary

**Primary approach — extract one mobile component and preserve the desktop renderer**

- `src/components/sidebar/sidebar.tsx` and `sidebar.module.css` already provide the shared desktop navigation and reusable `SidebarItem`, `SidebarNavigation`, and `SidebarLogoutButton` contracts.
- Admin's mobile sheet in `src/pages/admin/menu/admin-menu.tsx` and Moderator's sheet in `src/pages/moderator/moderator-shell.tsx` contain duplicated open/close, Escape, backdrop, focus, and logout handling. Their role shells already contain the appropriate role-specific navigation configuration.
- Customer and Technician currently render horizontal mobile strips from their own shells. Their mobile headers can host a shared hamburger while keeping each shell's notification control.
- Existing React, Next.js, Lucide, and CSS-module dependencies suffice; no navigation package is needed.

**Alternative approach — keep sheet state and interaction code in each role shell**

- It would allow each shell to tailor placement, but it preserves four copies of dismissal and accessibility behavior, undermining the shared-interaction requirement.
- Adding a dialog/navigation package would also increase dependencies for behavior that the Admin and Moderator implementations already demonstrate.

**Verdict:** use a shared mobile component with the Admin sheet as the visual reference. Put the mobile renderer and styles in separate files under `src/components/sidebar/`; keep role route configuration and shell-specific content in each role shell.

## Proposed Approach

1. Add a mobile navigation component next to the existing sidebar, reusing the existing menu item and logout contracts where practical. Place the shared logout action at the bottom of the drawer while each shell supplies its existing role-specific callback.
2. Centralize path normalization and active-item matching so exact routes, nested routes, query strings, and trailing slashes follow one rule. Nested paths select their most specific matching enabled destination; a role root matches only its own exact root path.
3. Migrate Admin first to establish the shared sheet and header trigger while retaining its disabled/pending items and existing desktop sidebar adapter.
4. Migrate Moderator, then Customer and Technician; remove their obsolete mobile sheet/strip renderers and any now-unused mobile-only menu configuration.
5. Validate the shared behavior across all four roles, including responsive layouts, keyboard access, route state, logout callbacks, and unchanged desktop navigation.

The shared mobile component owns only its hamburger trigger and sheet interaction. Each shell continues to own its header, breadcrumbs, notifications, action bars, role authorization, navigation data, and sign-out logic.

## Decisions Confirmed by User — 2026-10-27

- Share the navigation interface and opening behavior while each role keeps its own menu and routes.
- Use the Admin sheet as the mobile pattern: a bottom sheet opened by a hamburger in the header.
- Keep the desktop shared `Sidebar` in use.
- Keep the mobile drawer through 1023 px and use the desktop sidebar from 1024 px, matching current role-shell breakpoints.
- Show the full Moderator menu in the drawer and remove the old three-shortcut mobile bar/configuration.
- Place logout at the bottom of every shared mobile drawer while retaining each role shell's existing logout callback.

## Phase Index

1. `phase-01-shared-mobile-navigation-admin` — build the shared mobile sheet and route matcher, then migrate Admin as the first integration.
2. `phase-02-moderator-mobile-navigation` — adopt the shared component in Moderator and remove its duplicate sheet/shortcut implementation.
3. `phase-03-customer-technician-mobile-navigation` — adopt the shared component in Customer and Technician and remove their horizontal mobile strips.
4. `phase-04-shared-mobile-navigation-cross-role-validation-accessibility` — validate all roles together, responsive behavior, accessibility, route states, and desktop regression criteria.

## Risks and Decisions

- **MEDIUM — shell styles combine page layout and mobile navigation.** Removing a bottom strip or sheet can affect content height, footer/action-bar spacing, and safe-area padding. Each integration phase must remove only obsolete navigation styles and explicitly check its shell layout.
- **MEDIUM — active route resolution varies by shell.** Admin uses a route template while other shells normalize the concrete path differently. Use the concrete current path, strip query/hash and trailing slash for matching, match on segment boundaries, and select at most one most-specific enabled item. Include dynamic detail paths in the role matrix.
- **MEDIUM — accessibility behavior can drift during extraction.** Preserve focus containment/restoration, Escape and backdrop dismissal, accessible sheet naming, a visible close control, 44 px targets, and reduced-motion behavior in the shared component; cover these with component checks and keyboard walkthroughs.
- **LOW — mobile trigger may compete with notification controls.** Check the 360 px layout in each shell and retain access to existing notification actions.
- **LOW — viewport resize while the sheet is open can leave stale local state.** Close the sheet when entering the desktop breakpoint and verify it stays closed when returning to mobile.
- **Decision:** no new dependency, no change to auth/route authorization/logout semantics, no changes to role menu labels/routes, and no redesign of the desktop sidebar.
- **Rollback:** revert the shared mobile component and the role shell integrations phase by phase; the old desktop renderer and route configuration remain independent, and there is no data migration.

## Checklist

- [x] Phase 01 - shared mobile navigation and Admin integration
- [x] Phase 02 - Moderator integration
- [x] Phase 03 - Customer and Technician integration
- [x] Phase 04 — automated cross-role validation and accessibility (live role-shell visual walkthrough deferred per user's selected automated path)

## Session Notes
<!-- Updated by cook automatically - do not edit manually -->

**Last active:** 2026-10-27 10:32
**Phase in progress:** phase-04-shared-mobile-navigation-cross-role-validation-accessibility
**Status:** Automated Phase 04 acceptance is complete. The user selected the automated testing path; live role-shell visual checks remain explicitly unverified because no authenticated Moderator, Customer, or Technician sessions are available.

### Decisions made this session
- Assert exact route labels, active-state behavior, role-owned logout callbacks for all four roles, shared component adoption, breakpoint styles, and desktop Sidebar use.
- Exercise actual shared component handlers/effects for initial/restored focus, Tab containment, Escape, backdrop, route selection, and breakpoint close/reopen behavior.
- Responsive stylesheet test found and fixed Moderator's mobile notification link below the 44px minimum target.
- Record automated verification: focused tests 36/36; lint, TypeScript, and production build pass; full suite 134/180 with the same 46 recorded baseline failures; Phase 04 review approved 9.7/10.
- User selected automated validation; do not manufacture or bypass role authentication for unverified visual checks.

### Next immediate action
Automated Phase 04 is complete under the user's selected verification path. If authenticated Moderator, Customer, and Technician sessions become available later, extend evidence with rendered focus behavior, 360/390/768/1023/1024 px layouts, overflow/header collisions, and viewport resizing.
