# Mobile planning and source-audit report — 2026-10-08

The requested planning package and three reusable workflow skills have been prepared. No application implementation or Figma mutation was performed. Mobile-only scope, Technician source, breakpoint, demo-data mode, C-205 preview exception and exclusion of two obsolete action panels are confirmed in [decisions.md](decisions.md).

## Source and coverage

Source file: [Dolores UX/UI](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=0-1). Read all four role canvases by their exact IDs, inspected high-fidelity context/screenshots for four entry screens, traversed explicit reactions structurally, and read text/edges in targeted conflict frames. Existing route/layout/component/demo-state code was inspected read-only.

| Role | Raw root frames | Approved baseline | Excluded | App implemented in this task | App UX/UI status |
| --- | ---: | ---: | ---: | ---: | --- |
| Admin | 97 | 97 | 0 | 0 | NOT_RUN |
| Moderator | 204 | 204 | 0 | 0 | NOT_RUN |
| Technician | 50 | 50 | 0 | 0 | NOT_RUN |
| Customer | 201 | 190 | 11 | 0 | NOT_RUN |
| Total | 552 | 541 | 11 | 0 | NOT_RUN |

The 541 baseline includes one approved content exception (Q05). Frame presence and structural reachability are not test completion. [Audit evidence](evidence/structural-audit.json) records 2,947 raw reaction actions, no observed non-variant navigation outside each role's root-frame set, and 11 unreachable Customer frames. All 11 now have explicit historical/approved exclusion dispositions. Full semantic edge validation, design context for every frame, visual comparison of all states, browser testing, real-device testing, lint/type/build and PC/public regression testing remain future implementation work.

## Findings and proposed Figma fixes

| ID | Classification / severity | Evidence and impact | Suggested Figma fix | Implementation disposition |
| --- | --- | --- | --- | --- |
| F-M01 | Source content defect / High | [M40 `90:22920`](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=90-22920) describes C-205 / C-031 / C-205-signed.pdf, while [preview `90:22977`](https://www.figma.com/design/z34Av71ZjvqjF0AQ0hyQxK/Dolores?node-id=90-22977) visibly says C-204 and C-204-signed.pdf. Wrong-document identity undermines the review flow. | Change the preview frame name, visible title and document label to C-205 / C-205-signed.pdf. Retain close/back semantics; verify the source trigger and every entry to this preview. | Q05 APPROVED: later mobile implementation uses corrected content. Source remains unchanged by this task; PC is not changed. Retest C-205 preview and separately verify C-204 remains C-204. |
| F-M02 | Superseded source frames / Medium | Old Customer action panels `115:22640`, `115:22696` have no path from declared starts. Current controls `115:22638`, `115:22694` target `163:1367`, `163:1375`. Old copy says “Lưu bản chỉnh sửa” while current primary action is “Lưu & gửi đến máy”. | Mark the old panels deprecated/archive in the source and annotate the active replacements. Remove old frames only if the designer wants to clean them up after checking references. Do not reconnect an obsolete alternate flow. | Q06 APPROVED exclusion; preserve inventory rows. Test active replacement panels. No Figma deletion performed. |
| F-M03 | Historical design alternative / Medium | Nine `C39-ALT` mobile frames represent separate draft saving and sending; all are unreachable in this traversal. Existing D-01 records combined save/send approval and active mobile controls agree. | Label/archive the nine alternatives as superseded by combined save/send; update guide `119:12` so it does not imply two independent user steps. Keep acknowledgement distinct from submission. | EXCLUDED_D01, not an unresolved feature request. No reapproval needed. Test cancel, combined confirmation, pending and applied branches. |
| F-M04 | Stale guide statistics / Low | Guide text node `94:60` reports 501 mobile frames. Current four-canvas metadata contains 552, including later C45–C48/private-menu branches. Guide `94:61` claims all frames reachable; current traversal identifies historical unreachable frames. | Regenerate counts after deciding whether archived frames are included. Distinguish raw/active frames and main-entry reachability from multiple-start reachability; timestamp the audit. | Use 552 raw / 541 accepted baseline and current inventories. No source edits or assertions that the old audit was originally false. |
| F-M05 | Documentation/source discovery limitation / Low | Page-list metadata returned only Admin desktop and guide pages, while exact supplied mobile canvas IDs returned complete metadata. | Recheck page listing/tool visibility if needed; retain direct canonical canvas URLs. This is a tool discovery limitation, not evidence that mobile pages are missing or incorrectly designed. | Direct-ID reads succeeded. No implementation blocker. |

Nine excluded mobile draft nodes: `115:22869`, `115:22900`, `115:23047`, `115:23078`, `115:23225`, `115:23256`, `115:23463`, `115:23481`, `115:23499`. Preserve names in the inventory; do not confuse these mobile IDs with the six desktop alternatives recorded by D-01.

## Repository risks and controls

- Shared desktop shell has `min-w-[1024px]`. Plan scoped mobile composition below 1024px and protect all desktop geometry. Verify 1023/1024 boundary explicitly.
- Global CSS and root fonts already serve landing/public pages. Use existing fonts and mobile-scoped values; a token change at root is not acceptable if it changes a protected page.
- Shared demo stores and query-driven views can affect PC even when CSS is isolated. Keep state contracts and a single state owner; include persistence/back/cancel/cross-role tests.
- The working tree already contained changes. No reset, application edit, installation, commit or deploy was performed.
- Repository README is for a Go service; the observed frontend source/package files are the planning basis. No speculative stack migration is proposed.

## Audit limitations and next work

Package validation completed: all three new SKILL.md files passed the bundled skill-creator validator; all relative Markdown links resolve; inventory counts reconcile to 552 raw / 11 excluded / 541 accepted. The existing create-plan skill was preserved. Application tests were not run because this task changes documentation only. The exact requested filenames are playbooks, with companion `dolores-mobile-*/SKILL.md` folders providing valid reusable skill entrypoints; this package was not installed globally.

The first attempt to return full prototype graphs exceeded the Figma tool's 20,480-byte output limit. Those calls were read-only. A narrower summary audit succeeded; its JSON is retained. No full edge graph is claimed to have been exported. Variant internals, conditional flows and all per-frame measurements still need targeted capture during Phase 0.

Next, when implementation is requested, start with [startDesign.md](startDesign.md), refresh the source and approved inventory, specify the chosen vertical slice, capture PC/public baselines, and then implement the scoped mobile foundation. No unanswered user decision currently blocks this planning package. Source defects have been reported with suggestions; the Figma file has not been modified.
