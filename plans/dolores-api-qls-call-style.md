# Plan: Align Dolores API Call Style with QLS

**Status:** Approved for execution; validation error timing change accepted
**Target repository:** `C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE`
**Plan date:** 2026-10-22
**Scope:** Source-style refactor of all 12 Dolores API modules and the related AST and regression tests.

## Goal

Make each public API method in the 12 existing Dolores API modules read in the QLS style:

```ts
methodName: async (args): Promise<Result> => {
  return await requestDolores(/* existing request */);
},
```

The objective is consistent, explicit and easy-to-scan API declarations while preserving the FE's current Dolores transport, endpoints, request payloads, response validation, and DTO values. The user accepts that validation errors raised inside methods converted to `async` will be delivered as rejected Promises instead of synchronous throws.

## User decision and architecture

**Selected:** Adopt QLS's async arrow property syntax and explicit `return await` for methods that directly return a request, while continuing to use the Dolores client (`requestDolores` / `requestDoloresBlob`). Preserve existing `Promise<DTO>` return types and response checks/transforms. The user explicitly accepts Promise rejections for validation errors in methods converted from synchronous functions.

**Validation error decision:** Invalid IDs and other pre-request validation still stop the request before it is sent. In a newly async method, a validation exception is now a rejected Promise. The user selected this consequence to keep the uniform QLS async-arrow style. Regression tests must assert rejection and confirm invalid inputs do not reach the request client.

**Not selected:** Switch to QLS's `axiosClient` and `BaseResponse<T>` contract. That would change transport and return semantics, and could bypass Dolores proxy, authentication/refresh, Zod validation, and normalized error handling. The two repositories' backend response contracts have not been established as interchangeable.

| Option | Fit to request | Compatibility | Cost and risk | Reversibility | Evidence needed |
|---|---|---|---|---|---|
| Async arrow syntax with Dolores client (selected) | Matches the requested QLS call-site shape | Preserves request and DTO behavior; validation errors become Promise rejections | Low; mechanical edits plus regression expectation updates | High | AST contract test, typecheck, regression suite, source review |
| Preserve synchronous validation throws with non-async wrappers | Preserves the prior error delivery timing | Conflicts with a uniform async-arrow API shape | Low-to-medium; requires exceptions to the selected style | High | Tests would retain synchronous throw assertions |
| Direct `axiosClient` and `BaseResponse<T>` | Matches QLS transport and envelope | Changes FE transport and typing assumptions | High; may bypass FE client guarantees and alter consumers | Medium | Backend envelope contract, auth/error/proxy migration evidence, consumer migration |
| Keep method shorthand | No source changes | Fully compatible | No implementation cost, but does not meet the requested style | High | No additional evidence |

## Scope

### In scope

- The 12 domain modules in `src/apis/dolores`: `alerts`, `billing`, `buybacks`, `contracts`, `dashboard`, `installationWorkOrders`, `locations`, `machines`, `notifications`, `recipes`, `telemetry`, and `tenants`.
- Convert all 32 public API method declarations to object properties whose values are `async` arrow functions.
- Keep explicit `Promise<...>` return annotations and all existing parameter types.
- Use a block body for every method. Methods that directly return a Dolores request use `return await`; methods that validate or transform the response retain the awaited request and existing checks/transformation.
- Strengthen the existing API signature AST test so it rejects shorthand methods, non-async arrows, missing explicit return annotations, untyped public parameters, expression bodies, and unawaited Dolores helper calls.
- Update the invalid-ID expectations in `tests/moderator-phase3.test.cjs` and `tests/moderator-phase4.test.cjs` to assert Promise rejections and confirm invalid inputs do not issue requests.

### Preserve exactly

- `requestDolores` and `requestDoloresBlob` as the transport entry points.
- Current `Promise<DTO>` response types, schemas, type imports, validation rules, and response parsing/transformation. Validation still happens before the request; the accepted difference is synchronous throw versus rejected Promise delivery for converted methods.
- Endpoint paths, HTTP methods, query strings, path parameter encoding/parsing, request bodies, signals, and blob behavior.
- Dolores proxy usage, token attachment/refresh, cancellation, error normalization, retries, and user-facing runtime behavior.

