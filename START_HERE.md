# AEVIA — current build handoff

AEVIA is the working identity for the former VIGIL project. It is a private Android-first day companion for activity tracking, target-based focus, interruptions, sleep/wake, honest review, and opt-in support from trusted friends.

## Read in this order

1. `docs/AEVIA_PRODUCT_DESIGN_AUTHORITY_2026-09-14.md` — current product, journey, visual, motion, social, privacy, and widget authority.
2. `docs/BUILD_STATUS_CURRENT.md` — what has actually been repaired and verified.
3. `docs/AEVIA_IMPLEMENTATION_AND_RELEASE_PLAN_2026-09-14.md` — remaining Android, Circle, widget, and release gates.
4. The three original PNG mockups in the repository — quality references, not pixel specifications.
5. Older product/architecture/audit documents only when tracing a decision. Where they conflict with the three current documents above, the current documents win.

## Non-negotiable implementation rules

- Preserve one canonical Session/Interval engine for Track, Focus, Pause, Sleep, Timeline, Review, notifications, and the future widget.
- Do not reintroduce mint/green branding, flat polygon hero art, permanent Awake/Sleep buttons, generic identical cards, fake statistics, or a global hours leaderboard.
- Onboarding activity selection controls quick-access favorites. It must never archive activities the user did not select.
- Private use requires no account. Circle must remain explicitly labelled local-only until a real authenticated provider and two-identity security proof exist.
- Keep internal `vigil` scheme/package/database identifiers during this alpha unless a deliberate migration is approved.
- Do not commit, push, publish, deploy, create a cloud project, install system dependencies, or upload personal data without the user's explicit authorization.

## Current verification commands

```bash
npm run lint
npm test -- --runInBand
npx expo export --platform web --output-dir dist-aevia
npm run web -- --port 8094
```

Current evidence: TypeScript clean; 8 test suites / 79 tests pass; web export succeeds; the main state journeys were exercised in the Codex in-app browser at a 412×915 Android viewport.

## Honest capability boundary

The local/web alpha works. Cross-device Circle, a native Android home-screen widget, notification delivery on hardware, background/process-death behavior, and APK installation are not complete or proven. They require the gates in the implementation plan.
