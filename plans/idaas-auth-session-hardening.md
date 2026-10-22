# Plan: FE-Only IDaaS Cookie Boundary and Logout

**Status:** Phase 1 complete; Phase 2 complete; Phase 3 complete
**Revision date:** 2026-10-22
**Execution:** Standard, TDD on, stop and report at each phase gate
**Canonical file:** C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE\plans\idaas-auth-session-hardening.md
**Writable target:** C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE
**Read-only contract reference:** C:\GitHub\BEANS\mein-idaas

This revision replaces the earlier cross-repository phases after the user restricted edits to the FE repository. It preserves the selected current-browser logout behavior that FE can provide. It does not claim to revoke a session stored by IDaaS.

## Execution progress

- Phase 1 complete: login JSON redaction and local cookie expiry passed focused tests, the full 72-test suite, TypeScript, lint, and an isolated Next HTTP check.
- Phase 2 complete: auth service, Axios clients, Header, and LoginForm passed the full 77-test suite and TypeScript. Lint had zero errors and five pre-existing warnings. An isolated browser fixture exercised keyboard, pending, success, and failure navigation; the actual login page displayed the warning with role=alert. Read-only review found no cookie ownership or redirect regression.
- Phase 3 complete: all 77 Node tests, a standalone TypeScript check, and lint passed (zero errors, five existing warnings). An isolated Next/browser run with exact copies of the FE auth routes, clients, service, Header, and LoginForm confirmed login JSON redaction with Set-Cookie, scoped HttpOnly cookie delivery on refresh, no refresh cookie on Dolores requests, successful logout cookie expiry and local-state cleanup, and honest failure warning when logout is unavailable. Earlier local build attempts failed with Windows `EPERM` during static-page prerender. On 2026-10-22, the user reported a successful production build; a fresh `.next/BUILD_ID`, `prerender-manifest.json`, and prerendered `/moderator` and `/model/viewer` HTML were verified at 16:06 local time. No Phase 3 FE source change was needed. Integrated read-only review found no additional FE auth issue in the planned scope.

## Goal and accepted limit

Prevent the refresh token from reaching browser JavaScript through the login JSON, remove JavaScript attempts to manage the HttpOnly refresh cookie, and make logout clear that cookie on the current browser through a same-origin Next.js route. Keep the existing IDaaS and Dolores Axios clients separate.

The user explicitly accepts that the IDaaS session and its refresh-token record remain on the server until their normal expiry. A copied refresh token could still be used outside this browser until expiry. No FE-only code can revoke that server record because IDaaS has no logout endpoint today.

## Confirmed user decisions

- Modify FE only. Do not edit C:\GitHub\BEANS\mein-idaas or C:\GitHub\BEANS\dolores_platform.
- Use a local Next route to expire the current browser's HttpOnly refresh cookie; keep IDaaS server session until expiry.
- Remove the refresh_token field from the browser-visible login response in the existing FE proxy while preserving Set-Cookie.
- Keep src/lib/axios/axiosClient.ts for IDaaS and src/apis/dolores/client.ts for Dolores.
- If local logout cannot be confirmed, clear FE access/auth state, navigate to /login, and show a non-blocking warning in the existing LoginForm error area.
- Prior execution selection remains Standard with TDD on.

## Inspected facts

