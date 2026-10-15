# State transitions and data contracts for Dolores

**Purpose:** Give developers a consistent record model and enforceable business order before API and database design. Names and status identifiers below are illustrative implementation vocabulary; only the described business behavior is confirmed. Do not treat a suggested enum or endpoint shape as a new business decision.

## Global command contract

Every mutation should have an authenticated actor, target record ID, expected current version/state, validated input, committed result and audit event. The service loads the target and every linked record under the actor's role/customer scope, checks transition guards on the server, commits state and history together, then returns the saved record state. Reject stale or repeated commands without duplicating money, cup usage, task completion or inventory assignment. UI route visibility alone does not authorize a command.

For state-changing UI, display record identity and consequences before confirmation. After success, show the saved outcome and link to the updated record; after error, retain entered values where safe and explain the condition that failed. Repeated/duplicate submissions must not silently create a second payment or collection event.

## Role-to-action matrix

| Capability | Admin | Moderator | Technician | Tenant |
|---|---:|---:|---:|---:|
| Manage Admin? | Not specified | No | No | No |
| Create/manage Tenant account | Yes | Create only | No | Own profile access; account changes not specified |
| Create/manage Moderator or Technician account | Yes | No | No | No |
| Manage rental contract and signed-document record | Operational view; full change permission not fully detailed | Yes within customer operations | View assigned-job context | Read own contract |
| Create/reconcile invoices and company-bank evidence | See aggregate/reporting | Yes; compare using internal company account records | No | No |
| Submit payment evidence and Confirm payment | No | No | No | Own bill only |
| View other customers' data | Confirmed operational overview; exact field restrictions not specified | Contract operations in assigned/company scope; exact filters not specified | Assigned task scope | No |
| Manage Global Menu | Yes | Yes | Verify/result only | No |
| Edit private recipe/submit supported drink | No permission specified | No permission specified | No | Yes, own Tenant/machine scope |
| Assign / update Technician work | No specific task action defined | Assign and track | Update only assigned task result | Report own issue; view own outcome |
| Technician assessment | No | May read/use result | Perform assigned collection/inspection/test | See relevant result/settlement |
| Deposit settlement/refund record | No specific operational action defined | After Technician collection/assessment | Collect and assess before Moderator | View own settlement; pay excess under agreement |
| Buyback | Aggregate/oversight unspecified | Agree purchase, upload evidence, coordinate collection, manage stock release | Inspect/collect/refurbish and report test | Eligible customer's own case; view/confirm evidence |

“Không chỉ định” means the provided sources do not define that action; do not open the permission by analogy. Clarify it if the implementation requires it.

## Entity relationships

