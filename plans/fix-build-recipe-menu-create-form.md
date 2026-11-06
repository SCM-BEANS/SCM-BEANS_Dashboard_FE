# Fix: `npm run build` fails type check in recipe-menus-screen.tsx

`next build` fails with TS2367 at `src/components/features/recipe-menus/recipe-menus-screen.tsx:328-330`. The form at line 327 only renders when `menuAction === "create"`, but its body still branches on `"delete"`/`"rename"`, so TypeScript reports a comparison with no overlap. Rename and delete already have their own form at ~line 345.

## Task
- In the create-only form (lines ~327-331), remove the dead `"delete"`/`"rename"` branches: heading "Menu mới", the name field is always shown, the submit button is disabled when `busy || !menuName.trim()`, and its label is "Đang lưu…"/"Tạo menu". Behaviour stays identical for the create flow.
- Change nothing else.

## Constraints
FE only, do not touch `dolores_platform`, no commit/push/install.

## Done when
`npm run build` passes the type check step (other build issues, if any, must be reported, not fixed).
