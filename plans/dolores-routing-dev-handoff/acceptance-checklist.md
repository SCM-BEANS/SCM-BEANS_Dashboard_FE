# Acceptance checklist: all 45 source scenarios + cross-flow checks

**Status:** Test design only. None of these cases was run against a backend or accepted as passing by this static audit. Source scenario titles/IDs are preserved from the Section 10 traceability in SRS EN v1.1; flow steps are in flow-catalog.md.

## Source scenarios

| Scenario | Entry route | Essential acceptance outcome |
|---|---|---|
| MF-01/S01 Receive the rental need and agree the terms | /moderator/contracts/new | Moderator selects an existing Tenant/shop and records type, period, location, machine candidate and agreed fees. Admin is responsible for creating/managing shops, setting Tenant status and granting Tenant access. Smart prerequisites remain pre-contract company check. Invalid/unavailable machine cannot proceed. |
| MF-01/S02 Create the account and register the signed contract | /moderator/customers → /moderator/contracts/new | Moderator may create Tenant only; Admin manages Tenant/Moderator/Technician accounts and shop/status/access. A created account does not implicitly grant shop access. Contract attaches one real signed external document, one authorized Tenant/shop and exactly one primary physical machine. |
| MF-02/S01 Request delivery and assign a Technician | /moderator/technical-requests/new | Task references correct contract, machine, customer and destination; assigned Technician sees it. Conventional machine cannot be assigned Smart activation/telemetry. |
| MF-02/S02 Install and record handover | /technician/tasks/:taskId | Technician result updates task plus machine/contract history. Tenant sees contractual installation location. Conventional screen shows no cups/GPS/online/menu. |
| MF-03/S01 Deliver and activate the Smart IoT machine | /technician/tasks/:taskId | Smart device belongs to exact machine and contract; activation outcome records actual reported result, not fabricated online status. |
| MF-03/S02 Confirm the machine and default menu are ready | /customer/machines/:machineId | Factory-default Global Menu exists before handover; viewing doesn't require first cloud push. Device-reported applied menu is visible. |
| MF-04/S01 Prepare the first-month bill | /moderator/invoices | Itemized first bill includes applicable rent, installation, 10M deposit and charges; Deposit separate. Mid-month start rental follows actual-rental rule. No revenue before reconciliation. |
| MF-04/S02 Submit evidence and reconcile payment | /customer/invoices → /moderator/invoices | Tenant uploads and clicks Confirm; timestamp is stored. Moderator sees customer proof and separately supplies company-side evidence/reconcile outcome. Only reconciled received amount is revenue. |
| MF-05/S01 Close the month and issue the bill | /moderator/invoices | Ordinary bill issue date is month end; due day basis T2–T7 excluding Sunday. Late ordinary cups carry to next month and don't mutate/reissue prior bill. |
| MF-05/S02 Reconcile payment and handle differences | /moderator/invoices | Correct amount reconciles; shortfall is requested; excess enters external refund record. Upload+Confirm cuts off fee/reminders independently of reconcile time. Reject/short exception is blocked on OI-07. |
| MF-06/S01 Receive and display current or delayed usage | /customer/machines/:machineId/telemetry | Count only successfully sold/reported cups. Offline device retains events and later sync shows occurrence/received interval. No predicted cups. Ordinary late events next month; final bill waits full use-cutoff dataset. |
| MF-06/S02 Attribute replacement usage | /moderator/machines/:machineId; telemetry detail | Same-type replacement valid cups inside its active assignment interval attach once to primary contract; cups outside the interval or duplicate IDs are excluded. |
| MF-07/S01 Manage the internal Global Menu | /admin/global-menu or /moderator/global-menu | Only internal roles can create/update Global. Customer edit endpoint/button and direct API both denied. Conventional machine is not a menu target. |
| MF-07/S02 Apply an internal menu update | internal menu → Smart machine detail | New Global version sends to compatible Smart device. Sent/failed/pending does not display as applied; previous device-confirmed menu persists until device success. |
| MF-07/S03 Customize a private recipe | /customer/menu | Tenant can modify own recipe based on received Global, retains mandatory ingredients/capability, and cannot affect other Tenant or Global base. |
| MF-07/S04 Add a supported private drink | /customer/menu | Supported machine allows private drink scoped to Tenant/machine. Unsupported capability explains rejection. No mandatory Moderator approval is invented. |
| MF-08/S01 Coordinate maintenance outside Dolores | /moderator/technical-requests | Company still arranges maintenance. Record the three-month/ten-day obligation window only using an approved anchor; no Technician calendar, booking, auto-assignment or automatic maintenance reminder. An SLA target without approved rules stays unconfigured. |
| MF-08/S02 Swap, maintain and return the machines | /technician/tasks/:taskId → machine history | Record actual service/milestones, parts/price per agreement, and primary/same-type replacement handovers; close correct assignment at return; append histories for both machines. Compare against an approved target only when OI-19 rules are approved. |
| MF-09/S01 Report the problem and receive the faulty machine | /customer/support → /moderator/technical-requests | Customer can select current primary or active replacement and submit issue; timestamp it, snapshot an applicable approved SLA source, or label “Chưa cấu hình SLA”; Moderator sees the exact request and manually coordinates Technician. |
| MF-09/S02 Determine the diagnosis and contractual charges | /technician/tasks/:taskId | Assigned Technician sees approved deadline and records actual required milestones; due/breach is based on approved target/clock rules only. Contractual charge is referenced, not generated from internal checklist or automatic generic price. No scheduling calendar/automatic dispatch. |
| MF-09/S03 Complete the repair and return the machine | /technician/tasks/:taskId | Result and parts update original request; completion is compared with an approved deadline; machine history and replacement interval link correctly; Tenant sees own result and only the confirmed SLA details allowed by policy. |
| MF-10/S01 Remind the Tenant before expiry | /customer/contracts/:contractId | One-month-before reminder has contract target and is shown to own Tenant and Moderator. No maintenance reminder is generated here. |
| MF-10/S02 Follow the Tenant decision | /customer/contracts/:contractId | No response does not extend; positive interest records discussion/new contract intent, not renewal. |
| MF-11/S01 Recover and assess the machine | /moderator/deposits → /technician/tasks/:taskId | Tech must collect and assess the exact contract's physical machine before settle action unlocks. Another contract's assessment cannot unlock it. |
| MF-11/S02 Settle and refund the deposit | /moderator/deposits → /customer/contracts/:contractId | Uses actual received cọc and resolved agreed deductions; Tech result first; eligible refund tracked as external transaction with 10 working days from Moderator notice. Final-bill overlap requires OI-14. |
| MF-12/S01 Receive the early-termination request and recover | /customer/contracts/:contractId → /moderator/technical-requests/new | Save effective stop/time and exact source contract. Coordinator dispatches recovery. Customer non-cooperation stays contract process. |
| MF-12/S02 Apply the agreed settlement terms | /moderator/deposits and /moderator/invoices | Multi-month contract base rent uses full final-month rule; PAYG ends at actual use cutoff. Same-month start/end uses actual rental time. No undocumented penalty/order. |
| MF-13/S01 Record the violation and request recovery | /moderator/contracts/:contractId → recovery task | Record violation with contract reference and exact machine, request Technician recovery. No system-imposed lock or new contractual penalty. |
| MF-13/S02 Apply contractual deductions and refund any remainder | /moderator/deposits | Damage/penalty from contract plus Technician result are linked to same deposit; only actual remainder may refund; above-deposit damage is owed amount. OI-14 blocks final deduction ordering. |
| MF-14/S01 Negotiate and sign a separate contract | /moderator/contracts/new | New contract ID and signature document are separate from old; no renewal/extension operation. |
| MF-14/S02 Complete the old lifecycle and assign the new machine | /moderator/contracts/:contractId → new contract | Old closure/recovery remains distinct; choose eligible new machine which can differ; prohibit active double primary assignment. |
| MF-15/S01 Record inventory and allocate machines | /admin/machines or /moderator/machines | Inventory count/list and assignment changes derive from same records; active contract, replacement, repair/refurb, available stocks are not static counters. |
| MF-15/S02 Maintain the machine lifecycle history | /moderator/machine-history; /admin/machines/:machineId | Machine history opens without active contract and contains correct contract/task/part/replacement provenance. |
| MF-15/S03 View records within the role scope | All four workspaces | Admin overview, Moderator operations, assigned Technician and own Tenant records differ by server-enforced scope; modified URL cannot switch scope. |
| MF-16/S01 Provide and recover the temporary machine | /moderator/machines → task detail | Only currently free same-type replacement can be assigned for a dated interval; it stays under contract and returns to correct stock when its task says returned. |
| MF-16/S02 Allocate Smart replacement usage | Smart telemetry detail | Smart cups attribute by device + assignment interval to the primary contract; no double count from machine/cloud retries. |
| MF-17/S01 Record the location for any rental machine | /moderator/contracts/:contractId | Contractual/installation location is set for both types and remains stable if GPS changes. |
| MF-17/S02 Display Smart IoT GPS separately | /moderator/monitoring/:customerId/:machineId | Show device GPS/report time separately; conventional route refuses Smart GPS content. |
| MF-18/S01 Inspect and value the offered machine | /moderator/buyback → Technician assessment task | Existing Dolores rental eligibility verified; Tech result is before Moderator deal. Internal valuation criteria not exposed/configured. |
| MF-18/S02 Agree the purchase and upload the contract | /moderator/buyback | Moderator agreement and signed external purchase document link to correct buyback case and offered machine. |
| MF-18/S03 Record payment evidence and collect under the agreement | /moderator/buyback → /customer/buyback → task | Moderator transfer proof is viewable/acknowledgeable by Tenant; if allowed, collection can proceed with ack pending and explicit waiting label. |
| MF-19/S01 Receive the machine into processing | buyback case → /technician/tasks/:taskId | Technician records pickup; machine stays not available in inventory during refurbishment/testing. |
| MF-19/S02 Record the test result and release to inventory | task result → /moderator/machines | Failed/not-yet-complete test cannot be released. Satisfactory test then explicit Moderator release makes it available and updates stock. |
| MF-20/S01 Administer accounts and apply role access | /admin/accounts; /admin/stores; /moderator/customers | Admin can administer Tenant, Moderator, Technician accounts; create/manage shops; set Tenant status and grant access. Moderator can create Tenant accounts and manage scoped customer contracts, but cannot manage staff accounts, shops, Tenant status or access. Cross-customer route/API access denied. |
| MF-20/S02 View the operating overview | /admin/reports | Show customer/contract/rented machine quantities and current/expired contracts. Reconciled receipt basis; deposits separate, Gross includes and Actual excludes; refunds visible separately pending OI-17 presentation. |

