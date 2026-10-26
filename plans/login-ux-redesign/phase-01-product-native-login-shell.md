# Phase 01 — Product-native login shell

## Objective

Replace the marketing-style split hero with a focused, centered login card that follows the shared Dolores dashboard design language.

## Scope and Tasks

1. Remove the login-only coffee hero panel, dark overlay, and oversized marketing headline from the route.
2. Center a single white form card on the warm canvas; target a maximum width of 420px on desktop and retain at least 16px side gutters on mobile.
3. Replace the uppercase hero lockup with the lowercase Dolores wordmark treatment from Figma and a short product-oriented subtitle.
4. Apply the shared Figma palette: primary #b81724, canvas #f8f6f3, surface #ffffff, primary text #302927, secondary text #706561, and border #e9e2dc.
5. Scope styling to the login route; do not change global typography or landing-page styles.
6. Keep existing fields, validation, loading feedback, API calls, and route behavior unchanged.

## Files and Modules

- src/pages/auth/login/login-page.tsx
- Figma reference: Dolores Product UX/UI, shared design language and Customer screens

## Dependencies

- None.

## Tests and Acceptance Criteria

- **Tests to Write First:** Add a focused Node test that renders the login route and asserts the product wordmark and credential form are present while the hero panel is absent.
- At 1440×900, the card is centered, no wider than 420px, and the hero image/marketing headline are absent.
- At 390×844 and 360×640, there is no horizontal overflow; fields and submit action remain reachable by vertical scrolling.
- Email and password can still submit through the existing handler; no auth/API code or token behavior changes.
- During implementation, run node --test tests/login-ui-shell.test.cjs, npm.cmd run lint, npx.cmd tsc --noEmit --incremental false, and npm.cmd run build.

## Risks and Notes

- There is no login-specific Figma frame. Match the shared design tokens and visual hierarchy without copying a dashboard screen verbatim.
- Do not delete image assets unless confirmed login-only and unreferenced elsewhere.
