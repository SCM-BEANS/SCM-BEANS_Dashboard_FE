# Open decisions and clarification ledger

**Rule:** These items are absent, incomplete or explicitly open in SRS v1.1. Preserve the confirmed behavior around each one. The developer may design a reversible placeholder, but must not ship an invented business rule as agreed. Source IDs are kept for traceability.

## High priority before the affected business logic is finalized

| Priority | Decision | Confirmed so far | Still needs answer |
|---|---|---|---|
| **P1 / OI-07** | Payment submission rejected or Moderator finds a short amount | Late fee and reminders stop when Tenant uploads evidence and presses Confirm. Reconciliation is separate. A 5% daily compound formula applies to remaining unpaid amount once late. | If proof is invalid or a short balance remains after cutoff, should reminder/accrual resume from original due-time schedule, when Moderator marks it short, or other rule? How allocate partial amounts and round? **Question sent to user; awaiting answer.** |
| **P1 / OI-14** | Refund deadline when the final bill is pending sync | Deposit refund eligible remainder is due within 10 working days Mon–Sat after Moderator notifies Tenant of Technician result. Final Smart bill must wait complete usage through cutoff. | If an ending contract's last bill is still awaiting data when Tech assessment finishes, does Moderator wait before sending settlement notice/starting refund deadline, or send notice and run refund clock while final bill completes? **Question sent to user; awaiting answer.** |
| **P1 / OI-09/OI-03/OI-10** | Evidence that final Smart usage is complete | Last bill waits for all usage through rental/use cutoff, including offline days; ordinary late usage carries forward. | Device/cloud completeness watermark/close event; representation of zero-sale days; replacement boundary; event ID/duplicate/retry handling; what company does for permanently lost records. No minimum-online-day threshold is approved. |
| **P1 / OI-05/OI-06** | Calendar and actual-time calculations | Payment term counts Monday–Saturday, not Sunday. Mid-month start charges actual rental time; same-month start/end actual rental time. | Proration denominator, inclusion of start/end dates, rounding; whether issue/notice day is day one; public holidays, timezone/cutoff, whether overdue compounding counts Sundays/holidays. |
| **P1 / OI-17** | Report-period revenue and refunds | Revenue is reconciled money received; Gross includes deposit and Actual excludes it. External refunds keep evidence and confirmation. | Report period attribution, refund gross/net display, unreturned overpayment treatment, classification of installation/service/late fees in Actual Revenue. |
| **P1 / OI-19** | Service SLA policy for preventive maintenance and repair | User requests SLA tracking to make service commitments visible and avoid turning Dolores into a Technician scheduling tool. Moderator manually coordinates/dispatches; the existing preventive cycle is every 3 months within a 10-day window. | Exact response/arrival/repair targets and approved source (contract, service policy or both); whether each is a deadline or business-hours clock; start/stop/pause milestones; preventive-window anchor and date calculation; “approaching breach” thresholds, reminder cadence/channel and escalation; Tenant-visible SLA detail; any contractual consequence for breach. Until agreed, store/show no default target, no SLA pass/breach and no generated appointment/automatic assignment. |

## Remaining source questions for later implementation planning

| Source ID | Open item that must not be silently decided |
|---|---|
| OI-01 | Latest user clarification resolves permissions: Admin creates/manages all three account roles, creates/manages shops, sets Tenant status and grants Tenant access; Moderator may create Tenant accounts and manage customer contracts within scope, but cannot administer shops/status/access or staff accounts. Still confirm Tenant↔shop cardinality and the exact account-to-shop setup sequence. Exact status values/transitions remain in OI-02/OI-13. |
| OI-02 | Authentication, credentials, password reset, activation/deactivation and session lifetime are unspecified. The path-based prototype is not a login/session model. |
| OI-03 | Real device model capabilities/payloads, fields, units, capacity and telemetry reporting are not provided. Do not assume unmentioned sensor metrics or machine recipe capabilities. |
| OI-04 | Online/offline determination, report cadence, stale display, GPS accuracy and what to do after contract-specific offline limit are open. Offline limit breach does not authorize automatic lock/penalty. |
| OI-08 | Reminder channel, dispatch time, first reminder, month-before-expiry date interpretation are unspecified. Daily reminder cessation after upload+Confirm is confirmed; rejected/short payment outcome is OI-07. Preventive schedule reminders are excluded; SLA alert timing and recipients are separately open under OI-19. |
| OI-12 | Global/device version IDs, offline queue, retry/cancel, simultaneous edits and conflicts when Global removes/incompatibly changes a drink are open. Preserve private recipe values; never overwrite silently. |
| OI-13 | Full state catalogs, permitted correction/deletion, uploaded file types/size/retention, mandatory fields and evidence correction rights are not specified. |
| OI-15 | Same-type-only replacement is confirmed. Stock-shortage company procedure, service-return available criteria and full inventory state taxonomy are not specified. |
| OI-16 | Disputed/failed buyback payment, canceled purchase and unsuccessful collection process are open. Agreement's collection condition still applies. |
| OI-18 | Supported clients, performance/accessibility/availability/concurrency/backup targets, security controls and device API/protocol are absent. Do not invent non-functional targets. |

## Explicitly resolved; do not ask or code the old answer

| Clarification | Resolved answer |
|---|---|
| OI-11 / Global recipe preservation | U-06 resolves: preserve Tenant private recipes/drinks on Global updates; make new base viewable, Tenant can choose to adopt through existing capability and machine confirmation. An update must not overwrite a private 60 ml recipe with a new 50 ml base. |
| Earlier final-bill “online day” wording | U-07 resolves waiting for all usage data through rental/use cutoff including offline. This is not a count of online days and not the negotiated offline cap. |
| Earlier reissue-old-bill wording | U-02/U-07 resolve ordinary delayed cups to following month; final bill waits for complete dataset. Do not reissue the old ordinary bill for delayed cups. |
| Earlier reminder cutoff vs reconciliation | U-08 resolves cutoff at upload + Confirm timestamp. Moderator may reconcile later. OI-07 addresses exceptions after reject/short. |
| Account and shop permissions (G01) | Latest user clarification supersedes the older OI-01 wording in SRS v1.1. Admin creates/manages Tenant, Moderator and Technician accounts, shops, Tenant status and access. Moderator may create Tenant accounts and manage scoped customer contracts only; Moderator cannot manage shops, Tenant status/access or internal staff accounts. Only Tenant↔shop cardinality/setup sequence and exact status lifecycle remain open. |
| New-contract continuation | No renewal. Expired rental ends through normal lifecycle; if continuing, execute a new independent contract. |
| Replacement type | U-10 requires same type. No cross-type exception. |
| Buyback receipt confirmation | Collection according to signed agreement can proceed while Tenant acknowledgement is tracked separately. Show the waiting status where relevant. |

