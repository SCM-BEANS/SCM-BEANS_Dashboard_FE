# Spec: Admin UX/UI polish

**Date:** 2026-10-29
**Status:** Ready

---

## Problem Statement

Admin screens show useful operational and financial values, but some context is separated from the numbers and a few tables expose backend terms directly. Small presentation changes can improve scanning and confidence while preserving the Dolores visual language, current page structure, and business behavior.

---

## User Stories

- **[P1] US-01** As an Admin or manager, I want to see the unit and date period beside each time-based metric so that I can interpret the dashboard without searching elsewhere on the page.
  Accepted when: the accepted-cup metric displays its period beside the metric using dates already returned by the Dashboard API.

- **[P1] US-02** As an Admin, I want zero, unavailable, loading, and error states to look distinct so that I do not mistake missing data for a real zero.
  Accepted when: a numeric zero remains visible as 0, missing values use an explicit unavailable presentation, and existing loading/error states remain identifiable.

- **[P1] US-03** As an Admin, I want customer and machine tables to use familiar Vietnamese labels so that I can scan records without decoding internal status or type codes.
  Accepted when: the customer status is readable in both the customer list and its detail view, the machine-model list does not append raw type codes to its Vietnamese labels, and the machine owner identifier uses a Vietnamese label; unknown values have a readable fallback.

- **[P1] US-04** As an Admin using a narrow screen, I want to understand when a table can scroll horizontally and reach its final rows and controls so that mobile use does not hide information.
  Accepted when: the table's horizontal overflow is discoverable and the final row and pagination remain reachable at a 375 CSS pixel viewport.

- **[P2] US-05** As an Admin, I want restrained interaction feedback so that controls feel responsive without distracting from operational data.
  Accepted when: hover, pressed, and focus states are consistent within Admin and motion is reduced when the operating system requests reduced motion.

---

## Functional Requirements

1. FR-01: Preserve the existing Admin palette, typography, KPI grid, panels, tables, navigation, and action placement. Keep the current Dolores red, warm neutral background, white surfaces, and Arial typography.
2. FR-02: Put the existing usage period beside the accepted-cup KPI. Format dates and numeric values consistently for Vietnamese readers without deriving new business metrics.
3. FR-03: Keep zero separate from missing data. Use existing query states for loading, empty, and error presentation; do not add API requests or change response interpretation.
4. FR-04: Remove the overview's generic migration notice from the active dashboard content. Keep any actual pending navigation state close to the affected navigation item where it is already represented.
5. FR-05: Replace the raw customer status in both the list and detail view with Vietnamese labels. In Admin machine lists, use the Vietnamese owner identifier label. In the Admin machine-model list, show the existing Vietnamese machine-type label without appending its backend code. Use a clear fallback such as “Chưa xác định” for unmapped values. Preserve shared display labels used by Moderator contract creation, including SMART, CONVENTIONAL, and UNCLASSIFIED.
6. FR-06: Where the existing response provides total and page-size values, show the current visible range with the total while keeping current pagination behavior and URL state.
7. FR-07: Apply table hover, focus, and horizontal-scroll cues through an Admin-specific class passed through the existing DataTable className hook. Do not change DataTable base styles or its shared variants.
8. FR-08: Keep existing interactions and pending states. Add only restrained visual feedback for controls through Admin-scoped styles and honor prefers-reduced-motion. Do not change the shared ButtonBar or ActionBar default styles.
9. FR-09: Keep the last table row and pagination reachable. If an Admin overlap is confirmed, correct it with Admin-scoped layout styling; do not change the shared ActionBar dock because Customer, Technician, and Moderator also use it.
10. FR-10: Make these changes in existing source files. Do not add source components, source folders, API endpoints, dependencies, or business logic.

---

## Non-Functional Requirements

- Performance: Add no runtime dependency, API call, or polling behavior.
- Accessibility: Retain visible keyboard focus; status and error messages remain perceivable; reduced-motion preference suppresses nonessential transitions.
- Compatibility: Preserve current routes, query parameters, API contracts, and all action handlers.
- Architecture: Keep page-specific presentation in existing Admin pages and styles; avoid changing shared role behavior. The Admin stylesheet is shared across Admin screens, so use new, narrowly scoped class names where an adjustment is specific to the overview or targeted tables.

---

## Success Criteria

- [ ] All four overview KPI cards retain their current meaning; the time period is visible beside the accepted-cup metric.
- [ ] A displayed 0 is visually distinct from unavailable, loading, empty, and error states.
- [ ] The customer list and detail view show a readable customer status; machine tables use a Vietnamese owner identifier label and the machine-model list shows its Vietnamese type label without a raw code suffix.
- [ ] Paginated tables show the visible range and total when those values are already available.
- [ ] At 375 CSS pixels, the table's horizontal overflow is discoverable and all rows and pagination controls remain reachable.
- [ ] Admin hover, pressed, and focus feedback uses transitions no longer than 180 ms; reduced-motion preference removes nonessential transitions.
- [ ] No API contract, route, query behavior, action handler, or business rule changes; no new source file or component is introduced.

---

## Out of Scope

- Changing the Dolores color palette, typography, or overall Admin information architecture.
- Replacing existing KPI cards or tables with charts, a new dashboard layout, or mobile card lists.
- Changing API endpoints, business calculations, permissions, route behavior, or form workflows.
- Redesigning navigation or adding a new global notification/toast system.
- Refactoring shared components in a way that changes Customer, Technician, or Moderator screens.
- Changing the base styles of DataTable, ButtonBar, or ActionBar, which are used across roles.

---

## Assumptions

- The current Dashboard API response remains the source of truth for all values and periods.
- A missing value must not be presented as zero, and labels must not claim a metric is active-only unless the API provides that distinction.
- The shared DataTable already accepts a className, so Admin-specific table styling can remain scoped to existing Admin styles.
- ADMIN_OPERATIONS_MESSAGES is also imported by Moderator contract creation; preserve the shared contract and machine labels used by that flow.
- Admin metric classes are reused by the inventory, IoT, and machine-detail pages. Overview-only presentation changes need a distinct class to avoid changing those screens unintentionally.
- Vietnamese date and number formatting is appropriate for Admin users.

---

## Resolved Display Mapping

- Customer status values currently offered by the Admin filter are ACTIVE and DISABLED. Render them as “Đang hoạt động” and “Đã vô hiệu hóa”; use “Chưa xác định” for an unrecognized detail value. Keep the filter/query values unchanged.
- Machine model types currently rendered are SMART_IOT and CONVENTIONAL. Use the existing “Smart IoT” and “Máy thường” labels without displaying the raw code; use the existing unclassified label for any other value.
