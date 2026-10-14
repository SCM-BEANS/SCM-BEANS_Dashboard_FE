# Mobile scope and decision register

Updated: 2026-10-08. This register and the current conversation control the plan. A pending decision blocks only its dependent work. Elapsed time is never approval.

| ID | Status | Decision / evidence | Consequence |
| --- | --- | --- | --- |
| D-M01 | CONFIRMED, current user | Only mobile; keep PC and landing unchanged. | The original copied “PC dashboard pages” rule is corrected to mobile pages/states in the four named canvases. Protect all other pages, including indirect effects. |
| D-M02 | CONFIRMED, current user | Technician is canvas `87:14`, not `87:13`. | Use four distinct role canvases. |
| D-M03 | CONFIRMED, current user | Mobile below 1024 CSS px; PC from 1024 CSS px. | Test 1023 and 1024 boundary widths. A tablet below 1024 belongs to mobile scope. |
| D-M04 | CONFIRMED, current user | UI and existing simulated flows only. | No production API integration, real uploads/payments/device commands, backend changes, or live credentials required. |
| D-M05 | SUPERSEDED by current user request, 2026-10-08 | The earlier turn requested planning only; the current turn explicitly requests mobile implementation using startDesign.md. | Faithful mobile implementation is now authorized within all other scope limits. No repeated approval is needed. |
| D-01 | EXISTING CONFIRMED decision | `../skill/figma-guide.md` records the user's 2026-10-02 answer: “lưu và gửi cùng một lần”. Current mobile C38-60/C38-20G say “Lưu & gửi đến máy” and target combined confirmations. | Preserve the combined save/send operation. Never reopen a save-only alternative. Distinguish sent/pending from machine applied. Mobile `C39-ALT` counterparts are historical alternatives, excluded by this decision. Do not copy desktop node IDs as mobile IDs. |
| Q05 | CONFIRMED, current user, 2026-10-08 | “Duyệt sửa nội dung popup mobile thành C-205”. M40 `90:22920` is C-205 / C-031 / C-205-signed.pdf; source preview `90:22977` still displays C-204. | On later implementation, use C-205 and C-205-signed.pdf in this mobile preview. This is an approved source exception, not a Figma edit or permission to change PC. Do not ask again. |
| Q06 | CONFIRMED, current user, 2026-10-08 | “Đồng ý loại hai popup cũ”. `115:22640`, `115:22696` are replaced by active `163:1367`, `163:1375`. | Exclude the two old panels from implementation/acceptance, preserve source inventory for traceability. Do not delete Figma nodes. |

## Decisions needed only when their evidence is available

- At 390×844, reproduce exact frames. For 320–1023 widths, inspect constraints and reflow the same hierarchy. If there are multiple materially different options (e.g. centered narrow panel versus full-width tablet, new columns, relocated navigation), show the affected screen and options immediately; do not silently choose. Breakpoint approval is not approval for a tablet redesign.
- If an in-scope flow requires an unshown empty/error/recovery state, record the trigger and missing destination; ask before adding new visible UI. Technical implementation details that preserve the approved behavior do not require repeated permission.
- If a source accessibility defect requires changing geometry, colors, wording, focus visuals, or interaction, report measured evidence and propose a narrow fix. Do not use generic best practices to overwrite Figma.
- Fresh source edits may invalidate a recorded mapping. Compare node-level changes and preserve decisions unless the user explicitly supersedes them.

## How to record a reply

Update the existing row with the exact accepted behavior, date, affected nodes, and any conditions. Update the relevant inventory disposition and test expectations in the same documentation change. Keep source facts distinct from approved implementation exceptions. Never label an exception as unchanged Figma fidelity.
