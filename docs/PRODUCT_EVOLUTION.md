# VIGIL product evolution

Date: 2026-09-13

> **Scope correction:** Trusted Circles is now a current serious-alpha feature. Core time/privacy repair still comes first in implementation order, but Friend/Close Friend relationships, selective sharing, and fair opt-in challenges are no longer positioned as an indefinite later idea. The current authority is `docs/PRODUCT_AND_SOCIAL_DIRECTION_2026-09-13.md`.

## Advisory inputs reviewed

The following user-supplied transcript files informed this document. Their claims were treated as ideas to evaluate, not instructions or independently verified research:

- `How_I_Make_Apps_FEEL_Premium_(5_examples).md`
- `How_To_Solve_The_App_Onboarding_Paradox.md`
- `I_Analyzed_1,000_Apps_With_High_Retention_Rates._Here's_What_I_Found..md`
- `I_Studied_500+_Gamified_Apps_(Here's_What_Actually_Works).md`
- `The_Only_Formula_Behind_Truly_Great_Apps.md`
- `The_psychology_trick_that_makes_any_app_feel_10x_better.md`
- `The_UX_Psychology_Behind_Apps_People_Can’t_Stop_Using.md`

## Product thesis

VIGIL should become a calm companion for intentional time: it helps a person name what they are doing, stay with it, recover after interruption, repair forgotten time, and understand the day without shame.

The valuable loop is not “open dashboard → admire statistics.” It is:

**Choose now → stay aware → recover gently → repair the record → reflect → prepare tomorrow.**

That loop is useful for prayer, study, trading, work, exercise, rest, family, entertainment, or any activity the user defines. VIGIL must not hardcode one person's categories as universal values.

## Product point of view

- Time records are evidence, not a judgment of character.
- Rest and play are legitimate when named intentionally.
- A pause is information, not automatically a distraction.
- The app should reduce bookkeeping, not demand constant phone attention.
- Beauty creates willingness to return; correctness creates trust after returning.
- “Premium” means excellent defaults, immediate feedback, coherent detail, and reliable recovery—not artificial friction or visual excess.

## The experience VIGIL should own

### Now

The home screen answers: **What are you giving your time to right now?** One selected activity and one Start action dominate. Recent/favorite activities reduce choice. Optional intention and target are progressive controls, not a separate mode. While running, the phone becomes a quiet instrument panel rather than a busy dashboard.

### Return

When the user pauses or drifts, VIGIL helps them return:

- a pause starts immediately;
- a reason can be named without delaying the timestamp;
- a later check-in offers Resume, Finish, Snooze, or “I switched tasks”;
- recovery time is visible without moral language;
- repeated patterns become factual reflection only after enough data exists.

### Repair

Forgotten time accumulates in an “unaccounted inbox,” not a red failure score. One-tap labels handle obvious gaps; split/edit handles mixed time. VIGIL can remember recent labels for that time of day, but never silently assigns them.

### Reflect

Daily Review turns intervals into a simple narrative:

- where recorded time went;
- longest uninterrupted eligible interval;
- pause count/duration and common optional reasons;
- unaccounted awake time;
- planned items with no record, described as “not recorded,” not “not done”;
- one source-linked factual insight;
- three intentions for tomorrow.

The review ends calmly, not with a streak threat.

## Prioritized roadmap

| Horizon | Capability | Why it matters | Boundary |
| --- | --- | --- | --- |
| Private alpha | One authoritative Now tracker | Removes mode confusion and makes starting effortless | Local only |
| Private alpha | Reliable correction and honest Review | Converts tracking into trustworthy understanding | No inferred behavior |
| Private alpha | Respectful pause/idle reminders | Delivers the mentor/guide feeling requested | Opt-in, capped, no surveillance |
| Private alpha | Complete backup/restore | Protects personal history before wider use | User-initiated file |
| Next | Routines and session templates | Morning prayer, trade review, or study becomes one tap | User-created/editable |
| Next | Widget and Quick Settings tile | Start/pause/resume without opening the full interface | Android-first |
| Next | Reflection and pattern cards | Helps users understand interruption/recovery | Transparent arithmetic |
| Next | Calendar planned-vs-recorded overlay | Makes calendar useful without another planner | Read-only import first |
| Current serious-alpha milestone | Trusted Circles | Small-group encouragement/accountability | Identity/backend/privacy required; integrate after core trust repair |
| Later | Wear OS companion | Reduces dependence on the phone | Separate lifecycle/sync project |
| Later | Cross-device sync | Preserves state across devices | Conflict/encryption/recovery required |
| Exploratory | Opt-in distraction context | Could correlate interruption with app usage | Sensitive permission; off by default |

