# Spec: Shared machine and Smart IoT experience for Owner, Moderator, and Admin

**Date:** 2026-11-01
**Status:** Ready

---

## Problem Statement

The Owner machine flow currently shows operational status and maintenance information, but not live IoT connectivity or historical telemetry. Admin, Moderator, and Owner also have separate machine views. The experience should follow one visual flow—machine list, machine detail, then operational overview—while each role continues to use only data and actions permitted by its API scope.

## User Stories

- **[P1]** As an Owner, I want to see each Smart IoT machine's live connection state in the machine list so that I can quickly identify machines that are online, offline, or have unknown status.
  Accepted when: each listed Smart IoT machine has a separate connection badge sourced from the heartbeat endpoint; it is visually distinct from the machine's operational status.

- **[P1]** As an Owner, Moderator, or Admin, I want the machine list and detail views to share the same visual structure so that I can recognize the same machine information and IoT status across roles.
  Accepted when: all three role routes render the shared machine information/IoT presentation components while retaining role-specific data scope and action controls.

- **[P1]** As an Owner, I want the machine detail page to show its latest heartbeat and available health information so that I can understand when the device last reported and whether health metrics are available.
  Accepted when: the detail view displays status and last-seen/report timestamps when present; absent health fields are omitted or shown as unavailable rather than fabricated.

- **[P1]** As an Owner, I want to inspect telemetry over time so that I can understand how a selected machine has been behaving.
  Accepted when: I can choose a telemetry field actually returned for that machine, query a date range, and view numeric values as a time series and other values as timestamped records.

- **[P1]** As an Owner, Moderator, or Admin, I want to open an operational overview from machine detail so that I can review cup and available financial totals within my role's data scope.
  Accepted when: the overview shows the originating machine context while prominently labeling dashboard metrics as aggregate role-scope totals (the selected machine is navigation context only), offers calendar-based quick ranges and a custom range, and only renders financial fields returned for that role.

- **[P2]** As an Owner, I want quick date ranges and a custom range so that I can move between recent and longer-term telemetry without manually entering dates each time.
  Accepted when: the controls include the last 24 hours, 7 days, 30 days, and a custom date-time range; the default is the last 24 hours.

- **[P2]** As an Owner, I want a future 3D model view for a machine so that I can inspect the equipment visually.
  Accepted when: this is planned as a later phase after a real model asset and delivery source are available.

## Functional Requirements

1. **FR-01 — Shared presentation:** Provide common machine list/detail and Smart IoT presentation components under `src/components/machines` for Admin, Moderator, and Owner. Keep route ownership, API authorization, data loading, and role-specific actions in each role's page; pass capabilities/data into shared presentation rather than treating UI reuse as shared permission.
2. **FR-02 — Machine list connection state:** For Smart IoT machines visible in each role's permitted machine list, fetch `GET /api/v1/telemetry-query/machines/{machineId}/heartbeats/latest` where that role is authorized. Display only the API-provided `ONLINE`, `OFFLINE`, or `UNKNOWN` state, separately from `machine.status`.
3. **FR-03 — Machine detail flow:** Selecting a machine opens a detail view following the first reference image: key information and tracking, contract/location context, latest connectivity, and machine history. An explicit “Xem dữ liệu vận hành” action opens the operational overview; role-specific actions remain in the page's action area.
4. **FR-04 — Operational overview:** Follow the third reference image with period-level cup metrics, a daily accepted-cup chart, originating machine/contract context, and a route back to machine detail. Provide the same visual flow for all three roles through role-specific routes. Use `GET /api/v1/dashboard/overview?fromDate&toDate` for permitted aggregate dashboard data: Admin system scope, Moderator operational scope without financial data, and Owner scope derived from JWT. Prominently state that totals are role-scope aggregates and the selected machine is context only. Provide calendar-date presets for Today, Yesterday, This week, Last week, Last 30 days, and This month, plus a custom range; default to the API's seven-day calendar period. This calendar control is separate from telemetry's rolling date-time range. Dates are inclusive, no later than today, and limited to 90 days.
5. **FR-05 — Metric integrity:** In this phase, show only aggregate cup/financial values returned by the authorized dashboard endpoint and contract terms that can be labeled accurately. Do not split an Owner-wide aggregate into per-machine values or label a contract unit price as a billed amount. Per-machine accepted cups and PAYG totals are deferred until a documented endpoint exists.
6. **FR-06 — Machine detail heartbeat:** Show heartbeat state, last-seen/device-reported time when returned, and available health metrics such as Wi-Fi RSSI, RAM, latency, and firmware/app versions. Do not expose stream entry IDs as user-facing content.
7. **FR-07 — Live refresh:** Refresh heartbeat while the relevant screen is active, using the Swagger-documented 5-second interval. Pause when the page is hidden. On list screens, query only visible/rendered Smart IoT machines and stagger requests to avoid request bursts.
8. **FR-08 — Telemetry history:** Query `GET /api/v1/telemetry-query/machines/{machineId}/points` with required `from` and `to`, plus `limit` and `offset`. Use pages of 100 points and provide load-more when another page is available. Admin and Owner can use this endpoint within their permitted scope. Keep the Moderator panel in the same visual position but show a clear permission state until Swagger grants that role access.
9. **FR-09 — Dynamic fields and date controls:** Build selectable fields from telemetry actually returned for the machine/range. Plot numeric values over time and present non-numeric values as timestamped records. Default to the last 24 hours; include 24h, 7d, 30d, and custom range controls. Validate the range before requesting.
10. **FR-10 — Clear request states:** Provide loading, no-data, and retryable error states independently for heartbeat, dashboard metrics, and telemetry. API/network failure must not be labeled `OFFLINE`; `UNKNOWN` must remain distinct from unavailable.
11. **FR-11 — Preserve maintenance information:** Keep `GET /api/v1/machines/{id}/maintenance-schedule` in a separate maintenance section, including next preventive maintenance and cups since last descale.
12. **FR-12 — Model view later:** Reserve the machine-model view shown in the fourth reference image for a later phase. Do not claim a working 3D model until a real model asset and delivery source are available.
13. **FR-13 — Owner scope:** Send only machine IDs already returned in the authenticated Owner's machine scope. Handle `401`/`403` without retry loops and explain when the account cannot access telemetry.

