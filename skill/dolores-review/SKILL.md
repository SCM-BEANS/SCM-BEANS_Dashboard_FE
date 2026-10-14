---
name: dolores-review
description: Assess Dolores dashboard implementation completeness against the current Figma inventory, approved decisions, code diff, and test evidence; identify unresolved scope and fidelity gaps.
---

# Dolores Review

Perform an evidence-based, read-only completion review. Do not modify implementation or resolve disputed design/flow choices.

Target: `D:/capstone prj/SCM-BEANS-FE/SCM-BEANS_Dashboard_FE`.

## Mandatory user rules

- Change only PC dashboard pages and states represented in the specified Figma canvases. Keep the landing page and every other out-of-scope page unchanged, including indirect effects from global CSS, fonts, themes, shared components, or redirects.
- Reproduce the Figma design, content hierarchy, component states, and interactions faithfully. Propose any design improvement separately and obtain the user's explicit confirmation before applying it.
- Ask the user immediately when a relevant requirement is unclear. Pause the affected decision; continue independent, unambiguous work.
- Obtain explicit confirmation before any deviation from the Figma flow. Never silently resolve conflicting frames, invent missing destinations, or choose an unapproved alternative.
- Preserve authorization already given in this conversation. Do not request approval again for faithful changes already authorized; a new ambiguity or deviation still needs a decision.

## Procedure

Read [review procedure](../review.md) and [shared Figma guide](../figma-guide.md). Compare requested scope, live Figma evidence, implementation mapping, diff, and test results. Return node-specific findings and a qualified readiness verdict to [Startupdate](../dolores-start-update/SKILL.md).

Resolve local Markdown links from this file's directory. This package is stored at the user-requested project path; do not claim it is globally installed or automatically discovered.
