# Start Dolores mobile design work

Skill entrypoint: [dolores-mobile-start/SKILL.md](dolores-mobile-start/SKILL.md). This document is its execution playbook. Resolve paths relative to the document containing the link.

## Establish the requested mode

1. Read the latest request, [decisions](decisions.md), [plan](planMobile.md), and relevant role inventory. Preserve existing authorization; do not re-ask settled questions.
2. If asked to plan/revise skills, edit this package only. If asked to implement mobile, execute faithful approved slices. If asked to test/report, use the corresponding skill; testing alone does not authorize unrelated fixes. The current request authorizes faithful mobile implementation under the approved scope.
3. Read applicable repository instructions and Git status. Preserve user edits, including dirty shared components. Do not commit, push, deploy, or modify Figma unless separately requested.
4. Select the requested role/journey and its connected states. Do not spawn agents merely because this is an orchestration skill. Run sequentially unless the user separately authorizes delegation.

## Refresh source and specification

- File key: `z34Av71ZjvqjF0AQ0hyQxK`. Guide `0:1` / `3:68`; Admin `87:12`; Moderator `87:13`; Technician `87:14`; Customer `87:15`.
- Use the installed Figma plugin. Load `figma:figma-design-to-code` before design-context calls. Use exact node IDs and screenshots, inspect child nodes for sparse responses. Load `figma:figma-use` before read-only prototype/variant inspection. Do not execute canvas writes.
- Inventory all target nodes, including action panels, filters, variants, confirmations, errors and return paths. Reconcile fresh frames against the inventory; addition to Figma is evidence to review, not permission to expand platform scope.
- Complete the per-frame handoff contract in planMobile.md before implementing a slice. Verify active versus historical alternatives. D-01 combined save/send remains authoritative; Q05/Q06 dispositions live in decisions.md.
- If a relevant requirement is unclear, ask immediately with exact nodes and consequences; pause only that decision. Continue independent work. Never invent an endpoint, destination, confirmation step, missing state or alternate design.

## Execute an authorized implementation slice

- Mobile applies below 1024px, PC from 1024px. Only allowlisted role routes/states may change. Landing, other public pages, unrelated tools/settings/auth and all PC states must remain unchanged directly and indirectly.
- Inspect existing route/layout/component/state consumers before edits. Use matching existing components and assets; add scoped mobile composition where needed. No global CSS/font/theme/redirect changes that alter protected pages.
- Preserve existing simulated data contracts and role/entity selection. Do not add live integrations or change shared PC behavior to make mobile easier. Keep one state owner and prevent duplicate hidden controls or mutations.
- Follow dependency order and business invariants in the plan. Implement complete journeys, not disconnected reference screenshots. Use current approved source values; match content hierarchy, state, interaction and motion.
- For a discovered Figma defect, record evidence and propose a source fix. Ask before any deviation; an existing explicit exception already recorded does not need approval again. Do not silently implement a “better” design.

## Test, correct and report

1. Run [testuxuiMobile.md](testuxuiMobile.md) for each complete slice and its affected regression surface.
2. Fix demonstrated in-scope implementation mismatches under existing implementation authorization, then retest affected cases. Stop the affected work on a newly unresolved source conflict.
3. Run [reportMobile.md](reportMobile.md); distinguish source defects from code defects, historical exclusions and unavailable tests.
4. Resume from evidence and state already recorded on later turns. Do not restart finished work or relabel untested screens as done.
5. Finish only when the user's requested mode is complete. Planning completion means a usable plan/skills with honest evidence and remaining decisions, not application completion. Implementation completion requires the plan's acceptance checks.
