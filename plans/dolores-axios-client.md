# Plan: Use a Dedicated Axios Client in Dolores API Modules

**Status:** Phase 1 complete; Phase 2 complete; Phase 3 unverified (production prerender blocked by EPERM)
**Target repository:** C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE
**Plan date:** 2026-10-22
**Scope:** Replace requestDolores and requestDoloresBlob calls in the 12 Dolores API modules with direct methods on a dedicated Dolores Axios client, preserving the existing DTO, Zod, proxy, authentication, and error contracts.

## Goal

Make the Dolores API modules call a dedicated Axios instance directly using the QLS-style method shape. Keep explicit Promise<DTO> return types and the API object layout established by the completed style plan. This changes the client methods used by API modules; it does not adopt QLS's BaseResponse<T> envelope.

## User decision and architecture

**Selected by the user:** Use a dedicated Dolores Axios client, distinct from the shared axiosClient used by IDaaS. API modules should call .get(), .post(), and other applicable Axios methods directly. Preserve the Dolores-specific proxy path, Zod validation, DTO responses, authentication refresh, and DoloresApiError handling.

**Prior confirmed decisions retained:** Keep async arrow API members and explicit Promise<DTO> annotations. Keep validation before network calls; validation failures from async methods reject the returned Promise. UI screens and behavior are outside this change.

| Option | Fit | Compatibility and risk | Cost and maintenance | Decision |
|---|---|---|---|---|
| Use the shared src/lib/axios/axiosClient directly | Direct Axios calls, but its default base URL is /api/v1 while Dolores uses /api/dolores/v1 | Requires a per-request base URL override and inherits generic shared-client error behavior and its data-only response interceptor. Could affect IDaaS assumptions or lose DoloresApiError behavior. | Lowest initial setup, higher risk of shared-client coupling and repeated overrides | Rejected; user selected an isolated Dolores client |
| Use a dedicated Dolores Axios client and call it directly from each API module | Direct method calls while preserving Dolores ownership and routing | Can retain the Dolores base URL, token checks, refresh flow, normalized errors, Blob handling, schemas, and DTO return values without changing IDaaS | Moderate migration and test updates; transport remains in one existing domain client module | **Selected** |
| Keep requestDolores helpers as API call entry points | Keeps behavior unchanged | Does not make API modules use direct Axios methods as requested | Lowest cost, but does not meet the new direction | Rejected |

## Workspace and integration facts inspected

- The repository is a Next.js and TypeScript frontend. package.json includes Axios, Zod, TypeScript, and the Node built-in test runner; no new dependency is needed.
- The 12 API modules live in src/apis/dolores/. src/apis/dolores/client.ts currently owns a Dolores-specific Axios instance, DoloresApiError, requestDolores, and requestDoloresBlob.
- The Dolores client uses base URL /api/dolores/v1, adds the access token, refreshes on 401 through the shared client, normalizes failures to DoloresApiError, validates JSON responses with Zod, and supports Blob downloads.
- next.config.js rewrites /api/dolores/v1/:path* to the configured Dolores origin's /api/v1/:path*. The existing shared src/lib/axios/axiosClient.ts instead defaults to /api/v1, has shared auth-refresh behavior, and returns response.data from its interceptor.
- src/apis/idaas/client.ts uses the shared client for IDaaS parsing. DoloresApiError is consumed by query retry policy and screen error handling, so the migration must retain the Dolores error class and status/kind mapping.
- Zod schemas remain in src/schemas/dolores/; API DTOs remain in src/types/dolores/. No new directory or UI component is needed.
- Repository guidance in GLOBAL_WORKING_CONTEXT.md and rules.md requires minimal changes, English technical documentation, and no UI/API calls from components. The user previously supplied authorization to use the available repository context.

## Proposed code boundaries

Current relevant tree:

    src/
      apis/
        dolores/
          client.ts
          12 *.api.ts modules
        idaas/
          client.ts
      lib/axios/axiosClient.ts
      schemas/dolores/
      types/dolores/
    tests/

