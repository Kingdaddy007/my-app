# Ordered implementation tickets

Each ticket requires changed files, checks actually run, evidence paths, and remaining uncertainty in BUILD_STATUS. Dependencies are explicit. A blocker on physical-device evidence does not prevent independent implementation work, but its gate remains unverified.

## T01 — Inspect and bootstrap

Depends: packet read and originals visually inspected. Inspect workspace contracts/toolchain; preserve docs and originals. Scaffold native Expo/TypeScript project in this workspace without overwriting handoff files; choose compatible versions, lock dependencies. Set up routes, safe areas, lint/typecheck, domain test runner. Deliver exact run instructions and dependency/toolchain report. Pass: app launches on available native target; otherwise clearly record build blocker and complete static checks. Never call browser rendering native proof.

## T02 — Design system and visible quality checkpoint

Depends: T01. Implement semantic themes, typography, icons, accessible buttons, inputs, sheets, navigation, original landscape vector scene and timer halo. Build real Today idle/running/paused preview fixtures in both themes. Implement start/pause visual transitions against temporary isolated state. Deliver D1 screenshots and short interaction capture if available. Compare with all originals: composition, richness, spacing, legibility and Android fit. Refine defects before reusing components. Preview fixtures explicitly isolated from production storage. This checkpoint is self-review, not fabricated owner approval.

## T03 — Durable time engine

Depends: T01; may proceed independently of visual polish. Implement migrations/repositories/service and clock injection. Enforce one current session, idempotency, active/pause intervals, atomic switch and write failures. Deliver tests for start/pause/resume/stop, repeated actions, relaunch, midnight, long sessions, clock anomaly, transactional rollback. Pass: 09:00 start, 09:20 pause, 09:30 resume, 10:00 finish = 50m active, 10m pause, 60m elapsed, longest active 30m.

## T04 — Onboarding and activities

Depends: T02,T03. Optional name, editable starters, category/activity creation/search/favorite/archive, theme preference. Validate names, long input, duplicate handling, empty selection and keyboard-safe sheets. Save onboarding state and skip optional steps. Pass: two independent installations can choose different activities without accounts; no owner identity hardcoding.

## T05 — Today connected to real state

Depends: T02–T04. Bind hero/control states to durable service. Add elapsed default, optional target/overtime, session summary, contextual gap/pause follow-up, wake/sleep actions, today's priorities preview. Controls remain usable during transitions. Pass: navigation/background/relaunch retain accurate state and double taps create no extra session. Remove any production demo history.

## T06 — Timeline and corrections

Depends: T03,T05. Implement local-date navigation, clipped intervals, pauses and uncovered gaps. Add manual entries, split gap, edit/delete, collision validation, undo after quick label, accessible details. Use derived data consistently. Pass: gap split into Cleaning 20m and Rest 10m accounts for 30m exactly; failed overlapping edit leaves history unchanged. Check empty day, long names and cross-midnight session.

## T07 — Review, insights and priorities

Depends: T06. Daily category totals, honest elapsed-day chart, uninterrupted span and interruptions; weekly comparison with valid denominator; sparse-data fallback. Three editable/reorderable tomorrow priorities and explicit completion. Pass: numbers reconcile with timeline; rest counted positively; current future hours excluded; planned activity absence labeled as unrecorded rather than not done.

## T08 — Reminders and settings

Depends: T03,T05. Native permission explanation/enable flow, channels, local scheduling, cancellation, snooze, quiet hours, sleep suppression, cap, privacy and test reminder. Deliver foreground/background notification checks on native build where possible. Pass: resume cancels pause reminder; start cancels idle reminder; denied permission doesn't prevent tracking; stale notification opens present state; no duplicate reminders after relaunch. Explicitly record Doze/force-stop observations, not assumptions.

## T09 — Backup and recovery

Depends: T03,T04,T06,T07. Implement versioned export, validated import preview and atomic replacement, erase confirmation, migration testing and readable storage-error handling. Pass: export/import round trip preserves IDs/totals/preferences; malformed/future-version/overlapping backup rejected without data loss. Share action is initiated by the user; no automatic uploading.

## T10 — Whole-app visual and accessibility finish

Depends: T05–T09. D2 screenshots: Today/Timeline/Review both themes, empty/populated/paused. D3 videos: transitions, interrupt/repeat, theme/reduced motion. Test compact Android layout, 200% text, TalkBack, keyboard sheets, native back, insets. Measure actual contrast and observe frame pacing; fix clipping, tiny icons, indistinct hierarchy, jank and generic-looking surfaces. Refine beyond mockups where it improves the intended aesthetic and user journey. Do not silently add integrations.

## T11 — Delivery and audit package

Depends: all implementation tickets. Run required checks once after final relevant changes; repair failures. Produce README install/run/build instructions, evidence index, known limitations and manual phone checklist. Supply APK if toolchain allows and record variant/path; otherwise exact build blocker. Remove debug UI from normal app. No paid services/publication. Update BUILD_STATUS with implemented/verified/unverified distinctions. Prepare for Luna max-effort audit; do not claim independent audit occurred.

## Review sequence

Anti Gravity self-checks every ticket and D1/D2/D3. User returns with completed workspace. Codex opens an explicitly requested new Luna task at `gpt-5.6-luna` / `max` for independent audit, then resolves findings through authorized implementation and performs senior review. Only the host task creation response can prove model selection; prose in a prompt does not set a model.
