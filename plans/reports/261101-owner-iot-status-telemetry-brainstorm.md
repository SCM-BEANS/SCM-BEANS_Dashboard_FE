# Brainstorm: Shared machine and IoT experience across roles

**Date:** 2026-11-01

## Ideas Explored

- **Use the existing machine status only:** Keep showing the operational/lifecycle status from the machine resource. This requires no extra calls, but it does not tell an Owner whether a Smart IoT device is currently connected.
- **Add live heartbeat only:** Show the current `ONLINE`, `OFFLINE`, or `UNKNOWN` state. This answers the immediate connectivity question, but gives no history for diagnosis.
- **Add live heartbeat and telemetry history:** Put a separate connection badge on each machine in the list; in machine details show the latest heartbeat and health fields plus a historical telemetry view. This matches the Owner's selected scope and keeps the list scannable.
- **Include offline violation review in the Owner view:** This would surface review records and decisions, but it mixes an operational review workflow into the IoT status screen and Owner access was not explicit in the reviewed Swagger descriptions. Excluded from this scope.
- **Combine maintenance schedule and telemetry in one status panel:** Rejected because next maintenance/cups-since-descale and online liveness answer different questions. Keep maintenance separate and reuse its existing API.
- **Build separate IoT screens for each role:** The current code already diverges this way, but it causes the same information to look different and creates inconsistent permission/error states. Prefer common presentation with role-specific data and action capabilities.

## User's Direction

The user selected **live status plus telemetry history**, with an `ONLINE`/`OFFLINE`/`UNKNOWN` badge in both the machine list and detail page. The user confirmed a 24-hour default, quick ranges for 24 hours, 7 days, and 30 days, plus a custom range. The existing maintenance schedule remains separate.

The user then provided a four-screen reference flow:

1. **Machine list:** retain filters and scan-friendly machine rows/cards; selecting a machine opens its detail.
2. **Machine detail (reference 1):** show contract and location context, machine connection/tracking state, usage/fee summaries when APIs support them, and machine history. A bottom/primary action opens “Xem dữ liệu vận hành”; the 3D action is a later feature.
3. **Operational data (reference 3):** show period summary cards, valid cups by day, machine/contract context, and a clear route back to the machine detail.
4. **3D model (reference 4):** defer until model assets/data are ready.

The user wants Admin, Moderator, and Owner to follow the same visual pattern and operational-overview flow. They chose to keep the same layout when a role lacks telemetry-points permission, while showing a clear permission state in that panel. Dashboard totals must be labeled by role scope; a selected machine in the view is context only because the confirmed dashboard endpoint returns role aggregates rather than machine-filtered values.

The intended screen model is:

1. Machine list: retain current machine lifecycle status and add a distinct IoT connection badge for Smart IoT machines.
2. Machine detail: show the latest heartbeat, last-seen time, and available health metrics; below it, provide a field selector and time-series/history view for telemetry.
3. Keep the current preventive-maintenance section intact and visually separate.

## API Findings

- `GET /api/v1/telemetry-query/machines/{machineId}/heartbeats/latest` allows ADMIN/MODERATOR and the machine's Owner to read the latest heartbeat. The API returns `ONLINE`, `OFFLINE`, or `UNKNOWN`; its description says consumers should poll every 5 seconds and defines liveness using a 10-second age threshold. Health is independent of liveness.
- `GET /api/v1/telemetry-query/machines/{machineId}/points` allows ADMIN, OWNER, and TECHNICIAN within permitted machine scope. It requires `from` and `to`, and supports `limit` and `offset`; Swagger defaults to 100 points and offset 0.
- Telemetry points are generic records with timestamp, field, value, and machine ID. Since field names/value types can vary, the UI should derive selectable fields from the returned data rather than assume a fixed set.
- `GET /api/v1/machines/{id}/maintenance-schedule` is already used by Owner machine detail and returns next preventive maintenance time plus cups served since last descale.
- `GET /api/v1/dashboard/overview?fromDate&toDate` returns role-scoped aggregate `cupsInSelectedPeriod` and `dailyAcceptedCupUsage` suitable for period totals and a daily chart. Swagger defaults to 7 days and allows up to 90 days. Admin is system-scoped, Moderator sees operational data without financial metrics, and Owner is limited to its own scope. The endpoint does not provide the reference flow's per-machine breakdown.
- The FE has a `dashboardApi.getDailyMachineCupUsage` helper for `/dashboard/daily-cups/machines`, but no matching path appeared in the live Swagger document. Do not use it as a confirmed contract until the backend team verifies the route and role permissions.
- The user chose to use only verified aggregate data in this phase and defer per-machine cup/PAYG values until a documented API exists.
- Telemetry ingestion and federated-weight POST endpoints are device/data-write flows, not Owner dashboard read calls.
- Telemetry points are not the same as accepted-cup billing totals. Until metric semantics are verified, use dashboard aggregate data for accepted cups and use telemetry points for available machine telemetry fields.
- Offline violation review endpoints concern review records, not live connectivity. The reviewed GET descriptions did not explicitly confirm Owner permission, so this work excludes them pending a separate permission check.

