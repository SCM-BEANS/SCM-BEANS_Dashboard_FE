# Report Dolores mobile work

Skill entrypoint: [dolores-mobile-report/SKILL.md](dolores-mobile-report/SKILL.md). This is reporting guidance; planning findings live in [reportMobile-initial.md](reportMobile-initial.md), and the partial implementation report lives in [reportMobile-run-2026-10-08.md](reportMobile-run-2026-10-08.md).

## Gather evidence

Read [decisions](decisions.md), the requested scope, [plan](planMobile.md), inventories, Git diff and actual test evidence. State whether the report covers planning, implementation, testing or source audit. Never infer application completion from document creation or Figma reachability. Do not send the report externally or change the Figma source.

## Write the report

1. Lead with concrete outcome, scope, date and limitations.
2. Give role totals for approved/in-progress/verified/blocked/excluded frames and tested interactions. Explain the denominator and identify new/deleted source nodes. Do not mix raw frames, variants, actions and unique user journeys as the same metric.
3. Link changed files, source nodes, screenshots, command logs and decisions. List viewport/browser/fixture for visual and behavioral evidence. Separate tests actually run from proposed tests and unavailable environments.
4. Separate implementation defects, Figma source defects, source-document staleness, approved exceptions and optional improvements. Source problems are not automatically implementation permission.
5. For each finding record: ID, severity, role, exact node(s), observed fact, reproduction, expected/approved behavior, impact, proposed Figma fix, proposed code handling, decision status, affected dependency and retest criterion.
6. Ask immediately about new material ambiguity; pause its dependent action and continue independent work. Check earlier decisions first. Include the user's exact accepted behavior once answered.
7. End with the next concrete work package and remaining blockers; do not hide NOT_RUN/BLOCKED cases behind “complete”.

## Severity and disposition

| Classification | Meaning |
| --- | --- |
| Critical | Wrong tenant/role action, incorrect transaction outcome, destructive unintended behavior. |
| High | Main journey blocked, wrong entity/document, hidden/unusable primary action. |
| Medium | State inconsistency, source duplication/ambiguous branch, meaningful visual/accessibility mismatch. |
| Low | Documentation staleness or minor visual mismatch without blocked work. |

Use proposed severities with rationale; a hypothetical risk is not an observed critical defect. Frame exclusions require a decision ID. Improvements remain proposals until explicitly accepted. If a source defect is fixed by an approved implementation exception, keep it visible until Figma is aligned; do not claim the source is fixed.

## Useful report structure

- Outcome and mode.
- Source/version and scope, with approved exception list.
- Per-role coverage and journey status.
- Findings table and concrete fix suggestions.
- Test evidence and PC/public regression results.
- Pending decisions and next work package.

Do not overwrite this playbook with results. Add a dated run report only when reporting is part of the user's requested work, and link it from the task handoff. Preserve earlier evidence and unrelated user edits.
