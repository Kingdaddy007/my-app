# VIGIL current implementation audit

Date: 2026-09-13

Scope: inherited detached-worktree snapshot at `5a93de15070e964b06b6453c9dc18a68c4b8cdc2` plus the uncommitted files present before this implementation pass. This is a baseline audit, not a release approval and not evidence about a physical Android device.

Authority: `docs/PRODUCT_AND_SOCIAL_DIRECTION_2026-09-13.md`, `.agents/contexts/vigil-product-design-context.md`, and `docs/IMPLEMENTATION_AND_AUDIT_PLAN_2026-09-13.md` supersede conflicts in the original packet.

## Baseline evidence

| Evidence | Result | Label | Limit |
| --- | --- | --- | --- |
| `git status --short --branch` | Detached HEAD with 28 inherited modified/untracked paths | `source-reviewed` | Establishes provenance only |
| All current and original product/design/architecture/acceptance/ticket documents | Read completely | `source-reviewed` | Does not prove runtime behavior |
| Three `Codex Image 7 Sept 2026` PNG boards | Visually inspected at original resolution | `source-reviewed` | Art direction and hierarchy reference only |
| `npm ci --ignore-scripts` | Failed because package and lock data are inconsistent | `blocked` | No dependency installation completed |
| Temporary worktree junction to the owner checkout's exact existing dependency tree | Expo 57.0.20, React Native 0.86.3, TypeScript 6.0.3, Jest 30.5.1 | `source-reviewed` | Dependency tree is shared and not clean-install proof |
| `npm run lint` | Exit 0 | `automated-pass` | Type/static evidence only |
| `npm test -- --runInBand` | 6 suites, 42 tests, 0 failures | `automated-pass` | Existing tests do not cover the superseding Track/Focus or Circle contracts |
| Expo web preview on `http://localhost:8081` | Onboarding, Today, Timeline, Review, and Settings inspected at 360 x 800; onboarding inspected at 412 x 915 | `web-previewed` | Web/sql.js is not native SQLite, notification, lifecycle, TalkBack, frame pacing, Expo Go, Android build, or physical-device evidence |

## Findings

### VIG-001 - P1 - Track and Focus are still one ambiguous target timer

- Location: `src/domain/types.ts:29`, `src/domain/timeEngine.ts:43`, `app/(tabs)/index.tsx:371`.
- Reproduction: open Today while idle. The hero shows the selected activity's target (`25:00`) and one `Start Deep Work` action. There is no open-ended Track choice, Focus setup, prominent 45-minute default, intention, target-reached decision, or experience label in history.
- Expected: `experience = track | focus` and optional target/intention are metadata on one canonical Session/Interval engine; Track and Focus remain visibly distinct entry experiences.
- Actual: Session stores only `targetSeconds`; the activity target is passed automatically at start.
- Evidence: `source-reviewed`, `web-previewed`.

### VIG-002 - P1 - The single-current-session invariant is not durable and switching bypasses explicit conflict resolution

- Location: `src/data/schema.ts:74`, `src/data/repository.ts:109`, `src/domain/timeEngine.ts:43`, `app/(tabs)/index.tsx:623`.
- Reproduction: inspect the schema and start path. There is no database-level unique constraint for running/paused sessions; the in-memory lock protects only one `TimeEngine` instance. The existing double-start test awaits the first call before making the second, so it does not exercise concurrent commands. While a session is active, selecting another activity immediately calls `switchSession`.
- Expected: one open session globally, durable conflict protection, and an explicit `Continue current` or `Finish and start` decision before switching.
- Actual: multiple engine/process callers can race past the read, and the UI silently finishes and replaces the current session after a picker tap.
- Evidence: `source-reviewed`. The present test is positive but non-representative for the race.

### VIG-003 - P1 - Generic history operations can mutate or delete the live interval