The live document was checked at `http://100.75.202.72:8082/v3/api-docs`; the Swagger UI provided by the user is at `http://100.75.202.72:8082/swagger-ui/index.html#/`.

## Current FE Component Audit

- No shared machine-detail or IoT-monitoring UI component exists under `src/components`; its existing shared components are low-level pieces such as `DataTable` and navigation/action UI.
- Owner machine list/detail logic is in `src/pages/dashboard/machines/machines-screen.tsx`. It calls machine list/detail, maintenance schedule, contract history, maintenance tickets, and owner maintenance requests. It does not call heartbeat or telemetry-points.
- Admin machine detail is implemented separately in `src/pages/admin/machines/machine-detail-screen.tsx`; it calls heartbeat and telemetry points. Admin IoT overview is separately implemented in `src/pages/admin/iot/index.page.tsx`.
- Moderator machine detail is separate in `src/pages/moderator/machines/machine-detail-screen.tsx`; it calls heartbeat and displays an explicit no-permission message for telemetry points. Moderator IoT is another separate implementation in `src/pages/moderator/iot/iot-screen.tsx` and contains telemetry query code, so its current behavior should be reconciled with Swagger's role list.
- Moderator machine detail imports `adminStyles` from the Admin shell. This shares styles, not a reusable machine or IoT component.
- Shared API helpers and Zod schemas already exist in `src/apis/telemetry.api.ts` and `src/schema/telemetry.schema.ts`. A future implementation can preserve these APIs while consolidating the visual panels under `src/components` and keeping each role's route, data scope, and permitted actions in its page.

## Suggested Component Boundary

- Put reusable list/detail/IoT presentation in a focused `src/components/machines` domain folder. A small set of components should own the common visual structure: machine list presentation, machine detail sections, and the Smart IoT/telemetry panel.
- Keep page-level queries, role scope, and permitted actions in the existing Owner/Admin/Moderator pages. Give the shared presentation data and capability props so a consistent layout can show data, a permission state, or a role-specific action area without granting API access through the UI.
- Reuse the existing `DataTable`, `BackButtonHeading`, `machinesApi`, `telemetryApi`, and Zod schemas where their responsibilities fit. API parsing/validation stays in the existing shared API/schema layer; query enablement remains role-aware in each page.
- Keep the 3D viewer as a later standalone capability; the shared screen can reserve an action entry without pretending a model is already available.

## Open Questions

- Confirm with backend owners whether a bulk heartbeat endpoint or explicit rate limit exists. The currently documented heartbeat endpoint is per machine, so list-level polling needs visibility-aware requests and staggering.
- Verify real telemetry field distributions and available sample counts against representative Owner machines before choosing chart defaults or aggregations.
- Per-machine valid-cup and PAYG totals are deferred until there is a documented API; current Owner overview is aggregate and the FE's daily per-machine helper has no corresponding path in live Swagger.
- Moderator points permission follows the user's decision: keep the shared layout and show content/permission state according to the role's current API access.

## Plan Validation Decisions

- Use separate date controls: the operational overview uses calendar ranges (Today, Yesterday, This week, Last week, Last 30 days, This month, custom) with the dashboard's seven-day default; telemetry keeps rolling 24h/7d/30d/custom date-time ranges.
- Put a prominent disclosure on the operational overview that the selected machine is navigation context only and displayed dashboard totals aggregate the authenticated role's scope.
- Share presentation components only. Each role page retains its own API queries, authorization scope, and actions.

## Risks

- **Request fan-out:** One heartbeat request per machine can load the API if an Owner has many machines. Query only visible machines, stagger requests, pause when the page is hidden, and consider a bulk endpoint.
- **Misleading status:** A network error must not become `OFFLINE`; the API's `UNKNOWN` state and FE request failure need separate visuals.
- **Variable telemetry:** Hard-coded charts may show empty or incorrect data if machines report different fields/types. Derive fields from returned points and keep non-numeric events readable.
- **Cross-role permission mismatch:** Shared UI must not imply identical API access. Moderator's telemetry-points permission is absent from the current Swagger role list, despite a query implementation in the Moderator IoT page.
- **Unsupported metric claims:** Per-machine valid-cup and charge totals in the reference remain deferred; they must not be inferred from an aggregate or from contract unit price.
