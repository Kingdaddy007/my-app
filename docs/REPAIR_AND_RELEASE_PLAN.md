# VIGIL repair and private-alpha release plan

Date: 2026-09-13

Input: `docs/AUDIT_2026-09-13.md`

Target: a trustworthy, visually excellent Android private alpha for the owner and 2–3 invited testers

## Definition of done

“Finished” for this release means:

1. A clean clone builds and tests with documented commands.
2. First launch reaches a short, useful onboarding flow.
3. Start, pause, resume, switch, finish, correction, and process recovery preserve exact history.
4. Timeline and Review reconcile to the same disjoint accounting.
5. Reminder controls perform the behavior they describe, including denied-permission states.
6. Export/import preserves all supported data and failed restore preserves existing data.
7. Today, Timeline, Review, onboarding, activity management, and settings are deliberately rendered and checked in light/dark modes.
8. The app is installed on the owner's Android phone and passes the private-alpha checklist.
9. A debug or release APK is recorded with Git revision and checksum.

Private Circle identity, Friend/Close Friend relationships, selective summary sharing, and fair opt-in challenges are now part of the current serious-alpha program. They follow core time/privacy repairs because they introduce a larger trust boundary, not because they are postponed indefinitely. Public feeds, passive usage monitoring, Wear OS, and broad raw-history cloud sync remain outside this release. See `docs/PRODUCT_AND_SOCIAL_DIRECTION_2026-09-13.md` and `docs/IMPLEMENTATION_AND_AUDIT_PLAN_2026-09-13.md` for the superseding scope and gates.

## Execution order

### R0 — Establish reproducible project truth

Goal: make every later claim repeatable.

Work:

- Add a standard Gradle wrapper compatible with the selected Android Gradle plugin.
- Add `README.md` with required JDK/Android SDK versions, setup, build, test, install, and troubleshooting commands.
- Add `.gitignore`; stop tracking `.gradle`, local properties, APK/build output, secrets, and `.env` files.
- Add the referenced `app/proguard-rules.pro` or remove the unused reference deliberately.
- Remove the irrelevant Gemini capability from `metadata.json`.
- Add a local/CI verification command that runs clean build, unit tests, lint, and instrumentation where an emulator is available.
- Replace historical “verified” claims with evidence links only.

Exit evidence: clean-clone command log; build/test/lint results; produced APK path and checksum, or the exact unresolved toolchain blocker.

### R1 — Repair first launch and data trust

Goal: eliminate data-loss and privacy contradictions before visual expansion.

Work:

- Decouple starter catalog creation from onboarding completion. New settings start with `hasCompletedOnboarding = false`.
- Make initialization idempotent under both view models or move it to one application-level owner.
- Disable unintended Android backup for the current local-only policy; add explicit extraction/backup rules.
- Remove destructive migration fallback; enable Room schema export and add a migration-test foundation.
- Distinguish active and archived activity streams. Validate category/activity references on every write.
- Detect invalid database states: multiple live sessions, multiple open intervals, orphan references, reversed intervals, and overlaps. Never silently erase records.

Tests: first launch/completion/relaunch/reset; concurrent initialization; archived activity cannot start; populated migration preserves IDs and totals.

### R2 — Make the timing state machine authoritative

Goal: one durable source of truth for all timer presentations.

Work:

- Replace the two competing timer orchestration paths with one session controller used by Today and optional focus configuration.
- Validate every transition before mutation. `switch` validates the destination first and commits finish/start atomically.
- Query the open interval by current session ID and expected kind.
- Add a command mutex/idempotency token so rapid taps cannot create duplicate transitions.
- Return typed command outcomes. Do not close a dialog or announce success until persistence succeeds.
- Restrict open-session edits to session commands. Completed-session correction edits the full segment set transactionally.
- Inject clock/day-zone abstractions for deterministic boundary tests; handle backwards wall-clock input without negative records.
- Persist session intention and relevant timer preference; process death restores the same meaningful state.

