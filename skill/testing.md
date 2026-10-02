# Dolores testing procedure

Entry point: [dolores-testing](dolores-testing/SKILL.md). Its mandatory scope and confirmation rules apply.

## Inputs and evidence

Require the exact changed frame/state IDs, confirmed decisions, route/component mapping, current diff, data source/fixture information, and available test environment. Read [shared guide](figma-guide.md) and the applicable role playbook.

- Inspect existing package scripts and test setup before choosing commands. Run only verification authorized by the user's task; do not install a new testing stack as a side effect.
- Keep code/static checks, visual comparison, interaction checks, and real integration checks separate. Passing one does not prove the others.
- Use local or explicitly approved test environments and records. Do not send real machine commands, settle bills, refund deposits, dispatch jobs, or mutate production accounts merely to test UI.
- If authentication, fixtures, service availability, fonts/assets, or browser access are missing, record exactly which checks are blocked and request the needed information. Do not substitute a mocked result and call the real integration passed.

## Verification sequence

1. **Scope/diff:** confirm every changed application surface maps to an authorized Figma frame/state. Inspect shared dependencies for effects on landing/public/auth/account pages outside scope.
2. **Code:** use applicable existing type-check, lint, build, and focused test commands when authorized. Record commands, exit status, and relevant errors; distinguish pre-existing failures from introduced failures using evidence.
3. **Visual:** open the application and source frame at matching viewport dimensions and states. Compare actual screenshots and Figma properties.
4. **Interactions:** exercise the live mapped transitions and component variants, including error/cancel/back paths. Cover separate error prototype starts where present.
5. **Role/data boundaries:** verify the business invariants affected by the change.
6. **Preservation:** inspect unchanged public/landing pages if shared code could affect them. This is a regression check, not authorization to redesign those pages.
7. Return findings to the implementing role and recheck corrected cases plus affected adjacent behavior.

## Visual comparison checklist

For every changed screen/state, inspect:

- Dolores logo/assets, labels, typography, line breaks, alignment and hierarchy.
- Sidebar/header/workspace geometry; navigation state; fixed/scrolling areas.
- Spacing, panel sizing, borders, radii, fills, shadows and density.
- Tables, row heights, columns, filter selection, pagination if designed, units, formatting and status badges.
- Buttons, inputs, uploads, checkbox variants and notices; focus/hover/pressed/disabled/error states where defined.
- Modal/overlay placement, confirmation text, cancel/back behavior and destination.
- Machine illustration and transition behavior as actually specified.

Do not invent a pixel threshold or call the screen “100% identical” from a single screenshot. Record concrete differences and whether screenshot comparison is affected by dynamic data, font rendering, or missing assets.

## Interaction and business matrix

| Area | Required checks when affected |
| --- | --- |
| Admin accounts | Correct Customer/Moderator/Technician forms; no inferred new Admin creation |
| Moderator accounts | Customer creation only; no staff-management exposure |
| Tenant context | Selected customer/store/contract/machine is preserved; other customers' records and menus remain inaccessible |
| Standard vs Smart | No telemetry/GPS/remote menu for standard machines; correct Smart states |
| Financial display | Gross receipts, revenue excluding deposits, and deposits remain separate |
| Late cups | Paid/reconciled → next cycle; eligible editable bill → recalculate/resend |
| Retrieval/settlement | Technician outcome precedes Moderator settlement/refund |
| Substitute machine | Same type, correct issue/return associations, Smart cups assigned by period |
| Used-machine purchase | Document acknowledgement tracked independently; dispatch not blocked solely by acknowledgement |
| Private menu | D-01 combined save/send confirmation and submission; correct ownership/target, units, required ingredients, discard/error/support; six independent-draft alternatives excluded |
| Asynchronous outcomes | Saved/uploaded/sent/pending/acknowledged/applied/verified are not conflated |

Use the source flow and actual service contract for expected results. Do not add invented negative states to the UI to satisfy a test.

## D-01 save-and-send acceptance cases

- Confirming the existing combined dialog saves the private menu and initiates sending to the selected eligible machine in one user operation, with no separate draft-save or second send step.
- Canceling before submission causes no save/send side effects; invalid input follows the existing Figma validation path without submitting invalid data.
- A successful submission displays the relevant pending state. Only a machine acknowledgement permits an applied state; saving or dispatch acceptance alone is insufficient.
- Check the water, coffee, milk, and combined quantity variants affected by D-01, preserving ownership, units, ingredients and target machine.
- If saving or dispatch fails, verify the existing agreed error behavior and truthful status. If partial-failure recovery is undefined, mark that specific case blocked on the service/design contract; do not invent rollback or automatic retry behavior.
- Record the six C39-ALT nodes in the shared guide as excluded by D-01. Their absence from the implemented flow is expected, not a coverage failure. Keep them visible in the raw inventory/exclusion accounting.

## Result format

| Case | Role and Figma node | Route/state and action | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |

Use **Pass**, **Fail**, **Blocked**, or **Not run**. Include command output or screenshot references, environment/viewport, and reproducible steps. Record unapproved branches as Blocked. Explicitly separate fixture-only checks from live service checks.

Summarize verified scope, failures, blocked cases, checks not run, and affected files. A build pass alone is insufficient to certify visual/flow completion.
