# AEVIA implementation and release plan

Status: executable plan after the September 14 takeover and browser audit.

## Completed local foundation

- One canonical Session/Interval engine for Track, Focus, Pause, Sleep, manual repair, and wake.
- Serialized command queue, including three or more distinct rapid commands.
- Durable SQL.js browser storage and exclusive native SQLite transactions.
- Future-day accounting guard and future Timeline edit guard.
- Reminder replacement accounting and cold-launch notification tap handling.
- Backup validation for contradictory open/completed sessions.
- Activity-first onboarding, safe no-write rehearsal, and repair of the alpha archive bug.
- AEVIA visual identity, Ember/Iris tokens, authored horizon asset, state-aware Today hero, single-action sleep shell, saved pause-reason feedback, and unclipped four-tab navigation.
- Circle relationship/privacy domain model and clearly labelled local demonstration provider.
- Widget read-model contract only; no native Android widget surface yet.

## Remaining work and gates

### Gate 1 — Android development environment

Required before native proof:

1. Install/configure a supported JDK and Android SDK.
2. Connect an Android phone with USB debugging and confirm it appears in `adb devices -l`.
3. Generate the Expo native Android project and create a development build.
4. Verify local database persistence, background/resume timer reconciliation, haptics, notifications, quiet hours, deep links, safe areas, theme, reduced motion, and font scaling on device.

Current machine evidence: `adb` exists through scrcpy, but no device is attached; Java, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and an `android/` project are absent. Dependency/toolchain installation needs explicit user approval.

### Gate 2 — Real Circle provider

The local demonstration must not be relabelled as social sync. A real provider requires explicit approval to create/configure cloud infrastructure and authentication.

Recommended first implementation:

1. Passwordless identity suitable for a small trusted beta.
2. Invite code or link, request, accept, decline, block, unfriend.
3. Server-side relationship checks for every read.
4. Versioned daily derived snapshots, not raw intervals.
5. Per-friend sharing policy with Friend and Close Friend levels.
6. Delete/revoke flow and visible last-synced/error states.
7. Emulator/local security-rule tests before any friend data is uploaded.

No production personal history should be uploaded during development. Use synthetic accounts until the policy and deletion paths pass.

### Gate 3 — Native Android widget

After Gate 1:

1. Add a native widget implementation compatible with the chosen Expo development-build route.
2. Render idle, running Track, running Focus, paused, overtime, and sleeping states from the canonical widget read model.
3. Deep-link actions into the app for start/pause/resume/finish/wake unless a tested native action bridge safely preserves the same command queue.
4. Verify refresh cadence, process death, reboot, theme, accessibility labels, and stale-state recovery on the connected phone.

### Gate 4 — Native release evidence

Before sharing with friends:

- clean install and upgrade preserve local history;
- start/pause/resume/finish/sleep/wake survive app background and process restart;
- notification caps and quiet hours are observed on device;
- Circle denial paths are tested with two synthetic accounts and two devices/emulators;
- backup export/import round trip is exercised;
- TalkBack, font scaling, reduced motion, 360dp/412dp layouts, light/dark, and offline behavior are checked;
- no console/runtime errors remain in a fresh browser/native run;
- signed build and distribution method are chosen explicitly.

## Evidence already obtained in this pass

- In-app browser at Android-sized viewport: onboarding, rehearsal timer, Today idle/running/paused, pause-reason save, Finish, Sleep, Wake, Timeline, Review, and Circle.
- TypeScript: `npm run lint` passes.
- Automated regression: all 8 suites / 79 tests pass.
- Static web export: `npx expo export --platform web --output-dir dist-aevia` succeeds.

These prove source/web behavior only. They do not prove native Android, a real backend, or a home-screen widget.
