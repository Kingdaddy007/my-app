# VIGIL implementation and audit plan

Date: 2026-09-13

Mode: audit, repair, implement, visually direct, verify

Mutation boundary: work locally in an isolated Codex worktree. Do not commit, push, publish, deploy, create a cloud account/project, or upload personal records unless the owner separately requests it.

## Outcome

Deliver a phone-previewable Android-first Expo application that is accurate and resilient, visually exceeds the supplied mockups, supports open-ended Track and target Focus, and implements a private Circle foundation for Friends/Close Friends without fake cloud claims.

## Evidence vocabulary

Use only these labels: `source-reviewed`, `automated-pass`, `web-previewed`, `Expo-Go-tested`, `Android-build-tested`, `physical-device-tested`, and `blocked`. Never turn static inspection into runtime or device proof.

## Phase 0 — Preserve and establish truth

1. Inspect `git status` and preserve all inherited/user changes.
2. Read `START_HERE.md`, the two new direction/context files, original product/design/architecture/acceptance documents, and inspect all three PNGs visually.
3. Inventory routes, state, persistence, migrations, notification implementation, preview fixtures, tests, and current evidence.
4. Run baseline typecheck/tests and launch a real phone-sized web preview. Record exact commands/results and screenshots.
5. Write `docs/AUDIT_CURRENT_IMPLEMENTATION.md` with severity, file/line, reproduction, expected/actual, and evidence. Audit behavior, design, motion, onboarding, navigation, accessibility, error states, and privacy—not only compile errors.

Exit: baseline is reproducible and no inherited source was overwritten blindly.

## Phase 1 — One canonical session engine

Extend the data/domain model so Track and Focus are metadata variants of the same state machine. Add optional `experience`, `targetSeconds`, `intention`, and target/overtime semantics without duplicating timers.

Required tests:

- Track and Focus produce reconciled Session/Interval records;
- only one open session globally;
- navigation/browsing/filtering does not dispatch a timer transition;
- preview/tutorial store never writes production history;
- rapid repeated actions are idempotent;
- start conflict preserves current state until explicit choice;
- background/process recovery derives from timestamps;
- pause/resume/finish across midnight and clock anomalies;
- reaching Focus target does not stop automatically or lose overtime.

Exit: domain tests call production code and prove the core invariants.

## Phase 2 — Onboarding and progressive identity

Recompose onboarding into Welcome → Make it yours → isolated interactive preview → Start for real. Preserve no-account private use. Move notification permission to contextual settings and account creation to Circle/invitation time.

Required states: first launch, skip, back, resumed onboarding, zero selected starters, long/custom activity, light/dark, 200% text, keyboard, preview discard, explicit conversion to real session, error/retry.

Exit: a new user reaches a meaningful first timer action quickly and demo data never enters history.

## Phase 3 — Premium Today: Track and Focus

Build one cinematic Now hero that can enter either experience without resembling a settings toggle.

- Idle offers a recent/favorite activity and two legible choices: Track freely and Focus with a target.
- Track running emphasizes elapsed time and immediate Pause/Finish.
- Focus setup offers presets plus custom target/intention; running shows honest remaining, active, pause, and overtime behavior.
- Paused prioritizes Resume/Finish and optional reason.
- Target reached offers Continue, Extend, or Finish without blocking.
- Saved summary is factual and links to Timeline/Review.
- Active mini-status persists across other tabs; returning restores the full hero.

Complete D1 at 360dp/412dp in both themes for every state before copying patterns elsewhere. Compare side-by-side with board 3. Preserve the mockups’ atmospheric depth, timer authority, and warm/mint state language, then improve Android clarity and real-state behavior.

Exit: rendered and interaction evidence, not only JSX.

## Phase 4 — Timeline and correction safety

Ensure Timeline can be browsed while any session runs without affecting it. Keep a visible compact active-session indicator. Generic edits cannot touch an open interval. Collision errors preserve entered values and explain a valid recovery. Implement date navigation, manual entry, gap split, undo, exact active/paused/elapsed labels, sleep/wake, midnight, empty, future, and long-history states.

Exit: Timeline totals reconcile with canonical intervals and correction failures are atomic.

## Phase 5 — Review, planning, and meaningful insight

Reconcile Review with Timeline. Provide Day/Week lenses, category distribution, active/pause/sleep/untracked balance, Focus target results, interruption and recovery patterns, longest eligible uninterrupted interval, and tomorrow intentions. All conclusions link to source records and use “recorded” language. Sparse windows get calm guidance. No invented percentage, productivity score, or spiritual judgment.