## Non-Functional Requirements

- **Performance:** Heartbeat detail refresh interval is 5 seconds while visible, as described by Swagger. Telemetry requests use pages of 100; only one request per selected machine/range/offset is in flight at a time.
- **Security:** Use the authenticated session and server-derived Owner scope. Do not accept an Owner ID from user input to widen access.
- **Availability:** Heartbeat and telemetry failures must not block the machine profile or its maintenance schedule.
- **Accessibility:** Connection states must include text labels and must not rely on color alone. Date controls, field selection, and load-more must be keyboard accessible.
- **Date semantics:** Dashboard quick ranges use calendar dates; telemetry quick ranges use rolling date-time intervals. Keep their controls and labels distinct.

## Success Criteria

- [ ] Every visible Smart IoT machine in the Owner list shows one of `ONLINE`, `OFFLINE`, `UNKNOWN`, loading, or unavailable; API errors are never presented as `OFFLINE`.
- [ ] Admin, Moderator, and Owner machine views use the same shared detail/IoT presentation components while preserving each role's own action controls and API permissions.
- [ ] Selecting “Xem dữ liệu vận hành” from a machine detail opens the period overview; selecting “Về chi tiết máy” returns to the originating machine.
- [ ] Aggregate cup totals and daily accepted-cup chart are sourced from the role-scoped dashboard endpoint and reflect the selected date range; a prominent note identifies the scope and says the selected machine is navigation context, not the metric filter.
- [ ] Operational overview offers Today, Yesterday, This week, Last week, Last 30 days, This month, and custom calendar dates, with a seven-day default and a 90-day maximum; telemetry retains separate rolling date-time controls.
- [ ] A machine detail heartbeat refreshes every 5 seconds while visible and stops polling when the page is hidden or inactive.
- [ ] An Owner can load telemetry for 24h, 7d, 30d, and a valid custom range; requests use `from`, `to`, `limit=100`, and the correct `offset`.
- [ ] Numeric telemetry fields render with timestamps and units only when the API provides units; non-numeric fields remain readable as timestamped records.
- [ ] Heartbeat/telemetry errors do not prevent access to the existing machine profile, contracts, or maintenance section.

## Out of Scope

- Offline violation review decisions or financial actions.
- Telemetry ingestion (`POST /api/v1/telemetry/{machineId}`) and federated-weight submission.
- Changes to backend authorization, data retention, device firmware, or heartbeat thresholds.
- Changes to the existing machine lifecycle status semantics or preventive-maintenance calculations.
- Implementing or delivering a 3D machine model in this phase.

## Assumptions

- The Owner can read heartbeat and telemetry only for machines in the Owner scope derived from the authenticated JWT, as described by the live Swagger document.
- `ONLINE`, `OFFLINE`, and `UNKNOWN` are computed by the API. Its current description defines `ONLINE` as a latest liveness signal no older than 10 seconds, `OFFLINE` as older than 10 seconds, and `UNKNOWN` when no retained liveness or active device mapping exists.
- Telemetry fields and value types can vary between machines. UI presentation must be data-driven.
- The Owner machine list can contain multiple machines; list polling should be visibility-aware and staggered because the available heartbeat endpoint is per machine and no bulk endpoint was found in the reviewed Swagger paths.
- The shared design means a common visual structure, not identical role permissions or identical action buttons.
- Owner dashboard overview data is restricted by JWT. Its default period is 7 days and the Swagger contract allows up to 90 days.
- Dashboard overview applies role-specific scope: Admin system-wide, Moderator operational data without financial metrics, and Owner's own data. The selected machine in the page provides context but does not filter the aggregate endpoint to that machine.

## Open Questions

- Confirm with backend owners whether a bulk heartbeat endpoint or documented rate limit exists before implementation; if one becomes available, use it to reduce per-machine request fan-out.
- Verify real telemetry field distributions and available sample counts against representative machines before choosing chart defaults or aggregations.
- Per-machine accepted cups and PAYG totals are deferred; the FE helper route `/dashboard/daily-cups/machines` was not present in the live Swagger document reviewed. Revisit only after the backend documents an authorized endpoint.
