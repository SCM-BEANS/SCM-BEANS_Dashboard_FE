# Phase 02 — Device Identity and Machine Certificate API Specification

**Audience:** Dashboard FE
**Last reviewed:** 2026-11-07
**Backend source reviewed:** `SCM-BEANS/Dolores`, `origin/main` commit `a6b3da502bc7173d71f73f0fd2ad0a22b3285027`
**Scope:** machine-to-TeleParser identity mapping and X.509 machine certificate lifecycle. This document does not specify telemetry ingestion or heartbeat query APIs.

## 1. Current integration status

| Capability | Backend at `a6b3da5` | Current FE source |
|---|---|---|
| Read active device identity | `GET` exists; Admin or Technician assigned to the machine | **Not connected yet** in `machines.api.ts` |
| Register device identity | `POST` exists; Admin only | Connected |
| Revoke device identity | `DELETE` exists; Admin only | Connected; readback-based confirmation/reconciliation still needs the GET adapter |
| Issue/list/view/download/delete certificates | All five operations exist; Admin or assigned Technician | API adapter and certificate panel exist |
| Technician machine-level authorization | Checked by the backend for each certificate request and identity read | Source-reviewed; live direct-call check was not performed in this review |
| Private certificate bundle storage | Per-certificate Infisical key is used in source | Infisical availability and live storage were not verified |

The older Phase 02 checklist still describes G1 and Technician scope as unresolved. That snapshot predates `a6b3da5`; the backend source now contains the identity read endpoint and the per-machine Technician check. FE still needs to connect the identity GET, and live verification remains separate.

## 2. Roles and access scope

| Role | Device identity | Machine certificates |
|---|---|---|
| **ADMIN** | Read, register, revoke for any existing machine | Issue, list, view detail, download bundle, delete for any existing machine |
| **TECHNICIAN** | Read only for a machine the backend authorizes as assigned | Issue, list, view detail, download bundle, delete only for a machine the backend authorizes as assigned |
| **MODERATOR** | No access | No access |
| **OWNER** | No access | No access |
| **Guest / Barista** | No access | No access |

The Technician scope is checked on the requested `machineId` by BE. Hiding a button or loading a machine in FE does not grant access. Treat `403` as authoritative and do not retry the same request under another machine ID.

## 3. Calling convention

### Backend paths and FE paths

The backend paths below include `/api/v1`. In the Dashboard FE, call the existing API client through `DOLORES_API_BASE_URL` (`/api/dolores/v1`) and pass the remaining path, for example:

```text
BE:  GET /api/v1/machines/{machineId}/certificates
FE:  GET /api/dolores/v1/machines/{machineId}/certificates
```

Use `axiosClient` and the existing Dolores proxy. Do not call the server IP directly from a component. The shared client supplies the bearer token and its existing one-time 401 refresh behavior.

### Certificate environment selection

Certificate routes are sensitive and the proxy requires an explicit `BACKEND_API_MODE=local` or `BACKEND_API_MODE=remote` with both remote backend URLs configured. It does not fall back from remote to local for these routes. If selection is missing, FE receives `503 CERTIFICATE_BACKEND_MODE_REQUIRED`; if the selected Dolores server cannot be reached, FE receives `502`. Keep login and API traffic on the same selected environment.

Identity routes currently do **not** use that explicit certificate-route guard: the shared proxy auto-selects an environment and may retry an identity `GET` against local after a remote failure. Do not treat such a fallback read as authoritative for the selected machine. Use an explicitly configured, consistent environment for the whole identity/certificate workflow, and keep this proxy behavior visible as a Phase 02 integration gap.

### IDs, timestamps, and statuses

- `machineId` and `certificateId` are canonical UUIDs. Validate before calling; never substitute serial numbers in path parameters.
- Identity and certificate response DTOs use `LocalDateTime` from Java, serialized without a timezone suffix. Identity time zone follows the configured backend clock; certificate creation currently uses UTC. Do not assume all timestamps include `Z` or an offset.
- Device identity `status`: currently `ACTIVE` on GET/POST. Revoked identities are retained for audit but GET returns only the active mapping.
- Certificate status values: `ACTIVE`, `REVOKED`, `EXPIRED`. The delete endpoint is a hard delete; it is not a revoke operation.
- Backend errors may have a standard error body or an empty body depending on the path. Branch on HTTP status and show the existing FE-safe error message; do not depend on undocumented error JSON fields.

## 4. Device identity APIs

### 4.1 Read the active identity

```http
GET /api/v1/machines/{machineId}/telemetry-device-identity
```

