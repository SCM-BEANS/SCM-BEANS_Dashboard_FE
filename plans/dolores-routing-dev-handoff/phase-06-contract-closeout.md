# Phase 06 — Expiry, termination, deposit settlement and new contract

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Complete end-of-contract journeys while keeping machine recovery, Technician assessment, final usage/billing, Moderator settlement and external refund as separate linked events. Preserve normal expiry, early termination, contract violation and new-contract paths without inventing enforcement.

## Concrete tasks

- Add one-month-before-expiry reminder target and Tenant response/new-contract interest. No response means the current contract ends normally. No automatic renewal.
- Treat exact reminder dispatch date/channel as a provider/policy boundary until OI-08 is answered; keep target record and reminder audit separate from contract state.
- Record normal expiry, Tenant early-stop request/effective use cutoff or Moderator violation record with exact contract and machine. Do not infer effective stop time from a UI click when the signed agreement governs it.
- Moderator asks Tenant to prepare the machine; create recovery work for Technician. Non-cooperation remains governed by the contract/company process, not automated enforcement.
- Technician physically collects and assesses the exact machine before the Moderator settlement action is enabled. Preserve collection, condition and damage against contract/machine/recovery task.
- Calculate only approved rent/PAYG terms: multi-month final month base rent follows the confirmed full-month rule; a same-month start/end uses actual rental time; valid cups stop at use cutoff. Keep date/rounding policy behind OI-05/OI-06.
- Build settlement per actual deposit received, linked bills and allowed deductions. Damage is deducted; damage over deposit is an amount owed. Notify Tenant after Technician's result and track the eligible external refund, due within 10 working days Mon–Sat excluding Sunday from Moderator notification, once OI-14 interactions are resolved.
- Keep final Smart invoice waiting for complete data through cutoff. If it overlaps deposit decision/refund timing, keep that settlement/refund path gated by OI-14; do not substitute an estimated PAYG amount.
- Continue rental only by closing the old lifecycle and creating a separate externally signed contract, with one eligible primary machine assignment. No renewal or extension mutation.

## Dependencies

- P02 contract/machine/task records; P05 Technician recovery/assessment.
- P03 final Smart data readiness and P04 payment/deposit receipt ledger.
- `[NEEDS CLARIFICATION]` OI-05/OI-06 date/proration/rounding/overdue rules; OI-07 short payment behavior; OI-09/OI-10 final usage completeness; OI-14 refund clock vs pending final bill/deduction order; OI-08 expiry reminder details.

## Affected files and modules

- Existing UI/state: `src/components/PrototypeApp.tsx`, `src/lib/demo-store.tsx`, `src/lib/prototype.ts`.
- Routes: `/customer/contracts`, `/customer/contracts/:contractId`, `/moderator/contracts/:contractId`, `/moderator/technical-requests/new`, `/technician/tasks/:taskId`, `/moderator/deposits`, invoice details, notification targets, and `/moderator/contracts/new` for a genuinely new contract.
- Future contract closeout, recovery, assessment, settlement, refund tracking and calendar policy modules: TBD after ADR.

## Verification / acceptance (planned only)

- MF-10/S01–S02 through MF-14/S01–S02 cover 10 source scenarios with distinct old contract, recovery, assessment, settlement and new contract IDs.
- No-response expiry does not silently renew. A new agreement produces a new contract ID and independent dates/machine.
- Moderator cannot settle before a Technician assessment for the exact contract/machine exists.
- Damage/deduction cannot exceed actual held deposit without recording the excess owed; refund never exceeds eligible actual remainder.
- 10-day refund deadline begins from Moderator notification following Technician result, subject to the specific OI-14 final bill condition; if that condition is unresolved, UI must show a blocked/draft state instead of a fabricated deadline.
- Multi-month, same-month, cutoff, Sunday and timezone boundaries remain blocked from production money movement until OI-05/OI-06 policies are accepted.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-14 is a P1 gate for the refund clock when the final Smart bill is waiting. Do not resolve it by forcing a premature bill or delaying all unrelated recovery work.
- `[NEEDS CLARIFICATION]` OI-05/OI-06 and OI-07 gate actual charges, date math and short/rejected submissions.
- Contract violation does not imply automatic lock, penalty, or collection if the contract/company process has not recorded it.
