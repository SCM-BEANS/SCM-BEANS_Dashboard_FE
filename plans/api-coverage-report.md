# Báo cáo độ phủ API: FE Dashboard ↔ BE dolores_platform

Ngày: 2026-11-06 · FE branch `ref` (`73be04e`)

Cách đo: quét tĩnh `@*Mapping` trong `dolores_platform/src/main` và mọi lời gọi `axiosClient.*` trong `SCM-BEANS_Dashboard_FE/src/apis`, rồi so khớp theo method + path (FE gọi Dolores qua `/api/dolores/v1/*` → BE `/api/v1/*`).
Lưu ý: "đã nối" nghĩa là FE **có hàm API** gọi endpoint đó; chưa kiểm tra hàm đó có được UI dùng hay không.

## Tổng quan

| | Số lượng |
|---|---|
| BE endpoint tổng | **341** |
| — internal/dev/swagger (không dành cho FE) | 5 |
| BE endpoint public `/api/v1` | **336** |
| FE đã nối | **252** (75%) |
| FE chưa nối | **84** |
| — trong đó dành cho máy/hệ thống, FE không cần | 11 |
| — **thực sự còn thiếu cho Dashboard** | **73** |

Phía FE: 292 lời gọi HTTP = 280 tới Dolores + 12 tới IDaaS (auth, admin-users, không thuộc BE này).

## ⚠️ FE đang gọi endpoint mà BE KHÔNG có (sẽ 404)

| FE | Gọi |
|---|---|
| `src/apis/tenants.api.ts:6` | `GET /tenants` |
| `src/apis/tenants.api.ts:14` | `GET /tenants/{id}` |
| `src/apis/contracts.api.ts:35` | `GET /contracts/tenant/{tenantId}` |
| `src/apis/dashboard.api.ts:41` | `GET /dashboard/daily-cups/machines` |

Ngoài ra, `postCaseAction` trong `src/apis/buybacks.api.ts:86` được định nghĩa nhưng không ai gọi (dead code).

## A. Không cần nối (dành cho máy / webhook): 11

- `POST /telemetry/{machineId}`, `POST /telemetry/{machineId}/federated-weights`
- `POST /brew-records`, `POST /machines/{machineId}/brew-records`
- `GET /recipes/effective`, `GET /recipes/effective/sync`, `POST /recipes/effective/sync/{commandId}/ack`, `GET /recipes/effective/{machineId}/sync`, `POST /recipes/effective/{machineId}/sync/{commandId}/ack`
- `GET /orders/{id}/brew-command`
- `POST /payments/payos/callback`

## B. Module FE chưa có gì: 47

| Module (Controller) | Số | Endpoint |
|---|---|---|
| Technician trips (`TechnicianTripController`) | 14 | `POST/GET /technician-trips`, `GET /{tripId}`, `GET /{tripId}/events`, `GET/POST /{tripId}/stops`, `PUT /{tripId}/stops/order`, `DELETE /{tripId}/stops/{stopId}`, `POST /{tripId}/stops/{stopId}/reach`, `POST /{tripId}/stops/{stopId}/skip`, `PUT /{tripId}/technician`, `POST /{tripId}/start`, `/complete`, `/cancel` |
| Machine certificates | 5 | `POST/GET /machines/{machineId}/certificates`, `GET/DELETE /{certificateId}`, `GET /{certificateId}/download` |
| Wastage | 5 | `GET /machines/wastage/summary`, `/top-machines`, `/trend`, `GET /machines/{id}/wastage/daily`, `POST /machines/{id}/refill-log` |
| Orders | 5 | `POST/GET /orders`, `GET /orders/{id}`, `POST /orders/{id}/cancel`, `POST /orders/{id}/refund` |
| Telemetry ops replay | 4 | `POST /telemetry-operations/dead-letter/{entryId}/replay`, `POST /telemetry-operations/brew-usage/dead-letter/{entryId}/replay`, `/brew-usage/outbox/{outboxId}/replay`, `/brew-usage/machines/{machineId}/reconcile` |
| Offline violation reviews | 3 | `GET /offline-violation-reviews`, `GET /{reviewId}`, `POST /{reviewId}/decision` |
| Owner analytics | 3 | `GET /owner/cup-count`, `/owner/brew-records`, `/owner/cleaning-records` |
| Cleaning records | 3 | `POST /cleaning-records`, `POST /machines/{machineId}/cleaning-records`, `GET /machines/{machineId}/cleaning-compliance` |
| Delayed PAYG adjustments | 2 | `POST /billing/adjustments/delayed-payg`, `GET /billing/adjustments/quarantined` |
| Telemetry device identity | 2 | `POST/DELETE /machines/{machineId}/telemetry-device-identity` |
| Installation checklist template | 1 | `POST /installation-checklist-templates` |

## C. Module đã có nhưng thiếu action: 26

| Module | Endpoint còn thiếu |
|---|---|
| Maintenance tickets (4) | `POST /machines/{id}/maintenance-tickets`, `PATCH /maintenance-tickets/{ticketId}/details`, `POST /{ticketId}/overdue-review`, `POST /{ticketId}/unassign` |
| Maintenance requests (4) | `POST /{requestId}/closure-exception`, `/custody-events`, `/overdue-review`, `PUT /{requestId}/replacement-assignment/{assignmentId}` |
| Installation work orders (3) | `GET /{workOrderId}/accessories`, `/checklist-items`, `/evidence` |
| Locations (3) | `GET /locations/{id}/machines`, `GET /locations/{id}/stats`, `POST /locations/machines/{machineId}/transfer` |
| Recipes (2) | `POST /recipes/owner`, `GET /recipes/effective/{machineId}` |
| Repair case replacement (2) | `POST /repair-cases/{caseId}/emergency-work-authorizations`, `/replacement-offers` |
| Billing (1) | `POST /billing/invoices/{invoiceId}/payments` |
| Refunds (1) | `POST /billing/refunds/{refundId}/complete` |
| Contracts (1) | `GET /contracts/machine/{machineId}` |
| Coffee package fulfillment (1) | `POST /coffee-package-orders/{orderId}/confirm-received` |
| Machines (1) | `POST /machines/{id}/token/rotate` (ADMIN) |
| Machine recipes (1) | `GET /machines/{machineId}/recipes/effective` |
| Recall work orders (1) | `POST /recall-work-orders/{id}/legacy-review` |
| Termination cases (1) | `POST /termination-cases/{caseId}/handover` |

## Module đã nối đủ 100%

Alerts, Buybacks (28), Coffee packages (catalog/order/billing/payment proof/refund), Contract documents, Dashboard, Deposits, Heartbeat, Inventory, Machine availability/models/types, Notifications, Payment proofs, Recipe menus (22), Repair cases, Repair cost reviews, Replacement assignments, Technician assignments/work items, Telemetry query, User profiles.