- Location: `src/domain/timeEngine.ts:382` and `src/domain/timeEngine.ts:425`.
- Reproduction: call `editInterval` or `deleteInterval` with the ID of the current open interval. Neither method rejects `endMs == null`, a running/paused session association, or current-session ownership.
- Expected: the open interval is changed only through session commands; Timeline editing cannot alter it.
- Actual: the domain layer allows generic edit/delete access to the canonical live record.
- Evidence: `source-reviewed`.

### VIG-004 - P1 - Circle and its authorization/provider boundary do not exist

- Location: `app/(tabs)/_layout.tsx:51`; no Circle route, domain, provider interface, policy evaluator, snapshot builder, or authorization tests exist under `app/`, `src/`, or `tests/`.
- Reproduction: inspect primary navigation. Only Today, Timeline, and Plan are present.
- Expected: polished local Circle UX, mutual Friend and separate mutual Close Friend transitions, selective field sharing, sensitive-off defaults, viewer preview, revocation/blocking, encouragement, fair opt-in challenges, and a clearly labeled local demo provider when a real backend is unavailable.
- Actual: the complete Phase 6 surface is absent. No approved backend configuration was found, so real cross-device sharing is externally blocked and must not be claimed.
- Evidence: `source-reviewed`, `web-previewed`.

### VIG-005 - P1 - SVG rotation emits a blocking Expo development error overlay

- Location: `src/ui/TimerHalo.tsx:114` and `src/ui/DonutChart.tsx:91`.
- Reproduction: launch the web preview and start a targeted session. React Native SVG forwards `origin` as invalid DOM `transform-origin`; Expo opens its error overlay and blocks normal tab interaction until dismissed.
- Expected: zero runtime console errors during the critical timer and Review journeys.
- Actual: `Invalid DOM property 'transform-origin'. Did you mean 'transformOrigin'?` is rendered by the Expo error overlay.
- Evidence: `web-previewed` at 360 x 800.

### VIG-006 - P1 - Onboarding does not deliver the isolated Track/Focus proof step

- Location: `app/onboarding.tsx:29` and `app/preview.tsx:25`.
- Reproduction: follow onboarding. The three steps are welcome, name/theme, and starter activities; completing or skipping goes directly to Today. The separate design-check route has idle/running/paused fixtures only and is not the required onboarding sandbox.
- Expected: Welcome -> Make it yours -> clearly labeled isolated Track/Focus tryout -> Start for real, including discard and explicit conversion behavior.
- Actual: no Track/Focus preview occurs, no preview conversion contract exists, and in-progress onboarding step state is not persisted.
- Evidence: `source-reviewed`, `web-previewed`.

### VIG-007 - P1 - Dependency lock cannot reproduce the requested source state

- Location: `package.json` and `package-lock.json`.
- Reproduction: run `npm ci --ignore-scripts` in a clean worktree. npm rejects mismatched internal React Native/Metro/Hermes and WASI entries.
- Expected: lockfile and manifest are synchronized so a clean project-local install is deterministic.
- Actual: `npm ci` exits 1 before installation.
- Evidence: `blocked`.

### VIG-008 - P2 - Fresh-day accounting invents untracked time before the user begins awareness

- Location: `src/domain/dayCalculator.ts:93` and `app/(tabs)/index.tsx:481`.
- Reproduction: skip onboarding on an empty browser fixture in the evening. Today immediately reports all time since midnight as untracked (1077 minutes in the observed run).
- Expected: awareness begins from an explicit marker or first real use; the product does not pretend it observed earlier hours.
- Actual: gap calculation always starts at local midnight.
- Evidence: `source-reviewed`, `web-previewed` at 360 x 800.

### VIG-009 - P2 - Sparse Review uses invented praise

- Location: `app/(tabs)/review.tsx:401`.
- Reproduction: open Review with zero recorded minutes. The screen says `You used your time with intention. That's a win.` while its own chart says 100% untracked.
- Expected: calm, factual sparse-data guidance with no invented achievement or moral/productivity judgment.
- Actual: an unconditional day/week quote asserts a positive conclusion unsupported by records.
- Evidence: `source-reviewed`, `web-previewed` at 360 x 800.

