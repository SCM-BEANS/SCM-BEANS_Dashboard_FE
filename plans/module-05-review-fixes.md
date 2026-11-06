# Module 5 review fixes (Claude review)

Same constraints as module-05-lifecycle.md. The work is in the working tree (not committed).

## 1. Duplicate machine contract history
The BE maps `GET /contracts/machine/{machineId}` and `GET /contracts/machine/{machineId}/history` to the **same** handler. The FE already had `contractsApi.getMachineHistory` (the `/history` alias), and module 5 added `listByMachine`. Result:
- `src/pages/dashboard/machines/machines-screen.tsx` now shows contract history **twice**: the old inline list (~lines 74-76 and 174-184) and the new `<MachineContractHistory>` (~line 251).

Fix:
- Keep one API method: `listByMachine(machineId, { status?, page, size }, signal)` using `MachineIdSchema` (not `ContractIdSchema`) for the machine id. Make `getMachineHistory(machineId, signal)` a thin wrapper `listByMachine(machineId, { page: 0, size: 100 }).then(r => r.items)` so its existing callers keep working, or migrate them; do not keep two HTTP implementations.
- Owner machines screen: remove the old inline contract-history block and its query. Keep only the shared `<MachineContractHistory>`, placed where the old block was so the layout order stays the same.
- Check `pages/admin/contracts/index.page.tsx:118` and `pages/moderator/contracts/contract-detail-screen.tsx:183`. These show history for a contract's machine inside contract detail; keep them, but they must call the single method.
- Make the history `queryKey` start with `["dolores", ...]` like other queries in the app.

## 2. `confirmOrderReceived` validation
In `src/apis/coffee-packages.api.ts`, validate `id` with the existing order id schema and, if `CoffeePackageFulfillmentSchema` has the order id, check that it matches (follow the identity-check pattern of the neighbouring methods).

## 3. Tests
- Update unit/e2e tests for the merged method. Add an e2e assertion that the owner machine detail shows exactly one contract history table.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, `npx playwright test tests/e2e/lifecycle-actions.spec.ts` pass, and `node --test tests/*.test.cjs` has no new failure titles. Print a per-file summary.
