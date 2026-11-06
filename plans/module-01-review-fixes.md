# Module 1 review fixes (Claude review)

Same hard constraints as module-01-maintenance.md. Fix only the following, in the working tree (module 1 is not committed yet).

## 1. BUG: `scheduledDueAt` is sent in a format the BE rejects
`src/components/features/maintenance-workflow/maintenance-ticket-actions.tsx:88` sends `new Date(dueAt).toISOString()` (UTC with `Z`). The BE parses it with `LocalDateTime.parse(...)` (`MaintenanceTicketService#parseNullableLocalDateTime`), so any value with `Z` returns 400, and the time would also shift by the timezone offset.
- Send the `datetime-local` value as an ISO local date-time without an offset: `${dueAt}:00` → `YYYY-MM-DDTHH:mm:ss`.
- `toLocalDateTime` (line ~48) must turn a BE LocalDateTime string (no offset) into the input value without shifting it. If the value has no offset, just take `value.slice(0, 16)`; only convert when an offset or `Z` is present.
- In `MaintenanceTicketDetailsPatchRequestSchema` (`src/schema/machines.schema.ts`), make `scheduledDueAt` accept only a local date-time (`z.string().datetime({ local: true })`) plus `null`, so the bug cannot come back.
- Update the e2e assertion in `tests/e2e/maintenance-ticket-actions.spec.ts` to expect the local format (for example `"2026-11-10T09:30:00"`), and add a unit/schema check that rejects a `Z` value.

## 2. Polish: show statuses in Vietnamese, not raw enums
In `maintenance-ticket-actions.tsx` (around line 275, `<dd>{ticket.status ?? ...}</dd>`) and any other new UI in this module that prints raw enum values (ticket status, request status, custody event type, alert level), reuse the existing status label helpers and `StatusBadge` that the maintenance/repair screens already use (see `components/features/repair-workflow/maintenance-request-detail-screen.tsx`, `owner-maintenance-screen.tsx`, `components/status-badge/`). Do not create duplicate label maps if a shared one exists; if labels exist only inline in one screen, move them to a shared module under `src/components/features/maintenance-workflow/` and import them from both places.
Alert level select: show labels "Thông tin / Cảnh báo / Nghiêm trọng" but keep the values `Info/Warning/Critical`.

## Done when
`npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, `npx playwright test tests/e2e/maintenance-ticket-actions.spec.ts tests/e2e/maintenance-request-actions.spec.ts` pass, and `node --test tests/*.test.cjs` has no new failures. Print a short per-file summary.
