# Design direction — light through landscape

Latest owner clarification: the mockups are a quality reference, not a pixel-copy ceiling. Improve composition, detail, interaction and useful supporting screens beyond them. Android is the primary design and testing environment. Honor Android back behavior, system bars, notification channels, permission flows, accessibility and touch conventions; do not imitate iPhone hardware or force iOS controls onto Android. New details should serve the approved journeys, not silently expand into cloud, AI or social features.

## Mandatory source images

These originals already live safely inside the workspace. Keep them intact; do not move, overwrite, or ship the presentation boards as app backgrounds.

| Original relative to workspace | Read for |
| --- | --- |
| `Codex Image 7 Sept 2026, 11_48_01.png` | Timer halo, soft light iOS surfaces, frosted three-tab navigation, compact gap labeling |
| `Codex Image 7 Sept 2026, 11_48_25.png` | Warm cinematic dark greeting, clearer session card, restrained category summaries |
| `Codex Image 7 Sept 2026, 11_49_02.png` | Primary composition: mountain/sun timer centerpiece, elegant dark depth, light Android timeline and review |

There are 18 screen depictions across three boards, representing variations of three core flows, not 18 separate app routes. iOS/Android labels on the boards do not dictate different feature sets or restrict either theme to a platform. Images contain illustrative inconsistent dates/times/totals: implement correct accounting, not their numerical errors.

## Creative direction

Build a mobile product with a cinematic atmosphere: ink-blue shadows, warm sunrise, mint highlights, carefully layered mountain silhouettes, soft light through translucent surfaces. The hero is memorable; working surfaces stay quiet and exceptionally readable. Visual ambition is a requirement. Do not flatten the result into identical gray cards, generic stock dashboard widgets, emoji icons, or an oversized web landing page.

No new full-screen mockup generation is required before building. First create an actual rendered Today screen in both themes, using a clearly isolated preview fixture. Review it side by side with board 3 before propagating the design. Production launch starts empty; fixtures never become real history. If imagery is needed, create original layered SVG/vector mountain art locally; optional image generation can replace only the art later if tooling is available without unapproved spending. Never bake text, timer, buttons, charts, or navigation into an image.

## Tokens (initial values; verify rendered pairings)

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #F4F6F5 | #0C141A |
| Surface | #FFFFFF | #162229 |
| Raised surface | #EAF0ED | #1D2C33 |
| Primary text | #142821 | #F2F7F4 |
| Secondary text | #50645B | #ADBBB4 |
| Primary action | #087A59 | #55DEAE |
| On primary action | #FFFFFF | #082A20 |
| Warm gap surface | #FFF1D9 | #382C1D |
| Warm gap text | #714900 | #F5C77D |
| Border | #CFDAD4 | #35474B |

Status colors accompany labels/icons. Category colors are consistent across Today, Timeline and Review. No red treatment for rest/untracked time. Use real contrast measurements for text (4.5:1 normal, 3:1 large) and meaningful controls (3:1); these tokens are not a conformance claim. Hero text sits over a reliable scrim and passes over all animation frames.

Use one refined sans family (bundled licensed Inter or platform system font); tabular timer digits; timer 52–64sp, greeting 26–30sp, titles 22–26sp, body 15–17sp, metadata 12–14sp. Avoid excessively thin weights. Space on a 4/8 rhythm: page gutter 20dp, primary sections 24dp, card padding 16–20dp, cards radius 22–28dp, controls radius 14–18dp. Touch targets >=48dp. Bottom nav respects system insets and does not obscure the final row. Blur is bounded with an opaque fallback. No device frames or fake status bar in application UI.

## Screen and state specifications

### Welcome and setup

Quiet landscape, VIGIL wordmark, "Make room for what matters." Primary "Make it yours" and skip paths. Name is optional. Editable starter activities: Prayer, Study, Trading, Work, Cleaning, Exercise, Rest, Sleep; selecting none remains valid. Allow renaming/grouping, e.g. Prayer and Scripture under Spiritual time. Explain that data stays on this device and backup is manual. No account screen.

### Today — first impression and daily home

Order: date + small VIGIL wordmark + settings control; greeting with optional name; one compact priorities preview when relevant; dominant landscape timer; gap/pause follow-up; factual insight; floating three-tab navigation.

Hero height approximately 300–360dp at 390dp screen width; shorter viewports scroll without shrinking controls. Mountain layers and sun disc create depth; timer and activity selector remain live native elements. Idle: "What would you like to spend time on?", chosen/recent activity, obvious Start. Running: activity name, elapsed duration, subtle active halo, Pause and Finish always visible. Paused: "Paused", active-time total and distinct pause duration, Resume and Finish. Target reached: gentle confirmation, running overtime continues until stopped. Do not use a determinate completion ring for an unlimited stopwatch; use a state halo. Optional timed target can use real progress.

