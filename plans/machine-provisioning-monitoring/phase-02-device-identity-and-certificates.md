# Phase 02 - Device identity and machine certificates

Status: FE verified and review APPROVED; deployed Admin GET/schema verified; live credential mutations and full grant matrix deferred

## Current implementation - a6b3da5 specification, 2026-11-07

This section supersedes the historical 4adc8a1 findings below. Backend commit a6b3da502bc7173d71f73f0fd2ad0a22b3285027 was inspected read-only with git show; deployment of that commit is not verified.

- G1 contract is now available: identity GET returns the active mapping. FE adapter validates UUID, matching machineId and ACTIVE status and forwards abort signals. Admin/Technician read it only after successful machine detail loading; 404 is represented as no active mapping within that context.
- Admin registers/revokes with readback reconciliation; revocation targets the displayed machine/mapping in a confirmation. Unknown mutation results cannot blindly repeat before GET. Technician identity UI is read-only.
- Identity and certificate routes now both require explicit backend selection and never fall back to another environment. Existing general API auto-selection is preserved. No environment files changed.
- Certificate issuance is blocked while identity is unavailable or its active deviceId differs from the machine serial, addressing the documented backend insertion sequence issue without auto-revoking/replacing a custom mapping. Issuance also refreshes identity because BE may create the serial mapping.
- Nullable public client/CA PEM is represented as unavailable; private keys remain rejected from detail schemas. ZIP/JSON downloads validate MIME and content and remain transient.
- Source a6b3da5 adds certificate per-machine Technician authorization and certificate-specific Infisical keys. These supersede the previous source blockers, but real-server denied scope and storage isolation remain unverified.
- Verification: targeted Node49/49; machine operational/provisioning Playwright40/40 (including9 provisioning cases); TypeScript, focused ESLint and production build passed. No live mutation, commit or push.
- Independent code review: APPROVED for the FE diff, no HIGH/CRITICAL findings; reviewer reran contract/proxy20/20 and focused ESLint. Human phase approval remains pending.

## Deferred verification - user decision 2026-11-07

User requested recording the remaining checks separately and moving to Phase03. This accepts continuation, not a claim that live checks or G1 have passed.

- [x] G1 source confirmed at a6b3da5; identity GET and Admin readback/revoke UI implemented and tested with fixtures.
- [x] Selected remote in ignored .env.local and started Next.js on port3000 with BACKEND_API_MODE=remote on 2026-11-08. Admin identity/certificate-list GET200 and response schema verified against the remote server.
- [ ] Use an authorized disposable machine: Admin list/detail/issue/download ZIP/JSON/delete; confirm private bundle storage availability.
- [ ] Live Technician allowed machine versus denied machine and revoked/expired grant. Source a6b3da5 now checks machine scope; verify that deployed server actually includes it.
- [ ] Confirm real-server unknown issuance reconciliation without automatically repeating POST.

Keep these in this Phase02 file for a separate live verification session; do not mutate real machine credentials as part of Phase03.

## Historical backend source correction - origin/main 4adc8a1 (superseded above)

Reviewed clean worktree E:/Đồ án/.work/dolores-platform-main-4adc8a1 without changing backend or FE source.

- G1 remains pending: MachineDeviceIdentityController exposes POST/DELETE, and MachineResponse has no persisted device identity mapping.
- MachineCertificateController.hasAccess checks ADMIN/TECHNICIAN role only. It does not verify Technician assignment/grant on the requested machine; the source therefore cannot meet the denied-machine acceptance criterion yet. Existing fixture E2E proves FE avoids certificate calls after a denied machine read, not that direct backend calls enforce scope.
- MachineCertificateService derives Infisical key from normalized serial (MACHINE_CERT_...). Reissue can reuse that key; deletion removes the stored secret by key. Different certificate rows may therefore refer to a shared bundle. Backend must ensure certificate-specific bundle identity/lifecycle before production rollout; serial normalization collisions also require consideration.
- Live issuance/download/deletion must use a dedicated disposable machine with no operational credentials. Do not issue a second certificate or delete a credential on a real machine merely to test this workflow.
- Previously recorded Node/E2E/build results remain historical evidence; no tests rerun or authenticated certificate mutation performed for this source correction.
Stories: MP-03, MP-04, MP-07

## Source recheck - 2026-11-08

User requested completing Phase02 together with Phase03. Reviewed backend origin/main 05f3adb read-only. Existing FE identity/certificate implementation remains in place; no new provisioning endpoint is needed from the two latest attachments. The service still creates serial-based identity during certificate issuance, so the custom-deviceId-versus-serial issuance guard remains necessary. Deferred live issuance/download/deletion, storage availability and direct backend Technician scope checks above remain a separate verification session using a disposable machine. The new operational-history endpoints in the attachment are outside this identity/certificate phase.

## Deployed API checkpoint - 2026-11-08, after Swagger update

- Rechecked current remote OpenAPI; active identity GET and certificate DTOs match the FE schemas. Backend origin/main advanced to ebafe2b; inspected read-only, without changing the backend working tree. The exact running server commit is not asserted.
- Authenticated Admin GET for machine16cafe6e-9448-4578-a4c9-f00954bc9ed1: identity200 and certificate list200; both responses passed the real FE Zod schemas. No private bundle was requested.
- Technician on the same target received403 for identity and certificate list. This verifies one denial only; allowed/revoked/expired grant checks remain unchecked.
- Additional authentication was rate-limited429 by IDaaS; login probing stopped. No credential mutations or changes to existing identities/certificates were performed.
- Existing FE implementation retained; environment was the required operational change: ignored .env.local now selects remote, and the running development process explicitly selects remote. No remote-to-local fallback for identity/certificate operations.

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