| Record | Minimum relationship/data needed | Integrity rule |
|---|---|---|
| UserAccount | userId, role, status fields once specified, login identity | Admin creates/manages Tenant, Moderator and Technician accounts, sets Tenant status and grants Tenant access. Moderator may create Tenant only and cannot manage shops, Tenant status, access or staff accounts. Keep authentication principal separate from Tenant/shop data. Exact status values/transitions remain open under OI-02/OI-13. |
| Tenant / Shop | tenantId, shopId, Tenant↔shop access relation | Admin creates/manages shops and grants Tenant access. Moderator may create a Tenant account but this does not create a shop or grant access. Tenant/shop cardinality and exact setup sequence remain Cần chốt (OI-01 residual); scope customer screens by authenticated Tenant and its granted records. |
| RentalContract | contractId, tenantId, shopId, start/end, agreement file reference, contract location, agreed commercial values, approved SLA reference/version if applicable, offline allowance if Smart, lifecycle facts | Exactly one primary physical machine per contract; a physical machine at most one active primary contract. No e-sign. Do not use contract status alone to imply machine collected/refund settled. OI-19 decides whether SLA is sourced per contract, service type or both; do not assign defaults. |
| Machine | machineId, stored type, lifecycle/inventory fields once approved, ownership/provenance | Do not infer type from ID string. A machine record exists without active contract and retains history across contracts. Conventional and Smart capabilities are distinct. |
| Device / UsageEvent | deviceId↔machineId, eventId, occurredAt, receivedAt, successful result, source machine, cup/usage payload | Only successful sold cups billable. Deduplicate stable event identity. Keep occurred period distinct from received/sync time. Payload, identity, timestamps and retry details are OI-03/OI-10. |
| RentalMachineAssignment | contractId, primaryMachineId, assignedMachineId, role (primary/replacement), type, start/end interval, task reference | Temporary replacement same type, no new rental contract. No overlapping primary/replacement allocation. Attribute valid cups only within actual assignment interval. |
| Invoice / InvoiceLine | invoiceId, contractId, billing period, issue time, due cutoff, normal/final designation, line type, amount, usage allocations, carried/unbilled usage | Keep deposit, base rent, PAYG, installation, service/repair charges and penalties separately identified. Do not count issued bill or Tenant submission as reconciled receipts. |
| PaymentSubmission | submissionId, invoiceId, Tenant, evidence file ID, submitted/confirmed timestamp and outcome | Upload + Confirm is the late-fee/reminder cutoff. Preserve every attempt; do not overwrite prior image/reference. Review/rejection and resumption rules are OI-07. |
| BankReconciliation | reconciliationId, submission/receipt reference, received amount, company bank evidence/reference, result, Moderator, time | Internal company comparison. Record separately from customer submission. Support multiple attempts; prevent duplicate allocation of same bank receipt. |
| ReceiptAllocation / Refund | receiptId, reconciliationId, allocated line/deposit bucket, transaction amount; refundId, source, amount, external reference/evidence, performed/confirmed times | Derive revenue from reconciled money actually received. Keep deposits separate. Refund is external; record separately and do not silently net against a different contract. Report netting/treatment of excess remains OI-17. |
| Deposit/Settlement | contractId, amount contractually due, amount actually received, Technician recovery/assessment IDs, deductions by source, notification time, refund due time, external refund ID | One deposit/settlement per correct contract-machine; never global singleton. Recovery + assessment precede Moderator settlement. Do not refund more than actually held. Specific deduction priority and pending-bill interaction are OI-14. |
| SupportRequest | supportRequestId, Tenant, actual selected machine/assignment, details/evidence, status, timestamps | If an active replacement is selected, resolve it to primary contract plus exact active interval. Do not leave customer request unlinked when creating Technician task. |
| TechnicalTask | taskId, technicianAccountId, work type, assigned machine, parentType/parentId, parent contract/customer, requested/accepted/started/completed times, approved SLA source snapshot/reference and required milestone timestamps, result/evidence | Distinguish rental contract parent from buyback case parent and support request parent. Technician can update only assigned task. Preserve the SLA terms effective when work was requested; only compute compliance when target and clock policy are approved. Never store MB case ID in a field called contractId. |
| MachineServiceHistory | historyId, machineId, contract/assignment, related task, actual date, performed work, parts and charges recorded | Append linked records, not a free-text-only description; charge follows contract and is not automatically billed absent approved business rule. |
| BuybackCase | caseId, eligible Tenant, eligibility rental record, offered machine/provenance, assessment task, negotiated purchase, signed file, transfer evidence, acknowledgement, collection task | Only current Dolores rental customer eligible. Technician assesses before Moderator finalizes. Customer acknowledgement is separate and can await while agreed collection proceeds. |
| InventoryCondition / Release | machineId, custody/condition record, collection, refurbishment task, parts, satisfactory test result, Moderator release actor/time | Collected and in-process machine remains unavailable. Satisfactory Technician result and Moderator release both required for buyback unit availability. Actual full inventory statuses beyond this gate are OI-15. |
| GlobalMenuVersion / TenantRecipe | Global version/base, recipe ingredients and required ingredients; private Tenant+machine recipe and source base; sent/applied report | Global editable Admin/Moderator only. Preserve private values during base update. Update base display; Tenant explicitly adopts or keeps private recipe. Device acknowledgement decides displayed applied state. |
| Notification/AuditEvent | notification type, target record ID, intended actor, emitted/delivered/read times when available; audit actor/action/time/old/new | Link every alert to the exact role-scoped record. Delivery method/time is open; do not claim a reminder was sent just because it appears in a computed list. |

