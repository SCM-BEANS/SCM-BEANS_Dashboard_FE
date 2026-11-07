# Scenarios - Machine provisioning and monitoring

Date: 2026-11-07. Actors: Admin, Moderator, Owner, Technician, gateway/Edge.
Dimensions considered: users, inputs, timing, scale, transitions, environment, failures, authorization, integrity, integrations, compliance and business rules. No dimension excluded; this is a focused single-pass list of the principal dangerous cases, not exhaustive coverage.

| ID | Dimension / trigger | Severity | Expected behavior / test anchor | Phase |
|---|---|---|---|---|
| S01 | Owner or Moderator opens certificate/identity actions via manipulated URL | CRITICAL | No forbidden-role requests; backend denial remains authoritative | 01/02/03/04 |
| S02 | Technician machine grant expires while view is open | CRITICAL | 403 blocks reads/actions, removes stale scoped content; no broad fallback | 01/02/03/04 |
| S03 | Remote certificate download fails and proxy tries local | CRITICAL | Explicit environment enforced; assert no local fetch and no secret returned | 02/04 |
| S04 | Certificate bundle appears in query cache/storage/log/DOM | CRITICAL | Download-only short-lived blob; assert no persistence or inline private key | 02/04 |
| S05 | Successful mutation loses response, user retries | HIGH | Unknown outcome shown; reconcile authoritative GET before another mutation | 02/03 |
| S06 | SLA valid zero versus API 503 | HIGH | 0% only for valid response, unavailable state for error | 01 |
| S07 | SLA request returns another machine | HIGH | Identity validation rejects response before render | 01 |
| S08 | Cleaning history is paginated/incomplete | HIGH | SLA read separately; never recompute compliant days from partial history | 01 |
| S09 | Certificate Page has number/content, not page/content | HIGH | Correct Spring Page schema and later/empty pages | 02 |
| S10 | Double-click issue/apply/delete | HIGH | Pending disables duplicate action; one mutation | 02/03 |
| S11 | Download API returns JSON error with zip-looking filename | HIGH | Error shown; no ZIP download; safe filename | 02 |
| S12 | Moderator connection tab opened | HIGH | Heartbeat permitted, no unauthorized points/compliance request; old review URL valid | 01 |
| S13 | Account/machine changes before read resolves | CRITICAL | Scoped key/cancel prevents old response or selected menu/certificate leakage | All |
| S14 | Tab hidden or navigated away | HIGH | Stop heartbeat polling; never poll SLA every heartbeat tick | 01 |
| S15 | Flagged dates have no per-date reason | MEDIUM | Display needs-check without invented subtype | 01 |
| S16 | Deleted certificate status absent from public enum | HIGH | Refresh server list; no permissive schema or invented state | 02 |
| S17 | Admin requests Owner-only menu list | CRITICAL | Keep unavailable capability gated; no impersonation/ownerId hack | 03 |
| S18 | Refresh after successful menu/device mutation | HIGH | Read authoritative state or explicitly unavailable, no localStorage inference | 02/03 |
| S19 | Menu saved but machine has not ACKed matching version/hash | HIGH | Accepted/pending distinct from applied | 03 |
| S20 | Gateway disconnect after Exchange may have run hardware action | CRITICAL | Readiness requires correlation/expiry/reconcile; no automatic command replay | 04 |

Summary: 7 CRITICAL, 12 HIGH, 1 MEDIUM, 0 LOW. CRITICAL/HIGH rows are acceptance anchors in phase documents. No live mutations or source tests performed while writing this scenario list.
