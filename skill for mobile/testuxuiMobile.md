# Test Dolores mobile UX/UI

Skill entrypoint: [dolores-mobile-test/SKILL.md](dolores-mobile-test/SKILL.md). This playbook specifies future verification; its existence does not mean the application has been tested.

## Inputs and truthfulness

Read [plan](planMobile.md), [decisions](decisions.md), the selected role inventory and the actual implementation diff. Establish role, tenant, route/query, fixture state, browser, viewport, source capture, and permitted side effects. For a planning-only invocation, review the test specification and source evidence; do not claim browser/app test results.

Use the current Figma context and rendered screenshots for the exact approved nodes. Historical C39-ALT and other explicitly excluded frames are EXCLUDED, not missing or passing. A source exception such as the approved C-205 correction must have a decision ID. Do not automatically update a failing baseline to hide a mismatch.

## Required evidence per case

Record `test ID → role → node(s) → route/query → preconditions/fixture → viewport/browser → steps → expected → actual → status → evidence → decision/issue`. Use PASS, FAIL, BLOCKED, NOT_RUN or EXCLUDED. Store later screenshots/logs under task-specific evidence paths and reference them from the run report. Redact credentials and personal data; use existing demo fixtures.

## Visual and mobile layout

- At 390×844, compare every accepted frame/state to its Figma reference: copy, hierarchy, wrapping, weights, line-height, colors, margins/gaps, border/radius, assets, metric/card arrangement and fixed-region geometry.
- Capture top, middle, bottom and overlay states for long pages. Ensure the last field/card/chart label remains reachable by scroll; content outside the current viewport is not automatically a clipping defect.
- Verify bottom action bar versus bottom navigation stacking, safe-area padding, browser toolbar changes, viewport height, virtual keyboard, landscape, zoom and long Vietnamese text. Do not stretch a reference screenshot as an implementation asset.
- Exercise 320/360/375/390/414/768/1023px widths and 1024px boundary. The additional widths test robustness; unapproved tablet redesign is not an expected result. Surface ambiguous reflow decisions rather than inventing new columns/navigation.
- Validate every static image/SVG against its actual source slot, local availability, callsite, proportions and rendered bounds. No broken or expiring Figma URL assets, substituted icons, or improvised machine model.

## Navigation and input

- Tap each primary/secondary action, bottom tab, “Tác vụ”, “Khác”, filter and item drill-down. Assert exact role, selected entity, source transition kind, destination and return state.
- Inspect OPEN/CLOSE, overlay-backdrop behavior, cancel, browser back/forward, direct entry and refresh. Preserve scroll/input/filter state where source specifies it. If source is silent about a material behavior, report/ask; do not quietly choose.
- Test field focus, edit, valid/invalid submission, required components, units, disabled/pressed state, upload simulation and error recovery shown in source. Cancelling must not commit; repeated confirmation must not duplicate demo records/outcomes.
- Verify component variants as well as page navigation. Prototype CHANGE_TO is not a URL. Touch behavior must not depend solely on hover.
- On unrecognized IDs/paths, preserve current guards/not-found behavior. Do not fabricate a destination or leak another role's data.

## Role and cross-role cases

| ID | Journey | Required outcome |
| --- | --- | --- |
| A-ACCOUNT | Admin creates Customer/Moderator/Technician; Moderator creates Customer | Correct forms, role selector and allowed actions. No newly exposed staff creation in Moderator. |
| A-REVENUE | Gross/revenue/deposit and report filtering | Correct separate meanings, source units/labels and selected period/customer. |
| M-BILL | Late cups with locked versus editable bill | Locked paid/reconciled bill carries cups to next period; eligible editable bill recalculates/resends; invoice history preserved. |
| M-PREVIEW | Open signed document for C-205 | C-205 title/file under approved Q05; C-204 flow remains C-204. |
| T-RESULT | Assigned job → appropriate form → confirm → result | Correct task/machine, validation and returned result; no unrelated task updated. |
| X-DEPOSIT | Moderator retrieval → Technician assessment → Moderator settlement → Customer status | Assessment precedes settlement; compensation/refund branches and amounts stay consistent. |
| X-SUBSTITUTE | Same-type replacement → use period → return | Main contract association and Smart cup allocation maintained; standard machine gains no telemetry. |
| X-BUYBACK | Assessment/collection/documents/Customer acknowledgement/refurbishment | Acknowledgement tracked separately; does not block agreed collection; correct document/record ownership. |
| C-MACHINE | Standard versus Smart, offline last-known data and two-angle model | Correct capabilities and timestamps/status; no invented GPS/remote control/free-rotation 3D. |
| C-MENU | Adjust water/coffee/milk/both → cancel or combined save/send → pending → applied | Units/mandatory ingredients correct; cancel commits nothing; applied only after simulated acknowledgement; Global Menu/other customers unchanged. |
| C-REEDIT | Edit already-applied menu and return via monitoring/menu screens | Latest approved values persist across relevant states without reverting to an older branch. |
| C-ADD | C45–C48 add eligible private dish or unsupported dish | Unsupported state is accurate; eligible flow passes through confirmation/waiting/applied. |
| C-PAYMENT | Simulated proof → reconciliation → shortfall/excess/refund | Correct record and state; no real upload/payment or production call. |

Expand these journey cases with exact inventory node IDs during Phase 0; they are not a substitute for state-level coverage.

## Accessibility and usability checks

Check semantic buttons/links, accessible names, labels and error associations, heading order, focus visibility/return, keyboard operation, dialog focus containment, selected/expanded/disabled state, screen-reader reading order, zoom/reflow and reduced motion. Check measured contrast and usable CSS-pixel tap bounds. Use current web guidance when making standards claims; do not copy native pt/dp thresholds into web requirements. Do not claim an accessibility certification from a checklist or screenshot.

A generic UX recommendation never authorizes overriding Figma. Report source contrast/target/flow defects with measurements, propose a correction and request approval where the correction changes the design. Apply no unrelated visual improvements.

## PC and out-of-scope regression

- Compare against pre-change PC baselines at 1024/1280/1440px, across every consumer of changed shared shell/UI/state modules, including overlays/forms and browser navigation.
- Check landing and public `/about`, `/products`, `/pricing`, `/solutions`, `/technology`, plus unrelated auth/settings/tools affected by layout/provider imports at narrow and wide widths.
- Compare fonts, computed styles, spacing, content, redirect behavior, focus, route guards and state mutations. A mobile-only CSS selector is insufficient proof if shared component logic changed.
- Separate pre-existing mismatches from regressions introduced by this implementation. Do not repair out-of-scope mismatches.

## Commands and exit criteria

After application changes: run package-defined lint, TypeScript checking and build as specified in the plan; run relevant available browser checks. Record command, exit status and failures. There is no declared `npm test` script; do not invent one or install a framework merely to claim test coverage. For meaningful state tests, assert behavior (cancel, ownership, locked bills, acknowledgement), not implementation strings.

Cover available Chromium and actual Safari/Chrome mobile when access exists; mark unavailable real-device/engine checks NOT_RUN. Emulation is not equivalent to a real device.

Pass a slice only when all its approved state/edge cases pass, assets match, business outcomes are correct, and protected baselines show no new regression. BLOCKED/NOT_RUN are not PASS. Retest after relevant fixes; avoid rerunning unaffected suites without reason. Hand results to [reportMobile.md](reportMobile.md).