## Business state transitions

The identifiers below are suggested state names for implementation discussion; they are not an approved full state catalogue. The guard/order is the confirmed part.

### Invoice, usage, and payment

| Record/action | Preconditions | On success | Must reject / not infer |
|---|---|---|---|
| Prepare ordinary bill | Contract and machine assignment known; month boundary reached; event usage classified; fees tied to terms | Create itemized bill dated at month end. Save period, line items and usage-event allocations. | Do not include unresolved cups just because device is offline; do not recalculate an issued ordinary bill when late cups sync. |
| Carry late ordinary usage | New unique successful event arrives after its ordinary period bill issued | Add unbilled event to next month's bill once; preserve originating occurrence time and contract attribution. | No second charge in old period or both periods; no estimate from offline days. |
| Prepare final Smart bill | Actual rental/use cutoff exists; complete usage dataset through cutoff has synced, including replacement assignment and no-sale/offline periods; unbilled events reconciled | Issue final bill at actual later issuance time; that issue timestamp starts its payment term. | Do not equate online status/5-day offline allowance with proof of complete historical data; do not create another rental month because sync is delayed. |
| Customer submit payment | Tenant owns invoice; evidence uploaded and Confirm clicked | Append PaymentSubmission and completed timestamp. Stop late accrual and reminders from that exact time, pending OI-07 rejection/shortfall behavior. | Do not count as received/reconciled money; do not set submission timestamp to Moderator review time. |
| Compute delinquency | Due-time rules resolved; current unpaid amount > 0; no completed submission cutoff | Apply daily compound formula to previous unpaid amount per confirmed days/calendars. | Do not charge before due cutoff or continue past completed submission; Sundays/holiday/cutoff policy is OI-06, rounding OI-07. |
| Moderator reconciliation | Has submission plus internal bank transaction evidence/reference, amount and result | Append reconciliation event and allocate actual received amount; current reconciliation timestamp is separate from submission timestamp. | Do not overwrite earlier attempts or treat screenshot alone as bank receipt. Do not assume a failed/short submission resumes late charges on a date before OI-07 is settled. |
| Overpayment refund | Moderator confirms received amount exceeds applicable payable amount and Tenant-confirmation rule is met | External refund occurs; append amount, date/reference/evidence and confirmation link. Keep bill payment and refund as distinct events. | No in-app money transfer. Do not consider unmatched excess revenue settled or net without approved report treatment. |

The overdue example is exact before rounding: initial unpaid 5,000,000; one late day 5,250,000; two late days 5,512,500. When there has been partial receipt, calculation base is the remaining unpaid amount; how receipts allocate across base, deposit and late charges remains OI-07/OI-14.

### Contract end and deposit

| Record/action | Preconditions | On success | Must reject / not infer |
|---|---|---|---|
| Expiry reminder | One month before stored contract expiry under an agreed calendar interpretation | Record notification and allow Tenant response/new-contract interest. | No auto-extension. A missing reply means no continued rental. Channel and exact “one month” calendar rule remain open. |
| Ask for return / early stop / violation record | Correct contract; reason/effective use stop recorded according to agreement | Create recovery task linked to exact contract and machine; customer preparation communication can be tracked. | Enforcement for Customer refusal stays under contract/company process. Do not impose automatic lock/penalty. |
| Technician collect and assess | Task assigned; correct machine physically returned; Technician performs company assessment | Record collection, condition/damage and timestamp against task, machine and contract. | Do not populate one app-wide assessment shared between contracts. Technician result is a prerequisite to Moderator settlement. |
| Moderator settle deposit | Technician assessment exists for same contract/machine; amount actually received, unpaid bills/contract deductions known under resolved rules | Record separately itemized settlement and Moderator-notified timestamp. Refund-eligible remainder gets 10 working-day target from that notice. | Do not deduct assumed damage/penalties or refund nominal deposit before receipt. Pending final bill conflict and deduction order are OI-14. |
| Refund / excess compensation record | Eligible remainder and transaction decision complete | Track external refund evidence/reference/date/confirmation. For damage over deposit, record customer's extra amount owed. | No automatic external transfer; do not say refund complete before transfer proof/result. |