### Out of scope

- Direct Axios use, `BaseResponse<T>`, changes to response envelopes, or backend contract assumptions.
- Changes to the Dolores client, Zod schemas/types, API endpoint behavior, hooks, UI, routes, or backend.
- Dependency additions, code generation, broader naming cleanup, or unrelated refactoring.

**UI/UX impact:** None expected. This changes API source ergonomics for developers only.

## Phases

### Phase 1 — Enforce the contract and convert API declarations (TDD Off)

**Outcome:** All 32 methods across the 12 modules use the selected declaration style, with request construction, endpoint behavior, response validation, and DTO values preserved. Invalid-input validation errors follow Promise rejection semantics in converted async methods.

**Work:**

1. Convert the 32 methods mechanically, preserving each method's existing request arguments, validation, response checks, and transformations.
2. Extend `tests/dolores-api-signatures.test.cjs` to require async arrow properties, explicit `Promise<...>` annotations, typed parameters, block bodies, and awaited calls to the existing Dolores request helpers.
3. Update the invalid-ID assertions in the Phase 3 and Phase 4 regression tests from synchronous throws to rejected Promises; assert those invalid inputs do not call the request helpers.
4. Run the focused AST and invalid-input regression tests, TypeScript typecheck, and the complete Node regression test suite. TDD is off, so there is no pre-implementation red step.

**Affected components:** The 12 modules under `src/apis/dolores/`, `tests/dolores-api-signatures.test.cjs`, `tests/moderator-phase3.test.cjs`, and `tests/moderator-phase4.test.cjs`.

**Side effects:** Source formatting and API declaration syntax change. Invalid-input validation exceptions in converted methods become rejected Promises; no network calls, data migrations, generated files, dependency changes, or runtime configuration changes.

**Acceptance criteria:**

- Every public method in all 12 modules is an async arrow property with an explicit return type and block body. Directly returned request calls use `return await`; methods with response checks/transforms continue to await the request before those steps.
- Existing methods, parameters, endpoint strings, request arguments, helper selection, validation rules, response DTO types, and transforms remain unchanged.
- Invalid IDs reject the returned Promise before any request helper is called; regression tests cover all existing synchronous-throw assertions affected by the conversion.
- Focused AST contract tests, typecheck, and all repository Node regression tests pass.

**Entry criteria:** This plan is approved for execution; the user selected Standard mode and TDD Off; repository instructions and existing worktree limitations have been checked at execution time.

**Exit criteria:** The acceptance criteria pass and a read-only review confirms no endpoint, payload, response type, transport, validation-rule, or transformation drift beyond the accepted exception-to-rejection delivery change. If the AST gate requires a brittle implementation-specific assertion, stop and revise the test contract before broad edits.

**Review / stop gate:** Review the phase diff before starting final verification. Stop for any unexpected change to request semantics or any failing test/typecheck that cannot be attributed and fixed within this phase.

### Phase 2 — Full verification and handoff

**Outcome:** Provide evidence that the style change is complete and behavior-facing API definitions remain stable.

**Verification:**

- `node --test tests/dolores-api-signatures.test.cjs`
- `npx tsc --noEmit --incremental false`
- `node --test tests/*.test.cjs`
- `npm run lint`
- Read-only review comparing every API method for endpoint, HTTP method, parameters, payload, selected helper, schema, and response type; confirm validation remains before each request and the accepted rejection behavior matches the regression tests.
- Run `git diff --check` if the repository worktree permits it. Prior inspection found Git diff commands fail because the checkout reports a worktree-context/permission error; if that remains true, report it and run a targeted whitespace/conflict-marker scan on changed files instead. Do not claim a clean diff without evidence.

A production build is not required for this syntax-only refactor: TypeScript compilation plus the source-level contract and regression suite cover the changed surface. Revisit this only if implementation introduces runtime code beyond the approved scope.