Retain the same directories and files. The existing src/apis/dolores/client.ts remains the owner of Dolores transport configuration, authentication/error interceptors, the dedicated exported client, and a small schema-response parser. Each *.api.ts remains the owner of its endpoint methods and calls the dedicated client directly, then parses or checks the returned data. Tests remain under tests/; no new shared layer or directory is introduced.

Allowed dependency direction:

- src/apis/dolores/*.api.ts may import the dedicated client and DoloresApiError from ./client, plus existing schemas and DTO types.
- src/apis/dolores/client.ts may depend on Axios, cookies, auth constants/routes, and the existing shared client only for the current refresh operation. It must not import individual API modules, hooks, UI, or schemas owned by one endpoint.
- src/lib/axios/axiosClient.ts and src/apis/idaas/client.ts retain their current IDaaS ownership and response/error behavior.
- Hooks and UI continue to depend on API methods and DoloresApiError, not on Axios directly.

**UI/UX applicability:** No visible interface, workflow, or screen state is being changed. This task changes developer-facing API module calls and transport boundaries only.

## Scope

### In scope

- Refactor src/apis/dolores/client.ts to expose the existing dedicated Axios instance under a clear name such as doloresAxiosClient, with ordinary Axios response objects available for API-level parsing.
- Add or retain a small shared response-schema parser that converts invalid response shapes into the existing DoloresApiError invalid_response.
- Migrate all 32 public API methods across the 12 Dolores domain modules to direct awaited Axios method calls.
- Keep each method's explicit return annotation, method name, endpoint path, HTTP method, query params, body, AbortSignal, path validation/encoding, response validation, cross-field checks, DTO type, and transformation.
- Implement Blob downloads with a direct Axios request using responseType: blob, retaining Blob return types.
- Remove requestDolores and requestDoloresBlob after no API module depends on them.
- Update the API AST contract and focused regression tests to verify direct use of the dedicated client and unchanged request/response contracts.
- Update test mocks that currently inject requestDolores or requestDoloresBlob so they model Axios responses and the dedicated method calls.
- Add focused coverage for the dedicated client configuration, response parsing, error normalization, cancellation, and Blob behavior at the appropriate test boundary.

### Preserve

- Dolores path /api/dolores/v1, with the existing Next.js rewrite and DOLORES_API_URL configuration.
- Dolores access-token requirement, 401 refresh path, login redirect on refresh failure, and DoloresApiError kinds/statuses.
- All endpoint paths, HTTP verbs, params, query encoding, payloads, signals, and Blob response behavior.
- Zod validation, DTO response types, cross-field response checks, and transforms.
- IDaaS client behavior and API call sites, UI, hooks, query keys/retry policy, schemas, backend contracts, and environment configuration.
- User-accepted validation behavior: invalid input rejects the async method Promise before any HTTP call.

### Out of scope

- Replacing Dolores DTO returns with BaseResponse<T>, changing backend contract assumptions, or changing response payloads.
- Altering the shared IDaaS axiosClient, IDaaS APIs, proxy routes/rewrites, auth endpoints, login flow, hooks, UI, or application screens.
- Adding dependencies, code generation, schema changes, endpoint changes, unrelated renaming, or broad formatting.
- Live API calls, production data changes, commits, or pushes.

## Phases

### Phase 1 — Expose and verify the dedicated Dolores Axios client

**Outcome:** client.ts exposes direct Axios methods while the existing API modules can continue to use the current helper temporarily, keeping this increment behavior-compatible.

**Scope and implementation boundary:**

- Keep the existing Dolores Axios instance configuration and interceptors as the source of truth.
- Export it as doloresAxiosClient or another unambiguous Dolores-specific name.
- Add a reusable Zod response parser that returns parsed DTO data and raises the existing invalid_response error for a shape mismatch.
- Keep old request helpers delegating to the same dedicated instance during this phase so API modules continue to work until Phase 2.
- Do not change the shared IDaaS client or any endpoint module in this phase.

**Affected components:** src/apis/dolores/client.ts; focused client tests, preferably in a dedicated Dolores client test file.

**Side effects:** No endpoint call-site change and no external network activity. The client module adds direct Axios exports; old callers remain supported during this phase.

**Verification:**

- Focused tests assert the dedicated client uses the Dolores proxy base URL and configured headers/timeout.
- Tests exercise parsed valid responses, invalid response normalization, status/error normalization, refresh behavior, cancellation pass-through, and Blob response options using mocked Axios/network boundaries.
- Existing Dolores and IDaaS tests remain green.

**Acceptance criteria:**

- The dedicated client export can issue typed Axios requests and returns ordinary Axios response objects for API-level parsing.
- Existing helper calls still pass through the same authentication and error interceptors.
- DoloresApiError kinds/statuses used by query and UI consumers remain unchanged.
- No IDaaS file or environment/proxy configuration changes.

**Dependencies:** Architecture choice above is confirmed.

**Entry condition:** New plan selected by the user and current repository baseline inspected.

**Exit condition:** Client-level tests and existing focused regression tests pass; read-only review confirms there is a single Dolores transport configuration.

**Risk and mitigation:** Exporting an Axios instance can encourage API modules to bypass validation; the API AST and regression contracts in Phase 2 will require every JSON endpoint to parse with its existing schema.

**Approval/stopping gate:** Standard execution stops at the phase boundary for review. Stop earlier if the refactor requires changing shared IDaaS behavior or the existing Dolores auth/error contract.

**Review gate:** Review that refresh calls still use the existing shared auth path and that direct client responses preserve normal Axios data access.

### Phase 2 — Migrate Dolores API modules to direct Axios calls

**Outcome:** The 12 API modules call doloresAxiosClient methods directly; helper-only request entry points are removed.

**Scope and implementation boundary:**

- Convert each method to call the matching .get(), .post(), or applicable Axios method directly with the same relative endpoint and config.
- Parse every JSON response with its current Zod schema through the shared parser. Keep custom cross-field checks and transformations in the owning API method.
- Use direct Axios Blob requests for download endpoints.
- Remove requestDolores and requestDoloresBlob once all modules have migrated.
- Update the AST contract to require async-arrow methods with explicit return types and direct awaited doloresAxiosClient calls; reject helper-based or absolute URL requests.
- Update endpoint, validation, notification, telemetry, moderator Phase 3/4, Phase 6, and other relevant API tests to mock Axios method responses. Preserve assertions that invalid IDs cause no HTTP call.

**Affected components:** The 12 files under src/apis/dolores/, tests/dolores-api-signatures.test.cjs, tests/dolores-api-types.contract.ts, and the existing Dolores and moderator regression tests that mock request helpers.

**Side effects:** API source calls the dedicated Axios methods directly. Runtime request routing, auth, response DTOs, and error classification should remain stable. Test mocks change to match the new client boundary.

**Verification:**

- Focused API contract and regression tests prove URL, HTTP method, params, request data, signal, parsed output, Blob behavior, and invalid-input no-request behavior.
- AST checks find direct awaited calls on the dedicated client and no remaining requestDolores references in product API modules.
- TypeScript checks preserve all existing Promise<DTO> contracts.

**Acceptance criteria:**

- All 32 API methods call the dedicated Dolores Axios client directly.
- All JSON responses still pass through their existing schemas and custom checks/transforms.
- Blob endpoints return Blob data and preserve responseType behavior.
- All endpoint and request details match the completed API style plan.
- Existing consumers still receive DTOs and DoloresApiError values as before.
- No axiosClient import or behavior change is introduced into the IDaaS APIs.

**Dependencies:** Phase 1 complete.

**Entry condition:** Phase 1 client export and its verification are reviewed and accepted.

**Exit condition:** Focused AST, Dolores contract, and endpoint regression tests pass; source review finds no helper usage or request/response drift.

**Risk and mitigation:** Axios method signatures may silently change query/body/signal placement. Compare all 32 request configs with the pre-migration definitions and assert request config in tests. Keep schema parsing explicit to prevent typed but unvalidated responses.

**Approval/stopping gate:** Standard execution stops at the phase boundary for review. Stop if preserving DoloresApiError, auth refresh, or schema behavior requires a change to IDaaS or visible UI behavior.

**Review gate:** Review every migrated endpoint category, including methods with response checks, transformations, and Blob responses.

### Phase 3 — Full verification and handoff

**Outcome:** Confirm type, regression, lint, production compilation, and source-review evidence for the complete migration.

**Verification:**

- Run the focused Dolores client and API tests.
- Run npx --no-install tsc --noEmit --incremental false.
- Run node --test tests/*.test.cjs.
- Run npm run lint.
- Run npm run build, since this migration changes runtime request execution and client exports.
- Review the final source for request URL, method, params, payload, signals, response parsing, error mapping, and Blob behavior.
- Run git diff --check if the repository reports a usable worktree. Prior work recorded Git status/diff worktree errors; if that remains, report it and run a targeted whitespace/conflict-marker scan instead. Do not claim a clean Git diff without evidence.

**Acceptance criteria:** All checks pass or limitations are recorded; source review finds no endpoint, payload, DTO, Zod, auth, proxy, or error-contract drift; no API module uses the removed helpers; the shared IDaaS client remains unchanged.

**Dependencies:** Phase 2 complete.

**Side effects:** Test/build commands may create normal local cache/build artifacts. No live APIs, databases, or user data are accessed.

**Entry condition:** Phase 2 review gate passed.

**Exit condition:** Verification evidence is documented in the execution record and the plan status is updated to verified.

**Risk and mitigation:** Existing lint warnings or environmental build issues may be unrelated; isolate and report them without weakening the acceptance criteria.

**Approval/stopping gate:** Stop for review if a test, typecheck, lint, build, or source review reveals behavior drift that cannot be safely corrected within this plan.

**Review gate:** Final read-only review maps every acceptance criterion to test or source evidence.

## Assumptions and decision record

- The user requests direct Axios method calls for developer readability, while retaining the previous QLS-style object/API method format.
- The user's architecture choice is the dedicated Dolores client; its source remains in the existing src/apis/dolores/client.ts boundary.
- The method name doloresAxiosClient is preferred in the plan to distinguish it from the shared IDaaS axiosClient; the exact export name can be finalized during Phase 1 as long as API ownership remains explicit.
- Dolores backend responses are not assumed to use BaseResponse<T>; the existing Zod DTO contract remains authoritative.
- UI/UX is not applicable because no user-visible interaction changes.
- No production API session is required; all verification can use local tests and a production build.

## Execution record



### Baseline

- Repository Git status could not be read: Git returned `fatal: cannot change to ... Permission denied`. No Git clean/diff claim is made.
- Runtime prerequisites were available: Node v24.15.0, npm 11.12.1, and installed TypeScript dependency.
- Before changes, Dolores contract and IDaaS routing tests passed (6/6).

### Phase 1 — Complete (2026-10-22)

- Exported the existing Dolores Axios instance as `doloresAxiosClient`; moved request interceptor, response interceptor, and retry references to the export.
- Added `parseDoloresResponse` and kept `requestDolores` / `requestDoloresBlob` delegating to that same dedicated client so existing API modules remain compatible until Phase 2.
- Added `tests/dolores-axios-client.test.cjs` to cover direct Axios response access, Dolores base URL/config, schema parsing and invalid-response errors, relative-path guard, access-token handling, 401 refresh through the existing shared auth client, 403 normalization, cancellation pass-through, and Blob request configuration.
- Verification passed: Dolores, IDaaS, and Moderator Phase 3/4 regression set (47/47); `npx --no-install tsc --noEmit --incremental false`; targeted whitespace/conflict-marker scan on the client, test, and plan files.
- Standard read-only review found no behavior drift in the Dolores client, helper compatibility, auth/error mapping, IDaaS client, or environment/proxy configuration.
- Git diff/status remained unavailable due the repository permission error. The implementation changes in this phase were limited to `src/apis/dolores/client.ts`, the new `tests/dolores-axios-client.test.cjs`, and this execution record.
- Phase status: `complete`. The Standard gate was reviewed and the user approved Phase 2 in this conversation.

### Phase 2 — Complete (2026-10-22)

- Migrated all 32 public methods in the 12 Dolores API modules to direct awaited `doloresAxiosClient.get()` or `.post()` calls. Each JSON response still passes through its existing Zod schema with `parseDoloresResponse`; cross-field contract checks and location unwrapping remain in their API methods.
- Converted the two download methods to direct Axios GET requests with `responseType: 'blob'` and `Accept: '*/*'`, returning `response.data` as `Blob`.
- Removed `requestDolores` and `requestDoloresBlob`. Moved the relative-path guard into the dedicated client's request interceptor so absolute and protocol-relative URLs remain rejected before transport; auth token handling, refresh, Dolores error mapping, base URL, and proxy configuration remain in the same client.
- Updated the AST API contract to require one awaited direct Dolores client call per API method, reject absolute paths and legacy helper references, keep explicit async-arrow/Promise types, and require Zod parsing or Blob response configuration. Added `tests/dolores-api-requests.test.cjs` to assert the HTTP method, relative URL, request config/body, query params, signals, response data, and Blob options for all 32 methods. Updated existing API and Moderator regression mocks to use Axios `{ data }` responses.
- Verification passed: focused Dolores, IDaaS, and Moderator regression suite (48/48); `npx --no-install tsc --noEmit --incremental false`; source scan found no legacy helper references in Dolores API modules and no trailing whitespace or conflict markers.
- The initial post-migration test pass exposed two stale test expectations: one read the old helper mock shape, and one expected `objectKey` to survive despite the existing Zod schema stripping it. The mocks/assertions were corrected to the current Axios and DTO contracts; the final test pass was 48/48.
- `git diff --check` was unavailable because Git reported `fatal: this operation must be run in a work tree`. No clean Git diff/status claim is made. A targeted source whitespace/conflict-marker scan passed.
- Standard read-only source review found no behavior drift in routes, query/body/signal placement, response parsing, custom checks, Blob handling, auth/error behavior, or the shared IDaaS client. UI/UX review is not applicable because this phase changes API transport implementation only.
- Phase status: `complete`. Stop at the Standard gate before Phase 3.

