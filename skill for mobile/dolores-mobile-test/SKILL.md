---
name: dolores-mobile-test
description: Verify Dolores mobile web against approved Figma screens and flows, including mobile usability and PC/public regression checks. Use for testuxuiMobile requests or verification of an implemented mobile slice.
---

# Dolores mobile UX/UI verification

Read [testuxuiMobile.md](../testuxuiMobile.md), [decisions.md](../decisions.md), and the relevant inventory. Follow the evidence contract and distinguish PASS, FAIL, BLOCKED, NOT_RUN and EXCLUDED.

Compare exact approved state/node/route/fixture combinations; test interactions as well as visual fidelity. Protect PC from 1024px and all public/out-of-scope pages at every width. Testing a plan is not running application tests. Test-only requests do not authorize unrelated implementation or Figma edits. Route evidence and source defects to [reportMobile.md](../reportMobile.md); obtain explicit approval before a design/flow deviation.
