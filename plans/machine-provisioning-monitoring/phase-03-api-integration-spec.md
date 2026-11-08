# Phase 03 — Machine Active Menu API Specification

**Audience:** Dashboard FE
**Last reviewed:** 2026-11-07
**Backend source reviewed:** `SCM-BEANS/Dolores`, `origin/main` commit `a6b3da502bc7173d71f73f0fd2ad0a22b3285027`
**Scope:** identify an Owner menu eligible for a machine, assign or clear it, then distinguish saved assignment from device synchronization and application. This does not document menu/recipe CRUD or device mTLS endpoints.

## 1. Current state and G2 decision

The Phase 03 text describes a workflow, but its full FE flow is still blocked by G2. Current backend source has the assignment mutations and Owner menu listing, but it does not provide enough authorized readback for every role to build and refresh the selector safely.

| Requirement | Backend source at `a6b3da5` | Current FE source |
|---|---|---|
| Read machine’s current `activeMenuId` | **Not exposed.** `GET /machines/{id}` returns `MachineResponse`, which has no `activeMenuId`; no dedicated current-menu GET was found. | No current-menu adapter/field |
| List candidate Owner menus | `GET /recipe-menus/local` lists only the authenticated Owner’s menus. No Admin/Technician machine-Owner-scoped menu-list endpoint was found. | `recipeMenusApi.listLocal()` exists for Owner context |
| Assign a menu | `PUT /machines/{machineId}/active-menu/{menuId}` exists. | No active-menu mutation adapter found in `recipes.api.ts` |
| Clear the assignment | `DELETE /machines/{machineId}/active-menu` exists in source and returns `204`. Current Swagger contract in the Phase 03 notes says `200`; live response was not verified. | No active-menu mutation adapter found |
| Read sync status/history | Existing recipe sync APIs exist for Admin and machine Owner. They do not include `activeMenuId`. | `recipesApi.getSyncStatus()` and history methods exist; `RecipeSyncPanel` serves Owner/Admin |
| Technician authorization | Active-menu mutation code allows TECHNICIAN by role but does not check that Technician is assigned to the requested machine. Sync status authorization does not allow Technician. | No Technician active-menu path; keep it disabled |

**Conclusion:** do not enable the complete Admin or Technician selector yet. Owner can read their own menu candidates and send mutations, but cannot reliably determine the saved assignment after refresh. Admin/Technician cannot get the correct Owner menu list. FE must not fill these gaps with a cached selection, a global-menu ID, or an assumed `activeMenuId` field.

## 2. Roles and permissions

| Role | Candidate menus | Assign / clear menu | Read sync state |
|---|---|---|---|
| **OWNER** | Own menus through `/recipe-menus/local` | Allowed only when machine belongs to the authenticated Owner | Allowed for own machine under the existing Owner scope |
| **ADMIN** | No machine-Owner-scoped Owner menu list is available | Allowed by the current controller for any machine, if the selected menu belongs to that machine’s Owner | Allowed |
| **TECHNICIAN** | No authorized Owner-menu list for the selected machine is available | Controller currently allows by role without checking per-machine assignment; this is a backend scope gap. Do not enable. | Current `authorizedMachine()` path is Admin/Owner scoped; Technician is not authorized |
| **MODERATOR** | No endpoint for the selected machine’s Owner menus | Not allowed by the active-menu controller | Not authorized by the recipe sync `authorizedMachine()` check |
| **Guest / Barista** | Not part of this Dashboard API flow | Not allowed | Not allowed |

The endpoint implementation—not its annotation alone—is the authorization source for this matrix. In particular, the `MachineRecipeController` description names Technician, but its role check treats every Technician as an operator and omits `canAccessMachine(machineId, ...)`.

## 3. Calling convention

Use `axiosClient` with `DOLORES_API_BASE_URL` (`/api/dolores/v1`) from the existing FE API modules. The proxy forwards to BE `/api/v1/...`; do not call the server address directly from components. Path IDs must be canonical UUIDs.

