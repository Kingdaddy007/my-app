# Verification and audit contract

No checks below have been run yet. Use pass/fail/unverified with evidence, tool/device/build version and date. Static checks are not native or visual proof. Never replace a failing behavior with a hardcoded fixture or weaken its requirement to pass.

## Critical correctness

| ID | Scenario | Required result |
| --- | --- | --- |
| A01 | Start/pause/resume/finish example in T03 | 50m active, 10m pause, 60m elapsed; 30m longest |
| A02 | Rapid Start twice / Pause twice / stale sheet action | One valid transition, no duplicate/overlap |
| A03 | Background, lock, process kill, reopen | Durable state and timestamp-derived duration recovered |
| A04 | Session crosses midnight | Day clipping reconciles; same session continues |
| A05 | DST boundary, timezone change, manual clock backwards | Defined day policy, no negative totals or silent corruption |
| A06 | Pause labeled Rest | Single interval reclassified; no double counting |
| A07 | Gap split, adjacent entries and collision | Half-open adjacency allowed; overlap rejected atomically |
| A08 | Simulated DB write failure | No false success, previous saved state preserved, retry possible |
| A09 | New install / sparse week | Empty guidance; no fake records, percentages or insights |
| A10 | Backup roundtrip / invalid import / migration | Exact valid restore; invalid changes leave data intact |
| A11 | Wake + first activity | Interval computed only from explicit marker; editable |
| A12 | Priority saved/completed/reordered | Survives restart, correct local date, maximum three |

## Notification proof on Android

Check permission accept/deny; test notification; paused threshold; resume cancellation; idle threshold; start cancellation; snooze; sleep; overnight quiet hours; daily cap and midnight; app foreground/background; process termination; device reboot and reconciliation; stale notification tap. Record OS, phone, battery policy and build variant. State OS limitations observed. Require generic private preview by default. Real timing delivery may be delayed by OS; do not interpret a timer unit test as notification delivery proof.

## Visual and interaction proof

Open original boards during review. Judge layout hierarchy, quality of landscape/light, typographic rhythm, refined surfaces, coherent mint/amber accents, original detail, Android fit, and immediate controls. The final design may surpass the boards; pixel matching is not the goal. New useful supporting screens are welcome within product scope. A screenshot with nice art but broken buttons fails.

Capture Today idle/running/paused, Timeline empty/populated/edit, Review sparse/populated, activity creation, settings and onboarding across both themes. Verify 360dp and 412dp, large text, long activity names, software keyboard, safe areas and native back. Check TalkBack names/order, chart text alternatives, 48dp targets and measured contrast. Record start/pause/resume/finish and sheet/tab/theme transitions, repeated inputs and reduced motion. Observe performance on the available Android phone; list untested devices honestly.

## Evidence structure

Use `evidence/` for sanitized screenshots/video/check logs; don't commit personal activity history. An index associates test IDs with artifacts, commands and results. Keep runtime fixtures explicitly separated from user DB. Record exact versions and test date. Automated tests should protect domain invariants and failure paths rather than merely assert implementation details.

## Luna audit and senior review

Luna receives read-only audit scope initially. Each finding needs severity (P0 data loss/security/blocking crash, P1 broken core behavior, P2 meaningful usability/design defect, P3 polish), file/line, repro, expected/actual and evidence. Unverified phone tests remain unknowns. No finding is resolved by assertion alone: require retest after repair. Senior review checks audit quality, fixes and aesthetic consistency against user intent, then states build vs device vs personal-use readiness distinctly.
