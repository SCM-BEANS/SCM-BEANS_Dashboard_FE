# Phase 03 — Login success liquid splash

## Objective

Give a clear, brief visual confirmation after the final login response succeeds, then continue to the user's dashboard.

## Scope and Tasks

1. Create a login-only LiquidSuccessSplash component whose Dolores-colored SVG curtain drops from the top with rounded, uneven drips, deepens into a soft liquid belly, and fills the viewport before showing the checkmark and “Đăng nhập thành công”.
2. Use the Dolores primary red and light product surfaces; do not use the cyan demo colors and do not add sound.
3. Trigger the effect only from the final completeLogin path after an access token is received. Do not trigger it for OTP/MFA challenge responses, pending requests, or errors.
4. Keep the drip morph, full-screen fill, success message, and fade within 1.5 seconds, then call the existing role-based router.replace.
5. Respect prefers-reduced-motion by skipping the morph and redirecting immediately.
6. Guarantee redirect in a fallback path if the animation is interrupted, throws, or fails to initialize.
7. Use the existing GSAP dependency, cache its lazy import, and prepare it when the login form receives focus. Interpolate compatible SVG d attributes in sequential tweens; no MorphSVG plugin or CDN is needed. Kill the timeline on completion, fallback, and unmount.
8. Expose the success message as a screen-reader status without trapping focus or leaving keyboard users behind on the overlay.

## Files and Modules

- src/pages/auth/login/login-page.tsx
- src/pages/auth/login/liquid-success-splash.tsx (new, login-only)
- src/pages/auth/login/liquid-success-splash.module.css (new, if styles are separated)
- package.json and package-lock.json (only if GSAP is required)

## Dependencies

- Phases 01 and 02.

## Tests and Acceptance Criteria

- **Tests to Write First:** Add tests in tests/login-success-splash.test.cjs that mock final auth success, OTP/MFA challenge, auth failure, animation completion/failure, and reduced-motion preference; assert splash and redirect behavior.
- A final successful login response triggers exactly one splash and then reaches the same role-based destination as before.
- Invalid credentials, API errors, and OTP/MFA challenges do not show the splash.
- Splash uses no audio, finishes within 1.5 seconds, and uses Dolores colors.
- With reduced motion enabled, no liquid morph is animated and the user is redirected without a noticeable wait.
- If the animation fails, the redirect still occurs; no authenticated user remains stuck on the login page.
- During implementation, run node --test tests/login-success-splash.test.cjs, verify with controlled auth responses, then run lint, TypeScript, and production build.

## Risks and Notes

- The login completion path writes the access token before routing. Keep the splash short and make the existing redirect failure-safe.
- GSAP is not currently a direct dependency. Dynamically load it to avoid adding it to the initial login bundle.
- Do not test against a real account unless it is explicitly a designated test account.
