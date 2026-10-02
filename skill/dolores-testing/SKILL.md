---
name: dolores-testing
description: Verify implemented Dolores dashboard screens against their Figma frames and confirmed flows, including visual fidelity, interactions, role boundaries, and out-of-scope regressions.
---

# Dolores Testing

Check only work requested for verification. Report evidence and gaps; do not redesign or silently fix product decisions.

Target: `D:/capstone prj/SCM-BEANS-FE/SCM-BEANS_Dashboard_FE`.

## Mandatory user rules

- Change only PC dashboard pages and states represented in the specified Figma canvases. Keep the landing page and every other out-of-scope page unchanged, including indirect effects from global CSS, fonts, themes, shared components, or redirects.
- Reproduce the Figma design, content hierarchy, component states, and interactions faithfully. Propose any design improvement separately and obtain the user's explicit confirmation before applying it.
- Ask the user immediately when a relevant requirement is unclear. Pause the affected decision; continue independent, unambiguous work.
- Obtain explicit confirmation before any deviation from the Figma flow. Never silently resolve conflicting frames, invent missing destinations, or choose an unapproved alternative.
- Preserve authorization already given in this conversation. Do not request approval again for faithful changes already authorized; a new ambiguity or deviation still needs a decision.

## Procedure

Read [testing procedure](../testing.md) and [shared Figma guide](../figma-guide.md). Load the relevant role skill and implementation handoff. Run authorized checks, record exact outcomes, and return reproducible discrepancies to the responsible role skill. Testing may inspect out-of-scope pages to confirm preservation; it does not authorize changing them.

Resolve local Markdown links from this file's directory. This package is stored at the user-requested project path; do not claim it is globally installed or automatically discovered.
