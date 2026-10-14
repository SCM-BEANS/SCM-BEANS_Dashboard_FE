# Dolores completion review

Entry point: [dolores-review](dolores-review/SKILL.md). Its mandatory rules apply. Review is read-only.

## Inputs

- User-authorized scope and explicit decisions.
- Current Figma guide, role inventories, screenshots/properties and prototype evidence.
- Frame → route/component/state handoff.
- Current application diff and working-tree baseline.
- [Testing results](testing.md), including failed, blocked, and unrun cases.

If an input is missing, state the specific review limitation. Do not infer completeness from a developer's summary or from frame names.

## Review dimensions

1. **Coverage:** every in-scope screen, dialog, filter, validation, confirmation, success and relevant transition is mapped. Pending alternatives and explicitly excluded items are accounted for separately.
2. **Visual fidelity:** implementation evidence matches the source layout, assets, typography, spacing, component states and copy. Proposed improvements are not silently included.
3. **Flow fidelity:** actions, guards, destinations, cancel/back behavior, role boundaries and asynchronous states match confirmed source behavior.
4. **Business semantics:** verify affected invariants in [shared guide](figma-guide.md), especially billing eligibility, deposits, purchase acknowledgement, retrieval/settlement and menu ownership.
5. **Integration honesty:** sample values, fixtures and disconnected services are identified. No false claim of real upload, payment, telemetry, menu delivery or machine acknowledgement.
6. **Scope preservation:** examine direct edits and shared CSS/layout/provider/component impact. Landing/public pages remain unchanged unless separately authorized with design evidence.
7. **Implementation fit:** changes use current project patterns and preserve existing authentication/data contracts; no unrelated refactor, global rebrand or speculative endpoints.
8. **Evidence quality:** test results actually cover the changed states and journeys; reported errors have reproducible evidence.

## Findings format

| Severity | Role / node | File or route/state | Evidence | Expected versus actual | Needed action |
| --- | --- | --- | --- | --- | --- |

- Critical: wrong-role/tenant access or misleading financial/device outcome.
- Major: broken required flow, missing required state, or substantial design mismatch.
- Minor: localized visual discrepancy that still must be resolved for fidelity.
- Decision needed: conflicting/unclear Figma intent about an action, guard, destination, state transition, or required business outcome; this is not permission to select a design.

Treat all Figma values as illustrative. A difference in sample names, IDs, amounts, dates, or other display data is not a finding or decision blocker by itself; raise it only when it changes a user action, destination, state, or confirmed business invariant. Prioritize flow fidelity in the completion verdict.

Classify severity by observed impact. Do not invent issues merely to populate categories.

## Completion accounting

Report counts against the **current authorized inventory**, not a remembered Figma total or a range of screen numbers:

- In scope, mapped, implemented.
- Visually checked and flow checked.
- Passed, failed, blocked, not run.
- Explicitly excluded or pending user decision, with reasons.

Apply confirmed D-01 when reviewing Customer menus: the combined save-and-send action is required; independent draft saving is excluded. Account for the six exact C39-ALT nodes in the shared guide as excluded by user decision, not blocked or missing. Reject a separate draft/send flow or an applied status shown before machine acknowledgement. Historical “Cần chốt” frame names do not reopen the settled choice.

If a percentage is requested, state its numerator and denominator and separate implementation coverage from verified coverage. Never count blocked/unknown work as passed or hide exclusions by shrinking the denominator.

## Verdict and handoff

Use one of:

- **Ready within confirmed scope:** required screens/flows have sufficient evidence, with any explicitly accepted limitations listed.
- **Needs fixes:** list concrete discrepancies to return to the owning role.
- **Blocked on decision or evidence:** identify the exact unresolved item and what would unblock it.

Unrelated finished work can be reported as complete while a specific branch remains blocked. Do not declare the entire dashboard finished when required branches or verification remain outstanding. Review does not authorize code edits, commit/push, deployment or Figma changes.
