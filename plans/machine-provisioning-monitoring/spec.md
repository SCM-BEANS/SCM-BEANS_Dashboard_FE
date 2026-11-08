# Specification - Machine provisioning and monitoring

Date: 2026-11-07 (Asia/Saigon)
Status: MP-01..MP-07 FE implemented and fixture-verified; Phase04 validation executed with explicit live blockers. MP-08 gateway readiness not confirmed.

## Sources and scope

User-approved design: extend existing machine screens, retain current colors/layout/components, use role-specific data/actions and shared presentation. Reference: user-provided device/mTLS/telemetry attachment and public live OpenAPI at http://100.75.202.72:8082/v3/api-docs reviewed on 2026-11-07. OpenAPI declarations are not evidence of authenticated runtime authorization.

Existing: Next Pages Router; machinesApi, telemetryApi, Owner Analytics, machine heartbeat/history panels, RecipeSyncPanel, PageActions and JWT HTTP client. Add missing HTTP capabilities within this structure. No new navigation module, duplicated screen, hardware ingestion UI or simulated business data.

## User stories

- MP-01 [P1]: Owner/Admin, and Technician when authorized, can read server-calculated cleaning compliance alongside existing history. Acceptance: display all seven response fields; days is separate from history date range; 0, loading, empty and errors remain distinct.
- MP-02 [P1]: Moderator can read heartbeat on the selected authorized Smart IoT machine. Acceptance: connection/reviews tabs and old review deep links work; foreground polling is five seconds; no points/compliance requests are added for Moderator without permission evidence.
- MP-03 [P1]: Admin can register/remove a machine device identity. Acceptance: validated deviceId and canonical machine UUID; one explicit mutation per submission; no invented mapping after refresh.
- MP-04 [P1]: Admin/authorized Technician can issue, list, inspect, download and delete machine certificates. Acceptance: paginated Spring Page, public PEM detail, explicit bundle download, deletion confirmation, fail-closed environment selection, no private-key persistence/logging/preview.
- MP-05 [P1]: Owner selects an eligible personal menu for a machine or returns to the default. Acceptance: correct PUT/DELETE, authorized list, verified current-menu readback and existing sync version/hash checks; no guessed current menu or APPLIED state.
- MP-06 [P2]: Admin/Technician can assign an Owner menu only when a verified authorized menu source and machine readback exist. Acceptance: no calls to Owner-only list under an operator identity, no manual UUID workaround; blocked capability remains explicitly documented.
- MP-07 [P2]: Users can trust role/machine scope, errors and refresh behavior. Acceptance: old deep links, keyboard/mobile, account changes, expired grants and 401/403/409/503 covered by targeted tests.
- MP-08 [P3]: Live Watch/Exchange has an implementation-ready transport contract. Acceptance: browser transport, gateway URL, auth/scope, proto version, reconnect/cancellation and command safety contracts confirmed. This plan does not implement unsupported hardware controls.

## API contracts

All HTTP paths below are under /api/v1.

| Capability | Methods and paths | Scope |
|---|---|---|
| Identity | POST/DELETE /machines/{machineId}/telemetry-device-identity | ADMIN |
| Certificates | POST/GET /machines/{machineId}/certificates; GET/DELETE /machines/{machineId}/certificates/{certificateId}; GET .../{certificateId}/download?format=zip or json | ADMIN/TECHNICIAN, machine scope enforced by BE |
| Compliance | GET /machines/{machineId}/cleaning-compliance?days=30 | OWNER/ADMIN/TECHNICIAN per supplied contract; verify runtime |
| Active menu | PUT /machines/{machineId}/active-menu/{menuId}; DELETE /machines/{machineId}/active-menu | OWNER/ADMIN/TECHNICIAN, eligible OwnerRecipeMenu |
| Heartbeat | GET /telemetry-query/machines/{machineId}/heartbeats/latest | Live description includes ADMIN/MODERATOR/OWNER and scoped TECHNICIAN |
| History | GET /telemetry-query/machines/{machineId}/points | ADMIN/OWNER/scoped TECHNICIAN; preserve existing adapter |

Compliance fields: machine_id, evaluated_days, compliant_days, missing_startup_days, missing_closing_days, compliance_percentage, flagged_dates. Do not infer per-date missing subtype from flagged_dates alone.

Use server DTOs and validated nullable fields. Live cleaning enum is STARTUP/CLOSING with COMPLETED/FAILED/ABORTED, unlike ingestion examples in prose. Live certificate enum/filter is ACTIVE/REVOKED/EXPIRED; prose mentions DELETED audit state but FE must not add it to the response enum without verified contract change. Certificate list uses number/content/totalElements, not Owner Analytics page/content shape. Validate DELETE response against observed implementation: active-menu prose says 204 but live OpenAPI advertises 200; accept confirmed empty success without parsing a required JSON body.

## Design and ownership

Admin machine detail: add Setup connection tab beside profile/type. Identity form belongs only to Admin page. Certificate presentation is shared with Technician machine detail; role pages own scoped queries and actions. Keep fingerprint/SPIFFE/public PEM behind details. Use shared DataTable, ButtonBar, PageActions and existing machine styles.

Compliance belongs to Owner cleaning view and Admin machine operations; Technician view follows verified scope. Reuse existing history; server computes SLA. Load compliance when its view opens, days changes or user refreshes; do not poll cleaning with heartbeat.

Active menu extends RecipeSyncPanel and existing machine/recipe adapters. Backend owns effective recipe compilation. Distinguish menu assignment accepted, sync delivered and machine applied.

## Contract gates

Current checkpoint (2026-11-08): G1 deployed Admin identity readback and G2 deployed menu/candidates GET now pass FE schemas; G4 explicit remote selection is verified in proxy tests and running dev configuration. The original assessments below are historical. G3 remains readiness-only/BLOCKED: source native gRPC Watch/Exchange is not a browser gateway contract. See phase-04-validation-and-live-gateway-readiness.md for the actual four-role history401 matrix, the S02 cached-detail fix and pending live acceptance.

- G1: no identity GET or machine deviceId readback confirmed. Locate backend/runtime read source before showing a persisted mapping; if absent, record backend dependency and keep mapping-based lifecycle UI gated.
- G2: no activeMenuId readback in published machine schema. Owner-only local menu list cannot provide an operator Owner menu selector. Owner flow needs readback; operator flow additionally needs authorized list. Do not treat mutation response/localStorage as authoritative readback.
- G3: port 50051 and RPC names alone do not define browser integration. Watch/Exchange stays readiness-only until the full gateway contract exists.
- G4: current proxy retries remote GET on local backend after network failure. Certificate metadata/detail/download must stay in the explicitly selected environment, including initial backend selection, not only a late fetch retry. Use a narrow policy and shared backend-selection code; preserve unrelated API selection behavior.

## Success criteria

Each enabled capability has request/schema/UI tests; no unrelated Node failures introduced; lint/TypeScript/build baseline versus delta recorded. All role-sensitive behavior has mocked request assertions plus separately recorded live verification or UNVERIFIED evidence. No production readiness claim from fixture tests. No certificate bundle in cache, storage, diagnostics or rendered text. All new source/test paths require separate approval under MIGRATION_WORKFLOW.md.
