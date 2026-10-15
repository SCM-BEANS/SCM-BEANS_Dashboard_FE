# Phase 04 — Billing, payment evidence and reconciliation

**Mode: Hard** · **Risk: high-risk** · **Status: planned only**

## Objective

Complete external-transfer billing as an auditable sequence of invoice, Tenant submission, Moderator bank comparison, reconciled receipt allocation and external refund record. Keep deposit separate from recurring charges and recognized revenue.

## Concrete tasks

- Define persisted invoice and line-item records from contract terms: conventional rent 1.5M VND/month; Smart base 750k VND/month plus 1k VND per valid cup; installation/other charges only as agreed; deposit is a separate 10M VND contract/machine amount.
- Issue regular monthly invoices on the last calendar day of the month. Record issue time and due cutoff, then calculate the 10 working-day period using Monday–Saturday excluding Sunday as confirmed; resolve timezone/date boundary before production calculations.
- Produce first-month billing for rent, deposit, installation and applicable agreed charges. Do not call issuance or customer submission revenue.
- Provide Tenant private proof upload plus explicit Confirm action; persist immutable submission ID and timestamp. Stop late fee/reminder at the confirmed submission time for the agreed case.
- Provide Moderator internal company-bank evidence/reference entry and comparison to Tenant proof. Record reconciliation outcome, amount, actor and time separately. Only actual Moderator-reconciled receipts count as received revenue.
- Preserve partial submissions, retries and proof history. Prevent duplicate receipt allocation/idempotent re-submission.
- Implement daily compounding on unpaid balance only after due cutoff: prior unpaid amount × 1.05. Use exact arithmetic/rounding policy approved through OI; do not compound a deposit or overpayment by assumption.
- Handle confirmed overpayment as an external bank refund record with evidence/reference. Do not imply funds were sent by Dolores.
- For ordinary Smart bills, carry late-arriving cups to the next period without reopening/reissuing old invoice. Integrate complete final Smart period only after P03's completeness gate.
- Build invoice detail and confirmation/success/exception states for Customer and Moderator. Company-only bank proof must not be exposed to Tenant.

## Dependencies

- P01 auth/scope/private storage, P02 contract and agreed commercial terms.
- P03 event/assignment data for Smart PAYG. Conventional bills can proceed without device integration.
- `[NEEDS CLARIFICATION]` OI-05/OI-06 for proration, date boundaries, rounding and overdue-day counting; OI-07 for rejected/short submissions and allocation; OI-09/OI-10 for final Smart bill completeness/identity; OI-17 for final report presentation.

## Affected files and modules

- Existing UI/state: `src/components/PrototypeApp.tsx`, `src/lib/demo-store.tsx`, `src/lib/prototype.ts`, `src/app/globals.css`.
- Routes: `/moderator/invoices`, `/customer/invoices`, relevant `/customer/contracts/:contractId`, notification targets and `/admin/reports` read model.
- New invoice/calculation policy, submission/evidence, bank reconciliation, receipt allocation, refund and ledger modules: TBD after P00 ADR; no backend or storage modules currently exist.

## Verification / acceptance (planned only)

- MF-04/S01–S02 and MF-05/S01–S02: issue, submit, compare and reconcile by exact invoice ID with evidence history.
- Tenant Confirm timestamp stops agreed reminder/late charging even if Moderator reconciliation occurs later; unresolved rejected/short behavior is explicitly blocked under OI-07.
- Reconciled amount, not invoice status or uploaded screenshot, drives receipt totals. Duplicate attempts do not create duplicate receipt/revenue.
- Deposit is displayed and reported separately; delayed cups are carried once and do not modify a prior ordinary bill.
- Approved due dates and financial calculations match business-approved examples at timezone, Sunday and boundary cases before enabling production charges.

## Risks and decision gates

- `[NEEDS CLARIFICATION]` OI-05, OI-06, OI-07, OI-09/OI-10 and OI-17. Keep affected calculations behind explicit policy gates, not scattered UI conditionals.
- `[NEEDS CLARIFICATION]` OI-08 for reminder channel/delivery. The confirmed stop timestamp can be recorded independently of a delivery provider.
- Currency arithmetic, partial-payment allocation and evidence privacy are high-risk. Never use JavaScript binary floating-point as an unreviewed financial policy.
- Refunds are external transfers; a saved request is not proof of refund completion.