### Phase 3 — Unverified (2026-10-22)

- Focused Dolores, IDaaS, and Moderator regression suite passed (48/48). Full repository suite passed: `node --test tests/*.test.cjs` (66/66). Standalone `npx --no-install tsc --noEmit --incremental false` passed.
- `npm run lint` exited 0 with 5 warnings in files outside the API refactor: four React ref-cleanup warnings in `src/components/features/digital-twin/material-effects/` and one `@next/next/no-img-element` warning in `src/components/mfa/MfaSetupForm.tsx`. No lint errors were reported.
- `npm run build` did not complete. The first attempt could not fetch the configured Inter and Playfair Display fonts; after temporary network permission was granted, Next.js compiled successfully and finished TypeScript, but prerendering repeatedly stopped with `EPERM` while creating generated route-segment directories under `.next/server/app` (first `/inventory`, then `/moderator`, then `/model/viewer`). Additional scoped write permissions for `.next` and route-output parents did not resolve the nested output error. No application source or configuration change was made to work around it.
- Final read-only review found no endpoint, request config, DTO, Zod, Blob, auth/error, proxy, or IDaaS behavior drift. The IDaaS request adapter and shared client retain their prior roles; the Dolores client uses the shared client only for the existing token-refresh path. Source scan found no legacy request helper references in Dolores API modules and no trailing whitespace or conflict markers.
- `git status` and `git diff --check` remain unavailable because Git reports `fatal: this operation must be run in a work tree`. No clean Git diff/status claim is made. Partial `.next` output from the failed production builds remains; it was not cleaned because the repository did not report a usable worktree and the cache could predate this run.
- Verification status: `unverified`. All available test, type, and lint checks passed, but the required production build could not finish its prerender stage because of the output-directory `EPERM`; the plan is not marked verified or complete.
