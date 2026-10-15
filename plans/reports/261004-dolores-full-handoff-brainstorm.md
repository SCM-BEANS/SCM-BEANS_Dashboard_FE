# Brainstorm: Full Dolores developer handoff review

**Date:** 2026-10-04

## Ideas Explored

- Use current routes as the UI map and add a flow catalog, state/record contracts, permission checks and acceptance coverage. This retains the existing screen intent while giving developers operational rules.
- Rebuild navigation before backend work. The audit did not find this is the highest risk; most of the 48 role route patterns are useful as a prototype shell. Broken context links and missing record deep links should be corrected as part of handoff/implementation.
- Treat Figma/prototype clicks as behavior. Rejected because the UI stores demo data in localStorage and contains real deviations from latest SRS, notably payment cutoff, delayed cups, refund, task associations and inventory release.
- Treat the latest SRS U-01…U-11 as precedence over older draft statements, while preserving unresolved OI items. This corrects stale assumptions without inventing criteria.
- Organize developer work by entity lifecycle and role rather than by route alone. Bills, work tasks, machine assignments, menu versions and buyback/settlement need their own IDs and transitions.

## User's Direction

The user asked for a complete review to make the handoff understandable to developers implementing the correct web logic. They requested the brainstorm workflow. The expected result is an audit-ready package tied to current routes and the approved Dolores business baseline, with open decisions labeled rather than guessed.

## Open Questions

- **[NEEDS CLARIFICATION: OI-07]** If a Tenant confirms payment, which stops reminders and late accrual, but Moderator later rejects the proof or finds a short payment, when do reminders/charges resume and how are partial receipts allocated/rounded?
- **[NEEDS CLARIFICATION: OI-14]** If Technician finishes recovery assessment while final Smart IoT usage still needs to sync, when does Moderator notify settlement and when does the 10-working-day refund clock begin?
- Final usage completeness proof, calendar/proration details, report refund presentation and external device/file/security contracts remain mapped in open-decisions.md.

## Risks

- Existing payment and deposit demo state can apply another contract's evidence/assessment or compute the wrong due/revenue values.
- A role path, fixed C-204/09-2026 samples and machine-ID heuristics can leak or misattribute data once multiple customers/machines are real.
- Unresolved payment exceptions and final-bill settlement timing can cause inconsistent debt/reminder/refund decisions if developers fill them in independently.

