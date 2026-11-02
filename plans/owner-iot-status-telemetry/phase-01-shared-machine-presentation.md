# Phase 01 — Shared machine presentation

## Objective

Create the shared machine presentation layer and integrate the existing Owner, Admin, and Moderator machine list/detail screens—including the Admin machine inventory list—so the roles use the same visual hierarchy without sharing permissions or role-specific actions.

## Spec Mapping

- **P1 story 2:** shared visual structure across Admin, Moderator, and Owner.
- **FR-01:** shared presentation components under `src/components/machines`.
- **FR-03:** detail screen follows the reference and exposes an operational-data action area.

## Tasks

1. Define the component contract for shared list/detail/IoT presentation. Inputs should carry machine identity, lifecycle status, contract/location context, available panels, loading/error states, and role capability state.
2. Add the minimum reusable presentation components under `src/components/machines`, using the existing Dolores palette, spacing, card/table primitives, and `DataTable` where appropriate. Keep the component count limited to distinct reusable responsibilities.
3. Integrate Owner's `MachinesScreen` with the common machine list and detail layout while preserving maintenance schedule, contract history, maintenance tickets, and support-request links.
4. Integrate Admin's machine inventory list and machine detail presentation while preserving status filters, machine/model management controls, action bars, tables, and Admin navigation.
5. Integrate Moderator's machine list/detail presentation while preserving Moderator routing and machine/technician actions.
6. Integrate the standalone Admin and Moderator IoT routes with the shared Smart IoT panel/presentation structure. Preserve each page's route and query ownership; permission behavior and authorized requests are implemented in Phase 02.
7. Keep each role's data fetching, API scope, and mutation handlers in its existing page. Pass display data and capability flags to the shared UI; do not move Admin-only actions into the common component.
8. Define stable role-specific operational-overview path helpers that retain the selected machine ID. Add the visible “Xem dữ liệu vận hành” action together with its destination in Phase 03, when that route and screen exist, so Phase 01 does not expose a link to an unimplemented page.

## Files and Modules

**New presentation modules (planned):**

- `src/components/machines/machine-list-view.tsx`
- `src/components/machines/machine-detail-view.tsx`
- `src/components/machines/smart-iot-panel.tsx`
- `src/components/machines/machines.module.css`

**Role integration:**

- `src/pages/dashboard/machines/machines-screen.tsx`
- `src/pages/admin/machines/index.page.tsx` (Admin machine list; include in shared list presentation)
- `src/pages/admin/machines/machine-detail-screen.tsx`
- `src/pages/admin/iot/index.page.tsx` (retain existing Admin IoT entry and align its shared panel use)
- `src/pages/moderator/machines/machines-screen.tsx`
- `src/pages/moderator/machines/machine-detail-screen.tsx`
- `src/pages/moderator/iot/iot-screen.tsx`
- `src/routes/path.ts` (role-specific operational-overview path helpers)

## Dependencies

- Uses existing `src/components/table/data-table.tsx` and shared route/navigation primitives.
- Does not change endpoint contracts or add API mutations.
- Phase 02 depends on this phase's `SmartIotPanel` capability/state contract.

## Tests and Acceptance

- Existing focused checks: `node --test tests/admin-machines-iot.test.cjs tests/moderator-dashboard.test.cjs`.
- Acceptance: Owner, Admin, and Moderator render the same machine list/detail hierarchy at desktop and mobile widths; this explicitly includes Admin's `/admin/machines` list and preserves its status filter plus each role's own action controls/routes.
- Acceptance: the standalone Admin and Moderator IoT pages use the shared Smart IoT panel hierarchy; they keep role-specific data and capability inputs and do not imply that common presentation grants common API permissions.
- Acceptance: shared component shows lifecycle state independently from connection state and has distinct placeholders for loading, no data, error, and permission denied.
- Acceptance: Owner maintenance/history sections remain available; Admin and Moderator management controls remain in their existing role pages.
- No test execution is part of planning; this phase's implementation verification happens when the user starts cook.

## Risks and Notes

- The Admin and Moderator shells have their own CSS modules and action bars. Shared components must not depend on shell-specific class names.
- Avoid replacing role page containers wholesale; adapt only the presentation surfaces needed for consistency.
- Moderator's current IoT page makes a points query that Swagger does not authorize. Phase 02 must correct its displayed/requested behavior.
