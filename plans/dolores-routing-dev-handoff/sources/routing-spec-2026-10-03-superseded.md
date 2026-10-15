# Spec: Dolores routing and business-flow handoff readiness

**Date:** 2026-10-03  
**Status:** Draft

---

## Problem Statement

The Dolores prototype already contains routes for the four workspaces and most major screens, but route navigation does not fully specify the business rules developers need to implement. This handoff defines what the current routes cover, the confirmed flow and permission rules that must drive implementation, and the remaining decisions that must not be guessed.

## User Stories

- **[P1]** As a developer, I want each confirmed business flow to identify its actor, starting record, actions, guards, resulting state, and next screen so that I can implement the web logic without inferring business rules from mock UI.
  Accepted when: every flow listed in this spec has an ordered path and explicit actor/action/result.

- **[P1]** As an Admin, Moderator, Technician, or Customer, I want to see and perform only actions permitted for my role and records so that navigation and direct URL access cannot bypass Dolores permissions.
  Accepted when: the role/permission matrix is implemented on the server for every read and write, not only by hiding UI controls.

- **[P1]** As a Moderator or Customer, I want each billing, collection, service, and buyback record to preserve its own status and evidence so that both parties can follow the same operational history.
  Accepted when: each workflow record has a stable unique identifier and separate references to its customer, contract, machine, and related tasks.

- **[P2]** As an Admin or Moderator, I want to navigate from customer to contract to machine/monitoring/history and back so that operational work follows the entity relationship rather than an unrelated generic detail page.
  Accepted when: all links in the route map resolve to the correct role-scoped record and unknown IDs show a not-found state.

## Functional Requirements

### 1. Route and screen handoff

1. **FR-01:** Preserve the current role workspaces as the navigation shell: Admin, Moderator, Technician, and Customer. Treat the existing route list below as prototype screen coverage, not proof of authentication, authorization, API readiness, or complete workflow logic.
2. **FR-02:** Resolve a route parameter to a persisted record by a stable ID. If the record does not exist or is outside the actor's authorized scope, return a not-found/forbidden result; do not render a different record or a generic detail page. Derive Customer scope from the authenticated account, not from a fixed demo customer ID.
3. **FR-03:** For every screen action, handoff documentation must specify: actor, source record ID, current state, preconditions, user input/evidence, resulting state, side effect/notification, and destination screen.
4. **FR-04:** Keep long-running auditable workflows addressable by record ID. Invoice, deposit settlement, buyback case, support request, and technical task must not be identified only by their position in a list. Whether each opens as a page or an expanded panel is a presentation choice; the record identity and flow are mandatory.
5. **FR-05:** On every list and detail view, define loading, empty, validation, failure, success, and unauthorized states. A successful click in a local prototype is not an API contract.

### 2. Role permissions

6. **FR-06:** Admin can create and manage accounts for Customer/Tenant, Moderator, and Technician; view operational dashboards/reports, customers, stores, contracts, machines/inventory, Smart IoT monitoring, Global Menu, and histories.
7. **FR-07:** Moderator can create/manage Customer accounts and manage customer contracts in the operational scope. Moderator can review invoices and company bank reconciliation evidence, coordinate technicians, manage Global Menu, track machines/history and buyback. Moderator does not administer Moderator/Technician accounts.
8. **FR-08:** Technician can view assigned work and machine history and record the operational result for assigned work. The Technician's internal inspection criteria are company-internal and outside the Dolores platform; Dolores stores and displays the resulting machine/service records needed for operations.
9. **FR-09:** Customer can view their own stores, contracts, machines, invoices, monitoring data for Smart IoT machines, support/buyback cases, and their private recipe customizations. Customer cannot edit Dolores Global Menu.
10. **FR-10:** Every API operation must check role and record ownership/scope server-side. A URL beginning with `/admin`, `/moderator`, `/technician`, or `/customer` is not an authorization mechanism.

### 3. Rental lifecycle

