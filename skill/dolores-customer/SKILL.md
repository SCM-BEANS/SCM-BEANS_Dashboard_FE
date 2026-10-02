---
name: dolores-customer
description: Implement the Dolores Customer PC dashboard from Figma page 3:5, preserving tenant boundaries, contracts, machine views, billing, support, and private menu workflows.
---

# Dolores Customer

Use this skill for the Customer role only. Target project: `D:/capstone prj/SCM-BEANS-FE/SCM-BEANS_Dashboard_FE`.

## Mandatory user rules

- Change only PC dashboard pages and states represented in the specified Figma canvases. Keep the landing page and every other out-of-scope page unchanged, including indirect effects from global CSS, fonts, themes, shared components, or redirects.
- Reproduce the Figma design, content hierarchy, component states, and interactions faithfully. Propose any design improvement separately and obtain the user's explicit confirmation before applying it.
- Ask the user immediately when a relevant requirement is unclear. Pause the affected decision; continue independent, unambiguous work.
- Obtain explicit confirmation before any deviation from the Figma flow. Never silently resolve conflicting frames, invent missing destinations, or choose an unapproved alternative.
- Preserve authorization already given in this conversation. Do not request approval again for faithful changes already authorized; a new ambiguity or deviation still needs a decision.

## Required references

1. Read [shared Figma guide](../figma-guide.md) for source authority, component references, business invariants, and evidence requirements.
2. Read [Customer implementation instructions and frame inventory](../customer.md). The inventory is a dated discovery aid; refresh the live canvas before changing a screen.
3. Follow applicable repository instructions and inspect the current worktree before editing.

## Execution

- Apply confirmed D-01 in the shared guide: one combined save-and-send user action, with the existing Figma confirmation; exclude the six independent-draft alternatives. Do not ask for this choice again. Show machine-applied only after acknowledgement.
- Load the installed `figma:figma-design-to-code` skill before design-to-code work or any `get_design_context` call. Use the tool names available in the current session.
- Retrieve the target frame's design context, screenshot, component variants, and actual prototype transitions. Metadata alone does not establish visual properties or navigation edges.
- Map each requested Figma frame/state to existing routes and components before editing. A modal, filter, success, or error frame does not automatically require a new route.
- Reuse existing architecture and real data bindings. Isolate Dolores styling to authorized dashboard surfaces. Do not migrate APIs, alter permissions, or replace working behavior with sample data to mimic a screenshot.
- Implement confirmed screen groups and their connected states. If live Figma is inaccessible or contradictory, ask for the missing evidence/decision; do not approximate.
- Hand off changed node IDs, files, route/state mapping, data limitations, and pending decisions to [testing](../dolores-testing/SKILL.md), then [review](../dolores-review/SKILL.md), when those stages are authorized by the task.

## Completion

Report implemented scope and unresolved items with evidence. Never call a role complete solely because its main dashboard renders.
