# Action bar coverage: review fixes + remaining audit

Context: `plans/action-bar-coverage-audit.md` and `plans/action-bar-ux.md`. The coverage work in the working tree is NOT committed. Keep it and build on it. `node_modules` is restored, so `npx tsc`, `npm run lint`, `npm run build` and `npx playwright test` all work. Use the `.cmd` shims from PowerShell if needed. FE only; read `C:/GitHub/BEANS/dolores_platform` but never modify it. Do not commit, push or install.

## F1. Invoice export UX (all roles that list invoices)
The BE `BillingController#POST /billing/exports` (lines 162-170) requires `ownerId` for operators (Admin/Moderator) and uses the caller's own owner context for an Owner. Hiding the button when the visible invoices belong to several owners means it almost never shows: the user's screenshot of the Admin list has 4 owners.
- Always show "Xuất hóa đơn" (primary, 20) on the invoice list once the list has loaded with at least one invoice.
- Admin/Moderator, when the visible invoices span more than one owner and no owner filter is applied: disable it with `disabledReason` "Lọc theo một chủ sở hữu để xuất hóa đơn." (the search box already accepts an Owner ID). When exactly one owner is visible or filtered: enabled, export the visible invoice IDs with that `ownerId`.
- Owner invoice list (`src/pages/dashboard/**` invoices screen): add the same shared action via `buildInvoiceExportActions` in `entity-page-actions.ts` (no `ownerId` needed; the BE uses the Owner context). After success, navigate to the export job / download flow that the Owner already has, or show the job status with a download action, like the Moderator export page added in this work.
- Keep the 1,000-invoice BE limit check with a reason.
- Fix `tests/e2e/admin-page-actions.spec.ts:206`:
  - multi-owner mock → the button is visible and disabled with the reason;
  - single-owner (filtered) mock → enabled, and the click posts `/billing/exports` with `ownerId` + `invoiceIds`.

  Add an Owner case to `owner-technician-page-actions.spec.ts`.

## F2. Owner support form lost its bar
`tests/e2e/page-actions.spec.ts:120`: `/dashboard/support/new` no longer shows the dock, because the fallback back action was removed from `customer-workflow-screen.tsx` (correct per R2). The real fix is R8: the support request form's submit ("Gửi yêu cầu") and "Hủy" (dirty confirm) must be in `PageActions` with `form=`. Apply the same to every other customer workflow form route rendered by `customer-workflow-screen.tsx` (check its descriptors) whose submit is still inline. Keep the test asserting the dock is visible, and assert the primary is the submit.

## Done when (F1+F2)
- `npx tsc --noEmit -p .`, `npm run lint` and `npm run build` pass.
- The full `npx playwright test tests/e2e` passes except the 2 known failures (`buyback-collection-payment.spec.ts:151`, `landing-page.spec.ts:169`).
- `node --test --test-reporter=tap tests/*.test.cjs` reports exactly 91 `not ok` titles (the current baseline after the merge).
- `git checkout -- debug.log` if it changed.
