# VIGIL current product direction

Date: 2026-09-13

Status: superseding product amendment for the serious Android alpha

## Decisions now confirmed

1. VIGIL is useful privately without an account, but it is designed for multiple real users.
2. Track and Focus both remain. They are two user-facing experiences over one canonical session/history engine.
3. Browsing, filtering, reviewing, configuring, or previewing never changes an active session.
4. Friends, Close Friends, selective sharing, and small-circle motivation are part of the current serious-alpha product target—not an indefinite later idea.
5. Social must remain optional. Account creation appears at Circle/invitation time rather than before the user experiences tracking value.
6. The three original mockups are a quality floor. The final Android experience may depart from their layouts when it improves hierarchy, interaction, accessibility, or usefulness.
7. The GitHub repository currently contains a native Kotlin/Jetpack Compose implementation. Continue it by default; if the owner requests an alternative Flutter/Expo version, isolate it clearly rather than mixing frameworks or deleting the existing implementation.

## What problem VIGIL solves

Most time tools either ask people to plan perfectly or judge them afterward. VIGIL supports the moment between those extremes: naming what is happening now, protecting a chosen period of attention, returning after interruption, repairing forgotten time, and reflecting honestly.

The central loop is:

**Name → begin → stay or recover → finish → understand → choose what comes next.**

## Track and Focus

### Track

- Open-ended count-up.
- Optimized for normal daily activities whose length is not known in advance.
- Start from a recent/favorite/custom activity with one primary action.
- Pause is immediate; interruption/reason labeling follows and is optional.
- Resume continues the same session. Finish creates one completed session with active and paused intervals.

### Focus

- Intentional sprint for one activity and optional intention.
- Suggested presets include 25, 45, 60, and 90 minutes; 45 is the prominent default, not a universal rule.
- Target can count down while active/elapsed truth remains available.
- Pause, resume, extend, continue overtime, or finish explicitly.
- Completing the target creates a meaningful moment but never silently stops or fabricates success.

### Shared engine rules

- Only one running or paused session exists across the app.
- Navigation has no timer side effect.
- Starting another session requires explicit conflict resolution.
- History corrections cannot edit/delete the open interval through the generic editor.
- Every duration derives from timestamps; no per-second persistence loop.
- Track and Focus both appear in Timeline and Review with an experience label when useful.
- Tutorial/preview state uses isolated fixtures. Nothing is saved unless the user explicitly converts it to a real session.

## Onboarding that proves value early

1. **Opening scene:** VIGIL wordmark, landscape, “Make room for what matters,” and one action.
2. **Make it yours:** optional name, editable starter activities, theme. No account wall.
3. **Try the feeling:** a short interactive sandbox demonstrates selecting an activity, Track vs Focus, pause/recovery, and the saved summary. Clearly label it Preview.
4. **First real action:** “Start for real” returns to Today with the chosen activity ready.
5. **Permissions in context:** notification permission only after enabling a reminder; account only when opening Circle or accepting an invitation.

Onboarding progress may be resumed, skipped, or revisited. The first session is never silently polluted by demo data.

## Circle: friends without turning life into a feed

### Relationship lifecycle

`none → invited/requested → friend → close-requested → close-friend`

Either person may decline, cancel, downgrade, mute, or unfriend. Close Friend requires a second mutual acceptance. Blocking prevents discovery/contact and revokes active access.

### Visibility model

Every owner has defaults by tier and may override fields per person. The share preview is the product truth.

Suggested Friend defaults, all editable:

- display name/avatar;
- a chosen status such as Focusing, Resting, or Offline, with no exact activity by default;
- selected broad category totals for Today/Week;
- session count or focus target progress;
- selected intentions/check-ins.

Suggested Close Friend options, private until enabled:

- exact selected activity names;
- exact session windows;
- interruption count and duration;
- pause reasons or recovery rate;
- untracked time;
- selected sleep/spiritual summaries.

Sensitive categories and fields remain off even after Close Friend elevation until the owner deliberately enables them. Show a human-readable preview and require one confirmation when changing the effective audience.

### Social surfaces

- **Circle home:** invitations, friends, close friends, a compact daily pulse, and active opt-in challenges.
- **Friend profile:** only authorized summary, the date/window, data freshness, and encouragement action.
- **Share controls:** tier defaults, per-field toggles, per-person override, and preview-as-this-person.
- **Encouragement:** lightweight preset reactions or a short message with mute controls; no endless feed.
- **Focus Together candidate:** invite one or more friends to the same timed focus room. Show presence/progress, not private screen/app activity. Treat this as a follow-on milestone after private sharing is sound.

## Fair motivation

A global hours leaderboard would reward free time rather than intention. Ranking exists only inside an opted-in challenge with a chosen metric and time window.

Default ranking metrics:

1. percent of self-set target completed;
2. intentional sessions completed;
3. return-after-interruption rate;
4. consistency across opted-in days.

Raw minutes are allowed only for a named shared challenge such as “Read together this week.” Participants can hide rank, leave, or keep their number visible only to themselves. Rest, prayer, sleep, caregiving, and total-life productivity are never ranked by default.

## Account and backend decision

Real friends across different phones require identity, a network backend, authorization rules, deletion/revocation behavior, and sync/error states. This is not achieved by adding a button.

Recommended architecture for the private alpha:

- local SQLite remains authoritative for personal timer/history;
- the user remains a guest until Circle is used;
- a managed identity/backend is introduced behind repository interfaces;
- only minimal authorized daily snapshots are uploaded, not raw history by default;
- server-side rules enforce relationship and field access;
- offline changes queue safely and show last-updated state;
- backend configuration and secrets never enter source control.

Firebase is the practical first candidate if Google tooling is already available; Supabase is a valid alternative. Do not silently create either project. If no backend project/configuration is authorized, implement the provider boundary, schemas, authorization tests, complete UI states, and an unmistakably labeled local demo provider, then record the exact external blocker. A local demo is not claimed as cross-device sharing.

Provisional remote records:

- `profiles`: public-safe identity fields;
- `relationships`: requester, recipient, state, level, timestamps;
- `sharePolicies`: owner, viewer/tier, field allowlist, sensitive confirmations, revision;
- `dailySnapshots`: owner, local date/timezone, authorized derived metrics, policy revision;
- `challenges`: owner, metric, window, participants, visibility;
- `challengeResults`: participant, normalized result, source window, computed timestamp;
- `encouragements`: sender, recipient, bounded payload, timestamps/mute state.

Raw session/interval uploads are out by default. No authorization decision may rely only on client-side filtering.

## Additional product concepts worth preserving

- **Recovery fingerprint:** factual pattern of interruption reason, pause length, and return behavior; no moral label.
- **Ritual templates:** Morning Prayer, Trading Review, Study Block, Wind Down—user-created sequences, not universal prescriptions.
- **Gentle catch-up:** a fast way to explain several untracked spans at once without pretending the app observed them.
- **Day lens:** switch Review between time balance, activities, interruptions, and intentions without stacking an analytics grid.
- **Private aliases:** share “Spiritual” or “Personal” instead of exact activities.
- **Moment notes:** optional short note at finish; private by default and never shared through a category toggle.
- **Weekly letter:** an on-device narrative assembled only from traceable metrics, with links to source intervals.
- **Focus Together:** small real-time rooms after sharing/auth is secure.

## Release meaning

“Current scope” does not mean implementing every social screen before repairing time integrity. The sequence is trust-first: session correctness and privacy foundations, then real Circle functionality in the same serious-alpha program. The social milestone is not complete until two separate test identities can accept friendship, elevate/downgrade, share only allowed fields, revoke access, and pass authorization tests.
