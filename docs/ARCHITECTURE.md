# Architecture and correctness contracts

## Recommended implementation

Use React Native + Expo + TypeScript, native navigation through Expo Router, SQLite for durable local records, and compatible Reanimated/gesture primitives for motion. Select a current stable compatible Expo SDK at implementation time, record exact versions and commit a lockfile. Use Expo's version-compatible installation tooling. This is a recommended build decision, not an installed or tested stack.

Alternative: Kotlin/Compose gives direct Android integration but needs a separate iOS UI later. React Native offers shared future UI/domain work with native escape hatches; it still requires real device work and separate iOS validation. A browser-only PWA is insufficient evidence for the requested Android reminders/lifecycle. No backend/server, auth provider or cloud database is needed. Do not introduce speculative tenancy infrastructure; independent installations are already independent users. Future sync needs identity, conflict handling and migration design, not merely enabling a flag.

## Modules and ownership

Suggested root: `app/` routes; `src/features/{onboarding,today,timeline,review,activities,settings}`; `src/domain/` time/session/insight logic; `src/data/` SQLite migrations and repositories; `src/platform/` notifications/clock/backup; `src/ui/` tokens, controls, landscape and motion; `assets/` licensed/original runtime assets; `tests/`; `docs/`; `evidence/`.

Routes call a small application service surface: start, pause, resume, finish, switch, labelGap, editInterval, deleteEntry. The service owns validations and atomic transactions. Screens do not manipulate SQL or invent parallel totals. Database is durable truth; UI subscribes/refetches after commits. A render ticker updates displayed elapsed time only. No per-second database writes, no permanent background JavaScript timer for correctness.

## Logical records

- Activity: stable UUID, name, icon key, category ID, favorite/archive flag, optional target seconds, timestamps. Archive rather than breaking referenced history.
- Category: UUID, editable label and semantic color/icon. Changes to names have a documented historical display policy; initial policy: display current label and preserve deleted activity records through archive.
- Session: UUID, activity ID, status running/paused/completed, started/ended instants, optional target, created/updated timestamps.
- Interval: UUID, session ID nullable, activity ID nullable, kind active/pause/manual/sleep, start/end instants, optional reason, revision. An open interval belongs only to the single current session.
- Wake marker: explicit instant and source manual. Sleep intervals are explicit, never sensor-inferred.
- Priority: UUID, local target date, title, order, optional linked activity, explicit completion timestamp.
- Settings: onboarding/name/theme/time format/reminder policy/privacy/haptics/motion. Schema version belongs to migration/backup metadata.

Use parameterized SQL, foreign keys, validation and atomic writes. The precise SQL migration is implementer's responsibility within these invariants. Never store full screenshots or personal session data in logs. Backup includes schema version, units, timezone metadata, IDs and content validation; no encryption claims unless actually implemented.

## Timing state machine

Idle -> Start(activity,t) -> Running(open active segment).
Running -> Pause(t) -> Paused(close active, open pause).
Paused -> Resume(t) -> Running(close pause, open active).
Running/Paused -> Finish(t) -> Idle(close open interval and session).
Running/Paused -> Switch(activity,t) -> close previous and start new in one transaction after user confirmation.

Duplicate command IDs or equivalent transaction guards make rapid repeated taps idempotent. Invalid transitions reject without modifying history. Persist before reporting success; a write error keeps the previously confirmed state and allows retry. Reopen app by loading current session and deriving display from timestamps.

## Accounting invariants

All intervals are half-open [start,end), UTC instants in explicit millisecond units. End > start; no overlapping accounted intervals. Session active/pause segments cover its elapsed span without double counting. Labeled pauses change classification within the existing interval, never add a second interval. Switching and edits use atomic transactions. Gap labeling inserts into uncovered intervals only and revalidates against latest state. Editing an active/open record uses session commands, not generic history editor.

For selected local day, clip intervals to timezone-aware day boundaries and now for an ongoing day. Elapsed = accounted active/manual/sleep + pauses + untracked, each disjoint. The overview labels unlabeled pauses separately or includes them in explicitly explained unaccounted total, never both. Future time is separate. Day length can be 23/25 hours on DST transitions. Initial history browsing uses current device timezone and labels it; keep original zone/offset metadata for debugging and later policy changes. Do not reset an ongoing session at midnight.

Longest uninterrupted duration is largest active segment, not full session elapsed. Weekly comparisons compare equivalent elapsed periods or completed days, explicitly labeled; don't compare a partial Monday to a full prior week. A nonexistent record is not proof of inactivity.

Manual clock changes: inject clock abstraction for tests. Use wall-clock instants for history and monotonic elapsed while available in the same process to detect discontinuity. On backward/future-inconsistent timestamps, avoid negative durations, preserve stored data and surface correction. Don't claim exact cross-reboot clock-change recovery without platform evidence. Very long sessions prompt correction; never silently truncate.

## Notifications

Use OS-scheduled local notifications, no remote push service. After successful transitions, reconcile desired reminder with OS identifiers, cancel stale requests, persist scheduling state, and retry reconciliation on foreground. Scheduling failure does not roll back saved activity; show settings status honestly. Enforce quiet hours, sleep suppression, daily cap and snooze using persistent policy. Schedule a bounded next reminder rather than an endless background loop. A stale delivered notification must open current truth; it cannot mutate an old session.

Denied permissions leave app fully usable. Explain Android battery/Doze or force-stop limits when observed; don't promise exact delivery. Confirm behavior in a development/release Android build; Expo Go or browser checks alone are insufficient. No exact-alarm/full-screen alarm or accessibility surveillance permissions by default.

## Backup and migration

Local storage alone is not backup and may be lost on uninstall/device loss. Export a versioned JSON file through platform sharing, with a privacy warning. Import validates shape, limits, references, timestamps, overlap and schema version before showing counts and explicit replacement confirmation. Replace transactionally; failed import preserves current data. Test migration on a populated fixture and never erase production data to fix a migration. Erase-all requires explicit in-app confirmation.

## Toolchain, cost and platform evidence

Inspect Node/package manager/JDK/Android SDK first. Record requirements and commands in generated README. An Android build can use Expo CLI native compilation (`npx expo run:android`) with a working Android toolchain; do not confuse this with EAS local-build platform support. Produce installation instructions and, if tooling permits, an APK. Never claim installed on the owner's phone without evidence. No store publishing in this task.

iOS portability is future work. Expo Go may provide compatible previews, not full distribution or native-feature proof. Apple allows constrained personal testing through Xcode; broad distribution typically requires paid membership. Do not promise a Windows-only free standalone iOS distribution route.

Primary documentation consulted 2026-09-07; recheck SDK-specific APIs when implementing:
- https://docs.expo.dev/develop/development-builds/introduction/
- https://docs.expo.dev/develop/development-builds/faq/
- https://docs.expo.dev/versions/latest/sdk/notifications/
- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://github.com/expo/expo/blob/main/docs/pages/build-reference/local-builds.mdx
- https://developer.apple.com/support/compare-memberships/