**Acceptance criteria:** All listed checks pass, or any environment limitation is clearly recorded; source review finds no request construction, response DTO, transport, validation-rule, or transformation drift beyond the accepted exception-to-rejection delivery change; final report links the plan and summarizes files and verification evidence.

**Dependencies:** Phase 1 complete.

**Side effects:** Lint/typecheck/test commands may create local caches or build/test artifacts; no external service or database is contacted.

**Review / stop gate:** Do not claim behavior is unchanged unless the before/after request-definition review and checks support that conclusion. Stop and report if a check reveals behavior drift or a baseline failure that cannot be isolated.

## Verification and baseline notes

- Repository has no dedicated `test` package script; regression tests are run with Node's built-in test runner.
- Existing `tests/dolores-api-signatures.test.cjs` already checks public methods, return types, and typed parameters using the TypeScript AST; Phase 1 extends that contract for the requested syntax.
- Previously observed baseline: TypeScript passed, all 61 Node tests passed, lint had no errors and five warnings in unrelated Digital Twin/MFA files, and a production build succeeded in a prior completed increment. Re-run relevant checks against the current execution baseline rather than treating prior results as proof for this change.
- Prior Git inspection reported a worktree-context/permission error for diff commands. Confirm at execution time and preserve any pre-existing user changes; do not reset or clean the worktree.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Mechanical conversion accidentally changes a request or return type | Keep request expressions and annotations intact; use the AST contract and method-by-method source review |
| Validation errors change from synchronous throws to Promise rejections | This consequence is explicitly accepted by the user; update regression assertions and confirm invalid inputs still stop before a network request |
| AST test overfits formatting instead of syntax | Assert TypeScript AST node kinds and relevant call structure, not text formatting |
| Existing dirty changes obscure this increment's diff | Capture the baseline before edits and review only attributable changes; never reset user work |
| Git diff remains unavailable in this environment | Record the limitation and use targeted changed-file scans plus AST/type/test evidence; do not assert a clean diff |
| Scope drifts into replacing Dolores with Axios | Treat the selected architecture and out-of-scope list as a hard boundary; stop for new transport requirements |

## Approval gate

The user approved execution in Standard mode with TDD Off and explicitly accepted the validation exception-to-rejection change. Execute Phase 1, stop at its review gate, and continue to Phase 2 only after the Standard phase boundary is acknowledged.

## Execution record

### Phase 1 — Complete (2026-10-22)

- Converted the 32 methods in 12 Dolores API modules to async arrow properties. Existing endpoint strings, request arguments, helper selection, schemas, DTO types, response checks, and transformations were reviewed and preserved.
- Updated the AST contract test and the affected invalid-ID assertions in Phase 3 and Phase 4 tests. Invalid inputs are expected to reject and are confirmed not to add a request-helper call.
- Verification passed: targeted API/Phase 3/Phase 4 tests (22/22), `npx --no-install tsc --noEmit --incremental false`, and `node --test tests/*.test.cjs` (61/61).
- Read-only review found no request or response drift beyond the accepted synchronous-throw to Promise-rejection change.
- Environment limitation: Git status and diff commands could not access the repository worktree, so no Git-generated diff or diff-check result is claimed. The changed API and test source was inspected directly.

### Phase 2 — Complete; final verification verified (2026-10-22)

- Passed `node --test tests/dolores-api-signatures.test.cjs` (1/1).
- Passed `npx --no-install tsc --noEmit --incremental false`.
- Passed `node --test tests/*.test.cjs` (61/61).
- `npm run lint` passed with 0 errors and 5 warnings in unrelated Digital Twin/MFA files.
- `git diff --check` was unavailable because Git reported that the operation must run in a work tree. The targeted fallback scan passed on all 16 scoped files: no trailing whitespace or conflict markers.
- Final read-only review found no request construction, endpoint, transport, validation-rule, response DTO, or transformation drift beyond the accepted conversion of validation throws to Promise rejections.
- Final verification status: `verified`. Residual risk is limited to the accepted Promise-rejection semantics; no production build was needed for this syntax-only change.