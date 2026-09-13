# Product contract

> **Current amendment — 2026-09-13:** Private guest use remains foundational, but optional Circle identity, Friends/Close Friends, selective sharing, and fair opt-in challenges are now current serious-alpha scope. Track and Focus remain two user-facing experiences over one engine. Where this file excludes those capabilities, follow `PRODUCT_AND_SOCIAL_DIRECTION_2026-09-13.md`.

## Purpose and source of truth

VIGIL helps Beloved understand his day and act intentionally. It should feel like a thoughtful companion: personal greeting, beautiful atmosphere, immediate activity controls, useful reflection. The user's spoken requirements and the three provided mockup boards inform this plan. The detailed defaults below are design decisions proposed for implementation, not claims the user individually specified them.

Initially each installation is private and independent. A sibling can use their own installation and activities without a login. Do not hardcode Beloved, prayer, trading, or any religious identity as universal preferences. Ask for an optional display name and allow custom categories. No telemetry or remote AI is required.

## Essential journey

1. First launch: concise welcome; optional name; editable suggested activities; system/light/dark theme; explain reminders and request permission only after an explicit enable action. Everything except essential local setup is skippable.
2. Today: local-time greeting and date; select/create activity; start immediately. Default timer counts UP because the user measures real activities. Optional target duration gives a countdown without automatically ending or relabeling a session.
3. Pause: commit timestamp immediately. Optional interruption reason can be added afterward without delaying pause. Resume preserves the same session. Stop completes it; switching activity offers an explicit finish-and-start action.
4. Away from app: timestamps preserve duration through screen lock and process suspension. No perpetual JS loop is required for accuracy.
5. Untracked time: one-tap whole-gap labels plus an editor for dividing a gap among multiple activities. Never infer behavior from silence or call all pauses distraction.
6. Timeline: inspect any date; edit, add, correct, or delete entries with clear recovery. Show actual history and untracked gaps.
7. Review: totals by meaningful category, interruption count/duration, longest uninterrupted interval, tracked/untracked balance; choose three priorities for tomorrow and close the review.
8. Next day: priorities appear on Today as a compact preview, and can supply an activity name when starting. Completing a priority is explicit, not inferred from time spent.

## Accounting and coaching rules

- One running or paused session at a time. Double taps must not create duplicates.
- Active duration excludes pauses. Session elapsed span includes pauses. Present both with unambiguous labels.
- Pause reasons: Break, Phone call, Distraction, Other, Skip. An unlabeled pause remains unknown; do not auto-classify it as rest.
- Category totals count recorded active or explicitly labeled time only. Rest is a valid category, never a failure.
- Show missing activity only against an explicit user priority/plan; absence of a record does not prove the activity did not happen.
- Comparisons say "recorded" time. No claims about improved productivity, hypothetical focus gains, or spiritual quality.
- Insights use transparent arithmetic, e.g. "Your longest uninterrupted session was 38 minutes." Sparse data gets a useful neutral message, not fake weekly trends.
- Distinguish future hours from past untracked time. A day still in progress must not label its remaining hours missing.
- No automatic sleep/wake detection. Provide optional "I'm awake" and "Going to sleep" quick actions with manual correction. Sleep is an explicit activity; tracking awareness starts at onboarding and does not invent earlier records.
- Wake-to-first-activity insight exists only after a user-recorded wake marker. No unsolicited inferred wake time.

## Reminder defaults (editable and opt-in)

Paused session: one check-in after 10 minutes. Idle while awake: one check-in after 30 minutes. Offer snooze 15/30/60 minutes. Default quiet hours 22:00–07:00, editable, and suppress all coaching reminders during recorded sleep. At most one proactive reminder per hour and four per local day. Do not repeatedly nag after dismissal. Resuming, starting, labeling, disabling, or changing a session cancels obsolete scheduled reminders. Notification taps open the relevant current state and never replay a stale mutation. Generic lock-screen text by default; activity names require user opt-in.

Examples: "Still taking a break? Resume when you're ready." "A little time is unaccounted for. Want to give it a name?" Tone may be warm and playful, never insulting or threatening. Settings include frequency, quiet hours, preview privacy, reminder toggle, and a test reminder.

## Scope and usefulness

Include custom activity/category CRUD, local history, backup export/import, settings, both themes, priorities, manual sleep/wake, reminders, and honest insights. Exclude calendar integration, accounts, cloud sync, watches, passive app monitoring, AI coaching, gamification/streak pressure, subscriptions, and social feeds.

After seven days the owner should be able to explain where time went, correct forgotten intervals quickly, and keep using the app without excessive bookkeeping. Reliability gate: no double counting, no lost acknowledged writes, usable offline, timer recovery, and controls that remain immediate under animation. Aesthetics and usability are both release criteria.