Activity picker bottom sheet: favorites/recent, search, category, add custom. New activity: name required (1–60 trimmed characters), icon from consistent set, category, optional target. Keyboard-safe save/cancel. Starting takes no more than activity selection plus Start; pause is immediate.

Gap card: amber icon, exact interval and length, "What were you doing?", up to six recent labels, "Split or edit". Whole-gap quick label saves transactionally and offers Undo. Overlaps route to editor rather than silently replacing records. Paused follow-up replaces idle prompt; both must never refer to the same interval.

### Timeline

Title/date picker, Today shortcut, compact elapsed-day balance, chronological stream. Distinguish sessions, pauses, explicitly labeled gaps, sleep, and remaining untracked time with text/icon and color. Variable-duration blocks need a readable minimum height; label the layout as a sequence rather than implying proportional height if using this style. Times use consistent user locale/12–24-hour preference. Selected entry opens details with active vs elapsed time, pause reasons, edit and delete. Add entry via a labeled plus control. Edits preview affected intervals and reject collisions. Date navigation must work for empty dates, midnight crossings and long histories.

### Review & Plan

Soft horizon header, local date, daily/weekly toggle, labeled balance visualization and accessible text equivalent. Completed days may total 24h except timezone/DST day lengths; current-day display totals elapsed time. User categories supply breakdown; never force prayer/trading into generic "focused/rested/other" if that hides meaning. Longest uninterrupted interval and pause totals follow. Sparse-data copy replaces invented trends. Tomorrow's three priorities use editable rows, completion controls and clear reordering buttons (drag optional). Save "Ready for tomorrow" with subtle confirmation; edits remain possible. No hidden fourth priority requirement.

### Settings and secondary journeys

Profile name, theme system/light/dark, time format, activity/category management, reminder frequency/quiet hours/privacy, haptics, reduced motion, data export/import and erase. Settings reachable from every primary screen. Export warns the file contains personal activity information. Import previews backup validity and count before explicit replacement; failure leaves existing data intact. Deletion confirms exact scope and offers cancellation.

## Motion contract

| Interaction | Purpose / treatment | Timing | Interruption / reduced motion |
| --- | --- | --- | --- |
| Start / resume | Halo illuminates, controls crossfade, gentle optional haptic | 220ms ease-out | Data commits first; rapid taps deduplicated; reduced: instant state + haptic |
| Pause | Halo settles, paused label appears | 180ms | No delay to timer write; reduced: instant |
| Active halo | Very subtle luminance breath communicates running | 6s cycle | Stop offscreen/background/paused; reduced: static |
| Hero greeting entry | One short opacity reveal of landscape and greeting | <=300ms | Controls usable immediately; no replay on each tab; reduced: none |
| Tab change | Indicator slides; content short crossfade | 180ms | Cancel to newest selection; reduced: instant |
| Activity / edit sheet | Sheet rises, scrim fades; native back dismisses | 240ms | Gesture cancel restores state; reduced: opacity only |
| Label gap | Card gently collapses into updated timeline balance | 200ms | Commit before success; undo survives navigation; reduced: replace |
| Finish session | Small halo completion and summary reveal | 280ms | No confetti/blocking celebration; reduced: static summary |
| Theme change | Surface/color transition preserving layout | 200ms | System preference respected; reduced: instant |

Animate transform/opacity, keep numerical timer width stable, and avoid expensive full-screen animated blur. Budget for a midrange Android phone; inspect frame pacing during scrolling and transitions. No looping background video or GPU-heavy 3D requirement. The owner's requested visual delight is delivered through scene craft, responsive touch, transitions and excellent composition.

## Coverage and visual gates

Every screen must support empty, real data, long labels, large text, offline, loading, write failure, denied permissions, reduced motion and both themes where applicable. Use TalkBack labels, role/state announcements, logical focus, modal focus return, and accessible chart summaries. Native back closes sheet before leaving screen. Check 360dp and 412dp widths, compact height, landscape fallback, 200% text, keyboard, and gesture/button system navigation.

Gate D1: render Today idle/running/paused in both themes and compare hierarchy, atmosphere, typography, halo, controls, and navigation to originals. Record concrete adjustments before proceeding. Gate D2: render Timeline and Review populated/empty in both themes with real computed data. Gate D3: record start-pause-resume-finish, sheet, theme and reduced-motion journeys. Screenshots alone cannot validate motion. User taste approval remains a later review; implementer self-review must not be called user approval.