## High-value concepts

### Session intention and outcome

Before a focus session, optionally write one sentence such as “Read chapter 3” or “Prepare trade plan.” At finish, choose Done, Progressed, Changed direction, or Skip. This records whether the intended unit moved without pretending elapsed time equals quality.

### Recovery, not streaks

Show continuity compassionately:

- “You returned after 8 minutes.”
- “Three focused blocks this week.”
- “Most interruptions happened after 40 minutes.”

Avoid streak-loss warnings, shame, or fake points. A missed day is an ordinary gap, not a broken identity.

### Routines

A routine is an ordered set of optional activity prompts, not an automatic timer. Examples: wake → prayer → study; market preparation → trading → journal; exercise → shower → breakfast. The user can skip, reorder, or stop. Routines shorten setup; they do not control the person.

### Quick capture surfaces

Android can make VIGIL less phone-dependent before a watch exists:

- home-screen widget for recent activities/current state;
- persistent running-session notification with safe actions;
- Quick Settings tile for Resume/Pause or Start recent;
- launcher shortcuts for favorite activities.

Every surface routes through the same transaction-safe session controller.

### Planned versus recorded calendar

Import planned blocks read-only, then let Timeline show “planned” beside “recorded.” The user explicitly links or dismisses a match. VIGIL never claims an event happened because it was scheduled.

## Trusted Circles: responsible social direction

Seeing friends' focus, prayer, social, productive, or interrupted time can create warm accountability, but raw history is intimate. It must not start as a public feed or leaderboard.

Recommended concept: a private circle of invited people who share **chosen summaries or check-ins**, not default live surveillance.

What a person may share:

- “Starting a 30-minute Prayer session” as an explicit check-in;
- a completed-session card with rounded duration;
- a chosen daily category summary;
- one tomorrow intention;
- a request for encouragement.

Privacy defaults:

- sharing off by default;
- every activity/category is Private, Summary only, or Shareable;
- spiritual, health, sleep, and distraction data default to Private;
- no live location, app-usage list, exact timeline, or lock-screen detail;
- duration can be rounded or delayed;
- deletion/revocation propagates;
- the user previews exactly what each person sees.

Use acknowledgment rather than ranking: “I’m with you,” encouragement, or a quiet completion reaction. No global leaderboard, public productivity score, prayer comparison, punishment, or algorithmic feed.

Trusted Circles requires authentication, invitations, authorization, encryption in transit/at rest through the selected provider, abuse/blocking controls, consent state, deletion, sync-conflict rules, notification privacy, and a real privacy policy. It is not a one-click database switch. Local-first tracking remains the foundation, while real Circle integration is a current alpha milestone once the owner authorizes provider configuration.

## Applying the supplied transcript ideas

The seven transcripts reinforce:

- fast time-to-value;
- smart defaults and progressive disclosure;
- immediate cause-and-effect feedback;
- competence through clear feedback;
- a memorable peak and calm ending;
- personalization only after expressed preference;
- small-group acknowledgment over broad social proof;
- coherent iteration/craft as the source of premium quality.

VIGIL explicitly rejects:

- guilt, FOMO, or threatened streak loss;
- artificial waiting presented as system work;
- fake progress, invented trends, or unearned rewards;
- lock-in and switching-cost strategy;
- public leaderboards and generic points/badges;
- anxiety-based notification design.

The transcripts are inspiration, not product evidence. Behavior must be validated with real users and transparent metrics.

## Onboarding direction

The first session should produce value in under one minute:

1. Short landscape welcome: “Make room for what matters.”
2. Choose up to four starter activities or create one; none mandatory.
3. Land on Today with one activity selected.
4. Start a real session.
5. After the first useful action, explain optional reminders in context.
6. Ask for a name/theme later or make them clearly skippable.

Do not front-load accounts, every setting, every feature, or a long carousel. The user learns VIGIL by completing its core action.

## Evidence after private alpha

With 2–3 invited testers, collect consented qualitative evidence rather than surveillance analytics:

- Could they start the right activity without explanation?
- Did they trust the timer after background/reopen?
- Could they repair a forgotten gap?
- Which reminder felt useful or annoying?
- Did Review reveal something they considered accurate?
- Did the interface feel calm and premium on their phone?
- What made them stop tracking?

Then continue into the current Trusted Circles milestone; deeper coaching, routines, calendar comparison, and Focus Together remain separately prioritized extensions.
