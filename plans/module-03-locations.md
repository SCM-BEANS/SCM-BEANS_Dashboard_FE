# Module 3: Store locations: machines in a store, stats, transfer machine (3 APIs)

Same hard constraints as `plans/module-01-maintenance.md` (FE only, BE read-only, no commit/push/install, follow existing structure, shared UI across roles, Vietnamese text, tests required).
BE reference: `controller/StoreLocationController.java` (lines ~107-145), `service/StoreLocationService.java#transferMachine`.

## APIs
1. `GET /locations/{id}/stats` → `StoreLocationStatsResponse { locationId, locationName, ownerId, ownerName, totalMachines, onlineMachines, offlineMachines, todayCupsBrewed, weeklyCupsBrewed, averageWastagePct (decimal, nullable) }`. Access: business owner scope (ADMIN/MODERATOR in scope, OWNER own). 404 when not found.
2. `GET /locations/{id}/machines?page&size` → a **Spring `Page<MachineResponse>`** object (`content`, `number`, `size`, `totalElements`, `totalPages`, `last`, …), not an array with headers. Reuse the existing machine summary schema in `src/schema/machines.schema.ts` for `content` items, and the existing Spring page schema helper if one exists (grep `totalElements` in `src/schema`).
3. `POST /locations/machines/{machineId}/transfer` body `{ targetLocationId: uuid (required), reason?: string }` → `MachineResponse`. Rules: the target location must belong to the same owner as the machine (BE `validateSameOwner`) and must be active. Access: ADMIN/MODERATOR (`isMachineAllocationOperator`), or OWNER for their own target location. A machine without a location is "Kho" (warehouse).

## Implementation
- `src/apis/locations.api.ts`: `getStats(id, signal)`, `listMachines(id, { page, size }, signal)`, `transferMachine(machineId, { targetLocationId, reason })`, with zod schemas in `src/schema/locations.schema.ts` (or the existing locations schema file).
- Location detail (shared by every role that has a store/location detail screen: `pages/dashboard/locations/locations-screen.tsx` for the owner, `pages/moderator/locations/locations-screen.tsx`, `pages/admin/stores`): build one shared `LocationDetailPanel` in `src/components/features/locations/` (create the folder) containing:
  - a stats card row (total/online/offline machines, cups today/this week, average wastage %). Reuse any existing stat tile component (grep `StatCard`/`stat-tile`/`metric`).
  - a paginated machine table from API 2 (serial, status, connection badge via `machine-connection-badge.tsx`, a link to machine detail).
  - a per-row "Chuyển điểm bán" action that opens a shared `TransferMachineDialog`: select target location (only ACTIVE locations of the same owner, from the existing `locationsApi.listPage({ ownerId, activeOnly: true })`, excluding the current one), an optional reason (≤500 characters), and confirm. On success invalidate the stats and machine-page queries of both source and target locations, plus machine detail queries.
- Also offer the same `TransferMachineDialog` from machine detail screens (admin/moderator/owner) when the machine has an owner, so the transfer flow is the same everywhere.
- If a role screen currently lists location machines by filtering the global machine list, switch it to API 2.

## Tests
- Playwright `tests/e2e/location-detail.spec.ts`: stats render; machine pagination; transfer dialog lists only same-owner active locations other than the current one; POST body is correct; lists refresh after success; error message on 400/403. Cover owner and moderator.
- Unit tests for the 3 API methods in the existing style.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, `node --test tests/*.test.cjs` (no new failures) and the new Playwright spec pass. Print a per-file summary.
