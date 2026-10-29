# Brainstorm: Admin UX/UI polish

**Date:** 2026-10-29

## Ideas Explored

- **Clarify dashboard numbers:** Keep the existing KPI grid and finance panel, place time context beside the cup metric, format dates and amounts consistently, and show zero separately from unavailable data.
- **Add more charts or redesign the dashboard:** This could add visual comparisons, but would change the current layout and introduce visual weight without evidence that a new visualization is needed. The selected direction keeps the existing cards and tables.
- **Make tables easier to scan:** Translate visible backend terms, make pagination context clearer, and add quiet row and horizontal-scroll cues. Admin-specific styles avoid side effects on other roles.
- **Standardize feedback and motion:** Use small hover, pressed, focus, and loading feedback. Preserve existing drawer and logout animations and respect reduced-motion preferences.
- **Apply global shared-component styling:** This would reduce duplicate styling, but the shared table/button components serve other roles. The selected direction scopes visual changes to Admin using the existing style modules and DataTable className hook.
- **Change only an Admin page while reusing generic Admin CSS classes:** This avoids changes to other roles, but classes such as metricCard are also used by Admin inventory, IoT, and machine-detail pages. Use distinct scoped classes for overview-only changes.

## User's Direction

The user wants to retain the current colors and design language, keep most of the layout, preserve business logic, and focus on UX/UI. The agreed priority is: make data clearer first, make tables easier to read second, then smooth animation and interaction feedback. The user asked to follow that order and complete all three areas.

## Open Questions

No blocking design question remains. The planning step should confirm Vietnamese display labels against every status and machine-type enum currently rendered by the targeted lists. If a new enum is added later, use a readable fallback rather than rendering its raw code.

Code review confirmed several shared boundaries. DataTable is used by Customer, Technician, Moderator, and Admin; ButtonBar and ActionBar are also used across roles. ADMIN_OPERATIONS_MESSAGES is imported by Moderator contract creation. Keep its Moderator-used labels and all shared component defaults stable; apply the agreed polish through Admin page rendering and narrowly scoped Admin styles. The customer status also appears raw on the Admin profile detail, so include that view for consistent presentation.

## Risks

- A label that implies active-only or another filtered meaning could misrepresent a total. Keep existing API semantics and use neutral wording.
- DataTable styles are shared across roles. Keep new table styling attached to Admin-specific class names and styles.
- ButtonBar and ActionBar defaults are shared across roles. Changes to their component styles would alter non-Admin screens.
- The Admin stylesheet shares metric and form classes across several Admin pages. A broad change can affect the machine inventory, IoT, and machine details even when no other role is affected.
- The Admin operations message dictionary also supplies text to Moderator contract creation. Preserve keys used by that workflow.
- New motion can make data harder to read or conflict with accessibility settings. Keep transitions brief and suppress nonessential motion when reduced motion is enabled.

## Existing Code Areas

- Overview data and states: src/pages/admin/overview/overview-content.tsx
- Admin visual tokens and page styles: src/pages/admin/admin-shell.module.css
- Overview text: src/text/admin/admin-messages.ts
- Customer list: src/pages/admin/businesses/index.page.tsx
- Machine list: src/pages/admin/machines/index.page.tsx
- Admin operations labels: src/text/admin/admin-operations-messages.ts
- Shared table API: src/components/table/data-table.tsx

The initial implementation should stay within these existing modules. The shared DataTable API can receive an Admin-scoped class name; broad shared CSS changes are not part of the selected direction.
