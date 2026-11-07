# Phase 03 - Machine active menu

Status: active - contract assessment; G2 pending
Stories: MP-05, MP-06, MP-07

## Objective

Choose the menu a machine uses in the existing sync workflow and show assignment/sync/application as distinct states.

## Tasks and owners

1. Resolve G2 first: verify a machine GET response that exposes current active menu and whether null means default; verify authorized OwnerRecipeMenu candidates for each enabled role. Live API paths alone do not prove a menu belongs to the selected machine Owner. Record exact source/DTO before adding fields to schema.
2. Extend src/apis/recipes.api.ts with PUT /machines/{machineId}/active-menu/{menuId} and DELETE /machines/{machineId}/active-menu; request/response validation in existing src/schema/recipe-menus.schema.ts, with verified machine readback fields in machines.schema.ts. Avoid duplicate methods in machinesApi. Empty successful DELETE must not require JSON; verify 200/204 behavior.
3. Extend src/components/features/recipe-menus/recipe-sync-panel.tsx for Owner/Admin eligible menu controls above existing sync status/history. Reuse src/apis/recipe-menus.api.ts local menu pagination/search ONLY under Owner context. No global-menu ID in OwnerRecipeMenu selector.
4. Owner can apply a menu or use default when verified readback exists. Admin UI stays gated until both Owner menu source and readback exist. Technician path may extend existing machine detail only after equivalent source and permission verification; do not widen RecipeSyncPanel to a role whose sync-status API is not allowed.
5. After mutation invalidate machine/menu readback plus existing sync status/history; no redundant POST sync unless the confirmed backend contract requires it. Retain isRecipeSyncApplied version/hash checks. A failure after backend saved the assignment is an uncertain outcome: reconcile GET, do not retry mutation blindly.
6. Preserve selected machine through navigation; switching machine/account clears pending selections. Existing Menu pages remain library management; do not duplicate the machine sync form across pages.

## Dependencies

Existing recipe sync contract, G2 and source approvals if any additional path becomes necessary. Phase 02 does not automatically grant menu permissions. Source-approved endpoints missing from backend are documented blockers, never simulated UI.

## Tests and acceptance

Extend tests/recipe-menus-phase7.test.cjs, tests/dolores-api-requests.test.cjs and suitable existing E2E harness; update loader mocks with actual API contract. Owner A cannot select Owner B menu; Admin/Technician never invoke Owner local list as impersonation. PUT uses both canonical IDs; DELETE has no invented body; refresh reads authoritative current menu; 409/503/unknown outcome reconcile; null/default distinct from unknown. Assignment acceptance never displays APPLIED without verified ACK. No duplicate sync POST. Scenario anchors S01/S02/S05/S10/S13/S17/S18/S19.

## Risk

Swagger currently has no current activeMenuId readback or operator Owner-menu listing confirmed. Full Phase 03 must remain pending if these cannot be verified; independently completed phases are unaffected.

## Contract assessment - 2026-11-07

User approved moving to Phase03 and keeping Phase02 live verification separate. Public server OpenAPI was read again from http://100.75.202.72:8082/v3/api-docs; no authenticated mutation performed.

- PUT /api/v1/machines/{machineId}/active-menu/{menuId} exists, declares200 with a generic object; description says compile and sync automatically.
- DELETE /api/v1/machines/{machineId}/active-menu exists, declares200 with a generic object; description says clear to null and fallback. No authoritative current-menu read contract accompanies it.
- MachineResponse properties include id, ownerId, ownerName, serialNumber, status, machineType, modelId, modelName, locationId, locationName, region, deployedAt, nextPreventiveMaintenanceAt, cupsServedSinceLastDescale and certificate; no activeMenuId/current menu/default state.
- RecipeSyncStatusResponse exposes machine/version/hash/command state but no menu identity. It cannot establish which Owner menu is currently assigned.
- GET /recipe-menus/local lists the authenticated Owner's menus. No verified operator endpoint for the selected machine Owner's menus was found. Global menus are not OwnerRecipeMenu candidates.
- Existing FE RecipeSyncPanel has confirmed sync status/history and ACK version/hash validation. Do not infer current menu from the selected dropdown, successful PUT, global membership, cached mutation or localStorage.

G2 therefore remains pending. No active-menu selector, fabricated Machine schema field, unused mutation adapter or fake fixture readback is added while its required read source is unknown.

### Backend contract needed to resume UI

1. A documented machine-scoped GET (or extended machine detail) returning machineId/ownerId and activeMenuId, explicitly nullable with defined default semantics. Omitted/unknown must remain distinct from null/default.
2. For Admin/Technician only: an authorized machine/Owner-scoped OwnerRecipeMenu list with bounded pagination. Owner can use the existing local list once readback is verified.
3. Concrete PUT/DELETE success body/status and saved-but-sync-failed behavior, so FE reconciles readback without repeating mutation or creating an extra POST sync.

Once supplied, continue TDD in existing recipe-menus-phase7.test.cjs and existing E2E harness, then enable Owner first and operators only with verified candidate scope.

## Backend source correction - origin/main 4adc8a1

Clean worktree inspection confirms the public Swagger does not describe the full mutation response:

- MachineRecipeController.setActiveMenu returns200 JSON containing machineId, activeMenuId and menuName after saving and compiling. Sync request exceptions are caught, so successful assignment does not establish delivery/application. This mutation response cannot replace authoritative GET after refresh.
- clearActiveMenu returns204 with no body in source, while running OpenAPI declares200 generic object. A future adapter must accept confirmed empty success and not require JSON; record runtime behavior separately.
- No GET current menu or MachineResponse.activeMenuId was found. RecipeMenuController.localMenus takes the authenticated Owner context and page/size/q only, not an operator-selected Owner. G2 remains pending.
- Technician active-menu mutations use an operator role check without a machine assignment/grant check in this controller. Backend must enforce per-machine Technician scope before enabling that role's menu assignment.
- Related telemetry authorization also needs a fresh source/runtime matrix before expanding roles; do not rely on old Swagger Technician prose as authorization evidence.

No FE selector or API mutation added during this assessment. No backend working tree overwritten.
