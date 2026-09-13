# VIGIL active product and design context

Updated: 2026-09-13

Authority: current owner direction, supplied mockup boards, current implementation, and factual verification

Primary platform: Android. The GitHub repository currently contains a native Kotlin/Jetpack Compose implementation with local Room storage. Any alternative framework version must be isolated deliberately rather than mixed into the same app module. The three PNG boards in the repository are mandatory visual references and a quality floor, not final layouts.

## Product north star

VIGIL is a calm, cinematic companion that helps a person name what they are doing, stay intentionally present, recover from interruption, understand where time went, and draw useful conclusions without shame. It should feel more like a beautiful personal observatory and trusted mentor than a stopwatch, task manager, or generic analytics dashboard.

The product must be genuinely useful for one person offline and expand naturally to a small private circle. An account must not block first value. Identity is requested only when the user opens Circle, accepts an invitation, or enables backup/sync.

## Two experiences, one truth

Keep two distinct entry experiences. They are not two independent timers.

1. **Track** — open-ended count-up for real life: prayer, study, trading, work, cleaning, rest, sleep, entertainment, or any custom activity. The user starts, pauses, resumes, switches, or finishes without choosing a duration.
2. **Focus** — an intentional sprint with a chosen activity, purpose, and optional target. Default suggestion: 45 minutes. It may count down while preserving elapsed and active time, continue into overtime, or finish explicitly. Reaching zero never fabricates a completed session.

Both use the same durable Session and Interval engine and appear in the same Timeline and Review. `experience = track | focus` and optional target/intention are metadata on the canonical session.

Opening Timeline, Review, Circle, Settings, a sheet, or another tab never changes an active timer. Editing a future focus preset never changes the current session. If the user tries to start another activity, require an explicit Continue current or Finish and start choice. Preview/tutorial sessions use an isolated non-recording store and are clearly labeled; they never pollute history. A preview may offer a separate explicit Save as real session action.

## Current user journey

1. **Welcome:** quiet cinematic opening, one sentence of value, and Make it yours.
2. **Personalize:** optional name, choose/edit starter activities, choose theme. Selecting none is valid.
3. **First value:** interactive Track/Focus preview in a sandbox, then Start for real. Do not request account or notification permission here.
4. **Today:** greeting and date, a cinematic Now hero, Track and Focus entry affordances, current-state controls, untracked/pause recovery, and one factual observation.
5. **Timeline:** exact chronological truth with corrections that preserve the active session and input on error.
6. **Review:** daily/weekly balance, category totals, interruptions and recovery, self-comparison, and tomorrow intentions.
7. **Circle:** optional account step, invite/accept, sharing preview, friend level, circle pulse, encouragement, and fair opt-in challenges.
8. **Return:** reminder taps and app reopen always resolve current truth from timestamps before animation.

## Circle and relationship model

Circle is a current release feature for a small invited group, not a public social network.

- **Friend:** friendship requires acceptance. The owner chooses a small summary to share, such as selected category totals, recorded focus time, number of completed sessions, or a simple current check-in. Exact activity names and sensitive categories are hidden by default.
- **Close Friend:** either person can request an upgrade and both must accept. This tier can receive additional owner-selected fields such as interruption count, pause/recovery pattern, untracked time, exact session times, or selected activity names. Close Friend status does not automatically reveal every field.
- **Per-field control:** the owner sees a plain-language preview: “Samuel will see Focus total and 3 completed sessions. He will not see Prayer, Sleep, exact times, or interruption reasons.” One confirm action is sufficient; the interaction should feel light, while authorization remains strict underneath.
- **Revocation:** downgrading, unfriending, disabling a field, or deleting an account removes future access immediately. The product must explain what already-delivered screenshots or human memory cannot be revoked.
- Spiritual, sleep, health-adjacent, location, exact timestamps, interruption reasons, and raw untracked time default to private. Never infer spiritual quality, discipline, or character from duration.

Do not upload the complete local interval history by default. Produce minimal daily share snapshots containing only fields currently authorized for that viewer/tier. Server rules must authorize every read; hiding a component in the UI is not privacy enforcement.

## Motivation and ranking

Avoid a universal productivity leaderboard because activities, responsibilities, available hours, and goals differ. Use small opt-in challenges with an explicit metric, time window, and audience.

Recommended comparisons:

- percentage of each person’s self-set target completed;
- number of intentional sessions in the chosen window;
- return-after-interruption rate;
- consistency across opted-in days;
- raw time only for a named shared activity/challenge when every participant chooses it.

