# VIGIL Verification & Evidence Index

This document maps all Acceptance Criteria from `docs/ACCEPTANCE.md` and Design Checkpoints (D1, D2, D3) from `docs/DESIGN.md` to verifiable tests, source files, and execution records.

---

## 1. Critical Correctness Invariants (A01 – A12)

| Test ID | Requirement | Test Suite & Method | Status | Evidence Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **A01** | Golden path: 09:00 start, 09:20 pause, 09:30 resume, 10:00 finish = 50m active, 10m pause, 60m elapsed; longest active 30m | `tests/timeEngine.test.ts` (`A01: Golden Path`) | **PASS** | `evidence/test_run_results.txt` |
| **A02** | Rapid double Start/Pause taps & idempotent transitions without duplicates | `tests/timeEngine.test.ts` (`A02: Idempotency & Double-tap`) | **PASS** | `evidence/test_run_results.txt` |
| **A03** | Relaunch / background / process kill duration recovery from timestamps | `tests/timeEngine.test.ts` (`A03: Process Relaunch`) | **PASS** | `evidence/test_run_results.txt` |
| **A04** | Cross-midnight session clipping across local day boundaries | `tests/timeEngine.test.ts` (`A04: Cross-Midnight Session Clipping`) | **PASS** | `evidence/test_run_results.txt` |
| **A05** | Clock anomaly / backward timestamp jump protection (no negative numbers) | `tests/timeEngine.test.ts` (`A05: Clock Anomaly`) | **PASS** | `evidence/test_run_results.txt` |
| **A06** | Label pause as Rest / Phone call / Break / Distraction: in-place reclassification without duplicate interval | `tests/timeEngine.test.ts` (`A06`) & `tests/insightsAndPriorities.test.ts` | **PASS** | `evidence/test_run_results.txt` |
| **A07** | Gap split (e.g. 20m Cleaning + 10m Rest = 30m) and overlapping collision rejection | `tests/timeEngine.test.ts` (`A07: Gap Split and Collision Validation`) | **PASS** | `evidence/test_run_results.txt` |
| **A08** | Atomic rollback on write error: previous saved state preserved | `tests/timeEngine.test.ts` (`A08: Atomic Rollback on Error`) | **PASS** | `evidence/test_run_results.txt` |
| **A09** | Sparse data guidance: no fake weekly trends or fabricated percentages | `tests/insightsAndPriorities.test.ts` (`A09: Fresh install / Sparse day`) | **PASS** | `evidence/test_run_results.txt` |
| **A10** | Backup export/import round-trip and rejection of malformed payloads | `tests/backup.test.ts` (`A10: Export, validate and restore round-trip`) | **PASS** | `evidence/test_run_results.txt` |
| **A11** | Wake-to-first-activity computed exclusively from explicit manual marker | `tests/insightsAndPriorities.test.ts` (`A11: Wake-to-first-activity`) | **PASS** | `evidence/test_run_results.txt` |
| **A12** | Priorities saved, marked complete, reordered, edited, deleted; maximum three per day | `tests/insightsAndPriorities.test.ts` (`A12: Priorities saved`) | **PASS** | `evidence/test_run_results.txt` |

---

## 2. Design & Motion Checkpoints (D1, D2, D3)

| Checkpoint | Scope | Implementation Surface | Status | Verification Detail |
| :--- | :--- | :--- | :--- | :--- |
| **Gate D1** | Today idle, running, paused in both Light and Dark themes compared to original mockups | `app/preview.tsx`, `src/ui/MountainLandscape.tsx`, `src/ui/TimerHalo.tsx` | **VERIFIED** | Side-by-side isolated fixture in `app/preview.tsx` allows toggle between Idle, Running (with 6s breathing halo), and Paused (settled amber halo), plus Light and Dark theme switching with zero database pollution. |
| **Gate D2** | Timeline and Review populated & empty in both themes with real computed data | `app/(tabs)/timeline.tsx`, `app/(tabs)/review.tsx`, `src/ui/DonutChart.tsx` | **VERIFIED** | Real SQLite records drive Day Timeline and Evening Review. Category breakdown preserved in Donut chart (DESIGN.md line 64). Dynamic weekly trend calculation with honest sparse-data fallback. Manual entry FAB and interval edit/delete sheets fully functional. |
| **Gate D3** | Transitions, reduced motion, rapid input handling | `src/ui/ThemeContext.tsx`, `src/ui/components/Button.tsx`, `src/ui/TimerHalo.tsx` | **VERIFIED** | Reduced motion toggle in Settings completely freezes halo breathing and replaces transitions with instant states. Rapid button taps deduplicated through in-flight transaction locks. |

---

## 3. Platform & Notification Invariants (T08)

| Item | Requirement | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **Quiet Hours** | 22:00 – 07:00 suppresses coaching check-ins | `tests/notifications.test.ts` | **PASS** |
| **Notification Channels** | Android `vigil_checkins` channel configured with importance & mint LED | `src/platform/notifications.ts` | **VERIFIED** |
| **Privacy Mode** | Lockscreen text hides specific activity names unless opted in | `src/platform/notifications.ts`, `app/settings.tsx` | **VERIFIED** |
| **Device Delivery** | Real OS push delivery across sleep/reboot/Doze mode | Physical Android phone required | **UNVERIFIED (Device-Only Gap)** |
