# Dolores — Service SLA management without Technician scheduling

**Purpose:** Add service-commitment tracking to the maintenance and repair flows while keeping employee scheduling outside Dolores.

**Status:** SLA tracking is newly requested by the user on 2026-10-14. The concept is in scope; targets and timer/alert policy are not yet approved. Do not invent numeric service promises.

## Product boundary

Dolores records and surfaces an approved service commitment, the actual service milestones, and whether the target was met. It helps Moderator see which work needs attention and gives Technician the commitment attached to an assigned task. Whether targets come from each contract, a company service policy, or both is **Cần chốt** (OI-19).

Dolores does **not** manage Technician shifts, availability, routes, calendar appointments, automatic dispatch or automatic assignment. Moderator continues to coordinate and dispatch work manually. SLA “due” dates are service deadlines, not employee appointments.

## Role flow

1. **Tenant reports a fault** against the exact rented machine or active same-type replacement. The system records the submission time and links the request to its Tenant, contract, machine/assignment and evidence.
2. **System snapshots the applicable approved SLA source** if one exists. If no target is present, show “Chưa cấu hình SLA”; do not create a default deadline or claim on-time/breached status.
3. **Moderator reviews and manually coordinates a Technician.** The worklist can display the committed response/completion deadlines and elapsed or remaining time. Moderator records dispatch/coordination on the task; the platform does not choose a Technician based on an availability calendar.
4. **Technician sees the assigned task and its confirmed SLA target** and records the actual required milestones, diagnosis, repairs, parts, replacement handover and completion.
5. **System compares actual timestamps to the saved target** only under an approved clock policy. It updates the request and machine histories; Tenant sees the result and whichever commitment details business policy permits.
6. **Admin/Moderator review service performance** from the same request/task records. Each count links to the underlying task; unconfigured SLA records are excluded from on-time/breach metrics.

For preventive maintenance, the confirmed company cycle is every three months within a ten-day window. Dolores may record the obligation window and actual completion for compliance tracking once the window anchor is defined. This must not create a visit booking, staff calendar event, automatic assignment or schedule reminder.

## Proposed record fields (not new business rules)

- Approved SLA terms and effective version/reference, with source (contract or company service policy) recorded once OI-19 decides the allowed source.
- Service request/task ID, contract, Tenant, machine, work type, created time and manual coordination/assignment references.
- SLA target snapshot: target milestone, target duration/deadline and applicable policy version, if approved.
- Actual milestone timestamps required by policy, such as request received, acknowledged, work started and service completed.
- Derived state based only on confirmed rules: `Chưa cấu hình SLA`, `Trong hạn`, `Quá hạn`, `Hoàn thành đúng hạn` or `Hoàn thành trễ hạn`.

The final labels, milestone set, start/stop events and clock calculation are **Cần chốt** under OI-19. Do not infer paused timers, business-hour calendars or legal consequences from these example labels.

## OI-19 — Decisions required before SLA calculations or reminders

- Are response, on-site/remote arrival and repair/restoration separate targets? Which apply to preventive maintenance versus breakdown/repair?
- Are target values written per contract, per service type/company policy, or both? Who can enter/change them and what approved source controls the value?
- Which event starts each timer, which event satisfies it, and can a timer pause while waiting for Tenant access, parts, network or an external party?
- Is the three-month/ten-day maintenance window anchored to handover, last maintenance completion, or a contract-defined date? How are the window's exact start/end dates calculated?
- Should the app issue an approaching-deadline alert? If yes: threshold, repeat interval, recipient and channel. What escalation occurs after breach?
- Which SLA status/details can Tenant see? Are any credits, fees or other consequences specified by contract? Dolores must not create an automatic charge or remedy by default.

Until those answers are recorded, implementation may save request/task timestamps and display any approved source terms, but SLA outcome, alert timing and consequences remain unconfigured/gated.

## Acceptance boundary

- Tenant request, Moderator coordination, Technician work and final result keep the same exact parent IDs and audit trail.
- A configured approved target appears on its exact task and is compared to the corresponding actual milestone only after OI-19 defines the source and clock.
- A task without a target is visibly unconfigured, never falsely counted as on-time or breached.
- Moderator remains the dispatcher; Technician sees assigned work only; no shift, availability, calendar booking or auto-assignment feature is added.
- Maintenance due-window tracking, if enabled, records an obligation and completed evidence, not an employee appointment.
- SLA alerts or breach consequences cannot be enabled until their thresholds, recipients and terms are approved.