## Additional negative and integrity checks

| ID | Attempt | Expected outcome |
|---|---|---|
| NEG-01 | Tenant substitutes another tenant's contractId/invoiceId/machineId/taskId in URL or API | Access denied/not-found without leaking record fields. |
| NEG-02 | Moderator attempts create Moderator or Technician account | Denied server-side; UI role dropdown alone isn't policy. |
| NEG-03 | Customer or Technician updates Global Menu | Denied. Customer can only update own private supported recipe; Technician can't author menu. |
| NEG-04 | Direct path identifies a conventional machine as Smart telemetry | No data/menu/GPS shown; never fallback to S-018. |
| NEG-05 | Smart machine goes offline and reconnects with delayed events | Usage received once and linked by event occurrence + assigned interval; bill ordinary carry-forward. |
| NEG-06 | Staff tries reissue ordinary bill after offline cups arrive | Existing bill immutable as to that late usage; event belongs to next month. |
| NEG-07 | Final bill sees online now but there is a data gap in last offline interval | Keep final bill waiting; online-now alone isn't a completion watermark. |
| NEG-08 | Customer uploads/confirms at time T; Moderator opens bank account next day | Late charge/reminder stop at T, not reconcile date; actual income remains unrecognized until reconciliation. |
| NEG-09 | Same proof/reconcile callback is submitted twice | No duplicate receipt allocation or revenue. Preserve original evidence and attempt audit. |
| NEG-10 | Another recovery task is completed while contract A deposit page is open | Contract A assessment/settlement doesn't change. |
| NEG-11 | Tech completes repair using machine currently assigned to another contract as replacement | Allocation conflict rejected atomically. |
| NEG-12 | Different-type replacement is the only stock item | Assignment rejected; no cross-type fallback. |
| NEG-13 | Buyback purchase proof acknowledgement pending while agreement permits collection | Moderator can dispatch; UI explicitly says “Chờ khách xác nhận trước khi thu gom” and records acknowledgement separately. |
| NEG-14 | Buyback collected/paid but Technician test missing or failed | Machine remains unavailable; Moderator release action not enabled. |
| NEG-15 | Global recipe base changes while Tenant private amount differs | Private recipe retains its amount; new base visible as choice; don't overwrite. |
| NEG-16 | Wrong/expired/malformed route ID is opened/refreshed | No first-row/default sample fallback; return not found or approved historical view with correct authorization. |
| NEG-17 | Duplicate task completion or task belongs to different parent entity | Reject stale/wrong-parent action; do not mutate unrelated request/case/contract. |
| NEG-18 | Bill includes deposit on next month's late usage or revenue actual total | Deposit remains its own contract component; delayed-cup carry-forward contains only cup usage. |
| NEG-19 | Moderator creates/edits a shop, changes Tenant status or grants/revokes Tenant access | Denied server-side; those actions are Admin-only. |

## Mobile usability verification to run during implementation

The source CSS defines breakpoints at 1050, 760 and 390 px. Test representative widths 360, 390, 760, 1050 and 1440 px after APIs are connected. Verify bill amount/evidence can be read and confirmed without horizontal page overflow; table card labels identify their value; actions do not sit below bottom nav; filters, upload, confirmation and select controls remain reachable and retain focus. Run keyboard and screen-reader checks for alerts, dialogs, upload states and validation. Target tap sizing/contrast should be specified against the team's accessibility standard rather than inferred from this prototype.