```text
BE: GET /api/v1/recipe-menus/local?page=0&size=20&q=morning
FE: GET /api/dolores/v1/recipe-menus/local?page=0&size=20&q=morning
```

There is no body for assigning or clearing the machine menu: both IDs are in the path, and clear has no parameters. Keep `machineId` and `menuId` from validated API data, not display labels or serial numbers.

## 4. API contracts

### 4.1 List the authenticated Owner’s candidate menus

```http
GET /api/v1/recipe-menus/local?page=0&size=20&q=morning
```

**Role:** `OWNER` only. The Owner ID is taken from the authenticated `OwnerContext`; do not pass an arbitrary `ownerId`. Admin/Moderator/Technician calls return `403`.

| Query | Type | Default and rules |
|---|---|---|
| `page` | integer | default `0`, zero-based, must be `>= 0` |
| `size` | integer | default `20`, range `1..100` |
| `q` | string | optional partial menu-name search; whitespace-only behaves as no search |

**Success:** `200 OK`, stable `PageResponse<OwnerRecipeMenuResponse>`. Items are ordered by menu ID ascending.

```json
{
  "content": [
    {
      "id": "7de5ac15-8054-4c0b-adce-524fffe85d61",
      "ownerId": "70f67d43-d8ca-42fb-b70a-933f3fc76b37",
      "name": "Morning Menu",
      "createdAt": "2026-11-07T03:30:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

Use only the returned `id` as an `OwnerRecipeMenu` candidate. Do not use `/recipe-menus/global` results here: they are global catalog menus and are not the Owner menus required by the machine assignment endpoint.

**Other responses:** `400` invalid pagination; `401` unauthenticated; `403` caller is not in an Owner context.

### 4.2 Read machine detail — useful context, not active-menu readback

```http
GET /api/v1/machines/{machineId}
```

This existing endpoint returns `MachineResponse`, including `id`, `ownerId`, `serialNumber`, machine status/type, model/location fields and maintenance summary. It does **not** include `activeMenuId`, active menu name, or a default-menu indicator. It therefore cannot tell FE which menu was assigned before page load.

For Admin/Moderator and Owner, source applies the relevant role/Owner scope. The Technician branch can read machine detail by ID without proving that the Technician has an active machine assignment; that read must not be treated as authorization for menu mutations.

### 4.3 Assign an Owner menu to a machine

```http
PUT /api/v1/machines/{machineId}/active-menu/{menuId}
```

**Body:** none.
**Roles in current source:** Admin; Technician; or the Owner of the machine. Moderator is not accepted by this controller.

`menuId` must identify an `OwnerRecipeMenu` belonging to the machine’s Owner. The backend checks the menu’s `ownerId` against the Owner resolved for the machine. For an Owner caller, machine scope is checked against `OwnerContext`. For Admin and Technician, the current source does not require a per-machine Technician assignment; do not enable the Technician route until BE adds that check.

**Success:** `200 OK`, JSON body:

```json
{
  "machineId": "06dc0d42-bf45-4896-885d-888eef59aef5",
  "activeMenuId": "7de5ac15-8054-4c0b-adce-524fffe85d61",
  "menuName": "Morning Menu"
}
```

This response confirms that the controller saved the requested assignment and attempted to recompile recipes. It does **not** confirm that the machine received or applied the update. The controller catches exceptions from its automatic sync request, so an HTTP 200 can still be followed by a pending/failed sync state.

The controller does not reject an empty Owner menu. The recipe compiler then tries `Menu của tôi`, then the first Owner menu; if those contain no recipes, it compiles the global fallback. So `activeMenuId` can point to the selected menu while the effective recipes came from a fallback menu. The mutation response does not identify that effective source.

**Other responses:** `401` unauthenticated; `403` Owner caller is outside the machine’s Owner scope; `404` machine not found; `400` menu not found or menu Owner does not match the machine. The source does not define a specific `409` response for this operation. Do not invent one in the FE schema.

### 4.4 Clear the active menu assignment

```http
DELETE /api/v1/machines/{machineId}/active-menu
```

**Body:** none.
**Roles:** same source behavior as assignment: Admin, Technician, or machine Owner, with the Technician scope gap described above.

**Source success:** `204 No Content`, empty body. The controller stores `activeMenuId = null`, recompiles effective recipes, and requests sync; sync request exceptions are swallowed. **The Phase 03 contract note says the live Swagger declares `200` with a generic object, so the deployed response remains unverified.** FE must not require a JSON response; confirm the actual deployed success status before adding an exact-status assertion.

**Other responses:** `401`; `403` Owner scope failure; `404` machine not found. No active-menu-specific `409` is explicitly returned by the controller source.

Clearing means the machine no longer has an explicitly assigned menu. The compiler currently attempts the Owner menu named `Menu của tôi`; if it is absent, it tries the first Owner menu ordered by name and ID; if that produces no Owner recipes, it falls back to the global recipe menu. Thus `null` is not a stable display name or proof that a particular Owner menu is active. Render it as a distinct “Use default” selection only after current assignment readback exists and the fallback wording is confirmed with the product owner.

### 4.5 Read latest recipe sync status

```http
GET /api/v1/recipes/sync/{machineId}
```

**Roles:** Admin or the Owner of the machine. Technician is not authorized by the current `authorizedMachine()` helper.
**Body:** none.
**Success:** `200 OK`, `RecipeSyncStatusResponse`:

```json
{
  "machineId": "06dc0d42-bf45-4896-885d-888eef59aef5",
  "targetVersion": 8,
  "targetHash": "sha256:target-hash",
  "appliedVersion": 8,
  "appliedHash": "sha256:target-hash",
  "commandId": "6926cb8e-8e2d-4e42-b34c-b2b735a4383a",
  "state": "APPLIED",
  "retryCount": 0,
  "lastError": null,
  "requestedAt": "2026-11-07T03:30:00Z",
  "lastAttemptAt": "2026-11-07T03:30:02Z",
  "appliedAt": "2026-11-07T03:30:03Z",
  "expiresAt": "2026-11-07T03:45:00Z"
}
```

States are `PENDING`, `DELIVERED`, `APPLIED`, `OFFLINE`, `EXPIRED`, and `FAILED`. Treat `DELIVERED` as received by the machine, not applied. FE’s existing `isRecipeSyncApplied()` condition requires `state === "APPLIED"`, equal `appliedVersion` and `targetVersion`, a non-empty `targetHash`, and equal `appliedHash` and `targetHash`.

**Other responses:** `401`; `403` outside Admin/Owner scope; `404` no sync status (or machine not found through the authorization lookup).

This endpoint has no active menu ID. Its sync record alone cannot prove which menu is currently assigned.

### 4.6 Read sync history

```http
GET /api/v1/recipes/sync/{machineId}/history?page=0&size=50
```

**Roles:** Admin or machine Owner.
**Query:** zero-based `page` default `0`; `size` default `50`, maximum `100`.
**Success:** `200 OK`, JSON array of the same sync status DTOs as section 4.5. Pagination is sent in headers: `X-Page`, `X-Page-Size`, and `X-Has-Next`.

Use history to show prior commands and investigate errors; do not infer the selected menu from a sync-history item. Error statuses are `401`, `403`, and validation/service errors for invalid page settings.

### 4.7 Manual sync request — do not call as a second step after assignment

```http
POST /api/v1/recipes/sync
Content-Type: application/json
```

**Roles:** Admin or machine Owner under the source `authorizedMachine()` check.
**Request body:**

```json
{
  "machineIds": ["06dc0d42-bf45-4896-885d-888eef59aef5"]
}
```

**Success:** `202 Accepted`, array of `RecipeSyncStatusResponse` objects. The source endpoint is marked deprecated and recommends automatic downward sync. `PUT` and `DELETE` active-menu handlers already request sync themselves, so FE must **not** call this endpoint again after either mutation. Keep it only for a separate, explicitly requested manual resync action. Errors include `400` empty/invalid machine list or business state; `403` outside Admin/Owner scope.

## 5. Recommended FE behavior when the missing contracts are supplied

1. Load the selected machine’s canonical UUID and Owner ID from the scoped machine API.
2. Read an authoritative active-menu field. Distinguish `null` (default behavior) from omitted/unavailable data; do not infer it from the most recently selected dropdown item.
3. Fetch candidate menus for the machine Owner through an endpoint that enforces that Owner scope. Owner may use `/recipe-menus/local`; Admin/Technician must not impersonate the Owner through that endpoint.
4. On selection, call the active-menu `PUT` once. A confirmed `200` means saved assignment, not device application. Invalidate machine/menu readback and sync status/history.
5. On clear, call `DELETE` once with no body. Accept the verified deployed success status and do not parse an empty response as JSON.
6. Show “Applied” only when a sync acknowledgement matches target version and hash. Do not issue an extra `POST /recipes/sync` after assignment or clear.
7. If a mutation times out or returns an uncertain 5xx, do not retry blindly. Reconcile through authoritative current-menu readback first; current BE has no such readback, so keep the selection action blocked until that read source exists.
8. When changing machine or account, clear pending menu selection and invalidate/cache-key menu and sync data by authenticated subject plus machine ID.

## 6. FE code already available

- `src/apis/recipe-menus.api.ts` has `recipeMenusApi.listLocal()` and validates the stable `PageResponse`; it is suitable only in authenticated Owner context.
- `src/apis/recipes.api.ts` has sync status, history, manual sync, and command replay adapters. These provide synchronization state, not active-menu readback.
- `src/components/features/recipe-menus/recipe-sync-panel.tsx` is currently Owner/Admin and is a sync monitor. It does not have machine menu selection.
- `src/schema/machines.schema.ts` and the BE `MachineResponse` do not have `activeMenuId` today.
- No active-menu `PUT` or `DELETE` adapter was found in the current FE `recipes.api.ts`.

Do not add a guessed schema field or mutation adapter response type until the contracts in section 7 are settled.

## 7. Backend work required to unblock the complete UI

1. Add a machine-scoped current-menu read (or extend machine detail) with `machineId`, `ownerId`, `activeMenuId`, and explicit nullable/default semantics.
2. Add a bounded Owner-menu listing for Admin/Technician that authorizes the requested machine and derives/validates its Owner. Do not accept an unvalidated arbitrary Owner ID.
3. Add per-machine Technician authorization to both active-menu mutation methods, and define whether Technician may read sync status/history.
4. Return a sync command reference or target version/hash from active-menu `PUT`/`DELETE`, or expose a readback that safely correlates the assignment with its generated sync. The current `200` assignment body does not reference the command, and sync exceptions are suppressed.
5. Reject or define active-menu assignment when the machine has no resolvable Owner. Current code skips the menu-owner equality check when both direct and contract-resolved Owner IDs are null.
6. Define what happens when a selected Owner menu has no recipes; current compiler can silently use a different menu or the global fallback.
7. Align Swagger and running server behavior for clear-menu success (`200` in the Phase 03 live OpenAPI note versus `204` in source).
8. Define behavior for invalid, cross-Owner, empty, or missing Owner menu and whether any of these may be `400`, `403`, `404`, or `409`; current `PUT` returns `400` for a missing menu or Owner mismatch.

Until these are resolved, the Owner mutation can be tested only as a limited source-confirmed operation, but a refresh-safe assignment UI and Admin/Technician selector are not ready to ship.

## 8. Verification boundary

This document is based on source at `origin/main` `a6b3da5` and the supplied Phase 03 assessment. It is not proof that the same commit is deployed. No authenticated menu mutation or live status check was performed. Verify the deployed `GET /machines/{id}`, `PUT /machines/{id}/active-menu/{menuId}`, `DELETE /machines/{id}/active-menu`, and role matrix before strict FE response assertions.
