# Spec: Shared Navigation for Four Roles

**Date:** 2026-10-27
**Status:** Ready

---

## Problem Statement

The desktop sidebar is already shared, but mobile navigation differs across Admin, Customer, Technician, and Moderator: some roles use horizontally scrolling link bars while others open role-specific sheets. This makes navigation behavior and maintenance inconsistent; the roles need one shared mobile drawer while retaining their own route lists and permissions.

---

## User Stories

- **[P1]** As a user in any role, I want the same mobile navigation drawer opened from the header so that navigation behaves consistently across Dolores.
  Accepted when: all four role shells open the same bottom sheet from a header hamburger button, and selecting a destination closes the sheet and navigates to that role's route.

- **[P1]** As an Admin, Customer, Technician, or Moderator, I want my role's own destinations and enabled states in the shared navigation so that I only see the menu appropriate to my role.
  Accepted when: all existing role-specific links remain represented, Admin's disabled/pending items remain disabled, and each item resolves to its current route.

- **[P1]** As a keyboard or assistive-technology user, I want the mobile sheet to be operable and announced correctly so that I can navigate without a pointer.
  Accepted when: the sheet has an accessible name, focus is contained while open and restored to the trigger when closed, Escape and backdrop close it, and actionable targets are at least 44 px high.

- **[P2]** As a user on a nested route, I want the corresponding parent navigation item to stay active so that my place in the role's section remains clear.
  Accepted when: exact and nested routes follow one documented matching rule and at most one menu item is marked current.

---

## Functional Requirements

1. **FR-01:** Retain the existing shared desktop `Sidebar` as the desktop navigation used by all four roles.
2. **FR-02:** Keep desktop and mobile navigation renderers in separate component files and keep their styles separate under `src/components`.
3. **FR-03:** Provide one shared mobile bottom-sheet drawer opened by a hamburger button in each role's mobile header.
4. **FR-04:** Each role supplies its own ordered menu items, route destinations, labels, icons, enabled/disabled states, and sign-out callback.
5. **FR-05:** Use one active-route matching rule that handles exact paths, nested paths, query strings, and trailing slashes without activating a root item as a prefix for unrelated destinations.
6. **FR-06:** Preserve mobile drawer dismissal behavior: close after selecting a route, on Escape, and on backdrop activation; restore focus to the hamburger trigger after close.
7. **FR-07:** Keep role-specific headers, breadcrumbs, notification controls, action bars, authorization, and sign-out logic in their existing role shells.
8. **FR-08:** Remove the current horizontally scrolling Customer and Technician mobile navigation strips and the duplicated Admin/Moderator mobile drawer implementations after all four roles use the shared component.

---

## Non-Functional Requirements

- **Performance:** Opening and closing the drawer uses local UI state and makes no network request; do not add a navigation dependency.
- **Security:** The shared navigation only renders the links supplied by the role shell. Existing route authorization and sign-out behavior remain authoritative; disabled links remain non-interactive.
- **Availability:** Navigation remains operable at viewport widths from 360 px through desktop widths without horizontal scrolling in the mobile menu.
- **Accessibility:** The drawer supports keyboard focus containment, Escape dismissal, focus restoration, an accessible label, reduced motion, and a minimum 44 px target height.

---

## Success Criteria

- [ ] All 4 role shells use the same mobile drawer component and header trigger.
- [ ] All 4 desktop role navigations continue to use the existing shared `Sidebar`.
- [ ] Every current role-specific destination is present, with 0 route or disabled-state regressions.
- [ ] All nested routes tested mark the correct item current, with no more than 1 active item at a time.
- [ ] The mobile drawer has 0 horizontal overflow at 360 px, 390 px, and 768 px viewport widths.
- [ ] Keyboard checks pass for focus containment, Escape/backdrop close, focus restoration, and 44 px minimum targets.
- [ ] Existing role sign-out callbacks execute unchanged from the shared drawer.

---

## Out of Scope

- Changing role menus, labels, destination paths, or access policies.
- Refactoring all role headers, breadcrumbs, page content, notifications, or action bars into a shared shell.
- Changing API calls, authentication, or logout semantics.
- Redesigning the shared desktop sidebar beyond keeping its implementation separate from mobile navigation.

---

## Assumptions

- The existing desktop `Sidebar` is the intended shared web navigation and remains in use.
- Admin's current bottom-sheet visual treatment is the mobile drawer reference; the trigger moves to a hamburger button in the header.
- Each role keeps an independent route/menu configuration and supplies its existing sign-out behavior.
