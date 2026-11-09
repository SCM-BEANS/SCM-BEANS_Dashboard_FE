# Owner "Máy của tôi" (/dashboard/machines): UI polish

Planner/reviewer: Claude · Implementer: Codex. FE only; you may read `C:/GitHub/BEANS/dolores_platform`, never modify it. Do not commit, push or install. Write every file as UTF-8 and keep Vietnamese diacritics; never write `?` in place of Vietnamese letters. Follow `plans/action-bar-ux.md` for actions. Reuse existing components and styles (`StatusBadge`, `TruncatedId`, `DataTable`, `MachineDetailView` summary cards, `customer-shell.module.css`, `machines.module.css`) and keep the look consistent with the Admin/Moderator machine screens. Do not change BE calls beyond the location-name lookup described below.

Main file: `src/pages/dashboard/machines/machines-screen.tsx`.

## Issues seen on the running page (Owner, desktop 1440px)

### List view
1. **Raw English status:** the Trạng thái column shows "under maintenance" / "available for rent". Render the Vietnamese label in a `StatusBadge`, reusing the shared machine status label map if one exists (e.g. `MACHINE_STATUS_LABELS` or the Admin/Moderator `statusLabels`; move it to a shared module if it lives inside a page). Apply the same label map in the detail view.
2. **Header toolbar is disjointed:** "Vệ sinh ngày 09/11/2026" sits alone, with "Làm mới" floating right and the filter chips on a separate row. Make one toolbar row:
   - left: the type filter chips (Tất cả máy / Smart IoT / Thông thường);
   - right: a muted label "Dữ liệu vệ sinh ngày dd/mm/yyyy" followed by "Làm mới".

   It must wrap cleanly on mobile.
3. **Summary is tiny** ("2 máy của tôi"). Replace it with a row of summary cards in the same style as the detail view's 4 cards:
   - Tổng số máy;
   - Smart IoT;
   - Thông thường;
   - Đang bảo trì (status under maintenance; use the real enum value).

   Compute them from the loaded list (not the filtered subset). Do not invent connection counts, because heartbeats only load for visible rows.
4. **Add an "Điểm bán" column** that shows the location name. Read the Owner's locations once with the existing locations API that the Owner locations screen already uses, map `locationId` to name, and show "Kho" when `locationId` is null and "—" when the name cannot be resolved. Do not add N per-row requests.
5. **Consistency:** a conventional machine's Kết nối cell shows "Không áp dụng" in muted text, the same as the cleaning column.

### Detail view
6. Mã máy: use `TruncatedId` (short and copyable) instead of the full UUID.
7. Trạng thái: a Vietnamese `StatusBadge` (same map as item 1).
8. Điểm bán: show the location name (from the same Owner locations lookup, or `locationsApi.getById`), "Kho" when null, never the raw UUID.
9. "Xem dữ liệu vận hành": remove the full-width link from the info card. Add it as a secondary `PageActions` action (`href`, priority 0), shown only for Smart IoT machines. The existing bar has Xem lịch sử bảo trì, Chuyển điểm bán, Tạo phiếu bảo trì; it overflows correctly.
10. **Machine contract history** (`src/components/machines/machine-contract-history.tsx`, shared by every role):
    - wrap it in the same card/panel style as the other sections;
    - style the Trạng thái `<select>` like the app's other filter selects;
    - style its pagination like the invoice list ("Trang trước", "Trang N", "Trang sau" buttons).

    Keep its behaviour and API calls unchanged; verify the Admin/Moderator screens still look right.
11. **Maintenance section:** each ticket currently appears twice: a card ("Phiếu bảo trì · Đã xử lý / TERMINATION_INSPECTION") and again as "Chi tiết phiếu 75d66e42" buttons from `MachineMaintenanceTicketActions`.
    - Show each ticket once: a card with the status badge, date, a Vietnamese label for `preventiveSubtype`/`source` (reuse `src/components/features/maintenance-workflow/maintenance-status-labels.ts` or add the missing labels there), and a "Xem chi tiết" button that opens the same ticket panel the old button opened.
    - Prefer changing `MachineMaintenanceTicketActions` so every role gets the improved card list, and drop the Owner screen's own duplicate card loop.
    - Keep its PageActions (Tạo phiếu bảo trì) and ticket panel behaviour.
12. Use the same toolbar as item 2 on the detail view.

## Tests
- Update `tests/e2e/*` specs that assert the old texts or layout (grep "Chi tiết phiếu", "Vệ sinh ngày", "Xem dữ liệu vận hành", "máy của tôi"), keeping the behaviour assertions.
- Add an Owner machines e2e (mocked API, owner cookie). Cover:
  - list status badges in Vietnamese, the location name column, and the summary card counts;
  - detail: a truncated ID, the location name, a single card per ticket with "Xem chi tiết" opening the panel, and "Xem dữ liệu vận hành" in the action bar only for Smart IoT;
  - at 390×844 the toolbar wraps without horizontal scroll.

## Done when
- `npx tsc --noEmit -p .`, `npm run lint` and `npm run build` pass.
- The full `npx playwright test tests/e2e` passes except the known `buyback-collection-payment.spec.ts:151` and `landing-page.spec.ts:169`.
- `node --test --test-reporter=tap tests/*.test.cjs` reports exactly 91 `not ok`.
- `git diff -U0 | grep '^+'` has no mojibake (`[A-Za-z]?[a-z]`).
- Restore `debug.log` if changed.

Print a per-file summary.