Deposit cọc is not monthly usage carry-forward. Gross/actual revenue basis uses confirmed reconciled receipts and excludes cọc from Actual Revenue.

### Support, maintenance, replacement, buyback, menu

| Record/action | Preconditions | On success | Must reject / not infer |
|---|---|---|---|
| Create technical task | Source is a support request, rental/maintenance task, contract recovery, or buyback case; valid type/machine; source IDs are retained | New task is linked to exactly one typed parent and designated Technician; applicable service SLA terms are snapshotted when present. | No task without source/assignee where flow requires one; no Smart-only activation on conventional machine; maintenance record must not become Technician calendar/appointment product. SLA reminders/alerts require OI-19 policy. |
| Track service SLA | Task has an approved SLA target and clock policy from its approved source, and required actual milestone timestamps are recorded | Compare the saved target snapshot to the corresponding actual event and expose the derived on-time/late state to authorized roles. | If terms or clock policy are missing, mark “Chưa cấu hình SLA”; do not infer pass/breach, pause rules, default targets, schedule appointments, assign staff or apply financial consequences. |
| Allocate replacement | Same-type stock item is unallocated for overlapping time and eligible for use under task | Create temporary assignment with primary contract and start handover interval; keep inventory busy. On return, end assignment and record return condition. | Don't allocate a primary-rented machine or another active replacement. No cross-type substitute even if empty stock. Availability after service-return is OI-15. |
| Complete support work | Assigned Technician; matching task is open; actual result captured | Save result/part records, update source support request, append machine history, preserve agreed charge separately. | Don't orphan the request or silently charge extra cost contrary to contract. |
| Global menu update | Admin/Moderator; known Global version and eligible Smart devices | Send/update request; keep prior device-confirmed menu displayed until receipt/apply success is reported. Track failure/queued state. | Tenant cannot change base menu. Don't show newly sent version as already applied. Delivery/retry protocol is OI-12. |
| Private recipe update | Tenant owns machine; machine is Smart and capability supports product/quantity/mandatory ingredient combination | Save private proposal/recipe; transmit if supported; show last confirmed applied recipe until machine reports result. A base update does not overwrite private recipe. | Don't assume capability or approve recipe automatically. No conventional machine menu. Device payload/capability and conflicts with removed base ingredients remain OI-03/OI-12. |
| Technician buyback assessment | Eligible current Dolores Tenant; distinct buyback case and offered unit; case is before Moderator purchase agreement | Technician result/valuation recorded then linked to Moderator negotiation. | Moderator cannot finalize buyback before assessment. Internal scoring criteria are not modeled. |
| Collect buyback unit | Moderator's external purchase agreement/payment condition satisfies collection term; exact case/task; acknowledgement may still be pending only if agreement allows | Technician collects and records; if ack pending display “Chờ khách xác nhận trước khi thu gom” while tracking separately. | Don't block collection solely due pending ack when agreement allows. Do not use an unrelated rental contract or unrelated machine record as offer proof. |
| Release buyback inventory | Collection and processing recorded, satisfactory Technician test report exists | Moderator releases machine to rentable inventory; available counts/candidate allocation update from same record. | No release merely from payment, collection or Technician's unqualified text entry. |

## Error and confirmation contract for each UI action

1. Confirm screen/modal names the tenant, contract, machine, invoice/case/task and amount or result being committed.
2. Server rejects missing entity, wrong role/scope, wrong state, machine-type mismatch, duplicate submission/event, and missing evidence; response tells UI which record to refresh.
3. After action, update only the canonical persisted record plus linked history/notification; do not mutate a copy in another role's browser local store.
4. A notification opens that source record with appropriate scope; it never grants a new permission.
5. Keep upload, click-confirm, bank reconciliation, external money transfer, customer acknowledgement and application to device as separate events.

## API/storage design boundaries

Sources define behavior and records, not framework, endpoints, database, storage provider, auth SDK, or IoT protocol. Developers can choose those implementation details, but must demonstrate record IDs, relation constraints, audit, scope checks, idempotency, secure file references and state guards above before relying on the UI wiring.

