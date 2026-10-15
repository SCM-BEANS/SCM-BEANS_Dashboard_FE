# Phase 01 — Thin shared foundation and access

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Replace the prototype's role-by-path and shared demo state assumptions with the smallest approved identity, role, scope, account, shop and record-access foundation needed by the vertical journeys. This phase creates the common seams, not a broad business platform.

## Concrete tasks

- Implement the identity/session integration selected in P00 behind a server-verified principal boundary. Do not treat `/admin`, `/moderator`, `/technician` or `/customer` as proof of role.
- Enforce role and record scope server-side for page data and every state-changing action. A deep link may load a record only after verifying the principal and its relation to that record.
- Build Admin account management for Tenant, Moderator and Technician; Admin creates/manages shops, sets Tenant status and grants Tenant access.
- Build Moderator Tenant-account creation only. Reject Moderator attempts to create internal staff accounts, manage shops, change Tenant status or grant Tenant access. Do not give Moderator an Admin account-management shortcut.
- Preserve Tenant-to-shop association as a relation whose cardinality/setup sequence is configurable only after OI-01 is answered; do not silently assign a default shop.
- Define private file reference/access interfaces for signed agreements and later evidence. Select provider via ADR; prevent public access. Apply only verified retention/type/size rules after OI-13 is answered.
- Add shared loading, empty, forbidden, not-found, validation and success states in the role shell; remove cross-role links that simulate role switching.
- Keep the current Next.js route shape if useful, but make it resolve an authenticated workspace and exact resource, not an authorization policy.

## Dependencies

- P00 ADR ownership and selected identity/storage integration paths.
- OI-02 blocks final auth lifecycle, session expiration, reset/activation and status changes.
- OI-01 residual blocks Tenant/shop cardinality and exact setup sequence; OI-13 blocks final file policy.

## Affected files and modules

- Existing UI: `src/app/[role]/[[...segments]]/page.tsx`, `src/lib/prototype.ts`, `src/components/PrototypeApp.tsx`, `src/app/globals.css`.
- Existing demo state to retire/replace: `src/lib/demo-store.tsx`.
- New authentication, authorization, account, shop, session and file modules: TBD after P00 ADRs; none exist in the repository today.
- Account routes: `/admin/accounts`, `/admin/stores`, `/moderator/customers`, and relevant customer landing routes in `screen-route-map.md`.

## Verification / acceptance (planned only)

- MF-20/S01: Admin can manage all three account roles, shops and Tenant access/status actions within the answered status catalogue; Moderator can create Tenant accounts only.
- Negative access checks: Moderator cannot create staff accounts, modify shop/status/access, and Tenant/Technician cannot cross-access another Tenant's records.
- Direct links, refresh and altered IDs return the scoped record, not-found or forbidden outcome; no local role segment grants authority.
- Private file references are not publicly accessible; customer-visible and company-only evidence have separate authorization checks.
- OI-gated account lifecycle and file rules remain visibly unimplemented until resolved.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-01, OI-02 and OI-13. Restrict only final cardinality/lifecycle/storage policy; still implement the confirmed permissions and server scope.
- Admin's broad operational visibility does not automatically grant every write permission. Keep unspecified actions denied pending a rule.
- Migrating sample user/customer IDs into real identifiers risks accidental cross-scope links. Never use sample IDs as defaults.
