# AEVIA product and design authority

Status: current working authority for the serious alpha.

This document supersedes earlier aesthetic instructions that prescribe mint as the primary accent, a generic mountain illustration, or two permanent Awake/Sleep controls on Today. The original three mockup boards remain quality references, not pixel specifications.

## Product promise

AEVIA is a private day companion that helps a person name what they are doing, protect focused time, return after interruption, and understand the shape of a day without shame or surveillance.

The primary loop is:

1. Choose an activity.
2. Choose open-ended Track or target-based Focus.
3. Start, pause, label an interruption when useful, resume, and finish.
4. Repair genuinely untracked time.
5. Review factual patterns and choose priorities for tomorrow.

Sleep is a dedicated state, not a second permanent dashboard action. When sleeping, the app hides ordinary navigation and presents one wake action. Waking ends sleep, records a wake marker, and shows a short factual dawn summary.

## Working identity

The working product name is **AEVIA**: a coined name joining the idea of time with a way or path. Visible product copy, notification titles, backup labels, and the wordmark use AEVIA.

The existing `vigil` application scheme, package identifiers, database name, and deep-link compatibility identifiers stay unchanged during this alpha. Renaming those identifiers is a separate migration and release decision; visual rebranding must not strand existing local data.

## The coherent visual idea

**Time becomes a living horizon.**

The opening, timer, pause, sleep, wake, review, Circle, and future widget are views of one authored world rather than unrelated dashboard cards. The horizon moves from warm dawn to blue hour. A restrained arc represents the day. The timer is the clearest foreground object. State changes alter light, tone, wording, and motion without replacing the whole interface.

Use the authored source artwork at `assets/aevia-horizon.png`. Do not revert the opening or Today hero to the old flat polygon mountains.

The launcher mark is a luminous iris arc crossed by one warm ember. It contains no letter, clock, checkmark, leaf, or text. The current source is `assets/icon.png`; the adaptive foreground and splash derive from the same mark.

## Color system: Ember and Iris

Green/mint is not a brand color.

| Role | Dark | Light | Purpose |
| --- | --- | --- | --- |
| Canvas | `#080C14` | `#F3F0EA` | Blue-black night / warm pearl |
| Surface | `#101722` | `#FBF9F5` | Working cards and sheets |
| Iris action | `#91A7FF` | `#5967D9` | Product actions and selected controls |
| Ember | `#FFAD68` | `#E9894A` | Sun, welcome, warmth, pause emphasis |
| Violet | `#C4A7FF` | `#8B6FD6` | Study/reflection category |
| Coral | `#FF7A86` | `#C94B58` | Danger and health accents |
| Moon | `#7C8CF8` | `#5967D9` | Sleep state |

Use one dominant accent per surface. Apricot leads the cinematic welcome; iris leads working controls. Category colors may add small chart distinctions but must not turn a screen into a rainbow.

## Typography and material

- Android uses platform-native sans typography with tabular timer numerals.
- Headlines are compact, direct, and left aligned. Avoid landing-page slogans inside working screens.
- Cards are reserved for meaningful grouping. Do not wrap every line in a rounded rectangle.
- Corners are soft but not toy-like: 16px controls, 24px major surfaces, pill radii only for segmented controls and chips.
- Touch targets are at least 48dp. Selected state cannot depend on color alone.

## Motion contract

Motion explains state; it never delays the core action.

- Opening: one 520ms ease-out reveal with a subtle image scale and content rise.
- Start: immediate state copy change, timer motion, and restrained halo breath.
- Running and sleeping: a slow six-second luminance/scale breath, maximum scale about 1.025.
- Pause: warm state wash and reason sheet; no alarming shake or red warning.
- Reason saved: visible check plus saved copy.
- Wake: sleeping shell disappears before the dawn summary appears.
- Navigation and ordinary presses: immediate pressed opacity/scale feedback; Android ripple where supported.
- Reduced Motion: static states with identical information and controls.

Never use continuous decorative parallax, fake loading, confetti, coercive streak loss, or motion that hides the timer.

## Journey authority

### Onboarding

1. Full-bleed authored horizon, AEVIA wordmark, one promise, **Begin**.
2. Choose up to four quick-access activities. This changes favorites; it must never archive the unselected starters.
3. Choose Track or Focus as a smart default, optional name, and appearance.
4. Run a safe rehearsal that visibly counts time but never writes a session.
5. Enter Today with the first selected activity ready.

There is no account gate. Privacy is stated briefly, not turned into a legal wall of text.

### Today

Hierarchy: AEVIA/date → greeting → authored living horizon → one contextual action composer → supporting priorities/gap/insight.

Idle order is activity first, then Track/Focus, target/intention, then one start action. Running shows Pause and Finish. Paused shows Resume, Finish, and optional interruption labels with unmistakable saved feedback. Sleep hides all normal navigation and insights.

### Timeline

Timeline is the editable source of truth. It shows session, pause, sleep, manual, and untracked intervals without projecting an open interval into a future date. Future dates are view-only until time reaches them.

### Review

Review explains real recorded data. Active, pause, sleep, and untracked time form one partition; sleep must not be counted both as a category and as a separate sleep bucket. Sparse data uses honest empty/sparse language instead of invented praise.

### Circle

Private value works without an account. Real cross-device Circle requires identity and a sync provider. Sharing is opt-in and derived:

- Connection: small public identity and invitation status.
- Friend: high-level day totals and user-selected activity groups.
- Close friend: optional interruption count, return behavior, and selected deeper patterns.

Raw interval history, notes, exact timestamps, sleep detail, and spiritual labels stay private by default. No global leaderboard. Comparisons are based on self-set commitments or supportive consistency, not total hours.

### Android widget

The widget is a glanceable control surface for current state, activity, elapsed/remaining time, and one valid action. It reads the same canonical session state as the app. It must never create an independent timer. A native widget is not considered delivered until a development build is installed and exercised on a real Android device.

## Retention and motivation

Return behavior comes from utility and ownership:

- fast value in the first minute;
- personally chosen activities;
- a clear next action;
- honest completion feedback;
- weekly patterns that answer a real question;
- opt-in encouragement from trusted people.

Do not add points, currencies, artificial streak emergencies, shame notifications, or a leaderboard that rewards people for having different schedules.

## Acceptance standard

A screen passes only when it is visually coherent at 360dp and 412dp in light and dark themes, supports font scaling and reduced motion, has no clipped navigation, exposes exactly the actions valid for its state, and is backed by real persisted behavior. A beautiful static mock with false controls fails. A passing web export does not prove Android installation, notification delivery, cross-device Circle, or a native widget.
