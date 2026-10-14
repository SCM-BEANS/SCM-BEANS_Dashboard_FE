# Dolores update orchestration

Entry point: [dolores-start-update](dolores-start-update/SKILL.md). Its mandatory rules apply.

## Skill routing

Resolve these links from this document, not from the shell's current directory.

| Work | Skill | Playbook / evidence |
| --- | --- | --- |
| Admin | [dolores-admin](dolores-admin/SKILL.md) | [Admin.md](Admin.md), Figma `3:2` |
| Moderator | [dolores-moderator](dolores-moderator/SKILL.md) | [moderator.md](moderator.md), Figma `3:3` |
| Technician | [dolores-technician](dolores-technician/SKILL.md) | [technician.md](technician.md), Figma `3:4` |
| Customer | [dolores-customer](dolores-customer/SKILL.md) | [customer.md](customer.md), Figma `3:5` |
| Verification | [dolores-testing](dolores-testing/SKILL.md) | [testing.md](testing.md) |
| Completion review | [dolores-review](dolores-review/SKILL.md) | [review.md](review.md) |

Shared source and approval gates: [figma-guide.md](figma-guide.md).

These are instructions to execute in the active task, not background jobs or an installed scheduler. Do not spawn subagents just because this orchestration skill is invoked. If the user separately authorizes parallel agents, give them bounded ownership and prevent concurrent edits to shared components.

## 1. Establish the actual task

- Read the user's latest request and existing authorizations. “Create/revise skills” means change the skill package only. “Apply the Figma UX/UI” authorizes faithful implementation within the stated scope.
- Read applicable repository instructions, inspect Git status, and preserve pre-existing user changes.
- Confirm the target is `SCM-BEANS_Dashboard_FE`; inspect its actual framework, route groups, layouts, auth/role routing, components, data services, and package scripts.
- Load the installed `figma:figma-design-to-code` skill when implementation begins, before any design-context call.
- Do not require a second confirmation for already authorized faithful implementation. Ask only where the user's scope or design/flow intent still needs a decision.

## 2. Refresh Figma and map scope

- Read guide `0:1` / `3:68` and relevant role canvases. Inspect exact target frames, common components, variants, screenshots and prototype destinations.
- Refresh the role inventories. Frame count changes are evidence to investigate, not permission to extend the user's assignment to another platform.
- Build the handoff mapping defined in the shared guide, including modal/filter/error/success states and cross-role outcomes.
- Map onto existing routes and services. A frame is not necessarily a URL, and a role is not necessarily a new route group.
- Protect landing/public pages and out-of-scope account/auth pages from direct and indirect changes.
- If existing role routing or an API contract cannot support the shown flow without a product decision, present the concrete mapping issue and ask.

## 3. Resolve ambiguity without stopping independent work

- Check recorded decisions and current conversation before asking.
- Apply confirmed decision D-01: the Customer saves and sends the private menu in one user operation, using the existing combined confirmation. Exclude the six C39-ALT draft alternatives listed in the shared guide. Do not ask the user to choose this again or implement independent draft saving.
- Keep submission and machine acknowledgement distinct. If the service contract cannot support the confirmed action, ask about the specific integration gap; do not silently change the approved flow.
- Show conflicting node IDs, current behavior, options and their consequences in a focused question.
- Continue only the portions that do not depend on the missing answer. Time passing is not approval.
- Record accepted decisions and affected nodes in the task record. Keep proposals separate from approved changes.

## 4. Implement confirmed slices

- Extract exact dashboard-scoped component properties from Figma, then implement approved slices with the relevant role skill.
- Start with common UI needed by the selected slices. Preserve route/data contracts and avoid global styling effects.
- Follow dependency order for shared journeys: for example Technician assessment before verifying Moderator settlement, and Moderator document upload before Customer acknowledgement.
- Choose manageable slices containing their connected states, not only attractive overview screens.
- Use live assets and current design values. Missing Figma access/assets/edges require evidence or a question; approximate redesign is not a fallback.
- Maintain the mapping and status record as changes land. Do not commit, push, deploy, or edit the Figma source unless separately authorized.

## 5. Run the requested testing/review loop

When the user's requested workflow includes testing/review, as in this full update workflow:

1. Run [testing](dolores-testing/SKILL.md) for the implemented slice.
2. Run [review](dolores-review/SKILL.md) using actual test and visual evidence.
3. Return in-scope discrepancies to the owning role skill and fix them under the existing authorization.
4. Obtain confirmation for any proposed design/flow deviation discovered during correction.
5. Rerun affected checks and review the remaining findings.

Do not loop indefinitely around the same missing credential, inaccessible source, unknown hardware bound, or unresolved user choice. Record the specific blocker, request what is needed, and finish independent work. Do not mislabel that blocker as completed.

## 6. Report completion truthfully

Report in Vietnamese:

- Which roles/screens/states changed, with file links and Figma references.
- What was verified and by which commands/screenshots/interaction checks.
- Concrete remaining mismatches, decisions, unavailable integrations or checks not run.
- Whether the application implementation changed or only the skills were created/revised.

Completion requires all authorized work and required verification to be accounted for. Do not guarantee pixel-perfect or full functional completion without corresponding evidence.