**Roles:** Admin; Technician assigned/authorized for that machine.
**Request body:** none.
**Success:** `200 OK` and the active mapping.

```json
{
  "id": "c80f3ae2-478b-4f74-a7f5-3556e4ba6d2b",
  "machineId": "06dc0d42-bf45-4896-885d-888eef59aef5",
  "deviceId": "TEST-MACHINE-006",
  "status": "ACTIVE",
  "createdAt": "2026-11-07T10:30:00",
  "updatedAt": "2026-11-07T10:30:00",
  "revokedAt": null
}
```

**Other responses:** `401` unauthenticated; `403` insufficient role or machine scope; `404` machine not found or no active identity.

**FE interpretation:** first load the machine successfully, then treat identity `404` as “no active identity” for the identity panel. It can also mean the machine disappeared, so preserve the machine-detail error separately. After revocation, a subsequent GET returns `404`; it does not return the revoked historical row.

### 4.2 Register an identity

```http
POST /api/v1/machines/{machineId}/telemetry-device-identity
Content-Type: application/json
```

**Role:** Admin only.
**Request body:**

```json
{
  "deviceId": "TEST-MACHINE-006"
}
```

`deviceId` must be non-empty/non-blank and at most 255 characters. The value is unique across current and revoked mappings and cannot be reassigned. Each machine may have only one active mapping.

**Success:** `201 Created`, response has the same shape as section 4.1 and must match the requested `machineId` and `deviceId`.

**Other responses:** `400` invalid/missing `deviceId`; `401`; `403`; `404` machine not found; `409` device ID was used before or the machine already has an active mapping.

**FE behavior:** do not retry a `409`. After a timeout/unknown result, call GET before offering another registration attempt. Until GET is connected, use the successful POST response only as immediate confirmation; it is not proof of the mapping after a page reload.

### 4.3 Revoke the active identity

```http
DELETE /api/v1/machines/{machineId}/telemetry-device-identity
```

**Role:** Admin only.
**Request body:** none.
**Success:** `204 No Content`, empty body.
**Other responses:** `401`; `403`; `404` machine or active identity not found; `409` concurrent update conflict.

BE marks the mapping `REVOKED`, retains it for audit, and permanently reserves the old `deviceId`. Admin may register a different unused ID afterward. The FE adapter must not parse or require a JSON response, even though the service method internally returns an object.

**FE behavior:** confirm which machine’s identity will be revoked; disable duplicate submission; after `204`, refresh identity GET and display “no active identity” only after the readback returns `404`. A failed/unknown request must be reconciled with GET before another mutation.

## 5. Machine certificate APIs

All paths use `/api/v1/machines/{machineId}/certificates`. **Roles:** Admin, or Technician authorized for that machine. Moderator, Owner, and Guest cannot use these endpoints.

### 5.1 Issue a certificate

```http
POST /api/v1/machines/{machineId}/certificates
```

**Request body:** none. Do not send a made-up serial, key, owner ID, or certificate payload. BE derives certificate material from the machine and stores the private bundle in Infisical. If the machine has no matching device identity by its serial, the current issue service also tries to create an active mapping using that serial.

**Success:** `201 Created`, public metadata response (shape in section 5.2).
**Other responses:** `401`; `403`; `404` machine not found; validation/service errors such as a machine without a usable serial or certificate/Infisical failure.

**FE behavior:** this is a non-idempotent mutation. Set mutation retries to `false`, block duplicate clicks, and do not automatically repeat after timeout/5xx. Reconcile with the certificate list first. A newly issued certificate should be visible after the list refresh.

### 5.2 List certificates

```http
GET /api/v1/machines/{machineId}/certificates?page=0&size=50&status=ACTIVE
```

| Query | Type | Default / constraint |
|---|---|---|
| `page` | integer | 0-based, default `0`, must be `>= 0` |
| `size` | integer | default `50`; values above `100` are capped to `100`; `0` or negative values become `50` in BE—FE should send `1..100` |
| `status` | enum | optional: `ACTIVE`, `REVOKED`, `EXPIRED` |

**Success:** `200 OK`, Spring `Page<MachineCertificateResponse>`. BE sorts by `issuedAt` descending, then `id` descending. Example of the fields FE needs (Spring may include extra paging/sort fields):

