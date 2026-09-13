# VIGIL build and verification status

Last updated: 2026-09-13

Current revision audited: `77f7ba6`

Current decision: **implementation present; private-alpha release not verified**

## Current truth

| Area | Status | Evidence / blocker |
| --- | --- | --- |
| Native Android source | Implemented, source-reviewed | Kotlin/Compose/Room project under `app/` |
| Clean build | Unverified | No Gradle wrapper in repository; no usable JDK/Gradle/Android SDK found on this host during the 2026-09-13 audit |
| Unit tests | Present, not executed here, insufficient | Tests mostly reproduce arithmetic instead of invoking repository/domain behavior |
| Instrumentation/UI tests | Missing | No Android test source/dependencies found |
| APK | Missing/unverified | No build artifact recorded in repository |
| Emulator/device run | Unverified | No launch, install, lifecycle, TalkBack, or notification evidence supplied |
| Timer/accounting | Material defects found | See VIG-A07 through VIG-A15 in `AUDIT_2026-09-13.md` |
| Notifications | Not functionally complete | Immediate pause notification only; no delay scheduler, idle reminder, snooze/cap, or runtime permission flow |
| Backup/restore | Unsafe/incomplete | Omits settings/wake markers on export and priorities/settings/wake on import; failed import can commit partial writes |
| Privacy | Contract mismatch | `android:allowBackup="true"` conflicts with strict local-only onboarding copy |
| Migration safety | Release blocker | Destructive migration fallback enabled; schemas not exported |
| Visual quality | Source foundation only | Tokens/halo/vector landscape exist; required rendered D1/D2/D3 evidence absent and Today does not use the signature landscape |
| Accessibility | Unverified/incomplete | Reduced motion and haptic preferences not wired; no TalkBack/large-text evidence |

## Correction to the 2026-09-07 status

The previous version said all tickets were verified by Gradle builds and unit tests. That claim is unsupported by artifacts available in this checkout and conflicts with the audited implementation:

- no reproducible wrapper/build instructions;
- tests do not call the transaction engine, notification helper, backup routines, or review derivation;
- no idle reminder or scheduling mechanism;
- backup is neither complete nor an atomic replacement;
- reduced motion and haptic preferences are not applied globally;
- no screenshots, recordings, emulator logs, or physical-device results.

Historical implementation claims are superseded by `docs/AUDIT_2026-09-13.md` and `docs/REPAIR_AND_RELEASE_PLAN.md`.

## Next action

Start R0, then R1. Circle domain/UI is now current scope, but do not connect or expose real users' shared data before build reproducibility, onboarding, privacy, migration, timing, backup, identity, and server-authorization blockers are resolved. Do not distribute an APK until the applicable release gates are evidenced.

For each change, append exact command results, evidence paths, device/OS/build variant, remaining unknowns, and tested Git revision. Keep “source-reviewed,” “build-passed,” “emulator-tested,” “device-tested,” and “owner-approved” separate.
