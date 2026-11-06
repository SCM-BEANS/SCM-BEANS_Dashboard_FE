# Roadmap: connect the 26 missing actions (group C)

Process per module: Claude writes `plans/module-XX-*.md` → Codex implements (gpt-6-luna, effort max) → Claude reviews the diff and runs tsc + lint + build + e2e mocks → commit (user's name, no co-author, no push).

## Skipped: deprecated, disabled or duplicate in BE (7)
| API | Reason (from BE code) |
|---|---|
| `POST /billing/invoices/{invoiceId}/payments` | Always returns 409 `PAYMENT_PROOF_RECONCILIATION_REQUIRED`; replaced by the payment proof flow (already connected) |
| `POST /billing/refunds/{refundId}/complete` | Always returns 409; completion happens through the owner `receipt` (already connected) |
| `GET /recipes/effective/{machineId}` | `@Deprecated`, for devices; replaced by mTLS `GET /recipes/effective` |
| `GET /machines/{machineId}/recipes/effective` | `@Deprecated` device endpoint (mTLS) |
| `POST /machines/{id}/token/rotate` | `@Deprecated`: devices use mTLS X.509 and no longer use tokens |
| `POST /recipes/owner` | Duplicate of `/recipe-menus/local/dsl` (same service `createLocalRecipeFromDsl`), already connected |
| `POST /termination-cases/{caseId}/handover` | Always throws "Direct handover is retired"; replaced by the owner acknowledgement on RecallWorkOrder |

## To implement (19)
| # | Module | APIs | Plan file | Status |
|---|---|---|---|---|
| 0 | Remove 4 FE calls missing in BE | – | remove-nonexistent-be-apis.md | Done (0cffd35) |
| 0b | Fix pre-existing build type error | – | fix-build-recipe-menu-create-form.md | Done (90a868b) |
| 1 | Maintenance tickets + requests | 8 | module-01-maintenance.md | Done |
| 2 | Installation work orders (accessories, checklist-items, evidence) | 3 | module-02-installation.md | Done |
| 3 | Locations (machines in store, stats, transfer machine) | 3 | module-03-locations.md | Done |
| 4 | Repair case replacement (emergency work auth, fallback replacement offers) | 2 | module-04-repair-replacement.md | Codex running |
| 5 | Contract history by machine, coffee order confirm-received, recall legacy review | 3 | module-05-lifecycle.md | Plan ready |