```json
{
  "content": [
    {
      "id": "ac98ad75-f487-4c10-99c9-8deef7b7b5a2",
      "ownerId": null,
      "machineId": "06dc0d42-bf45-4896-885d-888eef59aef5",
      "commonName": "TEST-MACHINE-006",
      "organization": "Dolores",
      "fingerprint": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "spiffeId": "spiffe://dolores/machine/06dc0d42-bf45-4896-885d-888eef59aef5",
      "certificateSerial": "73AF02C1",
      "issuedAt": "2026-11-07T10:30:00",
      "expiresAt": "2027-11-07T10:30:00",
      "status": "ACTIVE",
      "revokedAt": null,
      "revokeReason": null,
      "createdAt": "2026-11-07T10:30:00",
      "updatedAt": "2026-11-07T10:30:00"
    }
  ],
  "number": 0,
  "size": 50,
  "totalElements": 1,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

An empty page has `content: []` and zero total elements. Use the server’s `number`, `size`, `totalElements`, `totalPages`, `first`, and `last` for pagination; do not infer the result count from `content.length` alone.

### 5.3 Read certificate details

```http
GET /api/v1/machines/{machineId}/certificates/{certificateId}
```

**Request body:** none.
**Success:** `200 OK`, all metadata from section 5.2 plus `clientCrtPem` and `caCrtPem`. These are public certificate contents. **The response must not contain `clientKeyPem`.**
**Other responses:** `401`; `403`; `404` certificate is not associated with the machine.

```json
{
  "id": "ac98ad75-f487-4c10-99c9-8deef7b7b5a2",
  "ownerId": null,
  "machineId": "06dc0d42-bf45-4896-885d-888eef59aef5",
  "commonName": "TEST-MACHINE-006",
  "organization": "Dolores",
  "fingerprint": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "spiffeId": "spiffe://dolores/machine/06dc0d42-bf45-4896-885d-888eef59aef5",
  "certificateSerial": "73AF02C1",
  "issuedAt": "2026-11-07T10:30:00",
  "expiresAt": "2027-11-07T10:30:00",
  "status": "ACTIVE",
  "revokedAt": null,
  "revokeReason": null,
  "createdAt": "2026-11-07T10:30:00",
  "updatedAt": "2026-11-07T10:30:00",
  "clientCrtPem": "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----",
  "caCrtPem": "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----"
}
```

If the Infisical bundle is absent or cannot be parsed, current BE source can still return `200` with null public PEM values. The FE schema currently requires non-empty strings. This BE/FE edge case needs a contract decision: return an explicit error from BE or let FE represent missing PEM as unavailable. Do not treat a null PEM as a private key or attempt a download from detail data.

### 5.4 Download the private certificate bundle

```http
GET /api/v1/machines/{machineId}/certificates/{certificateId}/download?format=zip
```

**Request body:** none.
**Query:** `format=zip` or `format=json`; omitted means `zip`. FE should only send these lowercase values.
**Success for ZIP:** `200 OK`, `Content-Type: application/zip`, `Cache-Control: no-store`, attachment filename based on the certificate common name; entries are `ca.crt`, `client.crt`, and `client.key`.
**Success for JSON:** `200 OK`, `Content-Type: application/json`, body:

```json
{
  "serialNumber": "TEST-MACHINE-006",
  "commonName": "TEST-MACHINE-006",
  "organization": "Dolores",
  "spiffeId": "spiffe://dolores/machine/06dc0d42-bf45-4896-885d-888eef59aef5",
  "fingerprint": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "certificateSerial": "73AF02C1",
  "caCrtPem": "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----",
  "clientCrtPem": "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----",
  "clientKeyPem": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
}
```

The JSON download contains the **private client key**. Treat ZIP and JSON downloads as secrets. A wrong `format` currently falls through to ZIP in the controller; FE must validate the format before requesting.

**Other responses:** `401`; `403`; `404` certificate or Infisical bundle missing; upstream/service errors.

**FE handling:** use a transient `Blob` response, validate HTTP status/content, choose a safe filename, trigger download only after the user’s action, revoke the object URL, and never store the downloaded content in React Query, component/global state, localStorage/sessionStorage, logs, telemetry, or error reports. Do not render the JSON bundle or show its contents in a success message.

### 5.5 Delete a certificate

```http
DELETE /api/v1/machines/{machineId}/certificates/{certificateId}
```

**Request body:** none.
**Success:** `204 No Content`, empty body.
**Other responses:** `401`; `403`; `404` certificate does not belong to the machine or was already deleted; Infisical/service errors.

BE deletes the associated Infisical secret and certificate row and writes an audit event. This is a **hard delete**, not a reversible revocation. There is no separate revoke endpoint in this controller. Confirm the exact certificate before sending, do not auto-retry after an unknown result, and refresh the list/detail after success.

## 6. Recommended FE workflows

### Admin: inspect and provision machine identity

1. Load the machine detail and retain its canonical `machineId` and `serialNumber`.
2. Call identity GET. Show the active `deviceId` on `200`; show “not registered” on `404` only when the machine detail itself loaded successfully.
3. If the identity is absent, confirm the intended provisioning value with the backend workflow owner before POST. Certificate issue currently tries to create a mapping from `serialNumber` when there is no active mapping for that serial, so a separate identity POST is not always required.
4. On `201`, display the verified response and refresh identity GET. On timeout/unknown response, refresh GET before enabling another POST.
5. To replace an identity, Admin revokes the current mapping, confirms GET returns `404`, then registers a new unused ID. The previous ID cannot be reused.

### Admin or assigned Technician: manage certificates

1. Load the machine through the existing authorized machine detail flow.
2. Load certificate pages with `page`, `size`, and optional status; key the query by role/subject, machine, filter, and page.
3. Issue only by explicit user action. Do not retry the POST automatically. On uncertain result, refresh the list before allowing another issue.
4. Fetch detail only for a selected certificate; display public metadata/PEM only.
5. Download ZIP or JSON only after explicit user action, with the privacy handling in section 5.4.
6. Confirm deletion by certificate ID/serial. After `204`, clear selected detail and reload the list.

### Technician

Use the same certificate workflow only for a machine BE authorizes as assigned. The identity GET is read-only. Hide identity POST/DELETE. If a request returns `403`, preserve the error and do not keep retrying or switch to a different machine context.

## 7. Important backend sequencing issue to resolve

There is a source-level incompatibility when an Admin registers a custom `deviceId` that differs from the machine serial and then issues a certificate:

1. Identity POST allows a custom value and stores one active identity per machine.
2. Certificate issuance writes the private bundle to Infisical and saves certificate metadata, then calls `ensureActiveDeviceIdentity(machine)`.
3. That helper only checks whether the machine serial exists as a `deviceId`. If the active custom ID differs from the serial, it tries to insert a second active mapping for the same machine.
4. The database unique index `uq_machine_device_identity_active_machine` rejects that insert. The transaction can roll back database work after the Infisical side effect has already happened, potentially leaving an orphan secret.

Therefore FE must not mask this with a retry. Before enabling certificate issuance after identity registration, BE should either make certificate issuance reuse the existing active mapping or define/enforce that the provisioned `deviceId` must equal the machine serial and make the external secret write transactional/compensated. Until then, if GET returns an active `deviceId` different from `serialNumber`, show a blocking state and do not call issue. Do not silently replace the user’s ID or auto-revoke it.

The current Admin screen accepts any non-blank value up to 255 characters, so this limitation is reachable from the present UI.

## 8. FE adapter checklist

- Add an identity GET method to `src/apis/machines.api.ts` using the existing identity schema; verify returned `machineId`, `status === "ACTIVE"`, and path UUID.
- Treat identity GET `404` as absence only within a successfully loaded machine detail.
- Keep device identity mutations Admin-only; keep Technician identity read and certificate operations behind machine access, with BE as final authorization.
- Certificate list/detail/download/delete already have methods in `src/apis/machine-certificates.api.ts`; keep machine/certificate UUID and response identity checks.
- Keep mutations `retry: false`; lock duplicate clicks and reconcile uncertain POST/DELETE outcomes through GET/list before another mutation.
- Keep explicit backend selection for every certificate route. Never fallback between local and remote for credential download or mutation.
- Keep identity read/write calls on the same selected environment as certificates. The current proxy's identity GET auto-fallback must not be mistaken for the selected environment's persisted state.
- Align the certificate detail parser with BE’s possibility of nullable public PEM fields, or ask BE to return an error instead. Never broaden the detail DTO to include private key material.
- Do not claim delete means revoke. Remove the row from local view after `204` and then refetch.

## 9. Verification still outstanding

Source review confirms the routes and checks described above at `a6b3da5`. It does **not** prove the same commit is deployed or that Infisical is available. Before live verification, use an explicitly selected environment and a disposable authorized test machine; verify Admin and assigned Technician access, denied Technician access to another machine, identity readback, certificate list/detail/download/delete, and timeout reconciliation. Never issue or delete credentials on an operational machine as a smoke test.

The BE test run was not completed during this review because the installed JDK is 17 while the project requires JDK 25. The source-level sequence issue in section 7 should be resolved or explicitly accepted by the backend owner before connecting the end-to-end identity-plus-certificate workflow.
