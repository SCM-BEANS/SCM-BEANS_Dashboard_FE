# Phase 04 - Cross-role validation and live gateway readiness

Status: not_started
Stories: MP-01..MP-08

## Objective

Verify enabled REST features across roles and record exactly what is required before live Watch/Exchange implementation.

## Validation tasks

1. Extend existing tests/e2e/machine-operational-overview.spec.ts and, if approved, tests/e2e/machine-provisioning.spec.ts. Desktop/mobile, keyboard, direct URL/refresh/Back, PageActions overflow, machine/account switching, 401/403/grant revocation, 409 and 503. Confirm unauthorized pages issue no provisioning/secret calls.
2. Reuse existing request/signature tests and add only meaningful contract/behavior tests. Run targeted Node and E2E; then lint, TypeScript and production build. Record baseline/delta and evidence separately for fixture FE and authenticated live API.
3. Verify server read permission with authorized accounts; verify mutations only on dedicated authorized disposable machines. No test may delete a real certificate or disturb another user's active menu. Pending runtime permission checks remain UNVERIFIED.
4. Check certificate path selected-environment invariant, error responses/filenames/no-store and lack of key persistence. Check SLA comes from compliance endpoint and heartbeat polling does not poll cleaning.
5. Record capability disposition for G1/G2/G3/G4 in existing approved plan/spec files. No phase claiming full completion if required story is blocked. Do not change old feature-list evidence/status.

## Live contract checklist - readiness only

- Browser-facing gateway URL, protocol (verified supported web transport), TLS and origin policy; approved auth/refresh/scope rules.
- Versioned proto and transport bindings; canonical machine UUID versus serial/deviceId mapping and server authorization of that mapping.
- Watch subscription/cancel semantics; hidden tab/unmount stop; reconnect/backoff; timestamps/sequence gaps/duplicates; supported telemetry fields and units.
- Exchange command allowlist and input schema; machine-safe states, authorization, command expiry, correlation_id matching and unknown-outcome handling. Never auto-replay a hardware action on reconnect.
- Tested staging Edge/gateway availability. No private certificate bundle used by the browser as a machine credential.

Do not add grpc dependencies, a fabricated Next SSE endpoint, fake live readings, or motor/valve controls in this phase. A subsequent source implementation requires verified contract and explicit scope.

## Acceptance

All enabled MP stories mapped to evidence. No new related failures versus baseline. Account/machine scope and secret handling covered. Live readiness is CONFIRMED with source evidence or BLOCKED with exact missing contracts, never implied by passing REST tests.

Dependencies: Phase 01..03 enabled capabilities and their gates. Scenario anchors S01..S20.
