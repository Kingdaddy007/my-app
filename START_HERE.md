# VIGIL project entrypoint

> **Current direction update — 2026-09-13:** Read `docs/PRODUCT_AND_SOCIAL_DIRECTION_2026-09-13.md`, `.agents/contexts/vigil-product-design-context.md`, and `docs/IMPLEMENTATION_AND_AUDIT_PLAN_2026-09-13.md` first. They supersede earlier statements that accounts/social are out of scope or that VIGIL should expose only one tracker experience. Open-ended Track and target Focus now remain as distinct experiences over one canonical session engine, and private Friends/Close Friends sharing is part of the current serious-alpha target.

Status: native Android implementation exists and was source-audited on 2026-09-13. It is **not yet verified for private-alpha release**. Owner: Beloved.

## Read in this order

1. `docs/PRODUCT_AND_SOCIAL_DIRECTION_2026-09-13.md` — current product decisions, Track/Focus behavior, Friends/Close Friends, selective sharing, and fair motivation.
2. `.agents/contexts/vigil-product-design-context.md` — active UX, visual, motion, copy, privacy, and evidence direction.
3. `docs/IMPLEMENTATION_AND_AUDIT_PLAN_2026-09-13.md` — current ordered implementation, Circle, audit, and release gates.
4. `docs/AUDIT_2026-09-13.md` — current defects, evidence, strengths, and limitations.
5. `docs/REPAIR_AND_RELEASE_PLAN.md` and `docs/PRODUCT_EVOLUTION.md` — earlier repair/evolution details, as amended by the three current files above.
6. `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, and `docs/ACCEPTANCE.md` — original approved contracts that still apply unless current dated direction explicitly refines them.
7. Visually inspect all three original mockup boards before design work:
   - `Codex Image 7 Sept 2026, 11_48_01.png`
   - `Codex Image 7 Sept 2026, 11_48_25.png`
   - `Codex Image 7 Sept 2026, 11_49_02.png`
8. `docs/BUILD_STATUS.md` — current reproducible evidence ledger.

## Current objective

Produce a trustworthy, exceptionally beautiful Android private alpha for the owner and 2–3 invited testers. Repair privacy, migration, onboarding, time accounting, error feedback, reminders, and recovery, then deliver both open-ended Track and target Focus over one durable engine. Build private Circle sharing for Friends/Close Friends in the same serious-alpha program, with real backend integration once an owner-approved provider configuration exists.

The mockups are a quality floor, not a pixel-copy target. Preserve cinematic light, landscape depth, typography, timer hierarchy, compact chronology, and calm reflection while improving Android-native behavior, state coverage, accessibility, and real interaction. Do not flatten the result into a generic Material dashboard.

## Release boundary

In scope now: independent local use without an account; editable activities/categories; one durable engine with Track and Focus experiences; pause reasons; correction; wake/sleep; priorities; accurate review; opt-in reminders; complete manual backup; both themes; reduced motion; accessibility; Android package evidence; optional identity at Circle entry; mutual Friend and Close Friend relationships; selective sharing; revocation; encouragement; and fair opt-in challenges.

Not in this alpha: public feeds, passive app monitoring, Wear OS, remote AI, subscriptions, publishing, or broad automatic upload of raw personal history. Real cross-phone Circle release requires an owner-approved backend configuration and server-side authorization; that dependency does not make Circle a later product feature.

## Working rules

- Database truth precedes animation and success feedback.
- Invalid actions do not modify history.
- No destructive migration or partial restore.
- No claim is stronger than its evidence.
- Tests invoke production behavior, not restate arithmetic.
- Native build/device proof and rendered design proof are both required.
- Keep mockup PNGs intact; never ship the presentation boards as app backgrounds.
- Do not use personal activity records in committed evidence.
- No paid service, deployment, publication, cloud account, or external upload without explicit owner authorization.

## Builder prompt

Read every required file above and inspect all three mockups. Execute `docs/IMPLEMENTATION_AND_AUDIT_PLAN_2026-09-13.md` in order, keeping evidence factual after each phase. Fix trust/accounting before sharing personal data. Build one authoritative engine with excellent Track and Focus experiences, prove Timeline and Review reconcile, then implement Circle with strict selective sharing. Run clean build/tests/lint, render the required design evidence, and install the versioned APK on the owner's Android device when available. Do not mark source inspection as runtime proof, fake real cloud sharing, or stop at generic Material components or decorative animation.

## Independent audit after repair

Audit the repaired revision against this entrypoint, active context, original contracts, audit findings, repair plan, and all three mockups. Reproduce build/domain tests; inspect rendered light/dark states; verify lifecycle, correction, backup rollback, notification permission/delivery, reduced motion, haptics, TalkBack, and phone installation. Every finding needs severity, file/line, reproduction, expected/actual, and evidence. Unverified device behavior remains unknown rather than passed.
