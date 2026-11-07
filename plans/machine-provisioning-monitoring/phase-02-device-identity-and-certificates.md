# Phase 02 - Device identity and machine certificates

Status: active - enabled certificate capabilities verified; G1 identity readback pending

## Deferred verification - user decision 2026-11-07

User requested recording the remaining checks separately and moving to Phase03. This accepts continuation, not a claim that live checks or G1 have passed.

- [ ] Confirm a backend source for persisted device identity mapping; connect current mapping/revoke UI only after that contract exists (G1).
- [ ] Select explicit local/remote environment and restart Next.js for certificate testing.
- [ ] Use an authorized disposable machine: Admin list/detail/issue/download ZIP/JSON/delete; confirm private bundle storage availability.
- [ ] BLOCKED by backend scope: Technician allowed machine versus denied machine and revoked/expired grant. Fix per-machine authorization first; a FE machine lookup is not a backend authorization boundary.
- [ ] Confirm real-server unknown issuance reconciliation without automatically repeating POST.

Keep these in this Phase02 file for a separate live verification session; do not mutate real machine credentials as part of Phase03.

## Backend source correction - origin/main 4adc8a1

Reviewed clean worktree E:/Đồ án/.work/dolores-platform-main-4adc8a1 without changing backend or FE source.

- G1 remains pending: MachineDeviceIdentityController exposes POST/DELETE, and MachineResponse has no persisted device identity mapping.
- MachineCertificateController.hasAccess checks ADMIN/TECHNICIAN role only. It does not verify Technician assignment/grant on the requested machine; the source therefore cannot meet the denied-machine acceptance criterion yet. Existing fixture E2E proves FE avoids certificate calls after a denied machine read, not that direct backend calls enforce scope.
- MachineCertificateService derives Infisical key from normalized serial (MACHINE_CERT_...). Reissue can reuse that key; deletion removes the stored secret by key. Different certificate rows may therefore refer to a shared bundle. Backend must ensure certificate-specific bundle identity/lifecycle before production rollout; serial normalization collisions also require consideration.
- Live issuance/download/deletion must use a dedicated disposable machine with no operational credentials. Do not issue a second certificate or delete a credential on a real machine merely to test this workflow.
- Previously recorded Node/E2E/build results remain historical evidence; no tests rerun or authenticated certificate mutation performed for this source correction.
Stories: MP-03, MP-04, MP-07

## Objective

Add machine connection setup to Admin and scoped certificate lifecycle to Technician, keeping private bundles out of app state and the selected backend environment stable.

## Tasks and files

1. Identity request/response and POST/DELETE belong in existing src/apis/machines.api.ts and src/schema/machines.schema.ts. Use returned verified fields; enforce live deviceId length/format, preserve canonical UUID and 409 errors. Resolve G1 before showing current mapping or exposing readback-dependent revoke UI; no localStorage stand-in.
2. Proposed new src/apis/machine-certificates.api.ts and src/schema/machine-certificates.schema.ts: issue with no invented key/body; list status/page/size with Spring Page number/content; get detail public PEM; download ZIP/JSON as explicit transient binary response; delete certificate. Validate machine/certificate identity, pagination and supported states.
3. Proposed shared src/components/machines/machine-certificates-panel.tsx is presentation/state/callback based. Integrate queries in src/pages/admin/machines/machine-detail-screen.tsx and src/pages/technician/machine-check/machine-detail-screen.tsx. Use existing PageActions/DataTable/ButtonBar/styles; add Admin setup tab and Technician certificate section. Hide provisioning actions for other roles.
4. Reuse binary download patterns in src/apis/installation-work-orders.api.ts / recall-work-orders.api.ts. Ensure status/content type are correct; parse errors safely rather than saving JSON error as ZIP. Safe filename and revoke object URL. No private key in React Query, persistent storage, logs, inline preview or success message.
5. Inspect src/pages/api/dolores/v1/[...path].page.ts and src/lib/server/backend-api-selection.ts. G4: certificate routes must use an explicitly selected backend; cover initial auto-selection and remote request fallback. Narrowly prevent cross-environment certificate GETs, retaining no-store/content-disposition and ordinary API behavior. If explicit source cannot be established with existing config, gate sensitive downloads until it can.
6. Mutation retry=false. Pending disables double submit. On timeout/unknown issuance result refresh certificate list before offering another issue; do not assert issuance failed and repeat automatically. Preserve the shared one-time 401 auth refresh semantics; no additional replay policy.
7. Deletion uses existing confirmation showing the targeted certificate; update list/detail and state exact deleted result. Do not promise merely reversible revocation. Scope cache keys to subject+machine+certificate+filters/page and cancel stale reads.

## Dependencies

Phase 01 supplies no mandatory adapter dependency; follow it for review ordering. G1 gates full identity lifecycle; G4 gates certificate download. Infisical availability and authenticated scope need runtime evidence. Proposed source/test files require separate approval.

## Tests and acceptance

Use proposed tests/machine-provisioning.test.cjs and tests/e2e/machine-provisioning.spec.ts after approval, or extend existing harnesses when sufficient. Test Spring Page/empty page, invalid UUID, mismatched response, revoked grant, zero forbidden-role calls, issue double-click/timeout reconciliation, safe ZIP/JSON/error handling, no secret rendering/cache/persistence, download stays in explicit environment on remote outage and initial auto-local selection. Include PUBLIC metadata versus PRIVATE bundle separation. Scenario anchors S01/S02/S03/S04/S05/S09/S10/S11/S13/S16.

Check query/UI tests, lint, TypeScript and targeted proxy tests; record current baseline. Never issue/delete a production credential as a default smoke test. Runtime mutations use a specifically authorized disposable machine.

## Implementation checkpoint - 2026-11-07

- User approved all five proposed Phase02 source/test paths. No extra files introduced.
- Admin machine detail now has connection setup: identity registration and shared certificate panel. Technician machine detail exposes certificate lifecycle only after successful authenticated machine lookup. Other roles have no provisioning UI.
- Certificate schema/API cover public metadata/detail, Spring Page filtering, issue201, delete204, transient ZIP/JSON download. Private bundle stays outside query/mutation cache, storage, rendered UI and logs; blob URLs revoked.
- Certificate proxy requires explicit BACKEND_API_MODE=local or remote, disables automatic initial selection and remote-to-local fallback for this route only, preserves no-store. Existing auto mode is unchanged for other APIs; no environment files edited.
- Unknown issuance result triggers list reconciliation and locks issue until explicit successful refresh. Duplicate submission guarded synchronously; detail errors allow same-item retry; delete asks targeted confirmation.
- Verification: 46/46 targeted Node tests; 35/35 machine operational/provisioning Playwright E2E; TypeScript, focused ESLint and production build passed. Build directory .next-cleaning-review; no generated files staged.
- G1 remains pending: published identity route has POST/DELETE but no verified GET or Machine DTO readback. Registration adapter/UI implemented; persisted current mapping and readback-dependent revoke UI intentionally unavailable. No fake local mapping.
- Authenticated real-server certificate issuance/deletion/Infisical availability and Technician grant scope not tested. Fixture E2E does not establish server authorization.