### VIG-010 - P2 - Active-session continuity is not visible outside Today

- Location: `app/(tabs)/timeline.tsx` and `app/(tabs)/review.tsx`.
- Reproduction: start Deep Work, dismiss the SVG overlay, then open Timeline and Review. Navigation itself did not dispatch a stop, but neither destination displayed the required compact active-session indicator. Timeline rendered the open interval as a visually completed zero-minute row.
- Expected: browsing never changes the timer and a compact active status remains visible across primary tabs.
- Actual: continuity is hidden and the live row is ambiguous.
- Evidence: `web-previewed` at 360 x 800.

### VIG-011 - P2 - Theme and database failure states are split from durable settings

- Location: `src/ui/ThemeContext.tsx:24`, `src/data/AppContext.tsx:137`, and `src/data/AppContext.tsx:153`.
- Reproduction: inspect provider ownership and failure handling. Theme/reduced-motion state initializes independently outside `AppProvider`; stored settings do not hydrate it on app restart. Database initialization/loading failures are logged but there is no user-visible error/retry state and `isReady` can remain false indefinitely.
- Expected: persisted appearance settings, explicit loading/error/retry UI, and no implied success after failed writes.
- Actual: the UI can diverge from stored preference and failure is silent.
- Evidence: `source-reviewed`.

### VIG-012 - P2 - Reminder behavior is only a partial policy implementation

- Location: `src/platform/notifications.ts:70` and `src/data/AppContext.tsx:198`.
- Reproduction: inspect scheduling. Every transition cancels all scheduled notifications; identifiers and delivery counts are not persisted. There is no snooze, daily cap, recorded-sleep suppression, reboot reconciliation, stale-tap routing, or Focus-target opt-in path, and scheduling failure is swallowed.
- Expected: bounded, persistent, truthful reminder policy with quiet hours, sleep, caps, snooze, deduplication, stale-tap resolution, and visible denied/failure status.
- Actual: pause/idle scheduling and generic privacy copy exist, but the broader lifecycle contract is unimplemented.
- Evidence: `source-reviewed`; Android delivery is `blocked` pending a development build/device.

### VIG-013 - P2 - Accessibility and responsive coverage is incomplete

- Location: `app/settings.tsx`, `app/onboarding.tsx`, `src/ui/components/ModalSheet.tsx`, and primary routes.
- Reproduction: inspect the 360dp accessibility tree. Several Settings controls and buttons have no useful accessible name, onboarding selection items do not expose selected state, and no focus-return/announcement behavior is implemented for sheets or durable transition results.
- Expected: logical TalkBack order, useful labels/state, modal focus return, write-result announcements, 48dp targets, long-label/200% text support, and both 360dp/412dp evidence.
- Actual: some controls and charts are labeled, but coverage is inconsistent and no TalkBack or 200% text proof exists.
- Evidence: `source-reviewed`, `web-previewed`; TalkBack and physical target measurement remain `blocked` without Android device evidence.

## Baseline security boundary

- Assets: local raw Session/Interval history, sensitive activity/category semantics, derived daily summaries, relationship/share-policy state, and encouragement/challenge content.
- Actors: the local owner, invited viewer, friend, close friend, blocked/former friend, and the absent real backend authority.
- Primary abuse case: unauthorized viewer -> stale or over-broad policy/snapshot read -> sensitive field exposure.
- Baseline control state: no social data is transmitted because Circle does not exist. That avoids an active leak but does not satisfy the product. Any demo implementation must remain local, clearly labeled, deny unauthorized reads in the provider/domain layer, and avoid representing client filtering as real server enforcement.
- External boundary: a real identity/backend project, server authorization rules, two test identities, and network/device evidence are absent and require owner-approved configuration.

## Baseline conclusion

Status: `blocked` for serious-alpha completion. Existing local accounting, backup validation, activities, reminders, and visual primitives provide a useful base, and the inherited 42-test suite passes. The superseding product contract, live-history safety, Circle authorization model, clean install, complete state coverage, and native/device proof are not yet satisfied.