Required scenarios:

- 09:00 start → 09:20 pause → 09:30 resume → 10:00 finish = 50m active, 10m pause, 60m elapsed, 30m longest interval;
- duplicate Start/Pause/Resume/Finish and stale actions;
- invalid switch preserves the original running session;
- lock, background, process kill, and reopen while running and paused;
- midnight, timezone change, 23/25-hour DST day, and backward clock change.

### R3 — Normalize timeline accounting and correction

Goal: every displayed number derives from one disjoint interval model.

Work:

- Define half-open `[start,end)` utilities in a pure domain module.
- Prevent or explicitly resolve overlaps for manual, sleep, import, and completed-session edits.
- Calculate union/disjoint spans before totals. Enforce `elapsed = active + pause + sleep + awake-untracked` for the selected policy.
- Define the wake baseline: pre-wake time is sleep/unknown, not automatically “you failed to track.” Future time is separate.
- Roll Today/tomorrow/wake subscriptions at local midnight and react to timezone/date changes.
- Replace raw time strings with Android date/time controls and support cross-midnight correction.
- Keep failed collision edits open with explanation and a suggested valid range.
- Implement a real undo event for gap labels and deletions where safely recoverable.
- Fix Today’s editor to save today's priorities.

Tests: half-open adjacency; overlap rollback; sleep collision decision; exact gap split; open interval cannot be generic-edited/deleted; current/past/empty/future day treatment; correct priority date.

### R4 — Rebuild Review as honest reflection

Goal: useful coaching from transparent arithmetic, never invented judgment.

Work:

- Count unique completed sessions, not active segments.
- Define “longest uninterrupted” as the largest eligible active segment; do not call arbitrary manual history focus.
- Compute daily/weekly untracked values from eligible elapsed windows.
- Return zero days for an empty window and provide sparse-data states.
- Show category totals, active/pause/sleep/untracked balance, interruption reasons, and recovery behavior with accessible text equivalents.
- Add one factual, source-linked reflection such as “Your longest uninterrupted Work interval was 38 minutes.”
- Keep rest and spiritual activity value-neutral. Do not convert the day into a productivity score.

Tests: Review reconciles with Timeline; one session with three active segments counts once; overlap/import corruption cannot inflate totals; empty and one-day windows have no fake denominator/trend.

### R5 — Implement respectful Android reminders

Goal: reminders become dependable support rather than decorative settings.

Recommended mechanism: uniquely named one-shot `WorkManager` requests with persisted reminder intent and foreground reconciliation. Exact-alarm permission is not justified; delayed delivery must be described honestly.

Work:

- Ask for Android notification permission only after the user enables reminders and understands the benefit.
- Schedule pause check-in after the configured threshold, not immediately.
- Schedule idle check-in only during an explicitly awake window after a finish/wake/label event.
- Cancel stale pause/idle work on relevant transitions.
- Implement quiet hours with inclusive start/exclusive end, recorded-sleep suppression, snooze, one-per-hour and four-per-day caps.
- Use generic lock-screen text by default; reveal activity names only by opt-in.
- Notification tap opens current truth. Stale requests cannot mutate an old session.
- Expose permission/channel/battery-delivery status; Test Notification reports actual availability.

Evidence matrix: permission accept/deny; foreground/background/process termination; pause threshold/resume cancellation; idle threshold/start cancellation; overnight quiet hours; sleep suppression; snooze/cap/date rollover; physical-device observation with Android/OEM/build recorded.

### R6 — Complete backup, restore, and erase

Goal: recovery can be trusted before personal history accumulates.

Work:

- Export a versioned file through Android's Storage Access Framework/share sheet, not only the clipboard.
- Include settings, categories, activities, sessions, intervals, priorities, and wake markers with units/timezone metadata.
- Parse into a bounded staging model. Validate schema, sizes, references, status values, timestamps, overlaps, and single-live/open invariants before writing.
- Show restore preview: source version/date, record counts, date range, and replacement scope.
- Replace atomically only after confirmation. Any error preserves current data.
- Erase-all offers export first. Reset returns to onboarding unless the user explicitly keeps setup.

