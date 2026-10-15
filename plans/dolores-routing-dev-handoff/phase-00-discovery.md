# Phase 00 — Discovery and architecture decision gates

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Agree how the production system will be divided and which technical decisions require ADRs before the team commits to backend, persistence, authentication, private files or device integration. Keep business questions in the existing OI ledger.

## Concrete tasks

- Inventory the repository and confirm it is the current frontend demo, not an API or production data layer.
- Establish owners and ADRs for backend/API boundary, database and migrations, authentication/session, role/scope enforcement, private file storage, deployment/operations, observability/audit, device/Edge integration and client API state handling.
- Define an integration boundary between the existing Next.js screens and future services without choosing endpoints or vendor products in this plan.
- Map each MF-01–MF-20/S01…S45 to owning service/module and UI entry point; assign every cross-flow entity one authoritative writer.
- Review P1 OIs with the business owner and capture answers in a versioned decision log. Leave unanswered OIs open and list the behaviors they gate.
- Confirm terminology mapping for app `Customer` and business `Tenant/Store Owner` without changing role rights.
- Record security/privacy and data-retention questions for uploaded contracts, customer proofs and company-only bank evidence.

## Dependencies

None. This is the prerequisite for implementation phases. It does not require resolving every OI; only architecture ownership and a safe path for each unresolved area are required.

## Affected files and modules

- Existing context to inspect: `README.md`, `package.json`, `src/app/[role]/[[...segments]]/page.tsx`, `src/lib/prototype.ts`, `src/lib/demo-store.tsx`, `src/components/PrototypeApp.tsx`, `src/app/globals.css`.
- Planning sources: `spec.md`, `flow-catalog.md`, `screen-route-map.md`, `state-and-data-contracts.md`, `acceptance-checklist.md`, `implementation-review.md`, `open-decisions.md`.
- New architecture records: location and format TBD by repository/team conventions. Backend, database, auth, storage and Edge modules remain TBD until ADRs choose them.

## Verification / acceptance (planned only)

- A signed-off system-context and ownership map exists, with each of the 20 flows and 45 scenarios assigned to a future implementation slice.
- Each architectural dependency has a decision owner, alternatives, implications and ADR status; no supplier/stack is implied by the plan.
- Each OI has `open`, `answered` or `deferred` status with traceable source. No unanswered OI is rewritten as an approved rule.
- The team can identify which UI actions must remain disabled/draft pending a business answer.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-02 affects production login, sessions and account lifecycle. Prototype URL role selection cannot stand in for identity.
- `[NEEDS CLARIFICATION]` OI-18 leaves non-functional/security/service targets open; collect targets without inventing numbers.
- Device protocol, backend, database and private storage are entirely TBD. Selecting them by habit would be an unsupported architectural assumption.
- OI-01 residual shop relationship and OI-13 evidence constraints may require a focused business answer; continue only with data shapes flexible enough to avoid guessing.
