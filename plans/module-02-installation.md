# Module 2: Installation work order paged records (3 APIs)

Same hard constraints as `plans/module-01-maintenance.md` (FE only, BE read-only, no commit/push/install, follow existing structure, shared UI across roles, Vietnamese text, tests required).

## APIs (`InstallationWorkOrderController`, lines ~320-352)
All are `GET`, take query `page` (default 0) and `size` (default 50, max 100), and return a JSON array with pagination headers `X-Page`, `X-Page-Size`, `X-Has-Next` (same as `BoundedListResponse` elsewhere; copy the header parsing already used in `src/apis/billing.api.ts` / `buybacks.api.ts`, or reuse a shared helper if one exists).
1. `GET /installation-work-orders/{workOrderId}/checklist-items` → `InstallationWorkOrderChecklistItem[]`
2. `GET /installation-work-orders/{workOrderId}/accessories` → `InstallationWorkOrderAccessory[]`
3. `GET /installation-work-orders/{workOrderId}/evidence` → `InstallationWorkOrderEvidenceMetadata[]` (metadata only; download stays on the existing `GET /{workOrderId}/evidence/{evidenceId}`)

Roles: MODERATOR (`getDetailsForModerator`) or the assigned TECHNICIAN. ADMIN is not allowed by BE here, so do not show it for admin.

Schemas already exist in `src/schema/installation-work-orders.schema.ts`; reuse them.

## Implementation
- `src/apis/installation-work-orders.api.ts`: add `listChecklistItems`, `listAccessories`, `listEvidence(workOrderId, { page, size }, signal)` returning `{ items, page, size, hasNext }`.
- Create one shared component `src/components/features/installation/installation-work-order-records.tsx` (or put it next to existing installation components if a folder already exists; grep first). It shows three tabs or sections, "Danh sách kiểm tra", "Phụ kiện bàn giao", "Chứng từ", each paginated through the new APIs with TanStack Query (keys include workOrderId, tab, page), plus loading, empty and error states. Evidence rows keep the existing download action.
- Use it in the moderator work order detail (`pages/moderator/contracts/contract-detail-screen.tsx` / `contract-installation-request-screen.tsx` / `components/features/repair-workflow/technical-operations-screen.tsx`, wherever the installation work order detail is rendered) and in the technician detail `pages/technician/tasks/work-order-detail-screen.tsx`. It replaces the current inline rendering of `details.checklistItems/accessories/evidence` lists when that is just a list display. Keep the technician's write actions (record checklist result, add accessory, upload evidence) working; after each write, invalidate the paged query for that tab.

## Tests
- Playwright `tests/e2e/installation-work-order-records.spec.ts`: moderator and technician both see the same records component; pagination "Trang sau" requests `page=1`; an empty state shows; the evidence download still calls the existing endpoint.
- Update `tests/dolores-api-requests.test.cjs`-style unit tests for the 3 new methods.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, `node --test tests/` and the new Playwright spec all pass. Print a per-file summary.
