# VIGIL — Mindful Activity Tracking & Reflection

A thoughtful, personal companion for intentional daily tracking. Built with Expo, React Native, TypeScript, and SQLite.

---

## Features

- **Cinematic Landscape & Timer Halo:** Layered mountain vector sunrise/night artwork with an ambient breathing halo (6s cycle), tabular digits, and immediate activity controls.
- **Durable Local SQLite Truth:** Atomic transactions, zero lost writes, half-open interval accounting, midnight crossing clipping, and collision protection.
- **Honest Arithmetic & Factual Insights:** Transparent numbers only. No speculative AI coaching, streak pressure, or fake productivity scores.
- **Untracked Time Gaps:** One-tap quick tagging for forgotten intervals with instant Undo, plus gap splitting into multiple activities.
- **Evening Review & Plan:** Donut balance chart, category breakdown, longest uninterrupted session, and exactly 3 editable/reorderable priorities for tomorrow.
- **Local Reminders & Privacy:** Opt-in quiet hours (22:00–07:00), pause/idle check-ins, privacy mode hiding activity names on lockscreen.
- **Zero Cloud / Manual Backup:** Versioned JSON backup export and import with validation preview. Data never leaves your device.
- **Both Light & Dark Themes:** Carefully calibrated semantic tokens meeting WCAG AA contrast standards.
- **Gate D1 Preview Fixture:** Built-in isolated preview mode accessible at `/preview` or from Settings/Today top bar.

---

## Quick Start & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests & Typecheck
```bash
# Run 18 Jest domain, timing, and accounting tests
npm test

# Run strict TypeScript compiler verification
npm run lint
```

### 3. Start Development Server
```bash
# Start Expo development server (opens QR code for Expo Go on Android)
npx expo start

# Run in Web Browser
npm run web
```

### 4. Running on Android Phone
1. Install **Expo Go** from Google Play Store on your Android device.
2. Ensure phone and computer are on the same Wi-Fi network.
3. Run `npx expo start` and scan the terminal QR code with your phone.

---

## Toolchain & Build Report

- **Node.js:** v24.12.0
- **npm:** 11.6.2
- **Expo SDK:** 57.0.20
- **React Native:** 0.86.3
- **Test Suite:** Jest 30.5.0 (5 suites, 18 tests passing)
- **Local Native APK Compilation Blocker:**
  Compiling a standalone Android APK directly on this local Windows machine requires installing JDK 17+ and the Android SDK / Command-line Tools (`$env:ANDROID_HOME`). Running via Expo Go or web export (`npx expo export -p web`) is fully verified and operational without external toolchain installation.

---

## Manual Android Phone Validation Checklist

When testing on a physical Android device:
- [ ] **Start/Pause/Resume/Finish:** Tap Start on Deep Work, wait 1 minute, tap Pause, select "Break", tap Resume, tap Finish. Verify duration updates without delay.
- [ ] **Double-tap Resilience:** Rapidly double tap Start and Pause; verify no duplicate sessions or intervals are created.
- [ ] **Background & Process Kill:** Start a session, background the app or lock the screen for 5 minutes, force-close the app from recent apps, and reopen. Verify accurate duration continues from stored timestamps.
- [ ] **Untracked Gap Card:** Leave app idle for 30 minutes. Reopen and verify amber gap card appears. Tap "Rest" quick tag; verify immediate allocation.
- [ ] **Gate D1 Preview:** Tap the sparkle icon in the top bar to open `/preview`. Toggle between Idle, Running, and Paused, and switch between Light and Dark themes.
- [ ] **TalkBack Accessibility:** Enable TalkBack in Android accessibility settings. Navigate with swipe gestures and verify labels for buttons, timer digits, and charts.
- [ ] **Reduced Motion:** In Settings, enable "Reduced Motion". Verify timer halo breathing stops and screen transitions become immediate.
- [ ] **Notification Check-in:** In Settings, enable Reminders and tap "Send Test Reminder". Verify local notification banner appears.
- [ ] **Backup Roundtrip:** In Settings, tap "Export Backup (JSON)" and share via Android share sheet. Verify file is created and valid.