11. **FR-11:** Customer onboarding and rental flow: Moderator and Customer negotiate terms outside electronic signing; Moderator records the customer/store and contract, attaches the signed external contract, associates exactly one physical machine with that rental contract, and records the agreed location and terms. One customer may have multiple contracts. Dolores does not provide e-signature.
12. **FR-12:** Conventional-machine delivery flow: create/record the assignment, dispatch Technician where needed, record delivery/installation/handover, and append machine history. Conventional machines have no Dolores Global Menu, cup telemetry, digital twin, remote menu, or live monitored location.
13. **FR-13:** Smart IoT delivery flow: associate the Smart IoT machine with its rental contract and contract/installation location; record handover/activation. A Smart IoT machine has its default Dolores Global Menu from manufacture; Admin/Moderator Global Menu updates are handled as internal operations. Smart IoT can report GPS/live monitored location and operational telemetry. The Tenant must satisfy company infrastructure prerequisites before contracting; internal eligibility criteria are not defined by this platform.
14. **FR-14:** Maintain the distinction between the contract/installation location (applies to both machine types) and monitored device location (Smart IoT only).
15. **FR-15:** Preventive maintenance occurs every 3 months within a 10-day window. Scheduling/dispatch calendars are outside the confirmed platform scope. Dolores records the resulting service, parts, price, and machine history. Replacement equipment must be the same type as the primary machine; a replacement remains linked to the existing contract rather than creating a new rental contract.
16. **FR-16:** Breakdown/support flow: Customer reports an issue to Moderator; Moderator coordinates a Technician; Technician records the result and any machine/part changes; Dolores preserves request, machine, service, replacement, and cost history. Repair/part billing follows the signed contract and is recorded/tracked; Dolores does not invent repair prices or contract terms.
17. **FR-17:** For a Smart IoT replacement, valid cups reported by the replacement machine during its assignment period count toward the existing contract's usage. Conventional replacements do not gain telemetry or cup counting.

### 4. Billing, payment, and telemetry

18. **FR-18:** Confirmed list prices: Conventional rental is 1,500,000 VND/month; Smart IoT base fee is 750,000 VND/month plus 1,000 VND per valid cup. A valid cup is a sold cup reported successfully by the machine. Offline Edge data is retained on the machine and sent to Cloud after connection returns.
19. **FR-19:** Deposit is 10,000,000 VND per rental contract/machine. Default installation fee is 1,000,000 VND per machine, adjustable by agreement. The first month bill includes deposit, rental, installation, and applicable agreed charges; display deposit separately from operational revenue.
20. **FR-20:** Issue regular bills on the last day of the month; payment is due within 10 working days, counting Monday through Saturday and excluding Sunday. Payment is external bank transfer. Customer uploads transfer evidence and confirms payment; Moderator compares it with the company's bank account records and records reconciliation. Company-side bank evidence is internal Moderator information.
21. **FR-21:** If reconciled amount is short while within the payment window, Moderator requests the remaining amount. The shortfall continues to accrue the confirmed daily 5% compound late fee after lateness begins. If the transfer is over the bill amount, Moderator verifies the received amount and arranges an external refund of the excess; the system stores the record/evidence and does not make the bank transfer itself.
22. **FR-22:** Apply the confirmed compounded late-fee example: a 5,000,000 VND unpaid amount becomes 5,250,000 VND after one late day and 5,512,500 VND after two late days, before rounding rules. Send a payment reminder once per day until the bill is paid. Rounding policy is not stated and must not be invented.
23. **FR-23:** At month close, late Smart IoT data can change the bill. If the late data arrives while the original bill can still be adjusted within its payment window, recalculate and send a replacement bill. If it can no longer be adjusted, carry the missing valid-cup amount into the next month. Do not estimate missing cups from offline duration.
24. **FR-24:** In a contract's final month, wait to issue the bill until the required number of online days for that machine is available. Early termination in the middle of a month still charges the full monthly base rental; PAYG is calculated by actual rental time. The exact final-month online-day sufficiency threshold is unresolved.
25. **FR-25:** Keep deposit separate in reports. Gross revenue includes deposits; actual revenue includes rental and actual usage/charges but excludes deposits. Do not carry a deposit into another bill/month.