- The FE is Next.js 16, TypeScript, Axios, js-cookie, and Node's built-in test runner. Tests live under tests/ as .test.cjs files; the package has build and lint scripts but no dedicated test script.
- The existing catch-all server route src/app/api/v1/[...path]/route.ts proxies /api/v1/* to IDaaS, forwards the upstream response headers including Set-Cookie, and disables fetch caching.
- IDaaS login sets a host-only refresh_token cookie with HttpOnly, Secure, SameSite=Strict, and COOKIE_PATH default /api/v1/auth. It also currently includes refresh_token in login JSON. IDaaS refresh returns access_token and a rotated Set-Cookie. No IDaaS logout route exists.
- The shared FE Axios client sends requests to /api/v1 and returns response.data. The Dolores client sends requests to /api/dolores/v1 with a Bearer access token. Both clients currently contain ineffective JavaScript refresh-cookie cleanup; the shared client also writes a possible root-path duplicate cookie during refresh.
- authService.logout currently removes cookies from JavaScript. Header owns email/local auth state and redirects to /login. LoginForm already handles a query-driven error and renders an inline message.
- FE .env.example configures IDaaS targets but not the cookie path. The deployed IDaaS COOKIE_PATH may differ from its default and is not observable from browser JavaScript.
- The repository's GLOBAL_WORKING_CONTEXT.md requires minimal edits, English technical docs, and a user choice among material alternatives. The decisions above were provided in this conversation. UI direction is the existing inline, non-blocking warning.

## Implementation choices and trade-offs

| Choice | Fit and cost | Security or compatibility | Decision |
|---|---|---|---|
| JavaScript cookie removal only | Small change | Cannot remove the scoped HttpOnly refresh cookie | Rejected |
| FE static POST route that expires the refresh cookie | Small, owned by Next route layer | Clears the browser credential but leaves IDaaS session alive | Selected by user |
| Call a new IDaaS logout API | Would allow server revocation | API does not exist and BE edits are forbidden | Deferred |
| Leave login JSON unchanged and ignore its refresh_token field in components | Small code change | Secret remains visible to browser JavaScript and network tooling | Rejected by user |
| Redact the login JSON in the existing FE proxy | Preserves current API path and Set-Cookie | FE proxy must parse success responses and fail closed on malformed success JSON | Selected by user |
| Hardcode /api/v1/auth as the cookie expiry path | Smallest route | Breaks if IDaaS COOKIE_PATH is customized | Rejected |
| Add optional FE IDAAS_REFRESH_COOKIE_PATH with default /api/v1/auth | One FE config field | Must match deployed IDaaS COOKIE_PATH | Selected as the only robust FE-only path configuration |

## FE contract

### Login proxy

- Requests continue to use POST /api/v1/auth/login and the existing IDaaS target selection. No browser URL or Axios baseURL changes.
- For a successful upstream login JSON response, remove only the top-level refresh_token property before responding to the browser. Preserve other response fields and Set-Cookie. Set Cache-Control: no-store and remove stale Content-Length/encoding headers as the current proxy already does.
- If a successful login response cannot be parsed as a JSON object, return a generic 502 without reflecting the raw body or setting its refresh cookie. Other proxy routes and non-success login responses keep their current status/body behavior; JSON login error responses must also have any top-level refresh_token removed.
- The browser-facing LoginResponse type includes access_token and expires_in, not refresh_token. IDaaS itself remains unchanged.

### Current-browser logout route

- Add a static POST /api/v1/auth/logout Next route under src/app/api/v1/auth/logout/route.ts. It does not call IDaaS.
- Return an empty 204 with Cache-Control: no-store. Emit expiry Set-Cookie headers for refresh_token at the configured scoped path and at / to clear the duplicate root-path cookie created by older FE code. Emit one header when the configured path is /.
- The expiry cookies are host-only, HttpOnly, Secure, SameSite=Strict, Max-Age=0, and expired in the past. IDAAS_REFRESH_COOKIE_PATH defaults to /api/v1/auth and must start with / and contain no cookie delimiter or control characters; invalid configuration returns a generic 500 rather than clearing an arbitrary path.
- POST is the only exported method. Reject a cross-origin Origin header with 403; a missing Origin is accepted for direct same-host clients. The route does not expose or log cookie values.
- This route clears only the current browser's cookie. It does not revoke an IDaaS session, invalidate previously copied refresh tokens, or alter another browser/device.

### FE auth and Axios flow

- Add AUTH.LOGOUT for the local route. authService.logout awaits the request, returns whether cookie expiry was confirmed, and always removes the JS-readable access_token in finally.
- Header always clears local email/auth state, dispatches the existing auth-change event, closes the menu, and routes to login after the bounded request resolves or times out. Disable a repeated logout click while pending.
- A failed local logout routes to /login?error=logout_failed. LoginForm uses its existing error area with an accessible alert and says local page state was cleared but refresh-cookie removal could not be confirmed. The warning never blocks login.
- Adapt LoginForm's other two logout call sites for the async service without unhandled rejections.
- Remove JavaScript read/write/removal of refresh_token from both Axios clients and auth.service. Refresh success updates only access_token; existing 401 redirect behavior remains. Exclude AUTH.LOGOUT from automatic refresh retries.
- Keep IDaaS and Dolores base URLs, request paths, response conventions, DTO/Zod validation, and DoloresApiError behavior unchanged.

## Ownership and structure

Current relevant tree:

    src/app/api/v1/[...path]/route.ts       IDaaS proxy
    src/lib/axios/axiosClient.ts             IDaaS browser transport
    src/apis/dolores/client.ts               Dolores browser transport
    src/services/auth.service.ts             login/logout workflow
    src/components/layout/Header.tsx         logout interaction
    src/components/auth/LoginForm.tsx        login feedback
    src/constants/endpoints.ts
    src/types/api.type.ts
    tests/*.test.cjs

Proposed tree retains these areas and adds only:

    src/app/api/v1/auth/logout/route.ts      same-origin browser cookie expiry
    tests/idaas-auth-cookie.test.cjs         proxy/logout boundary behavior
    tests/auth-logout.test.cjs               auth and Axios flow behavior

The Next route layer owns HTTP headers and HttpOnly cookie expiry. auth.service owns client logout and access-token cleanup. Header owns navigation and local UI state. LoginForm owns the failure warning. Axios clients own their separate transports. Tests follow the existing Node test directory. No new shared layer, dependency, backend file, schema migration, or generic notification component is proposed.

## Phase 1 — FE proxy and cookie boundary

**Entry:** User-selected FE-only direction and login filtering are recorded above. The existing Next proxy and IDaaS cookie contract are inspected. No BE write is needed.

**Outcome:** The browser login response no longer contains refresh_token, and FE has a local route that expires the current browser's scoped and legacy root refresh cookies.

**In scope:** Existing proxy login response branch, new static logout route, optional cookie path in FE .env.example, and focused tests. No authService, Header, LoginForm, Axios, BE, or Dolores change yet.

**Implementation boundary:** Keep the current catch-all proxy for upstream requests. Special-case only the login response there. Keep local cookie expiry in the static logout route. Validate cookie-path configuration and Origin before emitting headers.

**Affected components:** src/app/api/v1/[...path]/route.ts, src/app/api/v1/auth/logout/route.ts, .env.example, tests/idaas-auth-cookie.test.cjs.

**Side effects and risk:** Browser-visible login JSON changes by deleting one field. A wrong deployed cookie path would leave the scoped cookie; configurable path and an HTTP cookie test mitigate this. The server session remains active.

**TDD and verification:** First add behavior tests that fail on the current proxy/local route: login JSON redaction with preserved Set-Cookie, malformed successful JSON returning 502, non-login proxy pass-through, logout 204 with scoped and root expiry cookies, custom path, invalid path, and foreign Origin. Then implement. Run the focused test, all existing Node tests, TypeScript check, and lint. Inspect the actual HTTP response through a local Next runtime when available; use a controlled mock upstream, not a production account.

**Acceptance:** Browser login success JSON has no refresh_token, other fields and Set-Cookie remain; other proxy routes retain behavior; malformed successful login JSON is not reflected; logout route expires scoped and root cookies with the specified flags, enforces configured path and Origin, and never calls IDaaS; no BE file changes.

**Exit/review gate:** Every acceptance point has passing evidence and a read-only code review finds no response-header leak or wrong cookie path. Stop and report Phase 1 before Phase 2. If the Next runtime or required test cannot run, mark Phase 1 unverified and stop.

## Phase 2 — Axios and FE logout workflow

**Entry:** Phase 1 is complete, so AUTH.LOGOUT points to a working local route.

**Outcome:** Both clients stop managing the refresh cookie from JavaScript, while user logout always clears local auth state and gives honest failure feedback.

**In scope:** endpoint constant, browser LoginResponse type, auth.service, both Axios clients, Header, LoginForm, and focused tests. No proxy or BE implementation change.

**Implementation boundary:** Keep the two Axios instances. Let the local route own refresh-cookie expiry; let auth.service own access-token cleanup; let Header own navigation and existing local state; reuse LoginForm's error presentation.

**Affected components:** src/constants/endpoints.ts, src/types/api.type.ts, src/services/auth.service.ts, src/lib/axios/axiosClient.ts, src/apis/dolores/client.ts, src/components/layout/Header.tsx, src/components/auth/LoginForm.tsx, tests/auth-logout.test.cjs, existing Axios tests as needed.

**Side effects and risk:** Logout waits for the existing 10-second Axios timeout, then redirects even on failure. If FE route is unavailable, browser refresh cookie may remain; the warning says this explicitly. IDaaS session remains active even when local logout succeeds.

**TDD and verification:** First add failing behavior tests for logout success/failure and access-token cleanup, no logout 401 refresh retry, correct access-token refresh without JS refresh-cookie writes, and Dolores error/refresh behavior. Implement, then run focused tests, all Node tests, TypeScript check, lint, and a browser check of success/error navigation, pending state, keyboard operation, and alert announcement.

**Acceptance:** No FE JavaScript reads/writes/removes refresh_token; IDaaS and Dolores clients retain separate base URLs and existing DTO/error contracts; logout always clears access token/email/auth state and navigates to login; failure shows a non-blocking accessible warning; other logout call sites are safe; no BE file changes.

**Exit/review gate:** Map every criterion to passing evidence, perform a separate read-only review of cookie/refresh/redirect behavior, and stop before Phase 3. Any required failure or unavailable UI evidence keeps this phase failed or unverified.

## Phase 3 — Combined FE verification and handoff

**Entry:** Phases 1 and 2 are complete. A local Next runtime and controlled mock IDaaS upstream are available; no real account or live session is used.

**Outcome:** The combined browser-to-FE flow works with one Axios client per backend and no refresh token in browser JSON.

**In scope:** Verification and only fixes required by discovered FE defects. No BE edits, production deployment, commit, push, or live account mutation.

**Verification:** Through a local Next runtime, send a mock IDaaS login that contains Set-Cookie and refresh_token JSON; confirm the browser-facing response retains Set-Cookie but omits the field. Inspect scoped cookie storage, manual logout 204 and cookie expiry, local access-token cleanup, login redirect, and failure warning when the logout route is unavailable. Confirm a Dolores request still uses /api/dolores/v1 with a Bearer access token and does not receive the /api/v1/auth refresh cookie. Run all Node tests, TypeScript check, lint, and npm run build. If the previously observed Next prerender EPERM recurs, record the exact step and keep the build unverified until a suitable environment can run it.

**Acceptance:** The combined FE flow meets both earlier phase contracts; tests and checks pass; browser cookie behavior is observed in a local test environment; the distinction between browser logout and server-side session revocation is reported accurately.

**Exit/review gate:** Complete only with criterion-by-criterion passing evidence and a separate review of the integrated FE change. Stop with failed/unverified status if a required check cannot pass. Handoff must state that IDaaS server sessions and copied refresh credentials remain valid until expiry.

## Verification commands and limits

- Focused Node tests: node --test tests/idaas-auth-cookie.test.cjs tests/auth-logout.test.cjs and any affected existing Axios test.
- Full FE suite: node --test tests/*.test.cjs.
- TypeScript: npx --no-install tsc --noEmit --incremental false.
- Lint: npm run lint.
- Build: npm run build.
- Local HTTP/browser checks use a controlled upstream fixture and do not touch real accounts or production data.
- Existing Next build prerender EPERM is an environment limitation, not a pass. Record its exact outcome if reproduced.
- No backend test command is required because the backend is unchanged. Read-only source inspection established the cookie contract; mock tests prove FE behavior but not a live IDaaS deployment.

## Rollout and residual risk

- Configure IDAAS_REFRESH_COOKIE_PATH on FE when deployed IDaaS COOKIE_PATH differs from /api/v1/auth. The browser-facing path must match exactly for expiry.
- FE can hide refresh_token from browser JSON and expire its cookie but cannot invalidate an IDaaS refresh-token record. A copied refresh token remains usable until IDaaS expiry. An already issued access JWT remains usable until its TTL expires.
- A later server-side logout requires a separate BE-authorized plan and implementation.