Never rank prayer, sleep, rest, caregiving, or all-day “productivity” by default. No shame copy, public losers, streak loss threats, or endless feed. Recognition is lightweight: an encouragement, a shared focus invitation, or a weekly circle reflection.

## Information architecture

Primary navigation:

- **Today** — Now hero, Track, Focus, recovery, compact plan.
- **Timeline** — exact history and correction.
- **Review** — personal reflection, patterns, tomorrow plan.
- **Circle** — private friends, permissions, pulse, challenges.

Settings/profile remains a top-level secondary destination. On compact Android widths, use four clearly labeled destinations only if touch targets and safe-area behavior remain excellent; otherwise place Circle behind a prominent people affordance on Today and validate discoverability.

## Visual point of view: light through landscape

The first feeling is atmospheric calm with operational clarity. Use original layered vector landscape art, changing sky light, sun/moon, mist, silhouette depth, and carefully controlled glow. The visuals respond to time, theme, and session state without pretending to know more than recorded data.

- Light canvas: misted stone and warm daylight, not sterile white.
- Dark canvas: blue-hour ink with warm horizon light, not pure black or neon cyberpunk.
- Mint: active presence and positive continuation.
- Amber: pause, gap, and warm attention; never moral failure.
- Slate: sleep, unknown, and secondary history.
- Red: genuine error/destructive action only.

Use three surface roles: atmospheric canvas, quiet working surface, and rare luminous focus surface. Avoid a grid of identical cards. Let typography, whitespace, alignment, translucency, and landscape depth establish hierarchy. All text, controls, timer digits, and charts remain native—not baked into imagery.

The Today hero should remain the memorable signature: roughly 300–360dp at 390dp width, scrollable on compact height, 52–64sp tabular timer, immediate activity selection, and clear controls. Track can use a living state halo; Focus may use honest target progress. Idle, running, paused, target reached, overtime, saved, write failure, and process recovery each need distinct but related compositions.

Circle should feel intimate rather than corporate: portraits/initials, a restrained constellation or horizon motif, compact shared summaries, a visible sharing shield, and no public-feed chrome. Empty Circle should explain the value and invitation model with one action.

## Motion and soundness

Motion communicates cause and state after durable writes:

- start: control compresses, halo draws/illuminates, 220–320ms;
- pause: mint settles toward amber, 180–240ms;
- resume: amber recedes and active halo returns, 180–240ms;
- focus target: restrained light crest, no blocking celebration, 260–420ms;
- finish: halo resolves into a factual summary, 260–360ms;
- corrected gap: block folds into Timeline and totals reconcile, 180–240ms;
- Circle encouragement: subtle pulse/arrival, never confetti spam;
- ambient running: nearly imperceptible 6–10s luminance breath only while visible.

Persist before success animation. Keep controls usable during transitions. Respect reduced motion with static state or short crossfade and respect global haptic preference. No looping video, fake loading, full-screen blur, layout-jittering timer digits, or motion that hides a write failure.

## Voice

Warm, concise, observant, and nonjudgmental.

Prefer: “What are you giving your time to?”, “You returned after 8 minutes.”, “45 minutes of Focus complete. Continue or finish?”, and “Share only what feels useful.”

Avoid: “You failed,” “You wasted time,” invented praise, productivity grades, or claims that recorded prayer/work duration proves value or quality.

## Accessibility and required design evidence

- 48dp minimum targets; semantic labels, roles, selected/disabled states, and logical TalkBack order.
- 4.5:1 normal-text contrast, 3:1 large text and meaningful control boundaries.
- Charts include concise summaries and itemized values; color is never the only signal.
- Validate 360dp and 412dp widths, compact height, 200% font scaling, long activity/name strings, keyboard, light/dark/system themes, Android back, and both navigation modes.
- Capture Today Track idle/running/paused/saved, Focus setup/running/paused/target/overtime/saved, Timeline browse/edit/error while a session remains active, Review sparse/populated, onboarding, Circle empty/friend/close-friend/share-preview/challenge, and settings.
- Record start/pause/resume/finish/target/recovery/theme/Circle transitions and reduced-motion equivalents. Source review and screenshots do not prove runtime motion or native notification behavior.

## Hard bans

No generic dashboard template, public feed, surveillance, passive app monitoring, fake records in the production database, hidden sharing defaults, global productivity score, universal raw-hours ranking, manipulative streak pressure, or decorative animation ahead of correctness. Never push, publish, deploy, create a cloud project, or upload personal activity records without explicit owner authorization.