### 5. Contract end, deposit, and buyback

26. **FR-26:** One month before contract end, notify Customer and Moderator to ask whether the Customer wants to discuss continued use. No response means the current contract ends normally. There is no renewal; continued rental requires a new contract, and the assigned machine under the new contract may differ.
27. **FR-27:** Normal end, early termination, and contract violation lead to a recovery/settlement flow as applicable. If Moderator requests that the Customer prepare a machine for collection and the Customer does not do so, that is handled under the contract; Dolores tracks/monitors records and does not implement the contract enforcement process.
28. **FR-28:** Deposit return order is mandatory: (1) Moderator asks Customer to prepare the machine; (2) Technician collects and assesses its condition; (3) Technician reports whether damage exists and records the result; (4) Moderator settles the deposit under contract terms; (5) Moderator notifies Customer and records an external refund transaction. For no damage, refund is due within 10 days after Moderator notifies Customer of the Technician's result. Damage is deducted from the 10,000,000 VND deposit; if damage exceeds the deposit, record the additional amount owed. Do not initiate/complete deposit settlement before Technician's collection and assessment record exists.
29. **FR-29:** Used-machine buyback is only available to an existing Dolores rental customer. Technician assesses/values first under internal company criteria; after that, Moderator agrees terms with the Customer and signs the external purchase contract; Moderator uploads the signed contract and external bank transfer evidence; then collection can be coordinated according to the agreement. Customer acknowledgment of transfer evidence is tracked separately and does not block collection when the agreement permits collection. If acknowledgment is awaited, show “Chờ khách xác nhận trước khi thu gom”. After collection, record refurbishment/testing; only after the process is complete may the machine become available for rent.

### 6. Smart IoT menu and operations

30. **FR-30:** Global Menu is owned by Dolores and editable only by Admin/Moderator. Every Smart IoT machine has its default Global Menu from manufacture and receives Dolores Global Menu updates. Conventional machines do not receive it.
31. **FR-31:** Customer receives Global Menu updates and may customize a private recipe derived from the received Global Menu. Customer may propose/add a recipe only if the Smart IoT machine supports it. Customer must not create or update the Global Menu. Show the currently applied menu on the Customer's machine view.
32. **FR-32:** Smart IoT monitoring is navigated from Customer → their machine → telemetry, and from Admin/Moderator → customer/machine overview → a selected machine's telemetry/detail. Show received data and last Cloud sync time; offline Edge storage is not represented as an estimated cup count. GPS monitored location applies only to Smart IoT.
33. **FR-33:** Machine inventory/history must identify which individual machines are rented, in stock, assigned temporarily as replacements, under repair/refurbishment, or available for rent, and preserve replacement, maintenance, repair, and part history. Track remaining Smart IoT replacement stock quantity; replacement type must match the primary type.

### 7. Existing prototype route coverage (screen map)

| Role | Current list routes | Current detail routes / observations |
|---|---|---|
| Admin | `/admin`, `/admin/accounts`, `/admin/customers`, `/admin/stores`, `/admin/contracts`, `/admin/machines`, `/admin/monitoring`, `/admin/global-menu`, `/admin/reports`, `/admin/notifications` | Customer, contract, machine, and customer/machine monitoring detail routes exist. |
| Moderator | `/moderator`, `/moderator/contracts`, `/moderator/customers`, `/moderator/invoices`, `/moderator/deposits`, `/moderator/machines`, `/moderator/monitoring`, `/moderator/global-menu`, `/moderator/technical-requests`, `/moderator/machine-history`, `/moderator/buyback`, `/moderator/notifications` | Contract create/detail, machine detail, monitoring, technical request create/detail exist. Invoice, deposit, and buyback are currently list/inline-oriented rather than explicit record-detail routes. |
| Technician | `/technician`, `/technician/history`, `/technician/notifications` | `/technician/tasks/:taskId` exists for assigned work. |
| Customer | `/customer`, `/customer/contracts`, `/customer/machines`, `/customer/menu`, `/customer/invoices`, `/customer/support`, `/customer/buyback`, `/customer/notifications` | `/customer/contracts/:id`, `/customer/machines/:id`, and `/customer/machines/:id/telemetry` exist. |

