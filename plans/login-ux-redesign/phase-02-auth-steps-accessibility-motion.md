# Phase 02 — Auth steps, accessibility, and motion

## Objective

Make credentials, MFA, email OTP, and first-login password change feel like one continuous login task while preserving the existing auth state machine.

## Scope and Tasks

1. Render each existing auth step within the same centered card and keep the card's horizontal anchor stable when content changes.
2. Preserve the current step-specific headings, helper copy, errors, success feedback, resend behavior, and back actions.
3. Add a show/hide password control with an accessible name, keyboard operation, visible focus state, and a target size of at least 44×44px.
4. Animate the card entrance once with opacity and an upward offset of at most 8px for 180–220ms; transition step content in 140–180ms without layout movement.
5. When prefers-reduced-motion is enabled, remove the entrance translation and set transition duration to 0ms.
6. Keep labels visible, preserve email/password autocomplete semantics, and keep error/success messages exposed through the current alert/status roles.

## Files and Modules

- src/pages/auth/login/login-page.tsx
- src/text/auth/login-messages.ts (only if a new accessible label or concise helper message is needed)

## Dependencies

- Phase 01.

## Tests and Acceptance Criteria

- **Tests to Write First:** Add tests in tests/login-auth-steps.test.cjs for password visibility state, accessible control naming, and challenge transitions retaining the shared login shell.
- All four states render inside the same card; no transition changes the card's horizontal position.
- Keyboard-only walkthrough reaches every input, the password visibility control, submit action, resend, and back actions in a logical order.
- Password visibility toggles without clearing the value or changing form submission behavior.
- Normal-motion timing stays within the specified ranges; reduced-motion mode has no animated translation or nonzero transition duration.
- During implementation, run node --test tests/login-auth-steps.test.cjs, lint, and TypeScript checks, then manually inspect desktop and mobile layouts.

## Risks and Notes

- The password type toggle must not weaken autocomplete or validation behavior.
- OTP and password-change content is taller than the credentials form; allow vertical scrolling on short screens instead of shrinking controls.
