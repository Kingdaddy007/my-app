# Build status — AEVIA serious alpha

Date: 2026-09-14. Local changes only; nothing committed or pushed.

Current design authority: `docs/AEVIA_PRODUCT_DESIGN_AUTHORITY_2026-09-14.md`.
Remaining implementation and release gates: `docs/AEVIA_IMPLEMENTATION_AND_RELEASE_PLAN_2026-09-14.md`.

## Current verified state

| Area | Status | Evidence |
| --- | --- | --- |
| Track / Focus / Pause / Resume / Finish | working in local web build | In-app browser state transitions; automated engine tests |
| Pause reasons | working | Phone call selection rendered checked and persisted as the open pause reason |
| Sleep / Wake | working in local web build | Dedicated sleep shell, hidden tabs, live sleep timer, wake summary |
| Onboarding | working | Full opening, quick-access activities, rhythm setup, no-write rehearsal, enter Today |
| Browser persistence | working | Durable SQL.js adapter test and successful full reload retaining completed onboarding/history |
| Timeline | working in reviewed web paths | Real interval rows, pause and untracked rows, future-day guard |
| Review | repaired | Category palette migrated; duplicate sleep accounting removed |
| Circle | local demonstration only | Relationship/privacy model is present; banner states no cross-device provider |
| Widget | contract only | `src/platform/widgetState.ts`; no Android widget surface |
| Native Android | unverified | No connected device, Java, SDK environment, or `android/` project on this host |

## Corrections made during the takeover

- Replaced the visible VIGIL identity with working name AEVIA while retaining internal package/database/deep-link identifiers for migration safety.
- Replaced mint/green branding with Ember and Iris tokens and migrated untouched default category colors.
- Replaced the Expo placeholder launcher, adaptive foreground, and splash assets with an AEVIA arc-and-ember mark.
- Rebuilt the opening as a full-bleed authored horizon with restrained reveal motion.
- Reordered onboarding around activity ownership and a safe functioning timer rehearsal.
- Corrected onboarding so unselected starters remain available; selection now means quick-access favorite, not archive. Added a narrow repair for the exact four-activity archive pattern caused by the alpha bug.
- Rebuilt Today around one authored living horizon and one activity-first session composer.
- Removed permanent Awake/Sleep buttons; idle has a quiet sleep entry, sleeping has only **I'm awake** and no tab navigation.
- Added unmistakable saved-state feedback to pause reasons.
- Increased tab-bar geometry so four Android labels do not clip.
- Fixed durable web SQLite, native transaction routing, command serialization, future-day projection, reminder replacement accounting, cold-launch taps, sleep elapsed display, contradictory backup validation, and focus animation compatibility.
- Fixed Review so sleep appears once rather than as both a category and a second explicit bucket.
- Fixed very short wake summaries so a real sleep interval is not reported as zero minutes.

## Verification run

- `npm test -- --runInBand`: **8 suites, 79 tests, 0 failures**.
- `npm run lint` (`tsc --noEmit`): **clean**.
- `npx expo export --platform web --output-dir dist-aevia`: **success**.
- In-app browser at a 412×915 Android viewport: opening, setup steps, rehearsal count-up, Today idle/running/paused, pause reason save, finish, sleep, wake summary, Timeline, Review, Circle, and tab-label fit.

## Honest remaining limits

1. Circle does not connect two phones yet. It needs an approved identity/sync backend and two-account security tests.
2. The widget is not a native home-screen widget yet. It needs an Android development build.
3. Native notifications, process death, background timing, TalkBack, and the APK itself are not proven without the Android SDK and a connected device.
4. The working name AEVIA still needs a proper trademark/store-domain clearance before public release.

Do not describe the project as production-ready until these gates pass.