Tests: complete round trip with stable IDs/equal totals; malformed/future/oversized/orphan/overlap/multiple-live/simulated-write-failure fixtures; invalid import leaves original data unchanged.

### R7 — Recompose the product around one cinematic “Now” surface with Track and Focus

Goal: exceed the mockups through hierarchy and behavior, not ornamental clutter.

Work:

- Preserve two clear user experiences inside one Today hero: open-ended Track and target-based Focus. Both use the same canonical session/interval engine. Switching views, browsing, or editing a Focus preset never changes the active session. Avoid a confusing technical mode toggle; make the choices feel purposeful and visually distinct.
- Bring the layered landscape/sun or moon into the hero as live vector art. Timer, labels, and controls stay native and readable over a tested scrim.
- Give states distinct but related composition:
  - idle: calm horizon, selected/recent activity, one Start action;
  - running: luminous mint halo, elapsed/remaining label, Pause and Finish;
  - paused: warmer stillness, active and paused durations, reason, Resume and Finish;
  - target reached: restrained peak, continue/extend/finish without blocking flow;
  - saved: compact factual summary leading to Timeline or Review.
- Restore a clear time rail and calibrated information density in Timeline.
- Give Review a balance visualization, category narrative, source-linked insight, and “Ready for tomorrow” closing action.
- Move Settings out of the permanent fourth tab; use a top-level profile/settings affordance while preserving Android back.
- Replace repeated generic cards with three depth roles: canvas, working surface, rare luminous focus surface.
- Rewrite defensive/system copy into calm, direct language.

Design checkpoint D1: Today idle/running/paused/target/saved at 360dp and 412dp, light and dark.

Design checkpoint D2: Timeline and Review empty/populated/error, light and dark.

Design checkpoint D3: recorded start/pause/resume/finish, gap correction, review close, theme change, and reduced-motion versions.

### R8 — Accessibility, resilience, and alpha packaging

Goal: the premium feeling survives real Android conditions.

Work:

- Minimum 48dp targets; semantic roles, selected/disabled states, and TalkBack descriptions.
- Accessible summaries for visualizations; never encode meaning with color alone.
- Wire global reduced-motion/haptic settings everywhere. No ambient loop offscreen, paused, or in reduced motion.
- Verify 200% font scale, long names, keyboard, compact height, landscape fallback, gesture/button navigation, native back, dark startup, and rotation/process recreation.
- Add instrumentation/Compose tests for first launch and critical journey.
- Install a versioned APK on the owner's device; run a sanitized checklist; record limitations.

## Test architecture required

Current tests calculate expected arithmetic independently of production. Replace them with:

- pure domain tests calling interval-normalization and metric functions;
- Room in-memory repository tests exercising real transactions/DAOs;
- import/export round-trip and rollback tests;
- coroutine tests with injected clocks/schedulers;
- Compose UI tests using stable semantics;
- physical-device notification and visual evidence where emulation is insufficient.

## Today-first scope control

If time forces a narrower release, use this order:

1. R0 build truth.
2. R1 privacy/onboarding/migration safety.
3. R2 timing state machine.
4. R3 accounting and priority-date repair.
5. R6 backup safety.
6. R5 minimal truthful reminder and permission state.
7. R7 Today visual checkpoint.
8. R4 Review accuracy and R8 full evidence.

Never cut data safety, error feedback, or truthful claims to preserve animation. Conversely, passing tests without D1–D3 visual evidence is not the requested product.

## Handoff evidence format

For every phase record changed files, commands/results, automated scenario IDs, screenshot/video/device evidence, remaining unknowns, and next action in `docs/BUILD_STATUS.md`. “Implemented,” “source-reviewed,” “build-passed,” “emulator-tested,” “device-tested,” and “owner-approved” are distinct states.
