# Plan: Remove FE calls to APIs that do not exist in BE

Owner: planner/reviewer = Claude, implementer = Codex.
Repo: `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE` (Next.js, TypeScript). Branch `ref`.

## Hard constraints
- Do NOT modify the backend repo (`C:\GitHub\BEANS\dolores_platform`) in any way.
- Only touch files listed below (plus deleting files listed below). Do not refactor unrelated code.
- Do NOT commit, push, or create branches. Leave changes in the working tree.
- Do not run `npm install`; do not add dependencies.

## Background
These FE calls target endpoints that the Dolores BE does not expose (they would 404):
1. `GET /tenants` and `GET /tenants/{id}` — `src/apis/tenants.api.ts`
2. `GET /contracts/tenant/{tenantId}` — `contractsApi.listByTenant` in `src/apis/contracts.api.ts`
3. `GET /dashboard/daily-cups/machines` — `dashboardApi.getDailyMachineCupUsage` in `src/apis/dashboard.api.ts`

## Tasks

### 1. Tenants API
- Delete `src/apis/tenants.api.ts` (verified: nothing imports `tenantsApi`).
- `src/schema/tenants.schema.ts`: after step 2, if NO file in `src/` or `tests/` imports from `@/schema/tenants.schema`, delete it. If something still imports it, keep it and keep only what is used.

### 2. Contracts API
- In `src/apis/contracts.api.ts`, remove the `listByTenant` method and the now-unused `TenantIdSchema` import.
- Do NOT touch `locationsApi.listByTenant` in `src/apis/locations.api.ts` — it calls `GET /locations` which exists.

### 3. Dashboard daily machine cups
- `src/apis/dashboard.api.ts`: remove `getDailyMachineCupUsage` and imports that become unused (`DailyMachineCupUsageListSchema`, `TDailyMachineCupUsage`).
- `src/schema/dashboard.schema.ts`: remove `DailyMachineCupUsageSchema`, `DailyMachineCupUsageListSchema`, `TDailyMachineCupUsage` if unused anywhere else.
- `src/pages/admin/overview/overview-content.tsx`: remove the per-machine drill-down feature completely:
  - the `selectedDate` state and every `setSelectedDate(...)` call,
  - the `machineUsage` `useQuery`,
  - the "Chọn" checkbox column (header + cell) in the daily cups table, so the table has only Date and Cup count columns,
  - the expanded breakdown `<tr>` (heading "Số ly theo máy", close button, loading/error/empty states, machine DataTable).
  - Keep the daily table itself (date + cups rows) and everything else on the page working unchanged.
  - Remove imports that become unused (e.g. `Fragment`, `TruncatedId`, `getApiErrorMessage`) ONLY if no longer used in that file.
- `src/pages/admin/admin-shell.module.css`: remove CSS classes that are no longer referenced anywhere in `src/` (`overviewDayCheckLabel`, `overviewDayCheckbox`, `overviewBreakdownRow`, `overviewMachineBreakdown`, `overviewBreakdownHeading`, `overviewBreakdownTotal`, `overviewMachineRows`, `overviewMachineCupCell` — grep each before removing). Keep `overviewDailyTable` if still used.

### 4. Tests
- `tests/e2e/admin-overview-alignment.spec.ts`:
  - In test "Admin can filter accepted cups, open reports and inspect daily machine totals": remove the `daily-cups/machines` route mock and all assertions about the checkbox / machine breakdown table. Keep the range-filter and report-link assertions. Rename the test to "Admin can filter accepted cups and open reports".
  - Fix the other test in this file if it depends on the removed "Chọn" column (e.g. column index / heading alignment).
- grep `tests/` for `daily-cups`, `tenants`, `listByTenant`, `Số ly theo máy`, `Xem chi tiết số ly` and clean up any remaining references.

## Acceptance criteria (Claude will verify)
- `grep -rn "daily-cups/machines\|tenantsApi\|/tenants\b\|contracts/tenant\|getDailyMachineCupUsage" src tests` returns nothing.
- `npx tsc --noEmit -p .` passes.
- `npm run lint` has no new errors in touched files.
- Diff touches only the files named above.

Note: `node_modules` is not installed, so `tsc`/`eslint` cannot run in this environment. Do not install anything; Claude runs typecheck/lint during review. Be extra careful that removed imports/identifiers are truly unused (grep).

When done, print a short summary of each file changed.
