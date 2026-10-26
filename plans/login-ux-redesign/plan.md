# Plan: Redesign UX/UI trang đăng nhập

Date: 2026-10-26
Mode: fast (auto-detected: one existing login page and a contained success overlay)
Risk: high-risk — touches auth completion timing; preserve API, token, challenge, and redirect behavior.
Test: --tdd
Spec: plans/login-ux-redesign/spec.md

Project root: E:/Đồ án/SCM-BEANS_Dashboard_FE (git root; no ancestor .skills.json was found)

## Scope Challenge

- Exists: the login route and credential, MFA, email OTP, and first-login password-change states already exist in src/pages/auth/login/login-page.tsx.
- Minimum: replace the marketing-style split hero with a centered product login card; keep all auth states in the same shell; add the accessible password toggle and reduced-motion behavior; run a visual-only success splash after final auth success.
- Complexity: Fast. The work is limited to one login route and one login-only success animation component. No backend or token contract changes.

## Spec Quality Check

- Remaining blocking clarification: none.
- Success criteria: measurable viewport sizes, dimensions, durations, and auth response conditions.
- User stories: P1 and P2 are assigned.
- Acceptance criteria: testable through browser walkthroughs and existing project checks.
- Verdict: PASS.

## Decisions

- The provided Figma file has no login frame; use its shared Dolores wordmark, light surfaces, sans-serif dashboard typography, and color tokens.
- Do not change shared typography globally; scope login typography and colors to the login route.
- Keep the existing login and challenge state machine. Only the final authenticated response may trigger the success effect.
- Use a full-viewport SVG liquid overlay with a success mark and short message. Use Dolores colors, no audio, a 1.5-second hard limit, and skip the wave when reduced motion is requested.
- Use GSAP with an SVG wave timeline for the liquid splash; add it as a direct dependency and dynamically load it only for the success-only component. Do not load it from a CDN.

## Phase Index

| Phase | Objective | Stories | Dependencies |
|---|---|---|---|
| phase-01-product-native-login-shell | Align the login layout, brand, typography, colors, and responsive behavior with the product UI. | P1 login focus; P1 visual consistency | None |
| phase-02-auth-steps-accessibility-motion | Keep all login challenges in the same shell and add accessible controls and restrained transitions. | P1 multi-step flow; P2 password visibility | Phase 01 |
| phase-03-login-success-liquid-splash | Show the visual-only liquid success effect after final authentication and then route safely. | P2 success feedback | Phases 01–02 |

## Risks and Mitigations

- The Figma file does not contain a login screen. Use only the shared product design language and avoid inventing an exact login-frame match.
- Adding GSAP could increase client bundle size. Load it only when the success overlay is triggered and do not include it in the initial route bundle.
- The splash can delay entry to the dashboard. Cap it at 1.5 seconds and ensure animation failure or reduced-motion preference never prevents router.replace.
- Login has several challenge responses. Trigger the splash only in the final access-token completion path, never for a pending OTP/MFA challenge or an error.
- Authenticated browser walkthrough requires a test account. Do not submit non-test credentials or perform unrelated mutations.

## Task Checklist

- [x] Phase 01 — build the product-native responsive login shell.
- [x] Phase 02 — preserve challenge states, improve input accessibility, and respect reduced motion.
- [x] Phase 03 — add the success-only visual liquid splash and safe redirect.
- [x] Review the final login at 1440×900, 390×844, and 360×640.
- [x] Run lint, TypeScript, and production build during implementation.

## Session Notes
<!-- Updated by cook automatically — do not edit manually -->

**Last active:** 2026-10-26 17:38
**Phase in progress:** phase-03-login-success-liquid-splash
**Status:** All phases implemented; 12 focused tests, lint, TypeScript, production build, responsive/keyboard checks, and controlled login success redirect passed.

### Decisions made this session
- Use the existing Node test harness and render the actual login component to static markup.
- Keep one persistent card around keyed step content so challenge changes do not shift its horizontal anchor.
- Trigger the success animation only from `completeLogin`; reduced-motion users go directly to the existing role-based route.
- Keep the SVG hidden until GSAP initializes so its CSS transform cannot override SVG animation; keep the redirect callback current without restarting the timeline on parent renders.

### Next immediate action
Review the staged file set and finish the git-manager step; ask before pushing.