Exit: deterministic tests cover empty, sparse, normal, interrupted, overlapping-corruption rejection, and timezone boundaries.

## Phase 6 — Circle architecture and local UX

Add a provider-independent Circle domain and application surface now. Required entities and transitions are defined in `PRODUCT_AND_SOCIAL_DIRECTION_2026-09-13.md`.

Build:

- optional identity gate when entering Circle;
- invite/request/accept/decline/block/unfriend;
- separate mutual Close Friend upgrade/downgrade;
- tier defaults, per-field controls, sensitive-field confirmations, and preview-as-viewer;
- minimal daily share snapshot builder from local truth;
- Circle empty/loading/offline/error/signed-out states;
- friend profile, circle pulse, encouragement, mute, and freshness label;
- opt-in challenge model with fair normalized metrics.

If external provider credentials do not exist, use an unmistakable development-only demo provider behind the same interface. Do not expose demo identities in production data and do not claim cross-device completion.

Security tests must prove that non-friends, downgraded friends, blocked users, stale policy revisions, and unauthorized fields cannot read data. UI-hidden is not authorization.

Exit: complete local UX/domain proof and either a named real-provider integration status or a precise external blocker.

## Phase 7 — Real private-alpha sharing

This phase remains in the current release target, but requires owner-approved backend configuration.

Recommended first path: Firebase Auth plus Firestore if Google tooling/configuration already exists. Keep local SQLite authoritative; upload only authorized derived snapshots. Implement server-side rules, local queue/retry, revocation, account deletion/export, and two-identity integration tests. Never commit secrets.

Release scenarios:

1. User A invites User B; B accepts.
2. B sees only Friend-authorized fields.
3. Both accept Close Friend; B sees only newly authorized optional fields.
4. A disables interruptions and B immediately loses that field.
5. A downgrades/blocks/unfriends and access is revoked.
6. A and B opt into one named challenge and see the same explained ranking.
7. Offline/stale data is labeled and reconciles without leaking another viewer’s cached fields.

Exit: two real test accounts/devices or emulators, rule tests, network/error evidence, and no claim beyond what was run.

## Phase 8 — Respectful reminders

Audit and complete local notifications for paused and awake-idle states: just-in-time permission, quiet hours, sleep suppression, snooze, deduplication/cancellation, cap, generic lock-screen copy, stale-tap reconciliation, and truthful denied/battery status. Add Focus target notification only when explicitly enabled. Avoid alarm-level permissions.

Exit: domain tests plus Android development-build/device evidence; web preview is insufficient.

## Phase 9 — Design, motion, and accessibility pass

Apply the context’s landscape/light system across Onboarding, Today, Timeline, Review, Circle, and Settings. Use hierarchy and a limited surface system before adding cards. Implement semantic haptics and state motion after persistence. Validate dark startup, system bars, safe areas, back behavior, long labels, 200% text, TalkBack order/announcements, chart alternatives, touch targets, contrast, reduced motion, and midrange phone frame pacing.

Required visual gates:

- D1 Today: Track and Focus full state matrix.
- D2 Timeline/Review: empty, populated, edit/error, sparse.
- D3 Circle: empty, invite, Friend, Close Friend, share preview, challenge, blocked/offline.
- D4 motion: start/pause/resume/target/finish/gap correction/theme/encouragement and reduced-motion equivalents.

Exit: phone-sized screenshot set and recordings with device/viewport/theme/state labels.

## Phase 10 — Whole-product regression and handoff

Run full typecheck/tests, production web export, Expo phone preview, and Android build/device checks available on the host. Re-audit P0/P1/P2 findings. Update a new `docs/BUILD_STATUS_CURRENT.md` and `evidence/current/` index with sanitized evidence. Do not rewrite inherited evidence as if it proves new work.

Delivery report must state:

- changed files;
- exact commands and results;
- phone preview instructions/URL or QR workflow;
- what is source-only, browser-tested, Expo-Go-tested, Android-build-tested, and physical-device-tested;
- Circle real-provider vs demo status;
- residual defects and external blockers;
- no commit/push confirmation.

## Priority when time is constrained

1. P0/P1 correctness, privacy, backup, and active-session safety.
2. Track + Focus end-to-end and D1 visual quality.
3. Timeline/Review reconciliation and onboarding.
4. Circle domain, sharing controls, authorization tests, and real provider when approved.
5. Notifications, broader accessibility/device matrix, and optional Focus Together.

Do not cut data safety or sharing authorization to preserve an animation. Do not call the result premium if the core visual states were not rendered and judged against the mockups.