34. **FR-34:** Preserve existing routes as the prototype navigation basis unless the implementation design chooses a consistent record-detail route pattern. Do not use a frontend role route as a substitute for real login/session, server authorization, API resources, or record scoping.
35. **FR-35:** Correct the implementation data model before persistence: keep `contractId`, `buybackCaseId`, `invoiceId`, `machineId`, `supportRequestId`, and `technicalTaskId` as separate relations. A technical task may have a typed parent relation to a buyback case or rental contract, but must not store one identifier in a field named `contractId` for both.
36. **FR-36:** Use explicit machine type, ownership, current contract, reporting period, and operational status fields from persisted records. Do not infer a machine's type from its ID prefix or carry fixed demo customer IDs/months into business logic.

## Non-Functional Requirements

- **Security:** Every read/write uses authenticated identity and server-side role plus record-scope authorization. No user may access another tenant's data by editing a URL or request ID.
- **Auditability:** Preserve actor, action, timestamp, prior/new status, and evidence reference for bill reconciliation, refunds, deposit settlement, buyback, technical service, and contract events.
- **Data integrity:** Status transitions must be validated atomically; reject out-of-order operations such as deposit refund before Technician assessment, buyback collection before agreed prerequisites, and stock availability before refurbishment/testing completion.
- **Usability:** Preserve the responsive, bright UI intent of the prototype and present a clear success/error/confirmation outcome for each state-changing action.
- **Integration boundary:** Bank transfers and refunds are performed outside Dolores; the system records proof and reconciliation outcome. Smart IoT ingestion/sync behavior must support delayed offline data without fabricating missing telemetry.

## Success Criteria

- [ ] 100% of the four role route groups in FR-34 are mapped in the developer handoff to actor, resource, read/write permission, and next action.
- [ ] 100% of the lifecycle flows in FR-11 through FR-33 identify preconditions and resulting status/evidence before implementation begins.
- [ ] The implementation distinguishes contract, invoice, buyback case, machine, support request, and technical task identifiers in API/data contracts.
- [ ] Machine type, customer scope, and invoice period come from authorized persisted records, not hard-coded prototype values or ID-string heuristics.
- [ ] No unauthorized cross-customer record read/write succeeds through direct URL or API calls.
- [ ] Automated acceptance scenarios cover: customer onboarding/contract upload, both machine delivery types, first and recurring billing, short/overpayment reconciliation, delayed telemetry, maintenance/repair/replacement, normal/early/violation contract end, deposit refund, buyback, and Global Menu/private recipe permissions.

## Out of Scope

- E-signature and online payment processing.
- Internal company criteria/scoring for buyback valuation and Technician inspection.
- Scheduling preventive maintenance or a technician dispatch calendar.
- Enforcement of contract violations or failure by a Customer to prepare a machine for collection.
- Repair/part price determination beyond storing the agreed contract/service charge.
- Dolores Global Menu editing by Customer.
- Telemetry, cup count, remote menu, digital twin, or live monitored location for conventional machines.

## Assumptions

- Existing role routes are a visual/navigation prototype; implementation will provide real authentication, persistence, APIs, and server-side authorization.
- The business rules explicitly confirmed in this spec are the source of truth over placeholder values in demo data.
- Where business criteria are internal to Dolores and out of platform scope, the system stores the operational result/evidence that the company chooses to enter.
- The developer may implement a record detail as a page, drawer, or expanded panel, as long as it has a stable record ID, repeatable URL/deep link where needed, and the same defined state transitions.

## [NEEDS CLARIFICATION]

- [ ] Define the final-contract-month Smart IoT online-day threshold and whether it is calendar days, machine-online days, or another contract-agreed measure.

